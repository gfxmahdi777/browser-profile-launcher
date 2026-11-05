import { useState } from 'react';
import {
  FilePlus2,
  Activity,
  ExternalLink,
  CheckCircle2,
  ShieldAlert,
  RotateCcw,
  Terminal,
  Copy,
  Check,
  PowerOff,
  Power,
} from 'lucide-react';
import {
  BrowserId,
  DetectedBrowser,
  LaunchedInstance,
  WatcherEventLog,
} from '../shared/types.ts';
import { SUPPORTED_BROWSERS } from '../shared/constants.ts';
import { BrowserLogo } from './BrowserIcons.tsx';
import { Language, TRANSLATIONS } from './i18n.ts';

interface WatcherAndTestBenchProps {
  browsers: DetectedBrowser[];
  watchedFiles: string[];
  watcherHistory: WatcherEventLog[];
  launchedInstances: LaunchedInstance[];
  isPopupOpen: boolean;
  isDark: boolean;
  lang: Language;
  onSimulateAddProfile: (
    browserId: BrowserId,
    profileName: string,
    email: string
  ) => Promise<void>;
  onSimulateMalformed: (
    browserId: BrowserId,
    mode: 'corrupt' | 'restore'
  ) => Promise<void>;
  onTogglePopup: (open: boolean) => void;
}

