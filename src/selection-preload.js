const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('selection', { finish: region => ipcRenderer.send('region-selected', region) });