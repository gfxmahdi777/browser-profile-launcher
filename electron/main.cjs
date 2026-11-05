var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron/main.ts
var import_electron = require("electron");
var import_node_path6 = __toESM(require("node:path"), 1);
var import_node_fs5 = __toESM(require("node:fs"), 1);

// src/detect/detect.ts
var import_node_fs2 = __toESM(require("node:fs"), 1);
var import_node_path2 = __toESM(require("node:path"), 1);

// src/shared/constants.ts
var SUPPORTED_BROWSERS = [
  {
    id: "chrome",
    name: "Google Chrome",
    processExe: "chrome.exe",
    localStateSubpath: "Google/Chrome/User Data/Local State",
    userDataSubpath: "Google/Chrome/User Data",
    registryAppPathKey: "chrome.exe",
    brandColor: "#4285F4",
    standardExePaths: [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "%LOCALAPPDATA%\\Google\\Chrome\\Application\\chrome.exe"
    ]
  },
  {
    id: "brave",
    name: "Brave Browser",
    processExe: "brave.exe",
    localStateSubpath: "BraveSoftware/Brave-Browser/User Data/Local State",
    userDataSubpath: "BraveSoftware/Brave-Browser/User Data",
    registryAppPathKey: "brave.exe",
    brandColor: "#FB542B",
    standardExePaths: [
      "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
      "C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
      "%LOCALAPPDATA%\\BraveSoftware\\Brave-Browser\\Application\\brave.exe"
    ]
  },
  {
    id: "edge",
    name: "Microsoft Edge",
    processExe: "msedge.exe",
    localStateSubpath: "Microsoft/Edge/User Data/Local State",
    userDataSubpath: "Microsoft/Edge/User Data",
    registryAppPathKey: "msedge.exe",
    brandColor: "#0078D7",
    standardExePaths: [
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      "%LOCALAPPDATA%\\Microsoft\\Edge\\Application\\msedge.exe"
    ]
  },
  {
    id: "vivaldi",
    name: "Vivaldi",
    processExe: "vivaldi.exe",
    localStateSubpath: "Vivaldi/User Data/Local State",
    userDataSubpath: "Vivaldi/User Data",
    registryAppPathKey: "vivaldi.exe",
    brandColor: "#EF3939",
    standardExePaths: [
      "%LOCALAPPDATA%\\Vivaldi\\Application\\vivaldi.exe",
      "C:\\Program Files\\Vivaldi\\Application\\vivaldi.exe",
      "C:\\Program Files (x86)\\Vivaldi\\Application\\vivaldi.exe"
    ]
  }
];
var DEFAULT_SETTINGS = {
  startWithWindows: false,
  theme: "dark",
  language: "en",
  customGroups: ["Facebook", "Work", "Personal"],
  profiles: {}
};
function getProfileKey(browserId, folderName) {
  return `${browserId}:${folderName}`;
}

