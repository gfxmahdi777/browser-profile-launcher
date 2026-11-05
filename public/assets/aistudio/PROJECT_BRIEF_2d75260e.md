# Browser Profile Launcher: Project Brief

## 1. What this is
A small Windows desktop app (with a system tray icon) that lists every browser profile on the computer, across all installed browsers (Chrome, Brave, Edge, Vivaldi), in one place. Clicking a profile opens that browser's window for that profile. New profiles created in any browser appear in the app automatically.

## 2. Why
The owner uses many browsers and many profiles (for example several Facebook accounts, each in its own profile). Finding the right profile means opening a browser, then opening its profile picker. This app removes that step: one click, right profile, right browser.

## 3. Goals
- Auto-detect all profiles of all installed Chromium browsers. No manual adding.
- One click opens the chosen profile in its own normal browser window. Several can be open at once.
- Smooth, modern, fast UI with light and dark mode.
- Runs from the system tray; opens as a small popup near the tray.
- Create a desktop shortcut for any profile.

## 4. Non-goals (first version)
- No split-screen or window tiling.
- No Firefox, Opera, Safari.
- No Mac or Linux.
- No cookie, session, or account handling. The app only launches browsers; it never touches logins or browsing data.
- No browser extension in v1.

## 5. Suggested tech
- Electron + Node.js (plain JavaScript or TypeScript). UI in HTML/CSS (React optional).
- Alternative if a smaller install is wanted: Tauri.
- Package with electron-builder into a Windows installer.

## 6. How profile detection works
Each Chromium browser keeps a JSON file named `Local State` in its user data folder. Under `profile.info_cache`, each key is a profile folder name (`Default`, `Profile 1`, `Profile 2`, ...) and the value holds `name` (display name), and avatar or account info.

| Browser | Local State path (Windows) |
|---|---|
| Chrome | `%LOCALAPPDATA%\Google\Chrome\User Data\Local State` |
| Brave | `%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\Local State` |
| Edge | `%LOCALAPPDATA%\Microsoft\Edge\User Data\Local State` |
| Vivaldi | `%LOCALAPPDATA%\Vivaldi\User Data\Local State` |

Steps:
1. For each browser, check whether the file exists. If not, skip that browser.
2. Parse the JSON and read `profile.info_cache`.
3. Build a list: `{ browser, folderName, displayName, avatar }`.
4. Watch each `Local State` file for changes (fs.watch or chokidar, with a short debounce of about 500 ms). On change, re-read and refresh the UI. This is what makes new profiles appear automatically.
5. If a profile is deleted in the browser, it disappears from the list on the next refresh.

If a profile picture exists (for example `Google Profile Picture.png` inside the profile folder), show it. Otherwise show a colored circle with initials.

## 7. Finding the browser executable
Check, in order:
1. Windows registry `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\<exe>` (and `HKCU`), for `chrome.exe`, `brave.exe`, `msedge.exe`, `vivaldi.exe`.
2. Standard folders, for example:
   - `C:\Program Files\Google\Chrome\Application\chrome.exe`
   - `C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe`
   - `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`
3. If neither works, hide that browser's section.

## 8. Launching a profile
Spawn the browser as a detached process so closing the app does not close the browser:

```
<browser exe> --profile-directory="<folderName>"
```

Use Node `child_process.spawn` with `{ detached: true, stdio: 'ignore' }` and call `.unref()`. If the browser is already running, this opens a new window for that profile.

## 9. Features
**Must have (v1)**
- Profile list grouped by browser, with browser logo, profile name, picture or initials.
- Search box.
- Click to open profile.
- Auto-refresh when profiles change.
- System tray icon; left click toggles the popup; right click menu has Open, Start with Windows, Quit.
- Start with Windows option (`app.setLoginItemSettings`).

**Should have**
- Rename a profile inside the app (a nickname, stored only in the app's own settings, not in the browser).
- Pick a color or emoji for a profile.
- Favorites pinned at the top.
- "Create desktop shortcut" on each profile (Electron `shell.writeShortcutLink` creating a `.lnk` with the exe and `--profile-directory` argument).
- Custom groups (for example Facebook, Work).

**Later**
- Firefox support (`profiles.ini`).
- Chrome and Edge extension for opening profiles from the toolbar (Native Messaging).
- Mac and Linux.

## 10. UI direction
- Small window (about 380 x 560) that appears near the tray, with rounded corners and a soft shadow.
- Top: search field. Below: list or grid of profile cards grouped under browser headings.
- Card: round avatar, profile name, small browser badge. Subtle hover highlight and a quick press animation. A "..." menu on each card: Rename, Color, Favorite, Create shortcut.
- Smooth transitions (150 to 200 ms), no layout jumps when the list refreshes.
- Light and dark mode following the system setting.
- Empty state: a friendly message if no browsers or profiles are found.
- Text in the interface can be English first, with Bengali as a later option.

## 11. Data storage
App settings (nicknames, colors, favorites, groups, startup option) in a JSON file in the app's user data folder (`app.getPath('userData')`). Key profiles by `browser + folderName`. Never write into the browsers' own folders.

## 12. Suggested file structure
```
/src
  /main        main process: tray, window, launching, file watching
  /detect      browser and profile detection
  /renderer    UI
  /shared      types and constants
package.json
README.md
```

## 13. Build in milestones
1. Detect profiles and print them to the console.
2. Basic window with the list and a click that opens the profile.
3. File watching, so new profiles appear automatically.
4. Tray icon and popup behavior, start with Windows.
5. Polish the UI, add light and dark mode.
6. Nicknames, colors, favorites, groups.
7. Desktop shortcut creation.
8. Installer build and testing on a clean Windows PC.

## 14. Acceptance checks
- A new profile created in Brave shows up in the app within a few seconds without restarting the app.
- Clicking a Chrome profile and a Brave profile opens two separate windows with the right profiles.
- Closing the launcher does not close the opened browsers.
- Works when a browser is missing from the PC.
- No crash if a `Local State` file is missing, locked, or malformed.

## 15. Notes
- The app only launches browsers. It does not read or store passwords, cookies, or login data.
- Users who run several accounts on one site (for example Facebook) should follow that site's rules; some sites flag many accounts from one device or IP.
