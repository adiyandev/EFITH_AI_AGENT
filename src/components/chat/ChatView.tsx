import { useState } from "react";
import { Composer } from "./Composer";
import { Message } from "./Message";
import { WelcomeScreen } from "./WelcomeScreen";

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  showTools?: boolean;
};

export function ChatView() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const sendMessage = () => {
    const content = message.trim();
    if (!content) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      content,
    };

    setMessages((current) => [
      ...current,
      userMessage,
      {
        id: Date.now() + 1,
        role: "assistant",
        content: "I'm ready. My real agent tools will connect here next.",
        showTools: true,
      },
    ]);
    setMessage("");
  };

  const hasMessages = messages.length > 0;

  return (
    <div className={`chat-content ${hasMessages ? "chat-content--active" : ""}`}>
      {!hasMessages && <WelcomeScreen />}

      {hasMessages && (
        <div className="message-list">
          {messages.map((item) => (
            <Message key={item.id} {...item} />
          ))}
        </div>
      )}

      <Composer value={message} onChange={setMessage} onSend={sendMessage} />
    </div>
  );
}