// src/detect/parser.ts
function getInitials(name) {
  if (!name || !name.trim()) return "?";
  const clean = name.trim();
  const words = clean.split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, Math.min(2, clean.length)).toUpperCase();
}
function parseLocalState(rawContent, browserDef, avatarResolver) {
  if (!rawContent || !rawContent.trim()) {
    return { profiles: [], error: "Local State file is empty" };
  }
  let parsed;
  try {
    parsed = JSON.parse(rawContent);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      profiles: [],
      error: `Malformed JSON in Local State file: ${message}`
    };
  }
  if (!parsed || typeof parsed !== "object") {
    return {
      profiles: [],
      error: "Invalid Local State JSON structure (expected an object)"
    };
  }
  const infoCache = parsed.profile?.info_cache;
  if (!infoCache || typeof infoCache !== "object") {
    return { profiles: [] };
  }
  const profiles = [];
  const folderNames = Object.keys(infoCache);
  for (const folderName of folderNames) {
    const rawProfile = infoCache[folderName];
    if (!rawProfile || typeof rawProfile !== "object") {
      continue;
    }
    const rawName = typeof rawProfile.name === "string" && rawProfile.name.trim() || typeof rawProfile.gaia_name === "string" && rawProfile.gaia_name.trim() || typeof rawProfile.user_name === "string" && rawProfile.user_name.trim() || (folderName === "Default" ? "Default" : folderName);
    const displayName = rawName.trim();
    const initials = getInitials(displayName);
    const avatarPath = avatarResolver ? avatarResolver(folderName) : null;
    const avatarIcon = typeof rawProfile.avatar_icon === "string" ? rawProfile.avatar_icon : null;
    const gaiaId = typeof rawProfile.gaia_id === "string" ? rawProfile.gaia_id : null;
    profiles.push({
      browserId: browserDef.id,
      browserName: browserDef.name,
      folderName,
      displayName,
      initials,
      avatarPath,
      avatarIcon,
      gaiaId,
      isDefault: folderName.toLowerCase() === "default",
      launchArgument: `--profile-directory="${folderName}"`
    });
  }
  profiles.sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return a.displayName.localeCompare(b.displayName);
  });
  return { profiles };
}

// src/detect/paths.ts
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path = __toESM(require("node:path"), 1);
var import_node_os = __toESM(require("node:os"), 1);
var import_node_child_process = require("node:child_process");
function getLocalAppDataDir(overridePath) {
  if (overridePath) {
    return overridePath;
  }
  if (process.env.LOCALAPPDATA) {
    return process.env.LOCALAPPDATA;
  }
  const homeDir = import_node_os.default.homedir();
  if (process.platform === "win32") {
    return import_node_path.default.join(homeDir, "AppData", "Local");
  }
  return import_node_path.default.join(homeDir, ".local", "share");
}
function expandWindowsPath(rawPath, localAppData) {
  const lad = localAppData || getLocalAppDataDir();
  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
  return rawPath.replace(/%LOCALAPPDATA%/gi, lad).replace(/%PROGRAMFILES\(X86\)%/gi, programFilesX86).replace(/%PROGRAMFILES%/gi, programFiles);
}
function findExecutableInRegistry(exeKey) {
  if (process.platform !== "win32") {
    return null;
  }
  const hives = [
    "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths",
    "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths"
  ];
  for (const hive of hives) {
    try {
      const regCommand = `reg query "${hive}\\${exeKey}" /ve`;
      const output = (0, import_node_child_process.execSync)(regCommand, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
      const lines = output.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.includes("REG_SZ")) {
          const parts = trimmed.split("REG_SZ");
          if (parts.length >= 2) {
            const foundPath = parts[1].trim().replace(/^"|"$/g, "");
            if (import_node_fs.default.existsSync(foundPath)) {
              return foundPath;
            }
          }
        }
      }
    } catch {
    }
  }
  return null;
}
function findBrowserExecutable(browserDef, options) {
  const regPath = findExecutableInRegistry(browserDef.registryAppPathKey);
  if (regPath) {
    return regPath;
  }
  for (const rawPath of browserDef.standardExePaths) {
    const resolvedPath = expandWindowsPath(rawPath, options?.localAppDataDir);
    try {
      if (import_node_fs.default.existsSync(resolvedPath)) {
        return resolvedPath;
      }
    } catch {
    }
  }
  return null;
}
function findProfilePicture(profileDirPath) {
  const candidateNames = [
    "Google Profile Picture.png",
    "Edge Profile Picture.png",
    "Profile Picture.png",
    "Google Profile Picture.jpg",
    "Profile Picture.jpg"
  ];
  for (const name of candidateNames) {
    const fullPath = import_node_path.default.join(profileDirPath, name);
    try {
      if (import_node_fs.default.existsSync(fullPath)) {
        return fullPath;
      }
    } catch {
    }
  }
  return null;
}

