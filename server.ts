import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { SUPPORTED_BROWSERS } from './src/shared/constants.ts';
import {
  BrowserId,
  DetectionResult,
  LaunchedInstance,
  RawLocalState,
  WatcherEventLog,
} from './src/shared/types.ts';
import { detectAllBrowsers } from './src/detect/detect.ts';
import { getLocalAppDataDir } from './src/detect/paths.ts';
import { LocalStateWatcher } from './src/main/watcher.ts';
import { SettingsManager } from './src/main/settings.ts';
import { launchBrowserProfile } from './src/main/launcher.ts';
import { createDesktopShortcut } from './src/main/shortcut.ts';

const PORT = 3000;
const WORKSPACE_ROOT = process.cwd();
const SANDBOX_APPDATA_DIR = path.join(WORKSPACE_ROOT, '.local-appdata-sandbox');
const USER_DATA_DIR = path.join(WORKSPACE_ROOT, '.app-user-data');

/**
 * Ensures that if the current machine does not have real Windows Chromium Local State files
 * (for example, in the Linux preview container), we initialize a real on-disk sandbox directory
 * with genuine Chromium `Local State` JSON files so `fs.watch` watches real files on disk.
 */
function resolveActiveAppDataDir(): { appDataDir: string; isSandboxDisk: boolean } {
  if (process.platform === 'win32') {
    const realLad = getLocalAppDataDir();
    const realCheck = detectAllBrowsers({ localAppDataDir: realLad });
    if (realCheck.installedBrowsersCount > 0) {
      return { appDataDir: realLad, isSandboxDisk: false };
    }
  }

  // Initialize real on-disk sandbox files if not yet created
  const chromeStatePath = path.join(
    SANDBOX_APPDATA_DIR,
    'Google',
    'Chrome',
    'User Data',
    'Local State'
  );
  const braveStatePath = path.join(
    SANDBOX_APPDATA_DIR,
    'BraveSoftware',
    'Brave-Browser',
    'User Data',
    'Local State'
  );
  const edgeStatePath = path.join(
    SANDBOX_APPDATA_DIR,
    'Microsoft',
    'Edge',
    'User Data',
    'Local State'
  );

  if (!fs.existsSync(chromeStatePath)) {
    fs.mkdirSync(path.dirname(chromeStatePath), { recursive: true });
    const initialChrome: RawLocalState = {
      profile: {
        info_cache: {
          Default: {
            name: 'Personal Account',
            user_name: 'abdur.personal@gmail.com',
            gaia_name: 'Abdur Rahman',
            avatar_icon: 'chrome://theme/IDR_PROFILE_AVATAR_26',
          },
          'Profile 1': {
            name: 'Work & Clients',
            user_name: 'abdur@agency-work.com',
            gaia_name: 'Abdur (Work)',
          },
          'Profile 2': {
            name: 'Facebook Shop #1',
            user_name: 'fb.shop1@outlook.com',
          },
          'Profile 3': {
            name: 'Facebook Ads Manager',
            user_name: 'fb.ads@outlook.com',
          },
        },
      },
    };
    fs.writeFileSync(chromeStatePath, JSON.stringify(initialChrome, null, 2), 'utf8');
  }

  if (!fs.existsSync(braveStatePath)) {
    fs.mkdirSync(path.dirname(braveStatePath), { recursive: true });
    const initialBrave: RawLocalState = {
      profile: {
        info_cache: {
          Default: {
            name: 'Brave Personal & Privacy',
            user_name: 'brave.main@proton.me',
          },
          'Profile 1': {
            name: 'Facebook Account #2',
            user_name: 'fb.account2@proton.me',
          },
        },
      },
    };
    fs.writeFileSync(braveStatePath, JSON.stringify(initialBrave, null, 2), 'utf8');
  }

  if (!fs.existsSync(edgeStatePath)) {
    fs.mkdirSync(path.dirname(edgeStatePath), { recursive: true });
    const initialEdge: RawLocalState = {
      profile: {
        info_cache: {
          Default: {
            name: 'Microsoft 365 Office',
            user_name: 'abdur@enterprise.onmicrosoft.com',
          },
        },
      },
    };
    fs.writeFileSync(edgeStatePath, JSON.stringify(initialEdge, null, 2), 'utf8');
  }

  // Note: Vivaldi is intentionally left uncreated by default to demonstrate
  // Acceptance Check #4: "Works when a browser is missing from the PC."
  return { appDataDir: SANDBOX_APPDATA_DIR, isSandboxDisk: true };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  const { appDataDir, isSandboxDisk } = resolveActiveAppDataDir();
  const settingsManager = new SettingsManager(USER_DATA_DIR);

  // Set initial helpful group/favorite defaults on first run if empty
  const existingSettings = settingsManager.getSettings();
  if (Object.keys(existingSettings.profiles).length === 0) {
    settingsManager.updateProfileCustomization('chrome', 'Default', {
      favorite: true,
      group: 'Personal',
      color: '#3B82F6',
    });
    settingsManager.updateProfileCustomization('chrome', 'Profile 2', {
      favorite: true,
      group: 'Facebook',
      color: '#1877F2',
      emoji: '📘',
    });
    settingsManager.updateProfileCustomization('chrome', 'Profile 3', {
      group: 'Facebook',
      color: '#1877F2',
    });
    settingsManager.updateProfileCustomization('brave', 'Profile 1', {
      favorite: true,
      group: 'Facebook',
      color: '#FB542B',
      emoji: '🦁',
    });
    settingsManager.updateProfileCustomization('chrome', 'Profile 1', {
      group: 'Work',
      color: '#10B981',
    });
    settingsManager.updateProfileCustomization('edge', 'Default', {
      group: 'Work',
      color: '#0078D7',
    });
  }

  const launchedInstances: LaunchedInstance[] = [];
  const sseClients = new Set<express.Response>();

  const getEnrichedDetection = (): DetectionResult => {
    const result = detectAllBrowsers({ localAppDataDir: appDataDir });
    // Provide standard Windows executable paths for display when running in sandbox mode
    if (isSandboxDisk) {
      for (const b of result.browsers) {
        if (b.isInstalled && !b.executablePath) {
          const def = SUPPORTED_BROWSERS.find((d) => d.id === b.id);
          if (def) {
            b.executablePath = def.standardExePaths[0];
          }
        }
      }
    }
    result.watchedFiles = watcher.getWatchedFiles();
    result.isSandboxDisk = isSandboxDisk;
    return result;
  };

  const broadcastUpdate = (detection: DetectionResult, watcherEvent?: WatcherEventLog) => {
    const payload = JSON.stringify({
      type: 'update',
      detection,
      watcherEvent: watcherEvent || null,
      watcherHistory: watcher.getEventHistory(),
      settings: settingsManager.getSettings(),
      launchedInstances,
    });
    for (const client of sseClients) {
      client.write(`data: ${payload}\n\n`);
    }
  };

  // Start Milestone 3 File Watcher (500ms debounce as specified in Project Brief)
  const watcher = new LocalStateWatcher(
    { localAppDataDir: appDataDir },
    (result, eventLog) => {
      if (isSandboxDisk) {
        for (const b of result.browsers) {
          if (b.isInstalled && !b.executablePath) {
            const def = SUPPORTED_BROWSERS.find((d) => d.id === b.id);
            if (def) {
              b.executablePath = def.standardExePaths[0];
            }
          }
        }
      }
      result.isSandboxDisk = isSandboxDisk;
      broadcastUpdate(result, eventLog);
    },
    500
  );

  watcher.start();

  // SSE stream for real-time file watcher updates
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    sseClients.add(res);
    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // Get full application state
  app.get('/api/state', (_req, res) => {
    const detection = getEnrichedDetection();
    res.json({
      detection,
      settings: settingsManager.getSettings(),
      settingsFilePath: settingsManager.getSettingsPath(),
      launchedInstances,
      watcherHistory: watcher.getEventHistory(),
    });
  });

  // Milestone 2: Launch a browser profile via child_process.spawn (detached: true, unref)
  app.post('/api/launch', (req, res) => {
    const { browserId, folderName, displayName, targetUrl } = req.body as {
      browserId: BrowserId;
      folderName: string;
      displayName?: string;
      targetUrl?: string;
    };

    const detection = getEnrichedDetection();
    const browser = detection.browsers.find((b) => b.id === browserId);
    const browserDef = SUPPORTED_BROWSERS.find((b) => b.id === browserId);

    if (!browser || !browserDef) {
      res.status(400).json({ error: 'Unknown browser ID' });
      return;
    }

    const exePath = browser.executablePath || browserDef.standardExePaths[0];
    const result = launchBrowserProfile(exePath, folderName, browser.name, targetUrl);

    const instance: LaunchedInstance = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      browserId,
      browserName: browser.name,
      folderName,
      displayName: displayName || folderName,
      command: result.command,
      timestamp: new Date().toISOString(),
      detached: true,
      targetUrl: result.targetUrl,
    };

    launchedInstances.unshift(instance);
    if (launchedInstances.length > 25) {
      launchedInstances.pop();
    }

    res.json({
      result,
      instance,
      launchedInstances,
    });
  });

  // Update general settings (Start with Windows, theme, language, custom groups, customShortcuts)
  app.post('/api/settings/general', (req, res) => {
    const updated = settingsManager.updateGeneralSettings(req.body);
    res.json({ settings: updated });
  });

  // Rename a group and update assigned profiles/shortcuts
  app.post('/api/settings/group-rename', (req, res) => {
    const { oldName, newName, newIcon } = req.body as {
      oldName: string;
      newName: string;
      newIcon?: string;
    };
    const updated = settingsManager.renameGroup(oldName, newName, newIcon);
    res.json({ settings: updated });
  });

  // Delete a group and remove it from assigned profiles/shortcuts
  app.post('/api/settings/group-delete', (req, res) => {
    const { groupName } = req.body as { groupName: string };
    const updated = settingsManager.deleteGroup(groupName);
    res.json({ settings: updated });
  });

  // Update per-profile customization (nickname, color, emoji, favorite, group, groups, startupUrl)
  app.post('/api/settings/profile', (req, res) => {
    const { browserId, folderName, customization } = req.body as {
      browserId: BrowserId;
      folderName: string;
      customization: Record<string, unknown>;
    };
    const updated = settingsManager.updateProfileCustomization(
      browserId,
      folderName,
      customization
    );
    res.json({ settings: updated });
  });

  // Create Desktop Shortcut (.lnk)
  app.post('/api/shortcut', (req, res) => {
    const { browserId, folderName, displayName, targetUrl } = req.body as {
      browserId: BrowserId;
      folderName: string;
      displayName: string;
      targetUrl?: string;
    };

    const detection = getEnrichedDetection();
    const browser = detection.browsers.find((b) => b.id === browserId);
    const browserDef = SUPPORTED_BROWSERS.find((b) => b.id === browserId);
    const exePath = browser?.executablePath || browserDef?.standardExePaths[0] || null;

    const shortcutResult = createDesktopShortcut(
      browser?.name || browserId,
      exePath,
      folderName,
      displayName,
      targetUrl
    );

    res.json({ shortcutResult });
  });

  // Safe Sandbox Endpoint: Add a test profile strictly inside the isolated test folder
  // Safety rule: NEVER write to real browser Local State files
  app.post('/api/disk-simulate/add-profile', (req, res) => {
    const { browserId, profileName, email } = req.body as {
      browserId: BrowserId;
      profileName: string;
      email?: string;
    };

    const browserDef = SUPPORTED_BROWSERS.find((b) => b.id === browserId);
    if (!browserDef) {
      res.status(400).json({ error: 'Invalid browserId' });
      return;
    }

    // Safety constraint: strictly write ONLY to SANDBOX_APPDATA_DIR
    const localStatePath = path.join(
      SANDBOX_APPDATA_DIR,
      ...browserDef.localStateSubpath.split('/')
    );

    if (!localStatePath.startsWith(SANDBOX_APPDATA_DIR)) {
      res.status(403).json({ error: 'Safety Violation: Cannot write outside sandbox test directory' });
      return;
    }

    fs.mkdirSync(path.dirname(localStatePath), { recursive: true });

    let stateObj: RawLocalState = { profile: { info_cache: {} } };
    if (fs.existsSync(localStatePath)) {
      try {
        stateObj = JSON.parse(fs.readFileSync(localStatePath, 'utf8')) as RawLocalState;
      } catch {
        stateObj = { profile: { info_cache: {} } };
      }
    }

    if (!stateObj.profile) stateObj.profile = {};
    if (!stateObj.profile.info_cache) stateObj.profile.info_cache = {};

    const existingKeys = Object.keys(stateObj.profile.info_cache);
    let nextNum = 1;
    while (existingKeys.includes(`Profile ${nextNum}`)) {
      nextNum++;
    }
    const folderName = existingKeys.length === 0 ? 'Default' : `Profile ${nextNum}`;

    stateObj.profile.info_cache[folderName] = {
      name: profileName.trim() || `Test Profile ${nextNum}`,
      user_name: email?.trim() || `test${nextNum}@example.com`,
      active_time: Date.now() / 1000,
    };

    const wasInstalled = fs.existsSync(localStatePath);
    fs.writeFileSync(localStatePath, JSON.stringify(stateObj, null, 2), 'utf8');

    if (!wasInstalled) {
      watcher.start();
    }

    res.json({
      ok: true,
      browserId,
      folderName,
      localStatePath,
      message: `Created test profile "${profileName}" (${folderName}) safely in sandbox. Real browser data untouched.`,
    });
  });

  // Safe Sandbox Endpoint: Delete a test profile strictly from the isolated test folder
  app.post('/api/disk-simulate/delete-profile', (req, res) => {
    const { browserId, folderName } = req.body as {
      browserId: BrowserId;
      folderName: string;
    };

    const browserDef = SUPPORTED_BROWSERS.find((b) => b.id === browserId);
    if (!browserDef) {
      res.status(400).json({ error: 'Invalid browserId' });
      return;
    }

    // Safety constraint: strictly operate ONLY within SANDBOX_APPDATA_DIR
    const localStatePath = path.join(
      SANDBOX_APPDATA_DIR,
      ...browserDef.localStateSubpath.split('/')
    );

    if (!localStatePath.startsWith(SANDBOX_APPDATA_DIR)) {
      res.status(403).json({ error: 'Safety Violation: Cannot operate outside sandbox test directory' });
      return;
    }

    if (!fs.existsSync(localStatePath)) {
      res.status(404).json({ error: 'Sandbox Local State file not found' });
      return;
    }

    try {
      const stateObj = JSON.parse(
        fs.readFileSync(localStatePath, 'utf8')
      ) as RawLocalState;
      if (stateObj.profile?.info_cache && folderName in stateObj.profile.info_cache) {
        delete stateObj.profile.info_cache[folderName];
        fs.writeFileSync(localStatePath, JSON.stringify(stateObj, null, 2), 'utf8');
      }
      res.json({
        ok: true,
        message: `Removed test profile "${folderName}" safely from sandbox.`,
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Disk Simulator Endpoint: Test malformed Local State resilience (Acceptance Check #5)
  app.post('/api/disk-simulate/malformed-test', (req, res) => {
    const { browserId, mode } = req.body as {
      browserId: BrowserId;
      mode: 'corrupt' | 'restore';
    };

    const browserDef = SUPPORTED_BROWSERS.find((b) => b.id === browserId);
    if (!browserDef) {
      res.status(400).json({ error: 'Invalid browserId' });
      return;
    }

    const localStatePath = path.join(
      appDataDir,
      ...browserDef.localStateSubpath.split('/')
    );
    const backupPath = `${localStatePath}.bak`;

    if (mode === 'corrupt') {
      if (fs.existsSync(localStatePath) && !fs.existsSync(backupPath)) {
        fs.copyFileSync(localStatePath, backupPath);
      }
      fs.mkdirSync(path.dirname(localStatePath), { recursive: true });
      fs.writeFileSync(
        localStatePath,
        '{ "profile": { "info_cache": CORRUPTED_MALFORMED_JSON_TEST',
        'utf8'
      );
      res.json({
        ok: true,
        message: `Corrupted ${browserDef.name} Local State file on disk to test resilience.`,
      });
    } else {
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, localStatePath);
        fs.unlinkSync(backupPath);
      }
      res.json({
        ok: true,
        message: `Restored valid ${browserDef.name} Local State file on disk.`,
      });
    }
  });

  // Mount Vite dev server in development or static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(WORKSPACE_ROOT, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Browser Profile Launcher running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
