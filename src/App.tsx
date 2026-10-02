import { useEffect, useState } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";
import { ChatView } from "./components/chat/ChatView";
import { EfithSettings, SettingsModal, Provider } from "./components/settings/SettingsModal";
import "./styles/app.css";
import { McpAuthPage } from "./components/settings/McpAuthPage";
import { SettingsPage } from "./components/settings/SettingsPage";

const SETTINGS_KEY = "efith.settings";

const defaultSettings: EfithSettings = {
  apiUrl: import.meta.env.VITE_API_URL ?? "",
  provider: (import.meta.env.VITE_EFITH_PROVIDER as Provider) ?? "gemini",
  model: import.meta.env.VITE_EFITH_MODEL ?? "gemini-3.8-flash",
  apiKeys: {
    openai: "",
    gemini: "",
    anthropic: "",
    groq: "",
  },
};

export default function App() {
  if (window.location.pathname.includes("/mcp/auth/")) return <McpAuthPage />;
  return <EfithApp />;
}

function EfithApp() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(window.location.pathname.endsWith("/settings"));
  useEffect(() => {
    const onPop = () => setSettingsOpen(window.location.pathname.endsWith("/settings"));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
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

  if (settingsOpen) {
    return (
      <SettingsPage
        settings={settings}
        onSave={setSettings}
        onBack={() => {
          window.history.pushState({}, "", "/EFITH_AI_AGENT/");
          setSettingsOpen(false);
        }}
      />
    );
  }

  return (
    <main className="app-shell">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSettings={() => {
          window.history.pushState({}, "", "/EFITH_AI_AGENT/settings");
          setSettingsOpen(true);
        }}
      />
      <section className="chat-panel">
        <TopBar
          sidebarOpen={sidebarOpen}
          onOpenSidebar={() => setSidebarOpen(true)}
          settings={settings}
          onChange={(changes) => setSettings((current) => ({ ...current, ...changes }))}
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
