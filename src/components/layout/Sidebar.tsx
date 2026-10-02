import { motion } from "framer-motion";
import { Menu, Plus, Settings } from "lucide-react";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
  onSettings: () => void;
};

export function Sidebar({ open, onClose, onSettings }: SidebarProps) {
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
          <div className="empty-state">No saved chats yet</div>
        </div>

        <div className="sidebar-bottom">
          <button className="chat-item" onClick={onSettings}>
            <Settings size={17} />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
