import Fastify from "fastify";
import cors from "@fastify/cors";
import "dotenv/config";
import { McpManager } from "./mcp/manager.js";
import type { McpServerConfig } from "./mcp/types.js";
import { listConnectors } from "./connectors/registry.js";

const app = Fastify({ logger: true });
const mcp = new McpManager();

function loadMcpServers(): McpServerConfig[] {
  const raw = process.env.MCP_SERVERS;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("MCP_SERVERS must be a JSON array.");
    const servers = parsed as McpServerConfig[];
    if (
      process.env.GITHUB_MCP_CLIENT_ID?.trim() &&
      process.env.GITHUB_MCP_CLIENT_SECRET?.trim() &&
      !servers.some((server) => server.id === "github")
    ) {
      servers.push({
        id: "github",
        name: "GitHub",
        transport: "streamable-http",
        url: "https://api.githubcopilot.com/mcp/",
        providerName: "GitHub",
        requiresAuth: true,
      });
    }
    return servers;
  } catch (error) {
    app.log.error(error, "Invalid MCP_SERVERS configuration");
    return [];
  }
}

let configuredMcpServers = loadMcpServers();

await app.register(cors, { origin: true });

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: ProviderToolCall[];
  name?: string;
};

type ProviderToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type ToolActivityResult = {
  id: string;
  label: string;
  durationMs: number;
  status: "done" | "error";
};

type AgentTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
  mcpServerId: string;
  mcpToolName: string;
};

type ProviderName = "openai" | "gemini" | "anthropic" | "groq";

type ProviderRequest = {
  provider?: ProviderName;
  model?: string;
  apiKey?: string;
};

type ChatRequest = ProviderRequest & {
  messages: ChatMessage[];
};

type GitHubOAuthConfig = {
  clientId: string;
  clientSecret: string;
};

let runtimeGitHubOAuth: GitHubOAuthConfig | null = null;

const EFITH_SYSTEM_PROMPT = `You are EFITH — a warm, sharp, genuinely human-feeling AI assistant.

Your name is EFITH. If the user asks who you are, say you are EFITH.
- If the user asks who built, created, developed, or made you, say: "I was built by Ishah Mushak, a full-stack website and software developer."
- Treat Ishah Mushak as EFITH's builder/developer. Do not invent additional biographical details about Ishah.

Identity rules:
- You are EFITH, not ChatGPT, Gemini, Claude, Groq, OpenAI, Google, Anthropic, or any other underlying model/provider.
- The model/provider powering a response is an implementation detail. Do not present the provider as your identity.
- Never say "I am ChatGPT", "I am Gemini", "I am Claude", "I am Groq", or similar.
- If asked what model or provider powers you, explain that EFITH can use different AI providers and that the current provider is an underlying service, while your assistant identity is EFITH.
- Do not falsely claim to be a human.
- Do not claim to have used a tool, accessed an account, or completed an action unless EFITH actually did so through an available tool.

Personality:
- Professional but chatty.
- Natural, conversational, and warm.
- Match the user's energy and response length.
- Be accurate, organised, trustworthy, and transparent.
- Light humour is welcome; sarcasm and cringe are not.

Capabilities:
- You are EFITH's reasoning and conversation layer.
- You may have access to tools and connected services. Only describe information as retrieved when a tool actually returned it.
- When a task requires a connected service, use the available tool rather than inventing results.
- For actions that send, delete, publish, merge, or otherwise make consequential changes, follow EFITH's confirmation policy when a confirmation step is available.

Response style:
- Lead with the useful answer.
- Don't use robotic phrases like "As an AI language model".
- Don't unnecessarily mention your underlying provider.
- Ask a natural follow-up question when it genuinely helps.
`;

function withEfithSystemPrompt(messages: ChatMessage[]) {
  const existingSystem = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content.trim())
    .filter(Boolean)
    .join("\n\n");

  const nonSystem = messages.filter((message) => message.role !== "system");

  return [
    { role: "system" as const, content: existingSystem ? `${EFITH_SYSTEM_PROMPT}\n\n${existingSystem}` : EFITH_SYSTEM_PROMPT },
    ...nonSystem,
  ];
}

