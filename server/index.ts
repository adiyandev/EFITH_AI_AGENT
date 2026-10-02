import Fastify from "fastify";
import cors from "@fastify/cors";
import "dotenv/config";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ProviderName = "openai" | "gemini" | "anthropic";

type ProviderRequest = {
  provider?: ProviderName;
  model?: string;
  apiKey?: string;
};

type ChatRequest = ProviderRequest & {
  messages: ChatMessage[];
};

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
};

function getProviderConfig(provider: ProviderName, requestApiKey?: string) {
  const config = PROVIDERS[provider];
  const envKey =
    provider === "openai"
      ? process.env.OPENAI_API_KEY
      : provider === "gemini"
        ? process.env.GEMINI_API_KEY
        : process.env.ANTHROPIC_API_KEY;

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

async function callOpenAICompatible(
  provider: ProviderName,
  messages: ChatMessage[],
  model: string,
  apiKey: string,
) {
  const config = getProviderConfig(provider, apiKey);

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(getProviderError(payload, `${provider} request failed.`));
  }

  return payload?.choices?.[0]?.message?.content;
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
    throw new Error(getProviderError(payload, "Anthropic request failed."));
  }

  const textBlock = payload?.content?.find?.((item: { type?: string }) => item.type === "text");
  return textBlock?.text;
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
    const content =
      provider === "anthropic"
        ? await callAnthropic(messages, model, config.apiKey)
        : await callOpenAICompatible(provider, messages, model, config.apiKey);

    if (typeof content !== "string") {
      return reply.code(502).send({ error: `${provider} returned no text content.` });
    }

    return {
      provider,
      model,
      message: { role: "assistant", content },
    };
  } catch (error) {
    request.log.error(error, "Provider request failed");
    return reply.code(502).send({
      error: error instanceof Error ? error.message : "AI provider request failed.",
    });
  }
});

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "0.0.0.0";

await app.listen({ port, host });
