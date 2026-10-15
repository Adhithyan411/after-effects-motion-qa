/**
 * After Effects CEP Bridge Helper
 * Communicates with ExtendScript via window.__adobe_cep__ or CSInterface
 * Includes browser dev-mode fallback with mock data for local testing.
 */

export function isCEPEnvironment() {
  return typeof window !== 'undefined' && Boolean(window.__adobe_cep__);
}

export function getHostInfo() {
  if (isCEPEnvironment()) {
    try {
      const raw = window.__adobe_cep__.getHostEnvironment();
      const env = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return {
        isCEP: true,
        hostName: env?.appId === 'AEFT' ? 'After Effects' : (env?.appId || 'Adobe Host'),
        hostVersion: env?.appVersion || 'Detected',
        panelVersion: '1.0.0',
      };
    } catch {
      return {
        isCEP: true,
        hostName: 'After Effects',
        hostVersion: 'Detected',
        panelVersion: '1.0.0',
      };
    }
  }

  return {
    isCEP: false,
    hostName: 'Browser mode (mock data)',
    hostVersion: 'N/A',
    panelVersion: '1.0.0',
  };
}

export function runScan() {
  return new Promise((resolve, reject) => {
    if (isCEPEnvironment()) {
      window.__adobe_cep__.evalScript('scanProject()', (result) => {
        if (!result || result === 'EvalScript error.' || result === 'EvalScript error') {
          return reject(new Error('ExtendScript error: scanProject() failed or is not available.'));
        }

        try {
          const data = typeof result === 'string' ? JSON.parse(result) : result;
          resolve(data);
        } catch (parseErr) {
          reject(new Error('Failed to parse scan results from After Effects: ' + parseErr.message));
        }
      });
    } else {
      // Browser Dev-Mode Fallback (for npm run dev)
      console.info('[Motion QA] Running in Dev Mode (outside After Effects). Returning mock scan data.');
      setTimeout(() => {
        resolve({
          projectName: 'Sample After Effects Project.aep',
          compCount: 3,
          layerCount: 18,
          footageCount: 5,
          passedCount: 8,
          issues: [
            {
              id: 'mock-issue-1',
              severity: 'error',
              rule: 'missing-footage',
              title: 'Missing footage detected',
              description: 'Footage item "brand_logo_hires.png" is missing or offline.',
              compName: '',
              layerName: 'brand_logo_hires.png',
              itemId: 101,
            },
            {
              id: 'mock-issue-2',
              severity: 'warning',
              rule: 'unnamed-layer',
              title: 'Unnamed layers detected',
              description: "3 layers ('Shape Layer 1', 'Solid 1', 'Null 1') don't have descriptive names.",
              compName: 'Main Comp',
              layerName: 'Shape Layer 1',
              compId: 1,
              layerIndex: 1,
              layerId: 1,
            },
            {
              id: 'mock-issue-3',
              severity: 'warning',
              rule: 'unused-footage',
              title: 'Unused footage detected',
              description: '2 imported footage items are not being used in any composition.',
              compName: '',
              layerName: 'background_music_v2.wav',
              itemId: 102,
            },
          ],
        });
      }, 800);
    }
  });
}

/**
 * Selects and reveals the target item/layer/comp in Adobe After Effects.
 * @param {Object} issue - Issue object carrying compId, layerIndex, layerId, or itemId.
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export function revealIssue(issue) {
  return new Promise((resolve) => {
    if (isCEPEnvironment()) {
      const jsonParam = JSON.stringify(issue);
      const script = `revealIssue(${JSON.stringify(jsonParam)})`;

      window.__adobe_cep__.evalScript(script, (result) => {
        if (!result || result === 'EvalScript error.' || result === 'EvalScript error') {
          return resolve({ ok: false, error: 'ExtendScript execution failed.' });
        }

        try {
          const parsed = typeof result === 'string' ? JSON.parse(result) : result;
          resolve(parsed || { ok: false, error: 'Empty response from After Effects.' });
        } catch (parseErr) {
          resolve({ ok: false, error: 'Failed to parse response: ' + parseErr.message });
        }
      });
    } else {
      // Browser mode fallback
      console.info('[Motion QA] Browser dev mode: revealIssue called for:', issue);
      resolve({ ok: true });
    }
  });
}