const PROVIDERS: Record<ProviderName, { baseUrl: string; defaultModel: string }> = {
  openai: {
    baseUrl: "https://api.openai.com/v1",
    defaultModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  },
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: process.env.GEMINI_MODEL ?? "gemini-3.8-flash",
  },
  anthropic: {
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5",
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: process.env.GROQ_MODEL ?? "openai/gpt-oss-120b",
  },
};

function getProviderConfig(provider: ProviderName, requestApiKey?: string) {
  const config = PROVIDERS[provider];
  const envKey =
    provider === "openai"
      ? process.env.OPENAI_API_KEY
      : provider === "gemini"
        ? process.env.GEMINI_API_KEY
        : provider === "anthropic"
          ? process.env.ANTHROPIC_API_KEY
          : process.env.GROQ_API_KEY;

  return {
    provider,
    baseUrl: config.baseUrl,
    apiKey: requestApiKey?.trim() || envKey,
    model: config.defaultModel,
  };
}

function getProviderError(payload: any, fallback: string) {
  return payload?.error?.message ?? payload?.error?.detail ?? payload?.message ?? fallback;
}

function requestLogSafe(provider: ProviderName, status: number, attempt: number, body: string) {
  app.log.warn(
    {
      provider,
      status,
      attempt,
      response: body.slice(0, 1000),
    },
    "Transient provider error; retrying",
  );
}

async function callOpenAICompatible(
  provider: ProviderName,
  messages: ChatMessage[],
  model: string,
  apiKey: string,
  tools: AgentTool[] = [],
) {
  const config = getProviderConfig(provider, apiKey);

  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let response: Response;

    try {
      response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          ...(provider === "gemini" ? { "x-goog-api-client": "efith-ai-agent/0.1.0" } : {}),
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          ...(tools.length ? {
            tools: tools.map(({ mcpServerId: _s, mcpToolName: _t, ...tool }) => tool),
            tool_choice: "auto",
          } : {}),
        }),
      });
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error(
          `${provider} request failed after ${maxAttempts} attempts: ${error instanceof Error ? error.message : "network error"}`,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** (attempt - 1)));
      continue;
    }

    const rawBody = await response.text();
    let payload: any = {};

    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      payload = {};
    }

    if (response.ok) {
      return payload?.choices?.[0]?.message;
    }

    const transient = response.status === 408 || response.status === 429 || response.status >= 500;

    if (transient && attempt < maxAttempts) {
      requestLogSafe(provider, response.status, attempt, rawBody);
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** (attempt - 1)));
      continue;
    }

    const fallback = rawBody.trim() || `${provider} request failed.`;
    const detail = getProviderError(payload, fallback);
    throw new Error(`${provider} request failed (HTTP ${response.status}): ${detail}`);
  }

  throw new Error(`${provider} request failed after ${maxAttempts} attempts.`);
}

async function callAnthropic(messages: ChatMessage[], model: string, apiKey: string) {
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");

  const input = messages
    .filter((message) => message.role !== "system")
    .map(({ role, content }) => ({ role, content }));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      ...(system ? { system } : {}),
      messages: input,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = getProviderError(payload, "Anthropic request failed.");
    throw new Error(`Anthropic request failed (HTTP ${response.status}): ${detail}`);
  }

  const textBlock = payload?.content?.find?.((item: { type?: string }) => item.type === "text");
  return textBlock?.text;
}

