import { useEffect, useState } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";
import { ChatView } from "./components/chat/ChatView";
import { EfithSettings, SettingsModal, Provider } from "./components/settings/SettingsModal";
import "./styles/app.css";

const SETTINGS_KEY = "efith.settings";

const defaultSettings: EfithSettings = {
  apiUrl: import.meta.env.VITE_API_URL ?? "",
  provider: (import.meta.env.VITE_EFITH_PROVIDER as Provider) ?? "gemini",
  model: import.meta.env.VITE_EFITH_MODEL ?? "gemini-3.8-flash",
  apiKeys: {
    openai: "",
    gemini: "",
    anthropic: "",
  },
};

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<EfithSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (!saved) return defaultSettings;
      const parsed = JSON.parse(saved);
      return {
        ...defaultSettings,
        ...parsed,
        apiKeys: { ...defaultSettings.apiKeys, ...(parsed.apiKeys ?? {}) },
      };
    } catch {
      return defaultSettings;
    }
  });

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  return (
    <main className="app-shell">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSettings={() => setSettingsOpen(true)}
      />
      <section className="chat-panel">
        <TopBar
          sidebarOpen={sidebarOpen}
          onOpenSidebar={() => setSidebarOpen(true)}
          model={settings.model}
        />
        <ChatView settings={settings} />
      </section>
      <SettingsModal
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={setSettings}
      />
    </main>
  );
}
