import { app, BrowserWindow, ipcMain, safeStorage } from "electron";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const APP_ID = "com.efith.ai";
const PORT = 8787;
const APP_BASE = "/EFITH_AI_AGENT/";
const DEFAULT_SETTINGS = {
  apiUrl: "",
  provider: "gemini",
  model: "gemini-3.8-flash",
  apiKeys: { openai: "", gemini: "", anthropic: "", groq: "" },
  tavilyApiKey: "",
};

app.setAppUserModelId(APP_ID);

let mainWindow: BrowserWindow | null = null;

function settingsDirectory() {
  return path.join(app.getPath("userData"), "efith");
}

function settingsFile() {
  return path.join(settingsDirectory(), "settings.json");
}

function readStoredSettings() {
  try {
    const raw = fs.readFileSync(settingsFile(), "utf8");
    const parsed = JSON.parse(raw);
    const apiKeys = { ...DEFAULT_SETTINGS.apiKeys };
    for (const provider of Object.keys(apiKeys) as Array<keyof typeof apiKeys>) {
      const encrypted = parsed?.apiKeys?.[provider];
      if (!encrypted) continue;
      try {
        apiKeys[provider] = safeStorage.decryptString(Buffer.from(encrypted, "base64"));
      } catch {
        apiKeys[provider] = "";
      }
    }
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      apiKeys,
      tavilyApiKey: typeof parsed?.tavilyApiKey === "string"
        ? parsed.tavilyApiKey
        : "",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeStoredSettings(settings: typeof DEFAULT_SETTINGS) {
  fs.mkdirSync(settingsDirectory(), { recursive: true });
  const apiKeys: Record<string, string> = {};
  for (const [provider, value] of Object.entries(settings.apiKeys ?? {})) {
    if (!value) {
      apiKeys[provider] = "";
      continue;
    }
    apiKeys[provider] = safeStorage.encryptString(String(value)).toString("base64");
  }

  const payload = {
    ...settings,
    apiKeys,
  };

  fs.writeFileSync(settingsFile(), JSON.stringify(payload, null, 2), { mode: 0o600 });
}

ipcMain.handle("efith:settings:get", () => readStoredSettings());
ipcMain.handle("efith:settings:save", (_event, settings) => {
  writeStoredSettings(settings);
  return readStoredSettings();
});

async function startBackend() {
  process.env.HOST = "127.0.0.1";
  process.env.PORT = String(PORT);
  process.env.EFITH_WEB_ROOT = path.join(app.getAppPath(), "dist");

  const entry = path.join(app.getAppPath(), "dist-server", "index.js");
  await import(pathToFileURL(entry).href);

  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  throw new Error("EFITH backend did not start.");
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1000,
    minHeight: 680,
    backgroundColor: "#0b0b0d",
    icon: path.join(app.getAppPath(), "EFITH logo.png"),
    webPreferences: {
      preload: path.join(app.getAppPath(), "dist-electron", "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  await mainWindow.loadURL(`http://127.0.0.1:${PORT}${APP_BASE}`);
}

app.whenReady().then(async () => {
  try {
    await startBackend();
    await createWindow();
  } catch (error) {
    console.error("EFITH startup failed:", error);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", async () => {
  if (!mainWindow) await createWindow();
});
