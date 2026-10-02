import { useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronDown,
  Menu,
  Plus,
  Search,
  Send,
  Settings,
  Sparkles,
} from "lucide-react";
import "./styles/app.css";

const chats = ["AnimeVault", "EFITH architecture", "PC build"];

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [message, setMessage] = useState("");

  return (
    <main className="app-shell">
      <motion.aside
        className="sidebar"
        animate={{ width: sidebarOpen ? 272 : 0, opacity: sidebarOpen ? 1 : 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <div className="sidebar-inner">
          <div className="sidebar-top">
            <button className="icon-button" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
              <Menu size={19} />
            </button>
            <button className="new-chat-button">
              <Plus size={17} />
              <span>New chat</span>
            </button>
          </div>

          <div className="sidebar-section">
            <span className="section-label">Chats</span>
            {chats.map((chat) => (
              <button className="chat-item" key={chat}>
                <span>{chat}</span>
              </button>
            ))}
          </div>

          <div className="sidebar-bottom">
            <button className="chat-item">
              <Settings size={17} />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </motion.aside>

      <section className="chat-panel">
        <header className="topbar">
          <div className="topbar-left">
            {!sidebarOpen && (
              <button className="icon-button" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
                <Menu size={19} />
              </button>
            )}
            <button className="model-button">
              <span>EFITH</span>
              <ChevronDown size={16} />
            </button>
          </div>

          <div className="status">
            <span className="status-dot" />
            Online
          </div>
        </header>

        <div className="chat-content">
          <motion.div
            className="welcome"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="efith-mark">
              <Sparkles size={24} />
            </div>
            <h1>What can I help with?</h1>
            <p>Your personal AI assistant.</p>
          </motion.div>

          <div className="composer-wrap">
            <div className="composer">
              <button className="composer-icon" aria-label="Search">
                <Search size={19} />
              </button>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                  }
                }}
                placeholder="Message EFITH..."
                rows={1}
              />
              <button className="send-button" disabled={!message.trim()} aria-label="Send message">
                <Send size={17} />
              </button>
            </div>
            <p className="composer-note">EFITH can make mistakes. Check important information.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
