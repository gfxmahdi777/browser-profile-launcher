import fs from 'node:fs';
import path from 'node:path';

// Minimal valid 16x16 transparent PNG with a centered blue icon
// Base64 encoded 16x16 PNG icon
const ICON_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAZElEQVQ4T2NkoBAwUqifYdQAIwaG/wz/Gf6fOMbAwMDIyMjAiK6AgYEBVvDfP4b/DAwMDIwMDAwsDFABFiLN/8fAwMDAxMDw78RxBhyGkG0AcQYQZwBxBoAci8jRj95+IMcAAJ+nDhHfNqNnAAAAAElFTkSuQmCC';

const assetDir = path.join(process.cwd(), 'electron', 'assets');
if (!fs.existsSync(assetDir)) {
  fs.mkdirSync(assetDir, { recursive: true });
}

fs.writeFileSync(path.join(assetDir, 'tray-icon.png'), Buffer.from(ICON_BASE64, 'base64'));
fs.writeFileSync(path.join(assetDir, 'app-icon.png'), Buffer.from(ICON_BASE64, 'base64'));
console.log('Created tray and app icons.');
