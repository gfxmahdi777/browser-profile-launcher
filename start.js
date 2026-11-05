import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Detect if running in Cloud Run / headless container without display
const isCloudRun = Boolean(process.env.K_SERVICE || process.env.PORT);
const isHeadless = process.platform !== 'win32' && !process.env.DISPLAY;

if (isCloudRun || isHeadless) {
  // Start server for web preview
  import('./server.ts');
} else {
  // Start Electron desktop application on Windows / Desktop
  try {
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
    console.error('Failed to launch Electron, falling back to server:', err);
    import('./server.ts');
  }
}
