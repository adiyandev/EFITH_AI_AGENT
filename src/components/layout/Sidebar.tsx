import { motion } from "framer-motion";
import { Clock3, Menu, MessageSquare, Plus, Settings, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

type ChatRecord = { id: string; title: string; updatedAt: number };
const CHAT_INDEX_KEY = "efith.chat.index";

type SidebarProps = { open: boolean; onClose: () => void; onSettings: () => void };

export function Sidebar({ open, onClose, onSettings }: SidebarProps) {
  const [chats, setChats] = useState<ChatRecord[]>([]);

  const load = () => {
    try { setChats(JSON.parse(localStorage.getItem(CHAT_INDEX_KEY) ?? "[]")); } catch { setChats([]); }
  };
  useEffect(() => {
    load();
    const onChange = () => load();
    window.addEventListener("efith:chats-changed", onChange);
    return () => window.removeEventListener("efith:chats-changed", onChange);
  }, []);

  const newChat = () => window.dispatchEvent(new CustomEvent("efith:new-chat"));
  const openChat = (id: string) => window.dispatchEvent(new CustomEvent("efith:open-chat", { detail: { id } }));
  const deleteChat = (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    localStorage.removeItem(`efith.chat.${id}`);
    load();
    window.dispatchEvent(new CustomEvent("efith:chats-changed"));
  };

  return (
    <motion.aside className="sidebar" animate={{ width: open ? 272 : 0, opacity: open ? 1 : 0 }} transition={{ duration: .22, ease: "easeOut" }} aria-hidden={!open}>
      <div className="sidebar-inner">
        <div className="sidebar-top">
          <button className="icon-button" onClick={onClose} aria-label="Close sidebar"><Menu size={19} /></button>
          <button className="new-chat-button" onClick={newChat}><Plus size={17} /><span>New chat</span></button>
        </div>
        <div className="sidebar-section sidebar-chats">
          <span className="section-label"><span>Recent</span><Clock3 size={12} /></span>
          {chats.length === 0 ? (
            <div className="empty-state"><MessageSquare size={15} /><span>Your recent chats will appear here</span></div>
          ) : chats.slice(0, 20).map((chat) => (
            <motion.button layout key={chat.id} className="chat-item" onClick={() => openChat(chat.id)} whileTap={{ scale: .985 }}>
              <MessageSquare size={15} />
              <span>{chat.title}</span>
              <Trash2 className="chat-delete" size={13} onClick={(event) => deleteChat(event, chat.id)} />
            </motion.button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <button className="chat-item" onClick={onSettings}><Settings size={17} /><span>Settings</span></button>
        </div>
      </div>
    </motion.aside>
  );
}
