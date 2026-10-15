import { useState } from 'react';
import './App.css';
import { runScan, getHostInfo, revealIssue } from './lib/ae';

function App() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'error' | 'warning'
  const [scanDuration, setScanDuration] = useState(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [revealErrors, setRevealErrors] = useState({});
  const hostInfo = getHostInfo();

  const [scanData, setScanData] = useState({
    projectName: '',
    compCount: 0,
    layerCount: 0,
    footageCount: 0,
    issues: [],
    passedCount: 0,
  });

  const handleSelectIssue = async (issue) => {
    try {
      const res = await revealIssue(issue);
      if (!res || !res.ok) {
        setRevealErrors((prev) => ({
          ...prev,
          [issue.id]: res?.error || 'Item not found. Rescan the project.',
        }));
      } else {
        setRevealErrors((prev) => {
          if (!prev[issue.id]) return prev;
          const next = { ...prev };
          delete next[issue.id];
          return next;
        });
      }
    } catch {
      setRevealErrors((prev) => ({
        ...prev,
        [issue.id]: 'Item not found. Rescan the project.',
      }));
    }
  };

  const handleScan = async () => {
    setIsScanning(true);
    setScanError(null);
    setRevealErrors({});
    const startTime = performance.now();

    try {
      const data = await runScan();
      if (data.error || data.noProject) {
        setScanError(data.error || 'No active project found in After Effects.');
        setScanComplete(false);
        setScanData({
          projectName: data.projectName || 'No Project Open',
          compCount: 0,
          layerCount: 0,
          footageCount: 0,
          issues: [],
          passedCount: 0,
        });
      } else {
        setScanData({
          projectName: data.projectName || 'Untitled Project',
          compCount: data.compCount || 0,
          layerCount: data.layerCount || 0,
          footageCount: data.footageCount || 0,
          issues: Array.isArray(data.issues) ? data.issues : [],
          passedCount: typeof data.passedCount === 'number' ? data.passedCount : 0,
        });
        setScanComplete(true);
      }
    } catch (err) {
      setScanError(err.message || 'An unexpected scan error occurred.');
      setScanComplete(false);
    } finally {
      setScanDuration(Math.round(performance.now() - startTime));
      setIsScanning(false);
    }
  };

  const issues = scanData.issues || [];
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const passedCount = scanData.passedCount;

  const filteredIssues = issues.filter((issue) => {
    if (filter === 'error') return issue.severity === 'error';
    if (filter === 'warning') return issue.severity === 'warning';
    return true;
  });

  return (
    <div className="app">

      {/* Header */}
      <header className="header">
        <div>
          <h1>Motion QA</h1>
          <p>After Effects Project Quality Assistant</p>
        </div>

        <div className="status">
          <span className="status-dot"></span>
          {isScanning ? 'Scanning' : 'Ready'}
        </div>
      </header>


      {/* Main Content */}
      <main className="main-content">

        {/* Project Section */}
        <section className="project-card">

          <div className="project-info">

            <span className="label">
              CURRENT PROJECT
            </span>

            <h2>
              {scanComplete
                ? scanData.projectName
                : scanError
                ? 'No Project Open'
                : 'No After Effects project selected'}
            </h2>

            <p>
              {scanComplete
                ? `Project scan completed successfully (${scanData.compCount} comps, ${scanData.layerCount} layers, ${scanData.footageCount} footage items inspected).`
                : scanError
                ? scanError
                : 'Open an After Effects project and scan it for common animation and project issues.'}
            </p>

          </div>


          <button
            className="scan-button"
            onClick={handleScan}
            disabled={isScanning}
          >
            {isScanning
              ? 'Scanning...'
              : 'Scan Project'}
          </button>

        </section>


        {/* Project Health */}
        <section className="health-section">

          <div className="section-header">

            <div>
              <span className="label">
                PROJECT HEALTH
              </span>

              <h2>
                Overview
              </h2>
            </div>


            <span className="issue-count">
              {scanComplete
                ? `${issues.length} Issue${issues.length === 1 ? '' : 's'}`
                : '0 Issues'}
            </span>

          </div>


          <div className="health-grid">

            {/* Errors */}
            <div className="health-card">

              <span className="health-number">
                {scanComplete ? errorCount : 0}
              </span>

              <span className="health-label">
                Errors
              </span>

            </div>


            {/* Warnings */}
            <div className="health-card">

              <span className="health-number">
                {scanComplete ? warningCount : 0}
              </span>

              <span className="health-label">
                Warnings
              </span>

            </div>


            {/* Passed */}
            <div className="health-card">

              <span className="health-number">
                {scanComplete ? passedCount : 0}
              </span>

              <span className="health-label">
                Passed
              </span>

            </div>

          </div>

        </section>


        {/* Issues Section */}
        <section className="issues-section">

          <div className="section-header">

            <div>

              <span className="label">
                ANALYSIS
              </span>

              <h2>
                Issues
              </h2>

            </div>

            {/* Severity Filter Controls */}
            {scanComplete && (
              <div className="severity-filter">
                <button
                  type="button"
                  className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                  onClick={() => setFilter('all')}
                >
                  All ({issues.length})
                </button>
                <button
                  type="button"
                  className={`filter-btn ${filter === 'error' ? 'active' : ''}`}
                  onClick={() => setFilter('error')}
                >
                  Errors ({errorCount})
                </button>
                <button
                  type="button"
                  className={`filter-btn ${filter === 'warning' ? 'active' : ''}`}
                  onClick={() => setFilter('warning')}
                >
                  Warnings ({warningCount})
                </button>
              </div>
            )}

          </div>


          {/* Before Scan / Initial State */}
          {!scanComplete && !scanError && (

            <div className="empty-state">

              <div className="empty-icon">
                ✓
              </div>

              <h3>
                No scan performed
              </h3>

              <p>
                Click "Scan Project" to analyze
                the After Effects project.
              </p>

            </div>

          )}


          {/* Error State: No project open */}
          {!scanComplete && scanError && (

            <div className="empty-state">

              <div className="empty-icon error">
                !
              </div>

              <h3>
                No Active Project
              </h3>

              <p>
                {scanError}
              </p>

            </div>

          )}


          {/* After Scan */}
          {scanComplete && (

            filteredIssues.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  ✓
                </div>
                <h3>
                  {filter === 'all' ? 'No issues detected' : `No ${filter}s found`}
                </h3>
                <p>
                  {filter === 'all'
                    ? 'All project checks passed without issues.'
                    : `No issues found matching the ${filter} severity filter.`}
                </p>
              </div>
            ) : (
              <div className="issues-list">
                {filteredIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`issue-card ${issue.severity}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectIssue(issue)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectIssue(issue);
                      }
                    }}
                  >
                    <div className="issue-icon">
                      !
                    </div>

                    <div className="issue-body">
                      <div className="issue-header-row">
                        <h3>
                          {issue.title}
                        </h3>

                        <span className="select-action" title="Select in After Effects">
                          Select in AE →
                        </span>
                      </div>

                      <p>
                        {issue.description}
                      </p>

                      {(issue.compName || issue.layerName) && (
                        <div className="issue-meta">
                          {issue.compName && (
                            <span className="issue-badge comp">
                              Comp: {issue.compName}
                            </span>
                          )}
                          {issue.layerName && (
                            <span className="issue-badge layer">
                              Item: {issue.layerName}
                            </span>
                          )}
                        </div>
                      )}

                      {revealErrors[issue.id] && (
                        <div className="issue-inline-error" role="alert">
                          <span>⚠</span>
                          <span>Item not found. Rescan the project.</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )

          )}

        </section>

        {/* In-Panel Diagnostics */}
        <footer className="panel-footer">
          <button
            type="button"
            className="diagnostics-toggle"
            onClick={() => setShowDiagnostics((prev) => !prev)}
          >
            {showDiagnostics ? '▲ Hide Diagnostics' : '▼ Diagnostics'}
          </button>

          {showDiagnostics && (
            <div className="diagnostics-card">
              <div className="diag-row">
                <span>CEP Bridge:</span>
                <strong>{hostInfo.isCEP ? 'window.__adobe_cep__ detected' : 'Browser mode (mock data)'}</strong>
              </div>
              <div className="diag-row">
                <span>Host Application:</span>
                <strong>{hostInfo.isCEP ? `${hostInfo.hostName} (${hostInfo.hostVersion})` : 'Web Browser'}</strong>
              </div>
              <div className="diag-row">
                <span>Panel Version:</span>
                <strong>v{hostInfo.panelVersion}</strong>
              </div>
              <div className="diag-row">
                <span>Last Scan Duration:</span>
                <strong>{scanDuration !== null ? `${scanDuration} ms` : 'Not run yet'}</strong>
              </div>
            </div>
          )}
        </footer>

      </main>

    </div>
  );
}

export default App;