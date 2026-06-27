import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('taskbarNova', {
  loadSave: () => ipcRenderer.invoke('save:load'),
  writeSave: (data: unknown) => ipcRenderer.invoke('save:write', data),
  setAlwaysOnTop: (enabled: boolean) => ipcRenderer.invoke('window:set-top', enabled),
  setOpacity: (opacity: number) => ipcRenderer.invoke('window:set-opacity', opacity),
  collapse: (collapsed: boolean) => ipcRenderer.invoke('window:collapse', collapsed),
  toggleClickThrough: () => ipcRenderer.invoke('window:toggle-click-through'),
  onClickThroughChanged: (listener: (enabled: boolean) => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, enabled: boolean) => listener(enabled);
    ipcRenderer.on('window:click-through-changed', wrapped);
    return () => ipcRenderer.removeListener('window:click-through-changed', wrapped);
  },
  minimize: () => ipcRenderer.invoke('window:minimize'),
  close: () => ipcRenderer.invoke('window:close')
});
