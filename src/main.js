const { app, BrowserWindow, ipcMain, desktopCapturer, globalShortcut, dialog, nativeImage } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-dev-shm-usage');
if (process.env.CODESPACES || process.env.GITHUB_CODESPACE || process.env.ELECTRON_NO_SANDBOX) {
  app.commandLine.appendSwitch('no-sandbox');
}

let mainWindow;
let regionWindow;
const licenseFile = path.join(app.getPath('userData'), 'license.json');
function readLicense() { try { return JSON.parse(fs.readFileSync(licenseFile, 'utf8')); } catch { return { installedAt: Date.now(), plan: null }; } }
function saveLicense(value) { fs.mkdirSync(path.dirname(licenseFile), { recursive: true }); fs.writeFileSync(licenseFile, JSON.stringify(value, null, 2)); }

function createWindow() {
  mainWindow = new BrowserWindow({ width: 960, height: 680, minWidth: 820, minHeight: 560, backgroundColor: '#f6f9fc', title: 'Gravador de Tela Chequetto', webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false } });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  globalShortcut.register('F9', () => mainWindow?.webContents.send('global-hotkey', 'toggle-recording'));
  globalShortcut.register('F10', () => mainWindow?.webContents.send('global-hotkey', 'toggle-pause'));
}

app.whenReady().then(() => {
  ipcMain.handle('select-region', async () => new Promise((resolve, reject) => {
    const display = require('electron').screen.getPrimaryDisplay();
    regionWindow = new BrowserWindow({ x: display.bounds.x, y: display.bounds.y, width: display.bounds.width, height: display.bounds.height, transparent: true, frame: false, alwaysOnTop: true, skipTaskbar: true, webPreferences: { preload: path.join(__dirname, 'selection-preload.js'), contextIsolation: true, nodeIntegration: false } });
    regionWindow.loadFile(path.join(__dirname, 'selection.html'));
    const finish = (_event, region) => { if (!regionWindow) return; regionWindow.close(); regionWindow = null; resolve({ ...region, displayId: String(display.id) }); };
    ipcMain.once('region-selected', finish);
    regionWindow.on('closed', () => { regionWindow = null; reject(new Error('Seleção cancelada.')); });
  }));
  ipcMain.handle('capture-sources', async () => (await desktopCapturer.getSources({ types: ['screen', 'window'], fetchWindowIcons: true, thumbnailSize: { width: 320, height: 180 } })).map(source => ({ id: source.id, name: source.name, thumbnail: source.thumbnail.toDataURL(), displayId: source.display_id })));
  ipcMain.handle('save-recording', async (_event, buffer, suggestedName) => {
    const result = await dialog.showSaveDialog({ defaultPath: path.join(app.getPath('videos'), suggestedName), filters: [{ name: 'WebM', extensions: ['webm'] }] });
    if (result.canceled || !result.filePath) return null;
    fs.writeFileSync(result.filePath, Buffer.from(buffer)); return result.filePath;
  });
  ipcMain.handle('save-screenshot', async (_event, dataUrl) => {
    const result = await dialog.showSaveDialog({ defaultPath: path.join(app.getPath('pictures'), `chequetto-${Date.now()}.png`), filters: [{ name: 'PNG', extensions: ['png'] }] });
    if (result.canceled || !result.filePath) return null;
    fs.writeFileSync(result.filePath, nativeImage.createFromDataURL(dataUrl).toPNG()); return result.filePath;
  });
  ipcMain.handle('license-read', () => { const license = readLicense(); saveLicense(license); return { ...license, expired: !license.plan && Date.now() - license.installedAt > 30 * 86400000 }; });
  ipcMain.handle('license-activate', (_event, plan) => { const license = { ...readLicense(), plan, activatedAt: Date.now() }; saveLicense(license); return license; });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });