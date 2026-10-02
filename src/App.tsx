import { useState } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";
import { ChatView } from "./components/chat/ChatView";
import "./styles/app.css";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <main className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <section className="chat-panel">
        <TopBar
          sidebarOpen={sidebarOpen}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
        <ChatView />
      </section>
    </main>
  );
}