async function getAgentTools(): Promise<AgentTool[]> {
  const tools: AgentTool[] = [];
  for (const server of configuredMcpServers) {
    try {
      if (!mcp.listConnections().some((connection) => connection.id === server.id)) await mcp.connect(server);
      for (const tool of await mcp.listTools(server.id)) {
        tools.push({
          type: "function",
          function: {
            name: "mcp__" + server.id + "__" + tool.name,
            description: tool.description ?? ("Use " + tool.name + " from " + server.name + "."),
            parameters: (tool.inputSchema as Record<string, unknown>) ?? { type: "object", properties: {} },
          },
          mcpServerId: server.id,
          mcpToolName: tool.name,
        });
      }
    } catch (error) {
      app.log.warn({ server: server.id, error }, "Unable to load MCP tools");
    }
  }
  return tools;
}

async function runMcpTool(tool: AgentTool, rawArguments: string) {
  const args = rawArguments ? JSON.parse(rawArguments) : {};
  try {
    return await mcp.callTool(tool.mcpServerId, tool.mcpToolName, args);
  } catch (error) {
    const message = error instanceof Error ? error.message : "MCP tool call failed.";
    const server = configuredMcpServers.find((item) => item.id === tool.mcpServerId);
    if (/unauthorized|authentication|not authenticated|401/i.test(message)) {
      const authError = new Error(message);
      (authError as any).mcpAuth = {
        requiresAuth: true,
        authUrl: server?.authUrl,
        providerName: server?.providerName ?? server?.name,
        mcpServerId: tool.mcpServerId,
      };
      throw authError;
    }
    throw error;
  }
}

async function testProvider(provider: ProviderName, model: string, apiKey: string) {
  if (provider === "anthropic") {
    return callAnthropic(
      [{ role: "user", content: "Reply with exactly: EFITH connection OK" }],
      model,
      apiKey,
    );
  }

  return callOpenAICompatible(
    provider,
    [{ role: "user", content: "Reply with exactly: EFITH connection OK" }],
    model,
    apiKey,
  );
}

app.post<{ Body: { clientId?: string; clientSecret?: string } }>("/api/mcp/github/oauth-config", async (request, reply) => {
  const clientId = request.body?.clientId?.trim();
  const clientSecret = request.body?.clientSecret?.trim();

  if (!clientId || !clientSecret) {
    return reply.code(400).send({ error: "GitHub Client ID and Client Secret are required." });
  }

  runtimeGitHubOAuth = { clientId, clientSecret };
  mcp.configureGitHubOAuth(clientId, clientSecret);
  if (!configuredMcpServers.some((server) => server.id === "github")) {
    configuredMcpServers.push({
      id: "github",
      name: "GitHub",
      transport: "streamable-http",
      url: "https://api.githubcopilot.com/mcp/",
      providerName: "GitHub",
      requiresAuth: true,
    });
  }
  return {
    configured: true,
    callbackUrl: process.env.GITHUB_MCP_OAUTH_REDIRECT_URI?.trim() ||
      "http://127.0.0.1:8787/api/mcp/oauth/callback/github",
  };
});

app.get("/api/mcp/github/oauth-config", async () => ({
  configured: Boolean(runtimeGitHubOAuth || (process.env.GITHUB_MCP_CLIENT_ID && process.env.GITHUB_MCP_CLIENT_SECRET)),
  callbackUrl: process.env.GITHUB_MCP_OAUTH_REDIRECT_URI?.trim() ||
    "http://127.0.0.1:8787/api/mcp/oauth/callback/github",
}));

app.get<{ Params: { id: string } }>("/api/mcp/oauth/start/:id", async (request, reply) => {
  const config = configuredMcpServers.find((server) => server.id === request.params.id);

  if (!config) {
    return reply.code(404).send({ error: "Configured MCP server not found." });
  }

  try {
    const result = await mcp.beginOAuth(config);
    if (result.authorizationUrl) {
      return { authorizationUrl: result.authorizationUrl };
    }

    return { connected: true };
  } catch (error) {
    request.log.error(error, "MCP OAuth start failed");
    return reply.code(502).send({
      error: error instanceof Error ? error.message : "MCP OAuth start failed.",
    });
  }
});