// src/detect/detect.ts
function detectBrowser(browserDef, options) {
  const lad = getLocalAppDataDir(options?.localAppDataDir);
  const localStatePath = options?.customLocalStatePaths?.[browserDef.id] || import_node_path2.default.join(lad, ...browserDef.localStateSubpath.split("/"));
  const userDataDir = import_node_path2.default.dirname(localStatePath);
  let fileExists = false;
  try {
    fileExists = import_node_fs2.default.existsSync(localStatePath);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      id: browserDef.id,
      name: browserDef.name,
      isInstalled: false,
      executablePath: null,
      localStatePath: null,
      userDataDir: null,
      profiles: [],
      error: `Filesystem check failed: ${errorMsg}`
    };
  }
  if (!fileExists) {
    return {
      id: browserDef.id,
      name: browserDef.name,
      isInstalled: false,
      executablePath: null,
      localStatePath: null,
      userDataDir: null,
      profiles: []
    };
  }
  let rawContent;
  try {
    rawContent = import_node_fs2.default.readFileSync(localStatePath, "utf8");
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      id: browserDef.id,
      name: browserDef.name,
      isInstalled: true,
      executablePath: null,
      localStatePath,
      userDataDir,
      profiles: [],
      error: `Could not read Local State file (locked or access denied): ${errorMsg}`
    };
  }
  const { profiles, error: parseError } = parseLocalState(
    rawContent,
    browserDef,
    (folderName) => findProfilePicture(import_node_path2.default.join(userDataDir, folderName))
  );
  let executablePath = null;
  if (options?.checkExecutables !== false) {
    executablePath = findBrowserExecutable(browserDef, {
      localAppDataDir: lad
    });
  }
  return {
    id: browserDef.id,
    name: browserDef.name,
    isInstalled: true,
    executablePath,
    localStatePath,
    userDataDir,
    profiles,
    error: parseError || null
  };
}
function detectAllBrowsers(options, browserDefs = SUPPORTED_BROWSERS) {
  const browsers = browserDefs.map((def) => detectBrowser(def, options));
  const totalProfilesCount = browsers.reduce(
    (sum, b) => sum + b.profiles.length,
    0
  );
  const installedBrowsersCount = browsers.filter((b) => b.isInstalled).length;
  return {
    platform: process.platform,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    browsers,
    totalProfilesCount,
    installedBrowsersCount
  };
}

