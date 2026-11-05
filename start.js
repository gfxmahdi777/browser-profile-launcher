import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Detect if running in Cloud Run / headless container without display
const isCloudRun = Boolean(process.env.K_SERVICE || process.env.PORT);
const isHeadless = process.platform !== 'win32' && !process.env.DISPLAY;

if (isCloudRun || isHeadless) {
  // Start web server in cloud preview environment
  import('./server.ts');
} else {
  // Start real Electron desktop application on Windows / Desktop
  try {
    const distIndex = path.join(__dirname, 'dist', 'index.html');
    const mainCjs = path.join(__dirname, 'electron', 'main.cjs');
    if (!fs.existsSync(distIndex) || !fs.existsSync(mainCjs)) {
      execSync('npm run build:all', { cwd: __dirname, stdio: 'inherit' });
    }

    const electronModule = await import('electron');
    const electronExe = electronModule.default;
    const child = spawn(electronExe, ['.'], {
      cwd: __dirname,
      stdio: 'inherit',
    });
    child.on('exit', (code) => {
      process.exit(code || 0);
    });
  } catch (err) {
    console.error('Failed to launch Electron:', err);
    process.exit(1);
  }
}
