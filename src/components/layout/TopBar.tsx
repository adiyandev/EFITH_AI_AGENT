import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, LoaderCircle, Menu, RefreshCw, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { EfithSettings, Provider } from "../settings/SettingsModal";

type ModelOption = { provider: Provider; model: string };
type TopBarProps = {
  sidebarOpen: boolean;
  onOpenSidebar: () => void;
  settings: EfithSettings;
  onChange: (changes: Partial<EfithSettings>) => void;
};

const providerLabels: Record<Provider, string> = { openai: "OpenAI", gemini: "Gemini", anthropic: "Claude", groq: "Groq" };
const providerIcons: Record<Provider, string> = { openai: "O", gemini: "G", anthropic: "C", groq: "GQ" };

export function TopBar({ sidebarOpen, onOpenSidebar, settings, onChange }: TopBarProps) {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  const fetchModels = async () => {
    setLoading(true);
    const discovered: ModelOption[] = [];
    for (const provider of Object.keys(providerLabels) as Provider[]) {
      const apiKey = settings.apiKeys[provider]?.trim();
      if (!apiKey) continue;
      try {
        const response = await fetch(`${settings.apiUrl || ""}/api/providers/models`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider, apiKey }),
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) discovered.push(...(payload.models ?? []).map((model: string) => ({ provider, model })));
      } catch { /* Keep other providers available. */ }
    }
    setModels(discovered);
    setLoading(false);
  };

  useEffect(() => { void fetchModels(); }, []);
  useEffect(() => { if (open && !models.length) void fetchModels(); }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return models.filter((item) => !q || item.model.toLowerCase().includes(q) || providerLabels[item.provider].toLowerCase().includes(q));
  }, [models, query]);

  return (
    <header className="topbar">
      <div className="topbar-left">
        {!sidebarOpen && <button className="icon-button" onClick={onOpenSidebar} aria-label="Open sidebar"><Menu size={19} /></button>}
        <div className="model-picker">
          <motion.button
            className="model-button"
            whileTap={{ scale: 0.97 }}
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
          >
            <span className="model-button-icon">{providerIcons[settings.provider]}</span>
            <span className="model-button-copy">
              <small>{providerLabels[settings.provider]}</small>
              <strong>{settings.model || "Select model"}</strong>
            </span>
            <ChevronDown size={15} className={open ? "model-chevron model-chevron--open" : "model-chevron"} />
          </motion.button>

          <AnimatePresence>
            {open && (
              <>
                <motion.div className="model-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
                <motion.div
                  className="model-menu"
                  initial={{ opacity: 0, y: -8, scale: .97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: .98 }}
                  transition={{ duration: .16 }}
                >
                  <div className="model-menu-top">
                    <div>
                      <strong>Choose a model</strong>
                      <span>{models.length ? `${models.length} available` : "Connected providers only"}</span>
                    </div>
                    <motion.button whileTap={{ scale: .9 }} onClick={() => void fetchModels()} disabled={loading} aria-label="Refresh models">
                      {loading ? <LoaderCircle size={16} className="spin" /> : <RefreshCw size={16} />}
                    </motion.button>
                  </div>
                  <div className="model-search">
                    <Search size={15} />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search models or providers…" autoFocus />
                  </div>
                  <div className="model-list">
                    {loading && !models.length ? (
                      <div className="model-loading"><LoaderCircle size={18} className="spin" /> Fetching available models…</div>
                    ) : filtered.length ? (
                      (Object.keys(providerLabels) as Provider[]).map((provider) => {
                        const group = filtered.filter((item) => item.provider === provider);
                        if (!group.length) return null;
                        return (
                          <div className="model-group" key={provider}>
                            <div className="model-group-title"><span className={`provider-pill provider-pill--${provider}`}>{providerIcons[provider]}</span><span>{providerLabels[provider]}</span><em>{group.length}</em></div>
                            {group.map((item) => {
                              const active = item.provider === settings.provider && item.model === settings.model;
                              return (
                                <motion.button key={item.provider + item.model} className={active ? "model-option model-option--active" : "model-option"} whileTap={{ scale: .985 }} onClick={() => { onChange({ provider: item.provider, model: item.model }); setOpen(false); }}>
                                  <span><strong>{item.model}</strong><small>{providerLabels[item.provider]}</small></span>
                                  {active && <Check size={15} />}
                                </motion.button>
                              );
                            })}
                          </div>
                        );
                      })
                    ) : <div className="model-empty"><Sparkles size={18} /><span>No models found. Add provider API keys in Settings.</span></div>}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="status"><span className="status-dot" /> Backend ready</div>
    </header>
  );
}