// src/main/watcher.ts
var import_node_fs3 = __toESM(require("node:fs"), 1);
var import_node_path3 = __toESM(require("node:path"), 1);
var LocalStateWatcher = class {
  constructor(options, onUpdate, debounceMs = 500) {
    this.watchers = /* @__PURE__ */ new Map();
    this.debounceTimers = /* @__PURE__ */ new Map();
    this.eventHistory = [];
    this.detectOptions = options;
    this.onUpdate = onUpdate;
    this.debounceMs = debounceMs;
  }
  /**
   * Starts watching all existing Local State files (and their parent User Data folders
   * so atomic temp-file renames by Chromium also trigger re-detection).
   */
  start(browserDefs = SUPPORTED_BROWSERS) {
    this.stop();
    const lad = getLocalAppDataDir(this.detectOptions.localAppDataDir);
    const watchedPaths = [];
    for (const browserDef of browserDefs) {
      const localStatePath = this.detectOptions.customLocalStatePaths?.[browserDef.id] || import_node_path3.default.join(lad, ...browserDef.localStateSubpath.split("/"));
      const userDataDir = import_node_path3.default.dirname(localStatePath);
      try {
        if (import_node_fs3.default.existsSync(localStatePath)) {
          const fileWatcher = import_node_fs3.default.watch(
            localStatePath,
            { persistent: false },
            (eventType) => {
              this.scheduleRefresh(browserDef, localStatePath, eventType);
            }
          );
          fileWatcher.on("error", () => {
          });
          this.watchers.set(`file:${browserDef.id}`, fileWatcher);
          watchedPaths.push(localStatePath);
        }
        if (import_node_fs3.default.existsSync(userDataDir)) {
          const dirWatcher = import_node_fs3.default.watch(
            userDataDir,
            { persistent: false },
            (eventType, filename) => {
              if (!filename || filename === "Local State" || filename.startsWith("Local State")) {
                this.scheduleRefresh(browserDef, localStatePath, eventType);
              }
            }
          );
          dirWatcher.on("error", () => {
          });
          this.watchers.set(`dir:${browserDef.id}`, dirWatcher);
          if (!watchedPaths.includes(localStatePath)) {
            watchedPaths.push(localStatePath);
          }
        }
      } catch {
      }
    }
    return watchedPaths;
  }
  scheduleRefresh(browserDef, localStatePath, eventType) {
    const existingTimer = this.debounceTimers.get(browserDef.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    const timer = setTimeout(() => {
      this.debounceTimers.delete(browserDef.id);
      try {
        const result = detectAllBrowsers(this.detectOptions);
        result.watchedFiles = this.getWatchedFiles();
        const updatedBrowser = result.browsers.find((b) => b.id === browserDef.id);
        const eventLog = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          browserId: browserDef.id,
          browserName: browserDef.name,
          filePath: localStatePath,
          eventType,
          profilesCount: updatedBrowser ? updatedBrowser.profiles.length : 0
        };
        this.eventHistory.unshift(eventLog);
        if (this.eventHistory.length > 30) {
          this.eventHistory.pop();
        }
        this.onUpdate(result, eventLog);
      } catch {
      }
    }, this.debounceMs);
    this.debounceTimers.set(browserDef.id, timer);
  }
  getWatchedFiles() {
    const lad = getLocalAppDataDir(this.detectOptions.localAppDataDir);
    const files = [];
    for (const browserDef of SUPPORTED_BROWSERS) {
      const localStatePath = this.detectOptions.customLocalStatePaths?.[browserDef.id] || import_node_path3.default.join(lad, ...browserDef.localStateSubpath.split("/"));
      if (import_node_fs3.default.existsSync(localStatePath)) {
        files.push(localStatePath);
      }
    }
    return files;
  }
  getEventHistory() {
    return this.eventHistory;
  }
  stop() {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    for (const watcher2 of this.watchers.values()) {
      try {
        watcher2.close();
      } catch {
      }
    }
    this.watchers.clear();
  }
};

// src/main/launcher.ts
var import_node_child_process2 = require("node:child_process");
function launchBrowserProfile(executablePath, folderName, fallbackBrowserName) {
  const profileArg = `--profile-directory="${folderName}"`;
  const exe = executablePath || `${fallbackBrowserName || "browser"}.exe`;
  const fullCommand = `"${exe}" ${profileArg}`;
  if (process.platform === "win32" && executablePath) {
    try {
      const child = (0, import_node_child_process2.spawn)(executablePath, [`--profile-directory=${folderName}`], {
        detached: true,
        stdio: "ignore",
        windowsHide: false
      });
      child.unref();
      return {
        success: true,
        command: fullCommand,
        executablePath,
        folderName,
        message: `Successfully launched ${fallbackBrowserName || "browser"} with profile "${folderName}".`,
        platform: "win32",
        isSimulated: false
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        command: fullCommand,
        executablePath,
        folderName,
        message: `Failed to spawn process: ${errorMsg}`,
        platform: "win32",
        isSimulated: false
      };
    }
  }
  return {
    success: true,
    command: fullCommand,
    executablePath: exe,
    folderName,
    message: process.platform === "win32" ? `Browser executable not found on disk at "${exe}". Launch command prepared.` : `Simulated launch on ${process.platform}: "${fullCommand}" (detached: true, unref).`,
    platform: process.platform,
    isSimulated: process.platform !== "win32" || !executablePath
  };
}

