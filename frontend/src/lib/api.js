/**
 * Motion QA Backend API Client
 * Base URL: http://localhost:8000
 * Handles scan persistence, history retrieval, and report exporting.
 * All helpers fail gracefully when the backend is offline.
 */

export const API_BASE = 'http://localhost:8000';

/**
 * Fetch wrapper with configurable abort timeout.
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 3000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Opens a URL in the user's default web browser.
 * Inside CEP, uses cep.util.openURLInDefaultBrowser / CSInterface.
 * In a standard browser, falls back to window.open.
 */
export function openExternalUrl(url) {
  if (typeof window === 'undefined') return;

  // 1. Direct CEP util
  if (window.cep?.util?.openURLInDefaultBrowser) {
    try {
      window.cep.util.openURLInDefaultBrowser(url);
      return;
    } catch {
      // Continue to next fallback
    }
  }

  // 2. CSInterface instance
  if (typeof window.CSInterface === 'function') {
    try {
      const cs = new window.CSInterface();
      if (typeof cs.openURLInDefaultBrowser === 'function') {
        cs.openURLInDefaultBrowser(url);
        return;
      }
    } catch {
      // Continue to window.open
    }
  }

  // 3. Browser fallback
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Save a completed ScanResult to the backend.
 * @param {Object} scan
 * @returns {Promise<{ ok: boolean, offline?: boolean, data?: Object, error?: string }>}
 */
export async function saveScan(scan) {
  try {
    const res = await fetchWithTimeout(
      `${API_BASE}/scans`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scan),
      },
      3000
    );

    if (!res.ok) {
      return {
        ok: false,
        offline: false,
        error: `Failed to save scan (server returned status ${res.status}).`,
      };
    }

    const data = await res.json();
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      offline: true,
      error: 'Backend offline. Start it with uvicorn to save reports.',
    };
  }
}

/**
 * List saved scans from the backend.
 * @param {Object} [options]
 * @param {string} [options.project]
 * @param {number} [options.limit]
 * @returns {Promise<{ ok: boolean, offline?: boolean, data?: Array, error?: string }>}
 */
export async function listScans({ project, limit } = {}) {
  try {
    const params = new URLSearchParams();
    if (project) params.set('project', project);
    if (limit) params.set('limit', String(limit));

    const url = `${API_BASE}/scans${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetchWithTimeout(url, { method: 'GET' }, 3000);

    if (!res.ok) {
      return {
        ok: false,
        offline: false,
        error: `Failed to retrieve scans (status ${res.status}).`,
      };
    }

    const data = await res.json();
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      offline: true,
      error: 'Backend offline. Start it with uvicorn to save reports.',
    };
  }
}

/**
 * Returns the download/view URL for an exported report.
 * @param {number|string} id
 * @param {'html'|'json'|'csv'} [format='html']
 * @returns {string}
 */
export function getReportUrl(id, format = 'html') {
  return `${API_BASE}/scans/${id}/report?format=${encodeURIComponent(format)}`;
}

/**
 * Exports/opens a report in the default browser.
 * @param {number|string} id
 * @param {'html'|'json'|'csv'} [format='html']
 * @returns {{ ok: boolean, url: string }}
 */
export function exportReport(id, format = 'html') {
  const url = getReportUrl(id, format);
  openExternalUrl(url);
  return { ok: true, url };
}
