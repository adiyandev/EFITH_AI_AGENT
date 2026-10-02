import { ChevronDown, Menu } from "lucide-react";

type TopBarProps = {
  sidebarOpen: boolean;
  onOpenSidebar: () => void;
  model: string;
};

export function TopBar({ sidebarOpen, onOpenSidebar, model }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        {!sidebarOpen && (
          <button className="icon-button" onClick={onOpenSidebar} aria-label="Open sidebar">
            <Menu size={19} />
          </button>
        )}
        <button className="model-button" aria-label="Selected AI model">
          <span>{model || "EFITH"}</span>
          <ChevronDown size={16} />
        </button>
      </div>

      <div className="status">
        <span className="status-dot" />
        Backend ready
      </div>
    </header>
  );
}
