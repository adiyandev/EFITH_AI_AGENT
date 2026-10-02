import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  getSettings: () => ipcRenderer.invoke("efith:settings:get"),
  saveSettings: (settings: unknown) => ipcRenderer.invoke("efith:settings:save", settings),
});
