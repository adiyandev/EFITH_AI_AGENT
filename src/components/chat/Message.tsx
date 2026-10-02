import { motion } from "framer-motion";
import { ToolActivity } from "./ToolActivity";

type MessageProps = {
  role: "user" | "assistant";
  content: string;
  showTools?: boolean;
  auth?: { providerName?: string; mcpServerId?: string; authUrl?: string };
};

export function Message({ role, content, showTools = false, auth }: MessageProps) {
  return (
    <motion.article
      className={`message message--${role}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {role === "assistant" && <div className="message-avatar"><span>✦</span></div>}
      <div className="message-body">
        {showTools && (
          <div className="tool-activity-list">
            <ToolActivity label="Checking GitHub..." done />
            <ToolActivity label="Loading repository context..." done />
          </div>
        )}
        <p>{content}</p>
        {auth && (
          <button className="chat-auth-button" onClick={() => {
            const target = auth.authUrl || `${import.meta.env.BASE_URL}mcp/auth/${encodeURIComponent(auth.mcpServerId ?? "")}`;
            window.location.href = target;
          }}>
            Sign in with {auth.providerName ?? "this provider"} →
          </button>
        )}
      </div>
    </motion.article>
  );
}
