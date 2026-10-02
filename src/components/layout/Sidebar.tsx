import { motion } from "framer-motion";
import { Menu, Plus, Settings } from "lucide-react";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

const chats = ["AnimeVault", "EFITH architecture", "PC build"];

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <motion.aside
      className="sidebar"
      animate={{ width: open ? 272 : 0, opacity: open ? 1 : 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      aria-hidden={!open}
    >
      <div className="sidebar-inner">
        <div className="sidebar-top">
          <button className="icon-button" onClick={onClose} aria-label="Close sidebar">
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
  );
}