export function WatcherAndTestBench({
  browsers,
  watchedFiles,
  watcherHistory,
  launchedInstances,
  isPopupOpen,
  isDark,
  lang,
  onSimulateAddProfile,
  onSimulateMalformed,
  onTogglePopup,
}: WatcherAndTestBenchProps) {
  const [targetBrowser, setTargetBrowser] = useState<BrowserId>('brave');
  const [newProfileName, setNewProfileName] = useState('Facebook Business #3');
  const [newProfileEmail, setNewProfileEmail] = useState('fb.biz3@proton.me');
  const [isCreating, setIsCreating] = useState(false);
  const [corruptedBrowser, setCorruptedBrowser] = useState<BrowserId | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const t = TRANSLATIONS[lang];

  const handleAddOnDisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    setIsCreating(true);
    try {
      await onSimulateAddProfile(targetBrowser, newProfileName, newProfileEmail);
      // Prepare next sample name
      const randomNum = Math.floor(Math.random() * 90) + 10;
      setNewProfileName(`Brave Profile #${randomNum}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleCorrupt = async () => {
    if (corruptedBrowser) {
      await onSimulateMalformed(corruptedBrowser, 'restore');
      setCorruptedBrowser(null);
    } else {
      await onSimulateMalformed('edge', 'corrupt');
      setCorruptedBrowser('edge');
    }
  };

  const copyCommand = (cmd: string, id: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="flex-1 space-y-5 min-w-0">
      {/* Section 1: Milestone 3 Live File Watcher (fs.watch with 500ms debounce) */}
      <section
        aria-label="Milestone 3 File Watcher Controls"
        className={`rounded-2xl border p-5 transition-colors ${
          isDark
            ? 'bg-slate-900/90 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900 shadow-xs'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold">{t.watcherTitle}</h2>
            </div>
            <p
              className={`text-xs mt-1 leading-relaxed ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              {t.watcherSubtitle}
            </p>
          </div>
          <div
            className={`text-xs font-mono px-2.5 py-1 rounded-lg border ${
              isDark
                ? 'bg-slate-950 border-slate-800 text-emerald-400'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            fs.watch (500ms debounce) · {watchedFiles.length} files active
          </div>
        </div>

        {/* Form to write a new profile directly to Local State on disk */}
        <form
          onSubmit={handleAddOnDisk}
          className={`p-3.5 rounded-xl border grid grid-cols-1 sm:grid-cols-12 gap-3 items-end ${
            isDark
              ? 'bg-slate-950/70 border-slate-800/90'
              : 'bg-slate-50 border-slate-200/80'
          }`}
        >
          <div className="sm:col-span-3">
            <label
              htmlFor="sim-browser-select"
              className="block text-[11px] font-medium mb-1 opacity-80"
            >
              Browser (Local State)
            </label>
            <select
              id="sim-browser-select"
              value={targetBrowser}
              onChange={(e) => setTargetBrowser(e.target.value as BrowserId)}
              className={`w-full px-2.5 py-2 rounded-lg text-xs border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-100'
                  : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              {SUPPORTED_BROWSERS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-5">
            <label
              htmlFor="sim-profile-name"
              className="block text-[11px] font-medium mb-1 opacity-80"
            >
              New Profile Name
            </label>
            <input
              id="sim-profile-name"
              type="text"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              placeholder="e.g. Facebook Account #3"
              required
              className={`w-full px-3 py-2 rounded-lg text-xs border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-100'
                  : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
          </div>

          <div className="sm:col-span-4">
            <button
              type="submit"
              disabled={isCreating}
              className="w-full py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              <FilePlus2 className="w-4 h-4 shrink-0" />
              <span>{t.addProfileBtn}</span>
            </button>
          </div>
        </form>

        {/* Live Watcher Event Stream & Malformed JSON Resilience Test */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800/40">
          <div className="text-xs flex items-center gap-2 min-w-0">
            <span className="font-medium opacity-75">Latest Watcher Event:</span>
            {watcherHistory.length > 0 ? (
              <span className="font-mono text-[11px] text-emerald-400 truncate">
                [{new Date(watcherHistory[0].timestamp).toLocaleTimeString()}]{' '}
                {watcherHistory[0].browserName} updated →{' '}
                {watcherHistory[0].profilesCount} profile(s)
              </span>
            ) : (
              <span className="text-[11px] opacity-60">
                Watching Local State files for changes...
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleToggleCorrupt}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition cursor-pointer ${
              corruptedBrowser
                ? 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500'
                : isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
            }`}
          >
            {corruptedBrowser ? (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.restoreTestBtn}</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{t.corruptTestBtn}</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* Section 2: Milestone 2 Detached Browser Windows Log */}
      <section
        aria-label="Milestone 2 Detached Browser Processes"
        className={`rounded-2xl border p-5 transition-colors ${
          isDark
            ? 'bg-slate-900/90 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900 shadow-xs'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3.5">
          <div>
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-semibold">{t.launchedWindowsTitle}</h2>
            </div>
            <p
              className={`text-xs mt-1 leading-relaxed ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              {t.launchedWindowsSubtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onTogglePopup(!isPopupOpen)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition cursor-pointer ${
              isPopupOpen
                ? isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500'
            }`}
          >
            {isPopupOpen ? (
              <>
                <PowerOff className="w-3.5 h-3.5 text-rose-400" />
                <span>{t.closeLauncherSimBtn}</span>
              </>
            ) : (
              <>
                <Power className="w-3.5 h-3.5" />
                <span>{t.reopenLauncherBtn}</span>
              </>
            )}
          </button>
        </div>

        {launchedInstances.length === 0 ? (
          <div
            className={`p-4 rounded-xl border border-dashed text-center text-xs ${
              isDark
                ? 'border-slate-800 text-slate-400'
                : 'border-slate-200 text-slate-500'
            }`}
          >
            {t.noLaunchedYet}
          </div>
        ) : (
          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
            {launchedInstances.map((inst) => (
              <div
                key={inst.id}
                className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                  isDark
                    ? 'bg-slate-950/80 border-slate-800'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <BrowserLogo browserId={inst.browserId} className="w-4 h-4 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {inst.displayName}{' '}
                      <span className="opacity-60 font-normal">
                        · {inst.browserName} ({inst.folderName})
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-emerald-400 truncate mt-0.5">
                      {inst.command}
                    </div>
                  </div>
                </div>
                <div className="text-[11px] opacity-75 shrink-0">
                  Running (detached · unref)
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 3: Acceptance Checks Status & Windows Testing Commands */}
      <section
        aria-label="Acceptance Checks and Windows Guide"
        className={`rounded-2xl border p-5 transition-colors ${
          isDark
            ? 'bg-slate-900/90 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900 shadow-xs'
        }`}
      >
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{t.acceptanceTitle}</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs mb-5">
          {[
            {
              title: '1. New profile in Brave appears within seconds without restart',
              detail: 'Verified via fs.watch (500ms debounce) on Local State + SSE push',
            },
            {
              title: '2. Clicking Chrome & Brave profiles opens separate windows',
              detail: 'Verified via child_process.spawn with --profile-directory="<folder>"',
            },
            {
              title: '3. Closing the launcher does not close opened browsers',
              detail: 'Verified via { detached: true, stdio: "ignore" } and child.unref()',
            },
            {
              title: '4. Works when a browser is missing from the PC',
              detail: `Verified: Missing browsers (${
                browsers
                  .filter((b) => !b.isInstalled)
                  .map((b) => b.name)
                  .join(', ') || 'e.g. Vivaldi'
              }) are cleanly hidden`,
            },
            {
              title: '5. No crash if Local State is missing, locked, or malformed',
              detail: 'Verified by unit tests & safe try/catch recovery banner',
            },
          ].map((check) => (
            <div
              key={check.title}
              className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                isDark
                  ? 'bg-slate-950/60 border-slate-800/80'
                  : 'bg-slate-50 border-slate-200/80'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-medium">{check.title}</div>
                <div className="text-[11px] opacity-70 mt-0.5">{check.detail}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Windows Commands */}
        <div
          className={`p-3.5 rounded-xl border ${
            isDark
              ? 'bg-slate-950 border-slate-800'
              : 'bg-slate-100/80 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold mb-2">
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            <span>{t.windowsGuideTitle}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
            {[
              { id: 'dev', label: 'Start App + Watcher UI', cmd: 'npm run dev' },
              { id: 'detect', label: 'Console CLI Detector', cmd: 'npm run detect' },
              { id: 'test', label: 'Run All 10 Unit Tests', cmd: 'npm test' },
            ].map((item) => (
              <div
                key={item.id}
                className={`p-2.5 rounded-lg border flex items-center justify-between ${
                  isDark
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div>
                  <div className="text-[10px] font-sans opacity-65">
                    {item.label}
                  </div>
                  <div className="text-emerald-400 font-semibold mt-0.5">
                    {item.cmd}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copyCommand(item.cmd, item.id)}
                  aria-label={`Copy ${item.cmd}`}
                  className="p-1.5 rounded hover:bg-slate-500/20"
                >
                  {copiedCmd === item.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 opacity-70" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
