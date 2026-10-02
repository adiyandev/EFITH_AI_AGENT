import { app, BrowserWindow, ipcMain, safeStorage, shell } from "electron";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const APP_ID = "com.efith.ai";
const PORT = 8787;
const OLLAMA_API_URL = "http://127.0.0.1:11434";
const OLLAMA_WINDOWS_INSTALLER_URL = "https://ollama.com/download/OllamaSetup.exe";
const execFile = promisify(execFileCallback);
const APP_BASE = "/EFITH_AI_AGENT/";
const DEFAULT_SETTINGS = {
  apiUrl: "",
  provider: "gemini",
  model: "gemini-3.8-flash",
  apiKeys: { openai: "", gemini: "", anthropic: "", groq: "", ollama: "" },
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

function ollamaExecutableCandidates() {
  if (process.platform !== "win32") return [];
  const localAppData = process.env.LOCALAPPDATA;
  const programFiles = process.env.ProgramFiles;
  return [
    localAppData ? path.join(localAppData, "Programs", "Ollama", "ollama.exe") : null,
    programFiles ? path.join(programFiles, "Ollama", "ollama.exe") : null,
    localAppData ? path.join(localAppData, "Ollama", "ollama.exe") : null,
  ].filter((candidate): candidate is string => Boolean(candidate));
}

async function findOllamaExecutable() {
  if (process.platform !== "win32") return null;

  for (const candidate of ollamaExecutableCandidates()) {
    try {
      await fs.promises.access(candidate, fs.constants.F_OK);
      return candidate;
    } catch {}
  }

  try {
    const { stdout } = await execFile("where.exe", ["ollama"], { windowsHide: true });
    const candidate = stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
    return candidate || null;
  } catch {
    return null;
  }
}

async function getOllamaStatus() {
  if (process.platform !== "win32") {
    return { platform: process.platform, supported: false, installed: false, running: false, executablePath: null, version: null };
  }

  const executablePath = await findOllamaExecutable();
  let version: string | null = null;
  if (executablePath) {
    try {
      const result = await execFile(executablePath, ["--version"], { windowsHide: true, timeout: 5000 });
      version = result.stdout.trim() || result.stderr.trim() || null;
    } catch {}
  }

  let running = false;
  try {
    const response = await fetch(`${OLLAMA_API_URL}/api/tags`, { signal: AbortSignal.timeout(1500) });
    running = response.ok;
  } catch {}

  return {
    platform: process.platform,
    supported: true,
    installed: Boolean(executablePath) || running,
    running,
    executablePath,
    version,
  };
}

async function downloadOllamaInstaller() {
  if (process.platform !== "win32") {
    throw new Error("The Ollama Windows installer is only available on Windows.");
  }

  const installerPath = path.join(app.getPath("temp"), "EFITH-OllamaSetup.exe");
  const response = await fetch(OLLAMA_WINDOWS_INSTALLER_URL, { redirect: "follow" });
  if (!response.ok || !response.body) {
    throw new Error(`Could not download Ollama installer (HTTP ${response.status}).`);
  }

  const file = fs.createWriteStream(installerPath);
  await pipeline(Readable.fromWeb(response.body as any), file);
  return { path: installerPath, url: OLLAMA_WINDOWS_INSTALLER_URL };
}

async function launchOllamaInstaller() {
  if (process.platform !== "win32") {
    throw new Error("The Ollama installer can only be launched on Windows.");
  }

  const installerPath = path.join(app.getPath("temp"), "EFITH-OllamaSetup.exe");
  try {
    await fs.promises.access(installerPath, fs.constants.F_OK);
  } catch {
    throw new Error("Download the Ollama installer first.");
  }

  const errorMessage = await shell.openPath(installerPath);
  if (errorMessage) throw new Error(errorMessage);
  return { launched: true, path: installerPath };
}

ipcMain.handle("efith:ollama:status", () => getOllamaStatus());
ipcMain.handle("efith:ollama:download-installer", () => downloadOllamaInstaller());
ipcMain.handle("efith:ollama:launch-installer", () => launchOllamaInstaller());

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
