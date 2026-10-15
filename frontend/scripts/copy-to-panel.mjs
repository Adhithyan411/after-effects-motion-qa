import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths relative to project root
const projectRoot = path.resolve(__dirname, '..', '..');
const distDir = path.resolve(projectRoot, 'frontend', 'dist');
const panelDir = path.resolve(projectRoot, 'ae', 'panel');

if (!fs.existsSync(distDir)) {
  console.error(`[copy-to-panel] Error: Source dist directory not found at: ${distDir}`);
  console.error('[copy-to-panel] Please run "vite build" first.');
  process.exit(1);
}

// Remove old panel directory if it exists to prevent stale files
if (fs.existsSync(panelDir)) {
  console.log(`[copy-to-panel] Removing previous panel build at: ${panelDir}`);
  fs.rmSync(panelDir, { recursive: true, force: true });
}

// Copy dist contents into ae/panel
console.log(`[copy-to-panel] Copying ${distDir} -> ${panelDir}...`);
fs.cpSync(distDir, panelDir, { recursive: true });

// Post-process ae/panel/index.html for CEP compatibility:
// CEP can fail to load ES modules via file:// with CORS issues.
// Convert <script type="module" crossorigin src="..."> into <script defer src="...">
const panelHtmlPath = path.resolve(panelDir, 'index.html');
if (fs.existsSync(panelHtmlPath)) {
  let html = fs.readFileSync(panelHtmlPath, 'utf-8');

  // Strip modulepreload links
  html = html.replace(/<link\s+rel="modulepreload"[^>]*>\s*/gi, '');

  // Strip type="module" and crossorigin, add defer
  html = html.replace(/<script\s+([^>]*?)>/gi, (match, attrs) => {
    if (/src=/i.test(attrs)) {
      let cleaned = attrs
        .replace(/\btype=["']module["']/gi, '')
        .replace(/\bcrossorigin(=["'][^"']*["'])?/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!/\bdefer\b/i.test(cleaned)) {
        cleaned = `defer ${cleaned}`;
      }

      return `<script ${cleaned}>`;
    }
    return match;
  });

  fs.writeFileSync(panelHtmlPath, html, 'utf-8');
  console.log('[copy-to-panel] Successfully converted scripts in ae/panel/index.html to classic defer scripts (no type="module", no crossorigin).');
}

console.log('[copy-to-panel] Successfully deployed built frontend into ae/panel/');
