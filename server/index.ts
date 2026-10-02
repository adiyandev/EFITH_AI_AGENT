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

type ChatRequest = {
  messages: ChatMessage[];
  provider?: ProviderName;
  model?: string;
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

function getProviderConfig(provider: ProviderName) {
  const config = PROVIDERS[provider];

  if (provider === "openai") {
    return {
      provider,
      baseUrl: config.baseUrl,
      apiKey: process.env.OPENAI_API_KEY,
      model: config.defaultModel,
    };
  }

  if (provider === "gemini") {
    return {
      provider,
      baseUrl: config.baseUrl,
      apiKey: process.env.GEMINI_API_KEY,
      model: config.defaultModel,
    };
  }

  return {
    provider,
    baseUrl: config.baseUrl,
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: config.defaultModel,
  };
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

async function callOpenAICompatible(
  provider: ProviderName,
  messages: ChatMessage[],
  model: string,
) {
  const config = getProviderConfig(provider);

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `${provider} request failed.`);
  }

  return payload?.choices?.[0]?.message?.content;
}

async function callAnthropic(messages: ChatMessage[], model: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

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
      "x-api-key": apiKey!,
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
    throw new Error(payload?.error?.message ?? "Anthropic request failed.");
  }

  const textBlock = payload?.content?.find?.((item: { type?: string }) => item.type === "text");
  return textBlock?.text;
}

app.post<{ Body: ChatRequest }>("/api/chat", async (request, reply) => {
  const provider = request.body?.provider ?? "gemini";
  const config = getProviderConfig(provider);
  const messages = request.body?.messages;
  const model = request.body?.model || config.model;

  if (!config.apiKey) {
    return reply.code(503).send({
      error: `${provider} is not configured. Add its API key to the backend environment.`,
    });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return reply.code(400).send({ error: "messages must be a non-empty array." });
  }

  try {
    const content =
      provider === "anthropic"
        ? await callAnthropic(messages, model)
        : await callOpenAICompatible(provider, messages, model);

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