// src/main/settings.ts
var import_node_fs4 = __toESM(require("node:fs"), 1);
var import_node_path4 = __toESM(require("node:path"), 1);
var SettingsManager = class {
  constructor(userDataDir) {
    if (!import_node_fs4.default.existsSync(userDataDir)) {
      import_node_fs4.default.mkdirSync(userDataDir, { recursive: true });
    }
    this.settingsPath = import_node_path4.default.join(userDataDir, "app-settings.json");
    this.currentSettings = this.load();
  }
  getSettingsPath() {
    return this.settingsPath;
  }
  load() {
    try {
      if (import_node_fs4.default.existsSync(this.settingsPath)) {
        const raw = import_node_fs4.default.readFileSync(this.settingsPath, "utf8");
        const parsed = JSON.parse(raw);
        this.currentSettings = {
          startWithWindows: Boolean(parsed.startWithWindows ?? DEFAULT_SETTINGS.startWithWindows),
          theme: parsed.theme || DEFAULT_SETTINGS.theme,
          language: parsed.language || DEFAULT_SETTINGS.language,
          customGroups: Array.isArray(parsed.customGroups) ? parsed.customGroups : [...DEFAULT_SETTINGS.customGroups],
          profiles: parsed.profiles && typeof parsed.profiles === "object" ? parsed.profiles : {}
        };
        return this.currentSettings;
      }
    } catch {
    }
    this.currentSettings = {
      ...DEFAULT_SETTINGS,
      customGroups: [...DEFAULT_SETTINGS.customGroups],
      profiles: {}
    };
    this.save();
    return this.currentSettings;
  }
  save() {
    try {
      const dir = import_node_path4.default.dirname(this.settingsPath);
      if (!import_node_fs4.default.existsSync(dir)) {
        import_node_fs4.default.mkdirSync(dir, { recursive: true });
      }
      import_node_fs4.default.writeFileSync(
        this.settingsPath,
        JSON.stringify(this.currentSettings, null, 2),
        "utf8"
      );
    } catch {
    }
    return this.currentSettings;
  }
  getSettings() {
    return this.currentSettings;
  }
  updateGeneralSettings(partial) {
    if (typeof partial.startWithWindows === "boolean") {
      this.currentSettings.startWithWindows = partial.startWithWindows;
    }
    if (partial.theme) {
      this.currentSettings.theme = partial.theme;
    }
    if (partial.language) {
      this.currentSettings.language = partial.language;
    }
    if (Array.isArray(partial.customGroups)) {
      this.currentSettings.customGroups = partial.customGroups;
    }
    return this.save();
  }
  updateProfileCustomization(browserId, folderName, update) {
    const key = getProfileKey(browserId, folderName);
    const existing = this.currentSettings.profiles[key] || {};
    const merged = {
      ...existing,
      ...update
    };
    if (merged.nickname !== void 0 && !merged.nickname.trim()) {
      delete merged.nickname;
    }
    if (merged.group !== void 0 && !merged.group.trim()) {
      delete merged.group;
    }
    if (merged.color !== void 0 && !merged.color.trim()) {
      delete merged.color;
    }
    if (merged.emoji !== void 0 && !merged.emoji.trim()) {
      delete merged.emoji;
    }
    this.currentSettings.profiles[key] = merged;
    return this.save();
  }
};