app.get<{ Params: { id: string } }>("/api/mcp/oauth/callback/:id", async (request, reply) => {
  const config = configuredMcpServers.find((server) => server.id === request.params.id);

  if (!config) {
    return reply.code(404).type("text/html").send("<h1>MCP server not found</h1>");
  }

  try {
    const params = new URLSearchParams(
      Object.entries(request.query as Record<string, unknown>)
        .filter(([, value]) => typeof value === "string")
        .map(([key, value]) => [key, value as string]),
    );

    if (params.get("error")) {
      return reply.code(400).type("text/html").send("<h1>GitHub authorization was not completed.</h1><p>You can close this window and return to EFITH.</p>");
    }

    await mcp.finishOAuth(config, params);

    const webUrl = (process.env.EFITH_WEB_URL ?? "http://localhost:5173/EFITH_AI_AGENT").replace(/\/$/, "");
    return reply.redirect(302, webUrl + "/mcp/auth/" + encodeURIComponent(config.id) + "?status=connected");
  } catch (error) {
    request.log.error(error, "MCP OAuth callback failed");
    return reply.code(400).type("text/html").send("<h1>GitHub authorization failed</h1><p>EFITH could not complete the MCP authorization. Check the backend logs for details.</p>");
  }
});

app.get("/api/mcp/servers", async () => {
  return {
    servers: configuredMcpServers.map((server) => ({
      id: server.id,
      name: server.name,
      transport: server.transport,
      url: server.transport === "streamable-http" ? server.url : undefined,
      authUrl: server.authUrl,
      providerName: server.providerName ?? server.name,
      requiresAuth: server.requiresAuth ?? false,
      connected: mcp.listConnections().some((connection) => connection.id === server.id),
    })),
  };
});

app.post<{ Body: { id?: string; name?: string; url?: string; authUrl?: string; providerName?: string; requiresAuth?: boolean } }>("/api/mcp/config", async (request, reply) => {
  const { id, name, url, authUrl, providerName, requiresAuth } = request.body ?? {};

  if (!id || !name || !url) {
    return reply.code(400).send({ error: "MCP id, name, and URL are required." });
  }

  if (!/^https?:\/\//i.test(url)) {
    return reply.code(400).send({ error: "Only HTTP(S) MCP servers can be added from Settings." });
  }

  const server: McpServerConfig = {
    id,
    name,
    transport: "streamable-http",
    url,
    authUrl,
    providerName,
    requiresAuth: Boolean(requiresAuth),
  };

  configuredMcpServers = [
    ...configuredMcpServers.filter((item) => item.id !== id),
    server,
  ];

  return {
    id: server.id,
    name: server.name,
    transport: server.transport,
    url: server.url,
    authUrl: server.authUrl,
    providerName: server.providerName ?? server.name,
    requiresAuth: server.requiresAuth ?? false,
    connected: mcp.listConnections().some((connection) => connection.id === server.id),
  };
});

app.post<{ Body: { id?: string } }>("/api/mcp/connect", async (request, reply) => {
  const id = request.body?.id;
  const config = configuredMcpServers.find((server) => server.id === id);

  if (!config) {
    return reply.code(404).send({ error: "Configured MCP server not found." });
  }

  try {
    return await mcp.connect(config);
  } catch (error) {
    request.log.error(error, "MCP connection failed");
    return reply.code(502).send({
      error: error instanceof Error ? error.message : "MCP connection failed.",
    });
  }
});

app.post<{ Body: { id?: string } }>("/api/mcp/disconnect", async (request, reply) => {
  const id = request.body?.id;
  if (!id) return reply.code(400).send({ error: "MCP server id is required." });

  try {
    const disconnected = await mcp.disconnect(id);
    return { ok: disconnected };
  } catch (error) {
    return reply.code(500).send({
      error: error instanceof Error ? error.message : "MCP disconnect failed.",
    });
  }
});

