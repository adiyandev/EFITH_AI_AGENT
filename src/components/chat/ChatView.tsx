import { useState } from "react";
import { Composer } from "./Composer";
import { Message } from "./Message";
import { WelcomeScreen } from "./WelcomeScreen";
import type { EfithSettings } from "../settings/SettingsModal";

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

type ChatViewProps = { settings: EfithSettings };

export function ChatView({ settings }: ChatViewProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    const content = message.trim();
    if (!content || loading) return;

    const userMessage = { id: Date.now(), role: "user" as const, content };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${settings.apiUrl || ""}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: settings.provider,
          model: settings.model,
          messages: nextMessages.map(({ role, content: text }) => ({ role, content: text })),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "EFITH backend request failed.");

      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: payload.message?.content ?? "The backend returned an empty response.",
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: error instanceof Error
            ? `I couldn't reach the EFITH backend: ${error.message}`
            : "I couldn't reach the EFITH backend.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const hasMessages = messages.length > 0;
  return (
    <div className={`chat-content ${hasMessages ? "chat-content--active" : ""}`}>
      {!hasMessages && <WelcomeScreen />}
      {hasMessages && (
        <div className="message-list">
          {messages.map((item) => <Message key={item.id} {...item} />)}
          {loading && <Message role="assistant" content="Thinking..." />}
        </div>
      )}
      <Composer value={message} onChange={setMessage} onSend={sendMessage} />
    </div>
  );
}
