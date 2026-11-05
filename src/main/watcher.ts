import fs from 'node:fs';
import path from 'node:path';
import { SUPPORTED_BROWSERS } from '../shared/constants.ts';
import {
  BrowserDefinition,
  DetectionResult,
  WatcherEventLog,
} from '../shared/types.ts';
import { detectAllBrowsers, DetectOptions } from '../detect/detect.ts';
import { getLocalAppDataDir } from '../detect/paths.ts';

export type WatcherCallback = (
  result: DetectionResult,
  eventLog: WatcherEventLog
) => void;

/**
 * Watches Chromium "Local State" files across installed browsers using fs.watch
 * with a 500ms debounce (as specified in Project Brief Section 6, Step 4).
 */
export class LocalStateWatcher {
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private debounceMs: number;
  private detectOptions: DetectOptions;
  private onUpdate: WatcherCallback;
  private eventHistory: WatcherEventLog[] = [];

  constructor(
    options: DetectOptions,
    onUpdate: WatcherCallback,
    debounceMs = 500
  ) {
    this.detectOptions = options;
    this.onUpdate = onUpdate;
    this.debounceMs = debounceMs;
  }

  /**
   * Starts watching all existing Local State files (and their parent User Data folders
   * so atomic temp-file renames by Chromium also trigger re-detection).
   */
  public start(browserDefs: BrowserDefinition[] = SUPPORTED_BROWSERS): string[] {
    this.stop();
    const lad = getLocalAppDataDir(this.detectOptions.localAppDataDir);
    const watchedPaths: string[] = [];

    for (const browserDef of browserDefs) {
      const localStatePath =
        this.detectOptions.customLocalStatePaths?.[browserDef.id] ||
        path.join(lad, ...browserDef.localStateSubpath.split('/'));

      const userDataDir = path.dirname(localStatePath);

      try {
        if (fs.existsSync(localStatePath)) {
          // Watch the Local State file directly
          const fileWatcher = fs.watch(
            localStatePath,
            { persistent: false },
            (eventType) => {
              this.scheduleRefresh(browserDef, localStatePath, eventType);
            }
          );
          fileWatcher.on('error', () => {
            // Safely ignore transient lock errors on Windows
          });
          this.watchers.set(`file:${browserDef.id}`, fileWatcher);
          watchedPaths.push(localStatePath);
        }

        if (fs.existsSync(userDataDir)) {
          // Also watch the parent User Data folder for atomic replacement of Local State
          const dirWatcher = fs.watch(
            userDataDir,
            { persistent: false },
            (eventType, filename) => {
              if (!filename || filename === 'Local State' || filename.startsWith('Local State')) {
                this.scheduleRefresh(browserDef, localStatePath, eventType);
              }
            }
          );
          dirWatcher.on('error', () => {
            // Safely ignore transient directory watch errors
          });
          this.watchers.set(`dir:${browserDef.id}`, dirWatcher);
          if (!watchedPaths.includes(localStatePath)) {
            watchedPaths.push(localStatePath);
          }
        }
      } catch {
        // Never crash if a file is locked or inaccessible
      }
    }

    return watchedPaths;
  }

  private scheduleRefresh(
    browserDef: BrowserDefinition,
    localStatePath: string,
    eventType: string
  ): void {
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
        const eventLog: WatcherEventLog = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date().toISOString(),
          browserId: browserDef.id,
          browserName: browserDef.name,
          filePath: localStatePath,
          eventType,
          profilesCount: updatedBrowser ? updatedBrowser.profiles.length : 0,
        };

        this.eventHistory.unshift(eventLog);
        if (this.eventHistory.length > 30) {
          this.eventHistory.pop();
        }

        this.onUpdate(result, eventLog);
      } catch {
        // Prevent uncaught exceptions during file lock or mid-write state
      }
    }, this.debounceMs);

    this.debounceTimers.set(browserDef.id, timer);
  }

  public getWatchedFiles(): string[] {
    const lad = getLocalAppDataDir(this.detectOptions.localAppDataDir);
    const files: string[] = [];
    for (const browserDef of SUPPORTED_BROWSERS) {
      const localStatePath =
        this.detectOptions.customLocalStatePaths?.[browserDef.id] ||
        path.join(lad, ...browserDef.localStateSubpath.split('/'));
      if (fs.existsSync(localStatePath)) {
        files.push(localStatePath);
      }
    }
    return files;
  }

  public getEventHistory(): WatcherEventLog[] {
    return this.eventHistory;
  }

  public stop(): void {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    for (const watcher of this.watchers.values()) {
      try {
        watcher.close();
      } catch {
        // Ignore close errors
      }
    }
    this.watchers.clear();
  }
}
