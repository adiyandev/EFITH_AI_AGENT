import type { EfithSettings } from "./components/settings/SettingsModal";

declare global {
  interface Window {
    electronAPI?: {
      getSettings: () => Promise<EfithSettings>;
      saveSettings: (settings: EfithSettings) => Promise<EfithSettings>;
    };
  }
}

export {};
