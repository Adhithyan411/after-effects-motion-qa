import './App.css';

function App() {
  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Motion QA</h1>
          <p>After Effects Project Quality Assistant</p>
        </div>

        <div className="status">
          <span className="status-dot"></span>
          Ready
        </div>
      </header>

      <main className="main-content">
        <section className="project-card">
          <div className="project-info">
            <span className="label">CURRENT PROJECT</span>
            <h2>No After Effects project selected</h2>
            <p>
              Open an After Effects project and scan it for common
              animation and project issues.
            </p>
          </div>

          <button className="scan-button">
            Scan Project
          </button>
        </section>

        <section className="health-section">
          <div className="section-header">
            <div>
              <span className="label">PROJECT HEALTH</span>
              <h2>Overview</h2>
            </div>

            <span className="issue-count">0 Issues</span>
          </div>

          <div className="health-grid">
            <div className="health-card">
              <span className="health-number">0</span>
              <span className="health-label">Errors</span>
            </div>

            <div className="health-card">
              <span className="health-number">0</span>
              <span className="health-label">Warnings</span>
            </div>

            <div className="health-card">
              <span className="health-number">0</span>
              <span className="health-label">Passed</span>
            </div>
          </div>
        </section>

        <section className="issues-section">
          <div className="section-header">
            <div>
              <span className="label">ANALYSIS</span>
              <h2>Issues</h2>
            </div>
          </div>

          <div className="empty-state">
            <div className="empty-icon">✓</div>

            <h3>No issues detected</h3>

            <p>
              Scan an After Effects project to see potential
              problems here.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;