const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('chequetto', {
  getSources: () => ipcRenderer.invoke('capture-sources'),
  selectRegion: () => ipcRenderer.invoke('select-region'),
  saveRecording: (buffer, name) => ipcRenderer.invoke('save-recording', buffer, name),
  saveScreenshot: dataUrl => ipcRenderer.invoke('save-screenshot', dataUrl),
  getLicense: () => ipcRenderer.invoke('license-read'),
  activatePlan: plan => ipcRenderer.invoke('license-activate', plan),
  onHotkey: callback => ipcRenderer.on('global-hotkey', (_event, command) => callback(command))
});