import { app, BrowserWindow, globalShortcut, ipcMain, screen } from 'electron';
import type { Rectangle } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';

let mainWindow: BrowserWindow | null = null;
let clickThroughEnabled = false;
const expandedHeight = 460;
let expandedBounds: Rectangle | null = null;

function positionAtBottom(win: BrowserWindow, width: number, height: number) {
  const area = screen.getPrimaryDisplay().workArea;
  win.setBounds({
    x: area.x + Math.round((area.width - width) / 2),
    y: area.y + area.height - height - 8,
    width,
    height
  });
}

function createWindow() {
  const area = screen.getPrimaryDisplay().workArea;
  const width = Math.max(980, Math.round(area.width * 0.9));
  mainWindow = new BrowserWindow({
    width,
    height: expandedHeight,
    x: area.x + Math.round((area.width - width) / 2),
    y: area.y + area.height - expandedHeight - 8,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    resizable: true,
    minWidth: 900,
    minHeight: 260,
    icon: path.join(__dirname, '../build/icon.ico'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) mainWindow.loadURL(devUrl);
  else mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));

  mainWindow.once('ready-to-show', () => mainWindow?.show());
}

function setClickThrough(enabled: boolean) {
  clickThroughEnabled = enabled;
  mainWindow?.setIgnoreMouseEvents(enabled, { forward: true });
  mainWindow?.webContents.send('window:click-through-changed', enabled);
}

app.whenReady().then(() => {
  createWindow();
  globalShortcut.register('CommandOrControl+Alt+P', () => setClickThrough(!clickThroughEnabled));
  globalShortcut.register('F8', () => setClickThrough(!clickThroughEnabled));
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => globalShortcut.unregisterAll());

const savePath = () => path.join(app.getPath('userData'), 'save-data.json');

ipcMain.handle('save:load', async () => {
  try { return JSON.parse(await fs.readFile(savePath(), 'utf8')); }
  catch { return null; }
});

ipcMain.handle('save:write', async (_event, data: unknown) => {
  await fs.mkdir(path.dirname(savePath()), { recursive: true });
  await fs.writeFile(savePath(), JSON.stringify(data, null, 2), 'utf8');
  return true;
});

ipcMain.handle('window:set-top', (_event, enabled: boolean) => {
  mainWindow?.setAlwaysOnTop(enabled);
});

ipcMain.handle('window:set-opacity', (_event, opacity: number) => {
  mainWindow?.setOpacity(Math.max(0.1, Math.min(1, opacity)));
});

ipcMain.handle('window:toggle-click-through', () => {
  setClickThrough(!clickThroughEnabled);
  return clickThroughEnabled;
});

ipcMain.handle('window:collapse', (_event, collapsed: boolean) => {
  if (!mainWindow) return;
  const current = mainWindow.getBounds();
  const area = screen.getDisplayMatching(current).workArea;
  if (collapsed) {
    expandedBounds = current;
    const width = 320;
    const height = 86;
    mainWindow.setMinimumSize(width, height);
    mainWindow.setBounds({
      x: Math.max(area.x, Math.min(area.x + area.width - width, Math.round(current.x + current.width / 2 - width / 2))),
      y: Math.max(area.y, Math.min(area.y + area.height - height, current.y + current.height - height)),
      width,
      height
    });
    return;
  }
  const target = expandedBounds ?? {
    x: area.x + Math.round((area.width - Math.max(980, Math.round(area.width * 0.9))) / 2),
    y: area.y + area.height - expandedHeight - 8,
    width: Math.max(980, Math.round(area.width * 0.9)),
    height: expandedHeight
  };
  mainWindow.setMinimumSize(900, 260);
  mainWindow.setBounds({
    x: Math.max(area.x, Math.min(area.x + area.width - target.width, Math.round(current.x + current.width / 2 - target.width / 2))),
    y: Math.max(area.y, Math.min(area.y + area.height - target.height, current.y + current.height - target.height)),
    width: target.width,
    height: target.height
  });
});

ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:close', () => mainWindow?.close());
