import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  getSettings: () => ipcRenderer.invoke("efith:settings:get"),
  saveSettings: (settings: unknown) => ipcRenderer.invoke("efith:settings:save", settings),
  ollama: {
    getStatus: () => ipcRenderer.invoke("efith:ollama:status"),
    downloadInstaller: () => ipcRenderer.invoke("efith:ollama:download-installer"),
    launchInstaller: () => ipcRenderer.invoke("efith:ollama:launch-installer"),
    getModelsPath: () => ipcRenderer.invoke("efith:ollama:get-models-path"),
    chooseModelsDirectory: () => ipcRenderer.invoke("efith:ollama:choose-model-directory"),
  },
});