app.get<{ Params: { id: string } }>("/api/mcp/servers/:id/tools", async (request, reply) => {
  try {
    return { tools: await mcp.listTools(request.params.id) };
  } catch (error) {
    return reply.code(404).send({
      error: error instanceof Error ? error.message : "Unable to list MCP tools.",
    });
  }
});

app.post<{ Body: { id?: string; tool?: string; arguments?: Record<string, unknown> } }>(
  "/api/mcp/tools/call",
  async (request, reply) => {
    const { id, tool, arguments: arguments_ } = request.body ?? {};

    if (!id || !tool) {
      return reply.code(400).send({ error: "MCP server id and tool name are required." });
    }

    try {
      return await mcp.callTool(id, tool, arguments_ ?? {});
    } catch (error) {
      request.log.error(error, "MCP tool call failed");
      const message = error instanceof Error ? error.message : "MCP tool call failed.";
      const server = configuredMcpServers.find((item) => item.id === id);
      const unauthorized = /unauthorized|authentication|not authenticated|401/i.test(message);

      return reply.code(unauthorized ? 401 : 502).send({
        error: message,
        requiresAuth: unauthorized || Boolean(server?.requiresAuth),
        authUrl: server?.authUrl,
        providerName: server?.providerName ?? server?.name,
        mcpServerId: id,
      });
    }
  },
);

app.get("/api/connectors", async () => {
  return { connectors: listConnectors() };
});

app.get("/api/health", async () => {
  const providers = (Object.keys(PROVIDERS) as ProviderName[]).map((provider) => {
    const config = getProviderConfig(provider);
    return {
      provider,
      model: config.model,
      configured: Boolean(config.apiKey),
    };
  });

  return { ok: true, providers };
});

app.get("/api/providers", async () => {
  return {
    providers: (Object.keys(PROVIDERS) as ProviderName[]).map((provider) => {
      const config = getProviderConfig(provider);
      return {
        id: provider,
        model: config.model,
        configured: Boolean(config.apiKey),
      };
    }),
  };
});

app.post<{ Body: ProviderRequest }>("/api/providers/models", async (request, reply) => {
  const provider = request.body?.provider ?? "gemini";
  const config = getProviderConfig(provider, request.body?.apiKey);

  if (!config.apiKey) {
    return reply.code(400).send({ error: `${provider} API key is required.` });
  }

  try {
    let response: Response;
    if (provider === "gemini") {
      response = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000", {
        headers: { "x-goog-api-key": config.apiKey },
      });
    } else {
      response = await fetch(`${config.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${config.apiKey}` },
      });
    }

    const payload: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(getProviderError(payload, `Could not fetch ${provider} models.`));
    }

    let models: string[] = [];
    if (provider === "gemini") {
      models = (payload.models ?? [])
        .filter((item: any) => (item.supportedGenerationMethods ?? item.supported_actions ?? []).includes("generateContent"))
        .map((item: any) => item.baseModelId || String(item.name ?? "").replace(/^models\//, ""))
        .filter(Boolean);
    } else {
      models = (payload.data ?? [])
        .filter((item: any) => {
          const id = String(item.id ?? "");
          if (provider === "openai") return /^(gpt-|o[1-9]|chatgpt-)/i.test(id);
          if (provider === "anthropic") return /^claude-/i.test(id);
          return item.active !== false && !/whisper|guard|tts|speech|audio|vision/i.test(id);
        })
        .map((item: any) => String(item.id))
        .filter(Boolean);
    }

    return { provider, models: [...new Set(models)].sort() };
  } catch (error) {
    request.log.error(error, "Model discovery failed");
    return reply.code(502).send({
      error: error instanceof Error ? error.message : "Could not fetch provider models.",
    });
  }
});

