import { useEffect, useState } from "react";
import { ChevronDown, Menu, RefreshCw } from "lucide-react";
import type { EfithSettings, Provider } from "../settings/SettingsModal";

type ModelOption = { provider: Provider; model: string };

type TopBarProps = {
  sidebarOpen: boolean;
  onOpenSidebar: () => void;
  settings: EfithSettings;
  onChange: (changes: Partial<EfithSettings>) => void;
};

const providerLabels: Record<Provider, string> = {
  openai: "OpenAI",
  gemini: "Gemini",
  anthropic: "Claude",
  groq: "Groq",
};

export function TopBar({ sidebarOpen, onOpenSidebar, settings, onChange }: TopBarProps) {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchModels = async () => {
    setLoading(true);
    setError("");
    const discovered: ModelOption[] = [];

    try {
      for (const provider of Object.keys(providerLabels) as Provider[]) {
        const apiKey = settings.apiKeys[provider]?.trim();
        if (!apiKey) continue;

        const response = await fetch(`${settings.apiUrl || ""}/api/providers/models`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider, apiKey }),
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) {
          discovered.push(...(payload.models ?? []).map((model: string) => ({ provider, model })));
        }
      }

      setModels(discovered);
      if (!discovered.some((item) => item.provider === settings.provider && item.model === settings.model)) {
        const currentProviderModels = discovered.filter((item) => item.provider === settings.provider);
        if (currentProviderModels[0]) onChange({ model: currentProviderModels[0].model });
        else if (discovered[0]) onChange({ provider: discovered[0].provider, model: discovered[0].model });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not fetch models.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchModels();
  }, []);

  const grouped = (Object.keys(providerLabels) as Provider[])
    .map((provider) => ({
      provider,
      models: models.filter((item) => item.provider === provider),
    }))
    .filter((group) => group.models.length);

  return (
    <header className="topbar">
      <div className="topbar-left">
        {!sidebarOpen && (
          <button className="icon-button" onClick={onOpenSidebar} aria-label="Open sidebar">
            <Menu size={19} />
          </button>
        )}
        <div className="model-picker">
          <button className="model-button" aria-label="Selected AI model" onClick={() => setOpen((value) => !value)}>
            <span>{providerLabels[settings.provider]} · {settings.model || "Select model"}</span>
            <ChevronDown size={16} />
          </button>

          {open && (
            <div className="model-menu">
              <div className="model-menu-header">
                <span>Available models</span>
                <button onClick={fetchModels} disabled={loading} aria-label="Refresh models">
                  <RefreshCw size={14} className={loading ? "spin" : ""} />
                </button>
              </div>
              {error && <div className="model-menu-error">{error}</div>}
              {!loading && !grouped.length && (
                <div className="model-menu-empty">Add provider API keys in Settings to load models.</div>
              )}
              {grouped.map((group) => (
                <div className="model-provider-group" key={group.provider}>
                  <div className="model-provider-label">{providerLabels[group.provider]}</div>
                  {group.models.map((item) => (
                    <button
                      key={item.provider + ":" + item.model}
                      className={item.provider === settings.provider && item.model === settings.model ? "model-option active" : "model-option"}
                      onClick={() => {
                        onChange({ provider: item.provider, model: item.model });
                        setOpen(false);
                      }}
                    >
                      <span>{item.model}</span>
                      {item.provider === settings.provider && item.model === settings.model && <span>✓</span>}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="status">
        <span className="status-dot" />
        Backend ready
      </div>
    </header>
  );
}
