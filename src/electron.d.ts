import type { EfithSettings } from "./components/settings/SettingsModal";

declare global {
  interface Window {
    electronAPI?: {
      getSettings: () => Promise<EfithSettings>;
      saveSettings: (settings: EfithSettings) => Promise<EfithSettings>;
      ollama: {
        getStatus: () => Promise<{ platform: string; supported: boolean; installed: boolean; running: boolean; executablePath: string | null; version: string | null; modelsPath: string | null }>;
        downloadInstaller: () => Promise<{ path: string; url: string }>;
        launchInstaller: () => Promise<{ launched: boolean; path: string }>;
        getModelsPath: () => Promise<{ path: string | null }>;
        chooseModelsDirectory: () => Promise<{ canceled: boolean; path: string | null; restartRequired: boolean }>;
      };
    };
  }
}

export {};
