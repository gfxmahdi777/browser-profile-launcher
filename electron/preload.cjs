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
  onUpdateStatus: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('update-status', subscription);
    return () => ipcRenderer.removeListener('update-status', subscription);
  },
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  quitAndInstallUpdate: () => ipcRenderer.invoke('quit-and-install-update'),
  launchProfile: (browserId, folderName, displayName, targetUrl) =>
    ipcRenderer.invoke('launch-profile', { browserId, folderName, displayName, targetUrl }),
  updateProfileSettings: (browserId, folderName, customization) =>
    ipcRenderer.invoke('update-profile-settings', { browserId, folderName, customization }),
  updateGeneralSettings: (settings) =>
    ipcRenderer.invoke('update-general-settings', settings),
  renameGroup: (oldName, newName, newIcon) =>
    ipcRenderer.invoke('rename-group', { oldName, newName, newIcon }),
  deleteGroup: (groupName) =>
    ipcRenderer.invoke('delete-group', { groupName }),
  createShortcut: (browserId, folderName, displayName, targetUrl) =>
    ipcRenderer.invoke('create-shortcut', { browserId, folderName, displayName, targetUrl }),
  toggleStartup: (enable) =>
    ipcRenderer.invoke('toggle-startup', enable),
  hideWindow: () => ipcRenderer.invoke('hide-window'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  createSandboxProfile: (browserId, profileName, email) =>
    ipcRenderer.invoke('create-sandbox-profile', { browserId, profileName, email }),
  deleteSandboxProfile: (browserId, folderName) =>
    ipcRenderer.invoke('delete-sandbox-profile', { browserId, folderName }),
});