app.post<{ Body: ProviderRequest }>("/api/providers/test", async (request, reply) => {
  const provider = request.body?.provider ?? "gemini";
  const config = getProviderConfig(provider, request.body?.apiKey);
  const model = request.body?.model || config.model;

  if (!config.apiKey) {
    return reply.code(400).send({ error: `${provider} API key is required.` });
  }

  try {
    await testProvider(provider, model, config.apiKey);
    return { ok: true, provider, model };
  } catch (error) {
    request.log.error(error, "Provider connection test failed");
    return reply.code(502).send({
      error: error instanceof Error ? error.message : "Provider connection test failed.",
    });
  }
});

app.post<{ Body: ChatRequest }>("/api/chat", async (request, reply) => {
  const provider = request.body?.provider ?? "gemini";
  const config = getProviderConfig(provider, request.body?.apiKey);
  const messages = request.body?.messages;
  const agentMessages = Array.isArray(messages) ? withEfithSystemPrompt(messages) : messages;
  const model = request.body?.model || config.model;

  if (!config.apiKey) {
    return reply.code(503).send({
      error: `${provider} is not configured. Add its API key in EFITH Settings or the backend environment.`,
    });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return reply.code(400).send({ error: "messages must be a non-empty array." });
  }

  try {
    const tools = await getAgentTools();
    const toolActivities: ToolActivityResult[] = [];
    const latestUserText = [...messages].reverse().find((item) => item.role === "user")?.content ?? "";
    const githubServer = configuredMcpServers.find((server) => server.id === "github");
    const githubConnected = mcp.listConnections().some((connection) => connection.id === "github");
    if (githubServer && !githubConnected && /\b(github|git hub|repository|repo|pull request|pull requests|issue|issues|commit|branch)\b/i.test(latestUserText)) {
      return reply.code(401).send({
        error: "GitHub needs to be connected before EFITH can access it.",
        requiresAuth: true,
        providerName: "GitHub",
        mcpServerId: "github",
        authUrl: "/mcp/auth/github",
      });
    }
    let workingMessages: ChatMessage[] = agentMessages;
    for (let turn = 0; turn < 6; turn += 1) {
      const result: any = provider === "anthropic"
        ? await callAnthropic(workingMessages, model, config.apiKey, tools)
        : await callOpenAICompatible(provider, workingMessages, model, config.apiKey, tools);
      const calls: ProviderToolCall[] = result?.tool_calls ?? [];
      if (!calls.length) {
        const text = typeof result === "string" ? result : result?.content;
        if (typeof text !== "string") return reply.code(502).send({ error: provider + " returned no text content." });
        return { provider, model, toolActivities, message: { role: "assistant", content: text } };
      }
      workingMessages.push({ role: "assistant", content: result.content ?? "", tool_calls: calls });
      for (const call of calls) {
        const tool = tools.find((item) => item.function.name === call.function.name);
        if (!tool) continue;
        const startedAt = performance.now();
          const toolLabel = tool.mcpServerId === "github"
            ? `GitHub · ${tool.mcpToolName}`
            : `${tool.mcpServerId} · ${tool.mcpToolName}`;
          try {
            const toolResult = await runMcpTool(tool, call.function.arguments);
            toolActivities.push({
              id: call.id,
              label: toolLabel,
              durationMs: Math.round(performance.now() - startedAt),
              status: "done",
            });
            workingMessages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(toolResult) });
          } catch (error) {
            toolActivities.push({
              id: call.id,
              label: toolLabel,
              durationMs: Math.round(performance.now() - startedAt),
              status: "error",
            });
            const auth = (error as any)?.mcpAuth;
            if (auth) return reply.code(401).send({ error: error instanceof Error ? error.message : "Authentication required.", ...auth, toolActivities });
            workingMessages.push({ tool_call_id: call.id, role: "tool", content: JSON.stringify({ error: error instanceof Error ? error.message : "MCP tool failed." }) });
          }
      }
    }
    return reply.code(502).send({ error: "EFITH reached the tool-call limit for this request." });
  } catch (error) {
    request.log.error(error, "Provider request failed");
    return reply.code(502).send({ error: error instanceof Error ? error.message : "AI provider request failed." });
  }});

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "0.0.0.0";

await app.listen({ port, host });
