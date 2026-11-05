const { contextBridge, ipcRenderer } = require('electron');

// Expose safe, minimal API to renderer (contextIsolation: true, nodeIntegration: false)
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getState: () => ipcRenderer.invoke('get-state'),
  onProfilesUpdated: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('profiles-updated', subscription);
    return () => ipcRenderer.removeListener('profiles-updated', subscription);
  },
  launchProfile: (browserId, folderName, displayName) =>
    ipcRenderer.invoke('launch-profile', { browserId, folderName, displayName }),
  updateProfileSettings: (browserId, folderName, customization) =>
    ipcRenderer.invoke('update-profile-settings', { browserId, folderName, customization }),
  updateGeneralSettings: (settings) =>
    ipcRenderer.invoke('update-general-settings', settings),
  createShortcut: (browserId, folderName, displayName) =>
    ipcRenderer.invoke('create-shortcut', { browserId, folderName, displayName }),
  toggleStartup: (enable) =>
    ipcRenderer.invoke('toggle-startup', enable),
  hideWindow: () => ipcRenderer.invoke('hide-window'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  createSandboxProfile: (browserId, profileName, email) =>
    ipcRenderer.invoke('create-sandbox-profile', { browserId, profileName, email }),
  deleteSandboxProfile: (browserId, folderName) =>
    ipcRenderer.invoke('delete-sandbox-profile', { browserId, folderName }),
});
