import { useState } from 'react';
import './App.css';

function App() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);

  const handleScan = () => {
    setIsScanning(true);
    setScanComplete(false);

    setTimeout(() => {
      setIsScanning(false);
      setScanComplete(true);
    }, 1500);
  };

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
                ? 'Sample After Effects Project'
                : 'No After Effects project selected'}
            </h2>

            <p>
              {scanComplete
                ? 'Project scan completed successfully.'
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
                ? '2 Issues'
                : '0 Issues'}
            </span>

          </div>


          <div className="health-grid">

            {/* Errors */}
            <div className="health-card">

              <span className="health-number">
                {scanComplete ? '1' : '0'}
              </span>

              <span className="health-label">
                Errors
              </span>

            </div>


            {/* Warnings */}
            <div className="health-card">

              <span className="health-number">
                {scanComplete ? '1' : '0'}
              </span>

              <span className="health-label">
                Warnings
              </span>

            </div>


            {/* Passed */}
            <div className="health-card">

              <span className="health-number">
                {scanComplete ? '8' : '0'}
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

          </div>


          {/* Before Scan */}
          {!scanComplete && (

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


          {/* After Scan */}
          {scanComplete && (

            <div className="issues-list">

              {/* Error */}
              <div className="issue-card error">

                <div className="issue-icon">
                  !
                </div>

                <div>

                  <h3>
                    Unnamed layers detected
                  </h3>

                  <p>
                    3 layers don't have descriptive
                    names.
                  </p>

                </div>

              </div>


              {/* Warning */}
              <div className="issue-card warning">

                <div className="issue-icon">
                  !
                </div>

                <div>

                  <h3>
                    Unused footage detected
                  </h3>

                  <p>
                    2 imported footage items are
                    not being used.
                  </p>

                </div>

              </div>

            </div>

          )}

        </section>

      </main>

    </div>
  );
}

export default App;