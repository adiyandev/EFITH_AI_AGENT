import { useEffect, useRef } from "react";
import { Plus, Send, SlidersHorizontal, Sparkles } from "lucide-react";

type ComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
};

export function Composer({ value, onChange, onSend }: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }, [value]);

  return (
    <div className="composer-wrap">
      <div className="composer">
        <button className="composer-icon" aria-label="Add attachment">
          <Plus size={19} />
        </button>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (value.trim()) onSend();
            }
          }}
          placeholder="Message EFITH..."
          rows={1}
          aria-label="Message EFITH"
        />

        <button className="composer-icon" aria-label="Tools">
          <SlidersHorizontal size={18} />
        </button>

        <button
          className="send-button"
          disabled={!value.trim()}
          onClick={onSend}
          aria-label="Send message"
        >
          <Send size={17} />
        </button>
      </div>

      <div className="composer-meta">
        <span><Sparkles size={12} /> EFITH</span>
        <span>Tools enabled</span>
        <span>Web ready</span>
      </div>
      <p className="composer-note">EFITH can make mistakes. Check important information.</p>
    </div>
  );
}
