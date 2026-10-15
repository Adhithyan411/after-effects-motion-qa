import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

function renderErrorFallback(error) {
  const rootEl = document.getElementById('root') || document.body;
  const message = error instanceof Error ? error.stack || error.message : String(error);

  rootEl.innerHTML = `
    <div style="
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px;
      background: #0f1117;
      color: #ff5f56;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      text-align: left;
      box-sizing: border-box;
    ">
      <div style="
        max-width: 600px;
        width: 100%;
        background: #191c24;
        border: 1px solid #ff5f56;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      ">
        <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #ff5f56; display: flex; align-items: center; gap: 8px;">
          <span>⚠</span> Panel Initialization Error
        </h2>
        <p style="margin: 0 0 16px 0; font-size: 13px; color: #b7bdc9; line-height: 1.5;">
          The React application encountered an error while mounting inside the CEP panel.
        </p>
        <pre style="
          margin: 0;
          padding: 14px;
          background: #101218;
          border-radius: 8px;
          font-size: 12px;
          color: #f5b942;
          overflow-x: auto;
          white-space: pre-wrap;
          word-break: break-all;
          border: 1px solid #292e3a;
        ">${message}</pre>
      </div>
    </div>
  `;
}

// Global safety net for uncaught startup errors
window.addEventListener('error', (event) => {
  const root = document.getElementById('root');
  if (root && root.children.length === 0) {
    renderErrorFallback(event.error || event.message);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const root = document.getElementById('root');
  if (root && root.children.length === 0) {
    renderErrorFallback(event.reason || 'Unhandled Promise Rejection');
  }
});

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root DOM element "#root" was not found in index.html.');
  }

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} catch (err) {
  console.error('[Motion QA] Failed to mount React root:', err);
  renderErrorFallback(err);
}