import { useEffect, useState } from "react";
import { X } from "lucide-react";

export type EfithSettings = {
  apiUrl: string;
  model: string;
};

type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
  settings: EfithSettings;
  onSave: (settings: EfithSettings) => void;
};

export function SettingsModal({
  open,
  onClose,
  settings,
  onSave,
}: SettingsModalProps) {
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    if (open) setDraft(settings);
  }, [open, settings]);

  if (!open) return null;

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
            <span>Backend URL</span>
            <input
              value={draft.apiUrl}
              onChange={(event) => setDraft({ ...draft, apiUrl: event.target.value })}
              placeholder="http://localhost:8787"
            />
          </label>

          <label>
            <span>Model</span>
            <input
              value={draft.model}
              onChange={(event) => setDraft({ ...draft, model: event.target.value })}
              placeholder="gpt-4o-mini"
            />
          </label>

          <p className="settings-help">
            Provider API keys stay on the EFITH backend. They are never stored in this browser.
          </p>
        </div>

        <div className="settings-footer">
          <button className="settings-cancel" onClick={onClose}>Cancel</button>
          <button
            className="settings-save"
            onClick={() => {
              onSave({
                apiUrl: draft.apiUrl.trim().replace(/\/$/, ""),
                model: draft.model.trim(),
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
