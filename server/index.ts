import Fastify from "fastify";
import cors from "@fastify/cors";
import "dotenv/config";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: true,
});

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatRequest = {
  messages: ChatMessage[];
  model?: string;
};

function getProviderConfig() {
  const provider = process.env.EFITH_PROVIDER ?? "openai-compatible";
  const baseUrl = (process.env.EFITH_API_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const apiKey = process.env.EFITH_API_KEY ?? process.env.OPENAI_API_KEY;
  const model = process.env.EFITH_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  return { provider, baseUrl, apiKey, model };
}

app.get("/api/health", async () => {
  const config = getProviderConfig();

  return {
    ok: true,
    provider: config.provider,
    model: config.model,
    configured: Boolean(config.apiKey),
  };
});

app.post<{ Body: ChatRequest }>("/api/chat", async (request, reply) => {
  const config = getProviderConfig();

  if (!config.apiKey) {
    return reply.code(503).send({
      error: "EFITH_API_KEY is not configured on the backend.",
    });
  }

  const messages = request.body?.messages;

  if (!Array.isArray(messages) || messages.length === 0) {
    return reply.code(400).send({ error: "messages must be a non-empty array." });
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: request.body.model || config.model,
      messages,
      temperature: 0.7,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    request.log.error({ status: response.status, payload }, "Provider request failed");
    return reply.code(502).send({
      error: payload?.error?.message ?? "The AI provider request failed.",
    });
  }

  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    return reply.code(502).send({ error: "The AI provider returned no message content." });
  }

  return {
    message: {
      role: "assistant",
      content,
    },
    model: payload?.model ?? request.body.model ?? config.model,
  };
});

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "0.0.0.0";

await app.listen({ port, host });
