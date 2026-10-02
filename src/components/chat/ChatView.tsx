import { useEffect, useRef, useState } from "react";
import { Composer } from "./Composer";
import { Message } from "./Message";
import { WelcomeScreen } from "./WelcomeScreen";
import type { EfithSettings } from "../settings/SettingsModal";

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  auth?: { providerName?: string; mcpServerId?: string; authUrl?: string };
  toolActivities?: { id: string; label: string; durationMs: number; status: "done" | "error" | "running" }[];
};

type ChatViewProps = { settings: EfithSettings };
type StoredChat = { id: string; title: string; messages: ChatMessage[]; updatedAt: number };
const CHAT_INDEX_KEY = "efith.chat.index";
const chatKey = (id: string) => `efith.chat.${id}`;

export function ChatView({ settings }: ChatViewProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState(() => `chat-${Date.now()}`);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const save = () => {
      if (!messages.length) return;
      const title = messages.find((m) => m.role === "user")?.content.slice(0, 48) || "New chat";
      const record: StoredChat = { id: chatId, title, messages, updatedAt: Date.now() };
      localStorage.setItem(chatKey(chatId), JSON.stringify(record));
      let index: { id: string; title: string; updatedAt: number }[] = [];
      try { index = JSON.parse(localStorage.getItem(CHAT_INDEX_KEY) ?? "[]"); } catch {}
      index = [{ id: chatId, title, updatedAt: record.updatedAt }, ...index.filter((item) => item.id !== chatId)].slice(0, 30);
      localStorage.setItem(CHAT_INDEX_KEY, JSON.stringify(index));
      window.dispatchEvent(new CustomEvent("efith:chats-changed"));
    };
    save();
  }, [messages, chatId]);

  useEffect(() => {
    const onNew = () => { setMessages([]); setMessage(""); setChatId(`chat-${Date.now()}`); };
    const onOpen = (event: Event) => {
      const id = (event as CustomEvent<{ id: string }>).detail?.id;
      if (!id) return;
      try {
        const stored = JSON.parse(localStorage.getItem(chatKey(id)) ?? "null") as StoredChat | null;
        if (stored) { setChatId(stored.id); setMessages(stored.messages); setMessage(""); }
      } catch {}
    };
    window.addEventListener("efith:new-chat", onNew);
    window.addEventListener("efith:open-chat", onOpen);
    return () => { window.removeEventListener("efith:new-chat", onNew); window.removeEventListener("efith:open-chat", onOpen); };
  }, []);

  const sendMessage = async () => {
    const content = message.trim();
    if (!content || loading) return;

    const userMessage = { id: Date.now(), role: "user" as const, content };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setMessage("");
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`${settings.apiUrl || ""}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: controller.signal,
        body: JSON.stringify({
          provider: settings.provider,
          model: settings.model,
          apiKey: settings.apiKeys[settings.provider],
          messages: nextMessages.map(({ role, content: text }) => ({ role, content: text })),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401 && payload.requiresAuth) {
        setMessages((current) => [...current, {
          id: Date.now() + 1,
          role: "assistant",
          content: payload.error ?? "This connection needs you to sign in.",
          auth: {
            providerName: payload.providerName,
            mcpServerId: payload.mcpServerId,
            authUrl: payload.authUrl,
          },
          toolActivities: payload.toolActivities ?? [],
        }]);
        return;
      }
      if (!response.ok) throw new Error(payload.error ?? "EFITH backend request failed.");

      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: payload.message?.content ?? "The backend returned an empty response.",
          toolActivities: payload.toolActivities ?? [],
        },
      ]);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
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
      abortRef.current = null;
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
          {loading && <Message role="assistant" content="" thinking toolActivities={[{ id: "live-tool", label: "Calling tool", durationMs: 0, status: "running" }]} />}
        </div>
      )}
      <Composer value={message} onChange={setMessage} onSend={sendMessage} onStop={() => abortRef.current?.abort()} loading={loading} />
    </div>
  );
}
