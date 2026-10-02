import { useEffect, useState } from "react";
import { X } from "lucide-react";

export type Provider = "openai" | "gemini" | "anthropic";
export type EfithSettings = { apiUrl: string; provider: Provider; model: string };

type SettingsModalProps = { open: boolean; onClose: () => void; settings: EfithSettings; onSave: (settings: EfithSettings) => void };

const models: Record<Provider, string[]> = {
  openai: ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4.1"],
  gemini: ["gemini-3.8-flash", "gemini-3-pro-preview"],
  anthropic: ["claude-sonnet-5-5", "claude-opus-5-5", "claude-haiku-4-5-20251001"],
};

export function SettingsModal({ open, onClose, settings, onSave }: SettingsModalProps) {
  const [draft, setDraft] = useState(settings);
  useEffect(() => { if (open) setDraft(settings); }, [open, settings]);
  if (!open) return null;

  const changeProvider = (provider: Provider) =>
    setDraft({ ...draft, provider, model: models[provider][0] });

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="settings-header">
          <div><span className="settings-eyebrow">EFITH</span><h2 id="settings-title">Settings</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close settings"><X size={19} /></button>
        </div>
        <div className="settings-section">
          <label><span>AI provider</span>
            <select value={draft.provider} onChange={(e) => changeProvider(e.target.value as Provider)}>
              <option value="openai">OpenAI</option><option value="gemini">Google Gemini</option><option value="anthropic">Anthropic Claude</option>
            </select>
          </label>
          <label><span>Model</span>
            <select value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })}>
              {models[draft.provider].map((model) => <option key={model} value={model}>{model}</option>)}
            </select>
          </label>
          <label><span>Backend URL</span>
            <input value={draft.apiUrl} onChange={(e) => setDraft({ ...draft, apiUrl: e.target.value })} placeholder="http://localhost:8787" />
          </label>
          <p className="settings-help">API keys stay on the EFITH backend and are never stored in this browser.</p>
        </div>
        <div className="settings-footer">
          <button className="settings-cancel" onClick={onClose}>Cancel</button>
          <button className="settings-save" onClick={() => { onSave({...draft, apiUrl: draft.apiUrl.trim().replace(/\/$/, "")}); onClose(); }}>Save settings</button>
        </div>
      </section>
    </div>
  );
}
