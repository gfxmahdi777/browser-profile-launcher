# Browser Profile Launcher

A fast, lightweight Windows browser profile launcher that auto-detects profiles across **Google Chrome**, **Brave Browser**, **Microsoft Edge**, and **Vivaldi**, watches `Local State` files for live profile changes (`fs.watch` with 500ms debounce), and opens any profile in its own detached browser window with one click.

---

## ✅ Completed Milestones & Features (According to `PROJECT_BRIEF.md`)

1. **Milestone 1 — Auto-Detect Profiles & Console CLI (`src/detect/`)**:
   - Reads `%LOCALAPPDATA%\...\User Data\Local State` JSON (`profile.info_cache`) for Chrome, Brave, Edge, and Vivaldi.
   - Locates browser executables via Windows Registry (`HKLM` / `HKCU` App Paths) and standard `Program Files` paths.
   - Extracts display names, folder names (`Default`, `Profile 1`, etc.), initials, and profile pictures.
   - Safely skips missing browsers and recovers cleanly from locked or malformed `Local State` files without crashing.

2. **Milestone 2 — Launcher Window & One-Click Detached Launch (`src/main/launcher.ts` & `src/renderer/`)**:
   - **380 × 560 Popup Window** grouped by browser with browser logos, round avatars/initials, and search bar.
   - Clicking any profile spawns `<browser.exe> --profile-directory="<folderName>"` using `child_process.spawn` with `{ detached: true, stdio: 'ignore' }` and `.unref()`.
   - Opening a Chrome profile and a Brave profile launches two independent windows; closing the launcher leaves all opened browsers running.

3. **Milestone 3 — Real-Time File Watching (`src/main/watcher.ts`)**:
   - Watches each browser's `Local State` file and `User Data` folder using `fs.watch` with a **500 ms debounce**.
   - Creating or deleting a profile in any browser automatically updates the UI within ~0.5–1 second via Server-Sent Events (`/api/events`) without restarting the app.

4. **Additional Brief Features (`src/main/settings.ts` & `src/main/shortcut.ts`)**:
   - **`...` Menu on Each Card**: Rename profile (app-only nickname), pick a custom color or emoji, pin to **Favorites** at the top, assign **Custom Groups** (`Facebook`, `Work`, `Personal`), and **Create Desktop Shortcut (`.lnk`)**.
   - **System Tray Bar**: Left-click toggles the popup window; Right-click menu includes **Open**, **Start with Windows**, and **Quit**.
   - **Light & Dark Mode** + **English & বাংলা (Bengali)** interface toggle.
   - All custom settings are stored in the app's own data folder (`.app-user-data/app-settings.json`), never touching the browsers' folders.

---

## 💻 How to Run & Test on Windows

### 1. Start the Full Launcher App (Milestone 2 & 3 UI + File Watcher)
```powershell
npm run dev
```
Then open **`http://localhost:3000`** in your browser.
- **Test Milestone 2 (Click to Launch)**: Click any profile card on the left (for example, a Chrome profile and a Brave profile). On Windows, it will immediately open separate browser windows for those profiles.
- **Test Milestone 3 (Auto File Watcher)**:
  - Open Brave or Chrome on your PC and create a new profile, **OR** use the **"Milestone 3: Live File Watcher"** form on the right side of the screen and click **"Create Profile on Disk"**.
  - Within ~0.5 seconds, the new profile appears automatically in the launcher list without restarting!

### 2. Run the Console CLI Detector (Milestone 1)
```powershell
npm run detect
```

### 3. Run the Automated Unit Tests (All 10 Tests)
```powershell
npm test
```
