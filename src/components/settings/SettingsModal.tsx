import { useEffect, useState } from "react";
import { Check, LoaderCircle, X } from "lucide-react";

export type Provider = "openai" | "gemini" | "anthropic" | "groq";
export type EfithSettings = {
  apiUrl: string;
  provider: Provider;
  model: string;
  apiKeys: Record<Provider, string>;
};

type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
  settings: EfithSettings;
  onSave: (settings: EfithSettings) => void;
};

const models: Record<Provider, string[]> = {
  openai: ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4.1"],
  gemini: ["gemini-3.8-flash", "gemini-3-pro-preview"],
  anthropic: ["claude-sonnet-5-5", "claude-opus-5-5", "claude-haiku-4-5-20251001"],
  groq: ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
};

const labels: Record<Provider, string> = {
  openai: "OpenAI",
  gemini: "Google Gemini",
  anthropic: "Anthropic Claude",
  groq: "Groq",
};

export function SettingsModal({ open, onClose, settings, onSave }: SettingsModalProps) {
  const [draft, setDraft] = useState(settings);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [testMessage, setTestMessage] = useState("");

  useEffect(() => {
    if (open) {
      setDraft(settings);
      setTestResult(null);
      setTestMessage("");
    }
  }, [open, settings]);

  if (!open) return null;

  const changeProvider = (provider: Provider) => {
    setDraft({ ...draft, provider, model: models[provider][0] });
    setTestResult(null);
    setTestMessage("");
  };

  const apiKey = draft.apiKeys[draft.provider] ?? "";

  const testConnection = async () => {
    if (!apiKey.trim()) {
      setTestResult("error");
      setTestMessage("Enter an API key first.");
      return;
    }

    setTesting(true);
    setTestResult(null);
    setTestMessage("");

    try {
      const response = await fetch(`${draft.apiUrl || ""}/api/providers/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: draft.provider,
          apiKey: apiKey.trim(),
          model: draft.model,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Connection test failed.");

      setTestResult("success");
      setTestMessage(`${labels[draft.provider]} is connected.`);
    } catch (error) {
      setTestResult("error");
      setTestMessage(error instanceof Error ? error.message : "Connection test failed.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="settings-header">
          <div>
            <span className="settings-eyebrow">EFITH</span>
            <h2 id="settings-title">Settings</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close settings">
            <X size={19} />
          </button>
        </div>

        <div className="settings-section">
          <label>
            <span>AI provider</span>
            <select value={draft.provider} onChange={(e) => changeProvider(e.target.value as Provider)}>
              <option value="openai">OpenAI</option>
              <option value="gemini">Google Gemini</option>
              <option value="anthropic">Anthropic Claude</option>
              <option value="groq">Groq</option>
            </select>
          </label>

          <label>
            <span>Model</span>
            <select
              value={draft.model}
              onChange={(e) => {
                setDraft({ ...draft, model: e.target.value });
                setTestResult(null);
              }}
            >
              {models[draft.provider].map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </label>

          <label>
            <span>{labels[draft.provider]} API key</span>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setDraft({
                  ...draft,
                  apiKeys: { ...draft.apiKeys, [draft.provider]: e.target.value },
                });
                setTestResult(null);
              }}
              placeholder="Paste your API key"
              autoComplete="off"
              spellCheck={false}
            />
          </label>

          <button className="test-connection" onClick={testConnection} disabled={testing}>
            {testing ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />}
            {testing ? "Testing..." : "Test connection"}
          </button>

          {testMessage && (
            <p className={`settings-test settings-test--${testResult}`}>{testMessage}</p>
          )}

          <label>
            <span>Backend URL</span>
            <input
              value={draft.apiUrl}
              onChange={(e) => setDraft({ ...draft, apiUrl: e.target.value })}
              placeholder="http://localhost:8787"
            />
          </label>

          <p className="settings-help">
            Local mode: your key is saved in this browser and sent only to your local EFITH backend.
            It is not uploaded to GitHub or stored by the EFITH server.
          </p>
        </div>

        <div className="settings-footer">
          <button className="settings-cancel" onClick={onClose}>Cancel</button>
          <button
            className="settings-save"
            onClick={() => {
              onSave({
                ...draft,
                apiUrl: draft.apiUrl.trim().replace(/\/$/, ""),
                apiKeys: {
                  openai: draft.apiKeys.openai.trim(),
                  gemini: draft.apiKeys.gemini.trim(),
                  anthropic: draft.apiKeys.anthropic.trim(),
                  groq: draft.apiKeys.groq.trim(),
                },
              });
              onClose();
            }}
          >
            Save settings
          </button>
        </div>
      </section>
    </div>
  );
}
