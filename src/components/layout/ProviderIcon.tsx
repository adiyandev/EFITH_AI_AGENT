import type { CSSProperties } from "react";
import type { Provider } from "../settings/SettingsModal";

type Props = { provider: Provider; size?: number; className?: string };

const colors: Record<Provider, string> = {
  openai: "#10A37F",
  gemini: "#8E75FF",
  anthropic: "#D97757",
  groq: "#F55036",
  ollama: "#FFFFFF",
};

export function ProviderIcon({ provider, size = 20, className }: Props) {
  const style: CSSProperties = { width: size, height: size, display: "block", flex: "0 0 auto", color: colors[provider] };
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "currentColor", role: "img" as const, "aria-label": provider };
  return (
    <svg {...common} style={style} className={className}>
      {provider === "gemini" && <path d="M12 0c1.5 6.4 5.6 10.5 12 12-6.4 1.5-10.5 5.6-12 12C10.5 17.6 6.4 13.5 0 12 6.4 10.5 10.5 6.4 12 0Z" />}
      {provider === "anthropic" && <path d="M17.3 3.54h-3.67l6.7 16.92H24L17.3 3.54ZM6.7 3.54 0 20.46h3.74l1.37-3.55h7.01l1.37 3.55h3.74L10.54 3.54H6.7Zm-.37 10.22 2.29-5.94 2.29 5.94H6.33Z" />}
      {provider === "ollama" && <path d="M7.1 2.1c-.6 1.7-.6 3.4-.3 4.8A6.8 6.8 0 0 0 3.7 12c-.1 1.4.3 2.7 1.1 3.7-.9 1.8-1 4-.5 6.3h2.5c-.8-2.1-.6-4.2.5-5.9.3-.5.2-1.1-.2-1.5a4.1 4.1 0 0 1-1.1-3.2c.2-2.3 2.1-4 4.1-3.6.6.1 1-.1 1.3-.6.4-.8 1.4-1.3 2.6-1.3s2.2.5 2.6 1.3c.3.5.7.7 1.3.6 2-.4 3.9 1.3 4.1 3.6a4.1 4.1 0 0 1-1.1 3.2c-.4.4-.5 1-.2 1.5 1.1 1.7 1.3 3.8.5 5.9h2.5c.5-2.3.4-4.5-.5-6.3.8-1 1.2-2.3 1.1-3.7a6.8 6.8 0 0 0-3.1-5.1c.3-1.4.3-3.1-.3-4.8-.3-.9-.9-1.6-1.6-1.6-.9 0-1.6 1.2-1.8 3.2a6.4 6.4 0 0 0-3.5-1 6.4 6.4 0 0 0-3.5 1C8.7 1.7 8 0.5 7.1.5c-.7 0-1.3.7-1.6 1.6ZM8.5 11a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Zm7 0a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Zm-3.5 2.5c-1.2 0-1.7.6-1.7 1.1 0 .6.8 1.1 1.7 1.1s1.7-.5 1.7-1.1c0-.5-.5-1.1-1.7-1.1Z" />}
      {provider === "groq" && <path d="M5 3h14a2 2 0 0 1 2 2v3h-4V7H7v10h10v-2h4v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm6 6h10v4H11V9Z" />}
      {provider === "openai" && <path d="M12 2.1a5.1 5.1 0 0 0-4.9 3.7 5.1 5.1 0 0 0-4.2 7.5 5.1 5.1 0 0 0 2.6 7.3A5.1 5.1 0 0 0 12 22a5.1 5.1 0 0 0 4.9-3.7 5.1 5.1 0 0 0 4.2-7.5 5.1 5.1 0 0 0-2.6-7.3A5.1 5.1 0 0 0 12 2.1Zm0 2.5a2.6 2.6 0 0 1 2.4 1.7l-5.2 3a2.6 2.6 0 0 0-1.3 2.3v1.2l-2.7-1.6a2.6 2.6 0 0 1 2.3-3.9c.5 0 .9.1 1.3.3l1.1.6V6.8A2.6 2.6 0 0 1 12 4.6Zm5.1 2.1a2.6 2.6 0 0 1 2.2 3.9l-.7 1.1h-3.2v-1.3a2.6 2.6 0 0 0-1.3-2.3l-1-.6 2.7-1.5c.4.4.8.7 1.3.7ZM10.4 12l1.6-.9 1.6.9v1.9l-1.6.9-1.6-.9V12Zm-5.2 2.1 2.7 1.6v1.2a2.6 2.6 0 0 0 1.3 2.3l1 .6-2.7 1.5a2.6 2.6 0 0 1-2.2-3.9l.7-1.1H9v-1.3a2.6 2.6 0 0 0-1.3-2.3l-2.5-1.4v2.8Zm9.6 1.1a2.6 2.6 0 0 0 1.3-2.3v-1.2l2.7 1.6a2.6 2.6 0 0 1-2.3 3.9c-.5 0-.9-.1-1.3-.3l-1.1-.6v1.4a2.6 2.6 0 0 1-4.8 1.4l5.5-3.1Z" />}
    </svg>
  );
}
