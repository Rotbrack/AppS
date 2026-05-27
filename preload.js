const { contextBridge, ipcRenderer } = require('electron');

// Sichere IPC-Schnittstellen exponieren
contextBridge.exposeInMainWorld('electron', {
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
});