// src/main/shortcut.ts
var import_node_path5 = __toESM(require("node:path"), 1);
var import_node_os2 = __toESM(require("node:os"), 1);
var import_node_child_process3 = require("node:child_process");
function createDesktopShortcut(browserName, executablePath, folderName, profileDisplayName) {
  const safeName = `${browserName} - ${profileDisplayName}`.replace(/[<>:"/\\|?*]/g, "");
  const desktopDir = import_node_path5.default.join(import_node_os2.default.homedir(), "Desktop");
  const shortcutPath = import_node_path5.default.join(desktopDir, `${safeName}.lnk`);
  const targetExe = executablePath || `${browserName.toLowerCase().replace(/\s+/g, "")}.exe`;
  const args = `--profile-directory="${folderName}"`;
  if (process.platform === "win32" && executablePath) {
    try {
      const psScript = `
        $WshShell = New-Object -ComObject WScript.Shell;
        $Shortcut = $WshShell.CreateShortcut('${shortcutPath.replace(/'/g, "''")}');
        $Shortcut.TargetPath = '${executablePath.replace(/'/g, "''")}';
        $Shortcut.Arguments = '${args.replace(/'/g, "''")}';
        $Shortcut.Description = 'Launch ${browserName.replace(/'/g, "''")} (${profileDisplayName.replace(/'/g, "''")})';
        $Shortcut.Save();
      `;
      (0, import_node_child_process3.execSync)(`powershell -NoProfile -NonInteractive -Command "${psScript.replace(/\r?\n/g, " ")}"`, {
        stdio: "ignore"
      });
      return {
        success: true,
        shortcutPath,
        targetExe,
        arguments: args,
        message: `Created desktop shortcut: ${safeName}.lnk`,
        isSimulated: false
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        shortcutPath,
        targetExe,
        arguments: args,
        message: `Could not create .lnk file: ${errorMsg}`,
        isSimulated: false
      };
    }
  }
  return {
    success: true,
    shortcutPath: `C:\\Users\\User\\Desktop\\${safeName}.lnk`,
    targetExe,
    arguments: args,
    message: `Desktop shortcut prepared: "${safeName}.lnk" \u2192 "${targetExe}" ${args}`,
    isSimulated: true
  };
}

// electron/main.ts
var gotTheLock = import_electron.app.requestSingleInstanceLock();
if (!gotTheLock) {
  import_electron.app.quit();
  process.exit(0);
}
var mainWindow = null;
var tray = null;
var isQuitting = false;
var watcher = null;
var settingsManager = new SettingsManager(import_electron.app.getPath("userData"));
function getCachedDetection() {
  return detectAllBrowsers();
}
function createWindow() {
  mainWindow = new import_electron.BrowserWindow({
    width: 390,
    height: 560,
    show: false,
    frame: false,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: "#020617",
    // Match dark slate-950 theme
    webPreferences: {
      preload: import_node_path6.default.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !import_electron.app.isPackaged
    }
  });
  if (import_electron.app.isPackaged || process.env.NODE_ENV === "production") {
    mainWindow.loadFile(import_node_path6.default.join(__dirname, "../dist/index.html"));
  } else {
    mainWindow.loadURL("http://localhost:3000");
  }
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
  mainWindow.once("ready-to-show", () => {
    positionWindowNearTray();
    mainWindow?.show();
  });
  mainWindow.on("blur", () => {
    if (!mainWindow?.webContents.isDevToolsOpened()) {
      mainWindow?.hide();
    }
  });
}
function positionWindowNearTray() {
  if (!mainWindow || !tray) return;
  const trayBounds = tray.getBounds();
  const primaryDisplay = import_electron.screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  const [windowWidth, windowHeight] = mainWindow.getSize();
  let x = Math.round(trayBounds.x + trayBounds.width / 2 - windowWidth / 2);
  let y = Math.round(trayBounds.y - windowHeight - 8);
  if (x <= 0 || y <= 0 || x + windowWidth > screenWidth) {
    x = screenWidth - windowWidth - 16;
    y = screenHeight - windowHeight - 16;
  }
  mainWindow.setPosition(x, y, false);
}
function toggleWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    positionWindowNearTray();
    mainWindow.show();
    mainWindow.focus();
  }
}
function createTray() {
  const iconPath = import_node_path6.default.join(__dirname, "assets", "tray-icon.png");
  const icon = import_node_fs5.default.existsSync(iconPath) ? import_electron.nativeImage.createFromPath(iconPath) : import_electron.nativeImage.createEmpty();
  tray = new import_electron.Tray(icon);
  tray.setToolTip("Browser Profile Launcher");
  tray.on("click", () => {
    toggleWindow();
  });
  updateTrayContextMenu();
}
function updateTrayContextMenu() {
  if (!tray) return;
  const openAtLogin = import_electron.app.getLoginItemSettings().openAtLogin;
  const contextMenu = import_electron.Menu.buildFromTemplate([
    {
      label: "Open Launcher",
      click: () => {
        if (!mainWindow) createWindow();
        positionWindowNearTray();
        mainWindow?.show();
        mainWindow?.focus();
      }
    },
    {
      label: "Start with Windows",
      type: "checkbox",
      checked: openAtLogin,
      click: (menuItem) => {
        import_electron.app.setLoginItemSettings({
          openAtLogin: menuItem.checked,
          path: process.execPath
        });
        settingsManager.updateGeneralSettings({ startWithWindows: menuItem.checked });
      }
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        import_electron.app.quit();
      }
    }
  ]);
  tray.setContextMenu(contextMenu);
}
function setupIpc() {
  import_electron.ipcMain.handle("get-state", () => {
    const detection = getCachedDetection();
    return {
      detection,
      settings: settingsManager.getSettings(),
      settingsFilePath: settingsManager.getSettingsPath()
    };
  });
  import_electron.ipcMain.handle(
    "launch-profile",
    (_event, { browserId, folderName, displayName }) => {
      const detection = getCachedDetection();
      const browser = detection.browsers.find((b) => b.id === browserId);
      const def = SUPPORTED_BROWSERS.find((b) => b.id === browserId);
      const exe = browser?.executablePath || def?.standardExePaths[0] || null;
      return launchBrowserProfile(exe, folderName, browser?.name || displayName);
    }
  );
  import_electron.ipcMain.handle(
    "update-profile-settings",
    (_event, { browserId, folderName, customization }) => {
      return settingsManager.updateProfileCustomization(browserId, folderName, customization);
    }
  );
  import_electron.ipcMain.handle("update-general-settings", (_event, settings) => {
    if (typeof settings.startWithWindows === "boolean") {
      import_electron.app.setLoginItemSettings({
        openAtLogin: settings.startWithWindows,
        path: process.execPath
      });
      updateTrayContextMenu();
    }
    return settingsManager.updateGeneralSettings(settings);
  });
  import_electron.ipcMain.handle("toggle-startup", (_event, enable) => {
    import_electron.app.setLoginItemSettings({
      openAtLogin: enable,
      path: process.execPath
    });
    settingsManager.updateGeneralSettings({ startWithWindows: enable });
    updateTrayContextMenu();
    return import_electron.app.getLoginItemSettings().openAtLogin;
  });
  import_electron.ipcMain.handle(
    "create-shortcut",
    (_event, { browserId, folderName, displayName }) => {
      const detection = getCachedDetection();
      const browser = detection.browsers.find((b) => b.id === browserId);
      const def = SUPPORTED_BROWSERS.find((b) => b.id === browserId);
      const exe = browser?.executablePath || def?.standardExePaths[0] || null;
      return createDesktopShortcut(browser?.name || browserId, exe, folderName, displayName);
    }
  );
  import_electron.ipcMain.handle("hide-window", () => {
    mainWindow?.hide();
  });
  import_electron.ipcMain.handle("quit-app", () => {
    isQuitting = true;
    import_electron.app.quit();
  });
}
import_electron.app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    positionWindowNearTray();
    mainWindow.show();
    mainWindow.focus();
  }
});
import_electron.app.whenReady().then(() => {
  setupIpc();
  createWindow();
  createTray();
  watcher = new LocalStateWatcher(
    {},
    (detection, eventLog) => {
      mainWindow?.webContents.send("profiles-updated", { detection, eventLog });
    },
    500
  );
  watcher.start();
});
import_electron.app.on("before-quit", () => {
  isQuitting = true;
  watcher?.stop();
});
import_electron.app.on("window-all-closed", () => {
  if (process.platform !== "win32" && isQuitting) {
    import_electron.app.quit();
  }
});
