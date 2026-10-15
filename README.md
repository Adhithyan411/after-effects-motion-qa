# Motion QA - After Effects Project Quality Assistant

**Motion QA** is an automated quality assurance panel for **Adobe After Effects**. It scans open After Effects projects for common animation errors, naming convention issues, broken expressions, missing assets, and timeline inconsistencies before delivery or rendering.

---

## 🛠 Tech Stack & Architecture

- **Panel Frontend (`/frontend`)**: React 19, Vite, Vanilla CSS. Features real-time counters, severity filters (All, Errors, Warnings), and clean dark-mode UI.
- **CEP Bridge (`/ae`)**: Adobe Common Extensibility Platform (CEP 11, Host: `AEFT`) panel manifest and configuration (`CSXS/manifest.xml`, `.debug`).
- **ExtendScript Scanner (`/ae/jsx/scan.jsx`)**: ES3-compatible After Effects scripting engine that inspects compositions, layers, properties, and project footage items.
- **Backend API (`/backend`)**: FastAPI + SQLite service for persistent scan storage, comparison/diffing, and multi-format report exports (HTML, JSON, CSV).

---

## 🔍 QA Rules Checked

| Rule ID | Severity | Description |
|---|---|---|
| `expression-error` | `Error` | Inspects layer properties for broken expressions reporting runtime errors. |
| `missing-footage` | `Error` | Catches missing files or unlinked media (`footageMissing == true`). |
| `unnamed-layer` | `Warning` | Flags unrenamed layers matching patterns like `Shape Layer 1`, `Solid 1`, `Null 1`, `Text 1`. |
| `unused-footage` | `Warning` | Identifies imported footage or assets in the Project panel not used in any comp. |
| `layer-extends-comp` | `Warning` | Identifies layers whose `outPoint` extends past the composition's total duration. |
| `inconsistent-framerate` | `Warning` | Detects compositions with mismatched frame rates compared to the main composition. |
| `missing-font` | `Warning` | Detects text layers referencing uninstalled or substituted fonts. |
| `heavy-effect` | `Warning` | Flags render-heavy effects (Gaussian Blur, Glow, Fast Box Blur > 50px, Particles, Time Displacement). |
| `precomp-organization` | `Warning` | Flags comps nested > 4 levels deep and default-named compositions like `Comp 1` or `Pre-comp 1`. |
| `duplicate-footage` | `Warning` | Identifies footage items pointing to the same file path on disk. |
| `disabled-layer` | `Warning` | Flags hidden/disabled layers not marked as guide layers. |
| `oversized-footage` | `Warning` | Flags footage items with dimensions over 2x the width/height of the composition using them. |

---

## 🚀 Running the Project

### Option 1: Browser Dev Mode (Rapid UI Development)

You can develop and preview the UI in your web browser without opening After Effects. When running outside After Effects, `frontend/src/lib/ae.js` activates a mock data fallback.

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   npm install
   ```

2. Start the Vite development server:
   ```bash
   npm run dev
   ```

3. Open `http://localhost:5173` in your browser. Click **Scan Project** to test the scan flow, severity filtering, and error states.

---

### Option 2: Inside Adobe After Effects (CEP Panel)

To run Motion QA as a native dockable panel inside Adobe After Effects:

#### Step 1: Enable `PlayerDebugMode`

Adobe host applications block unsigned third-party extensions unless **PlayerDebugMode** is enabled.

- **Windows**:
  Run PowerShell as Administrator or Command Prompt:
  ```powershell
  # For CSXS.11 (After Effects 2021+)
  reg add "HKCU\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d "1" /f
  # For backwards compatibility with CSXS.10 / CSXS.9
  reg add "HKCU\Software\Adobe\CSXS.10" /v PlayerDebugMode /t REG_SZ /d "1" /f
  reg add "HKCU\Software\Adobe\CSXS.9" /v PlayerDebugMode /t REG_SZ /d "1" /f
  ```

- **macOS**:
  Open Terminal:
  ```bash
  defaults write com.adobe.CSXS.11 PlayerDebugMode 1
  defaults write com.adobe.CSXS.10 PlayerDebugMode 1
  defaults write com.adobe.CSXS.9 PlayerDebugMode 1
  ```

#### Step 2: Build the Panel

Compile the React frontend and deploy the production bundle into `ae/panel/`:

```bash
cd frontend
npm run build:panel
```

This compiles Vite with relative asset paths (`./assets/...`) and copies the output directly into `ae/panel/` so the extension is completely self-contained.

#### Step 3: Link `/ae` to Adobe CEP Extensions Directory

Create a directory junction or symlink from your project's `/ae` directory into Adobe's user CEP folder:

- **Windows (Command Prompt / PowerShell)**:
  CEP Directory: `%APPDATA%\Adobe\CEP\extensions\`
  
  ```powershell
  # Create the CEP extensions directory if it doesn't already exist
  New-Item -ItemType Directory -Force -Path "$env:APPDATA\Adobe\CEP\extensions"

  # Create a junction / link to the /ae folder
  New-Item -ItemType Junction -Path "$env:APPDATA\Adobe\CEP\extensions\MotionQA" -Target "c:\Users\adhit\Desktop\after-effects-motion-qa\ae"
  ```

- **macOS**:
  ```bash
  mkdir -p ~/Library/Application\ Support/Adobe/CEP/extensions
  ln -s "/path/to/after-effects-motion-qa/ae" ~/Library/Application\ Support/Adobe/CEP/extensions/MotionQA
  ```

#### Step 4: Open the Panel in After Effects

1. Start (or restart) **Adobe After Effects**.
2. Open any project (`.aep`) or create a new composition.
3. In the menu bar, go to:
   **Window > Extensions > Motion QA**
4. The Motion QA panel will appear. Click **Scan Project** to execute the ExtendScript scan.

#### Step 5: Remote Debugging (DevTools)

Remote debugging is configured on port `8088` via `/ae/.debug`.

1. With the Motion QA panel open in After Effects, open Google Chrome or Microsoft Edge.
2. Navigate to:
   ```
   http://localhost:8088
   ```
3. Click **Motion QA** to open the Chromium DevTools console, inspect elements, and monitor network/script calls.

---

## 🐍 Backend Setup & Run (FastAPI)

> **Note on Standalone Operation:** The Motion QA CEP panel operates completely offline inside After Effects. The backend service is optional and only used for saving scan records, comparing historical runs, and exporting HTML/JSON/CSV reports. If the backend is not running, project scanning, severity filtering, and click-to-select remain 100% operational.

The backend provides persistent SQLite storage for scans, history listing, comparative diffing across scans, and print-friendly report exports in HTML, JSON, and CSV.

### 1. Environment Setup

```bash
cd backend

# Create virtual environment (if not already created)
python -m venv .venv

# Activate virtual environment
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# Windows Command Prompt:
.\.venv\Scripts\activate.bat
# macOS / Linux:
source .venv/bin/activate

# Install runtime dependencies
pip install -r requirements.txt

# Or install all dependencies including testing tools (pytest, httpx):
pip install -r requirements-dev.txt
```

### 2. Run the Development Server

```bash
uvicorn app.main:app --reload --port 8000
```
- API Base: `http://localhost:8000`
- Interactive Swagger Documentation: `http://localhost:8000/docs`
- Database: SQLite standard library file automatically created at `backend/data/motionqa.db`.

### 3. API Endpoints Table

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check returning `{"status": "ok"}`. |
| `POST` | `/scans` | Validates and stores a `ScanResult`. Returns `SavedScanSummary` with auto-assigned `id`. |
| `GET` | `/scans` | Lists saved scans newest first. Supports optional query parameters: `?project=<name>` and `?limit=<int>`. |
| `GET` | `/scans/{id}` | Retrieves the complete saved scan including all issues and metadata, or `404`. |
| `DELETE` | `/scans/{id}` | Deletes a saved scan record, or returns `404`. |
| `GET` | `/scans/{id}/compare/{other_id}` | Compares two scans and returns `added`, `resolved`, and `retained` issues matched by `rule + compName + layerName`, plus `errorDelta` and `warningDelta`. |
| `GET` | `/scans/{id}/report?format=html\|json\|csv` | Exports a formatted report (`html` print-ready page, `json` raw scan, or `csv` spreadsheet). Sets `Content-Disposition` attachment with filename `motionqa-<project>-<date>.<ext>`. |

### 4. Running Backend Tests

```bash
pytest backend/tests -v
```

---

## 📁 Repository Structure

```text
after-effects-motion-qa/
├── ae/                           # Adobe After Effects CEP Extension
│   ├── .debug                    # Remote debugging configuration (port 8088)
│   ├── .gitkeep                  # Tracked folder placeholder
│   ├── CSXS/
│   │   └── manifest.xml          # CEP 11 manifest (MainPath: ./panel/index.html)
│   ├── jsx/
│   │   ├── json2.js              # Douglas Crockford's ES3 JSON polyfill
│   │   ├── make-test-project.jsx # Extended test project generator
│   │   └── scan.jsx              # ExtendScript project & layer QA scanner + reveal bridge
│   ├── lib/
│   │   └── CSInterface.js        # Official Adobe CSInterface library (v11.0.0)
│   └── panel/                    # Built frontend assets loaded by CEP
├── backend/                      # FastAPI Backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── db.py                 # SQLite database helper & CRUD operations
│   │   ├── main.py               # FastAPI application, routes, and CORS
│   │   ├── models.py             # Pydantic schemas (Issue, ScanResult, SavedScan)
│   │   └── reports.py            # HTML, JSON, and CSV report export builders
│   ├── data/                     # Local SQLite database (motionqa.db, gitignored)
│   ├── tests/
│   │   ├── __init__.py
│   │   └── test_api.py           # Pytest test suite for all endpoints
│   ├── requirements.txt          # Production dependencies (fastapi, uvicorn, pydantic)
│   └── requirements-dev.txt      # Development dependencies (pytest, httpx)
├── frontend/                     # React 19 + Vite Application
│   ├── dist/                     # Vite production build output
│   ├── scripts/
│   │   └── copy-to-panel.mjs     # Deploys dist/ to ae/panel/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── ae.js             # CEP bridge & browser dev fallback helper
│   │   │   └── api.js            # Graceful backend API client (saveScan, exportReport)
│   │   ├── App.css               # Dark mode styling for panel
│   │   ├── App.jsx               # QA dashboard UI, filters, counters & report actions
│   │   └── main.jsx              # React root
│   ├── index.html                # Panel HTML entrypoint ("Motion QA")
│   ├── package.json
│   └── vite.config.js            # Vite config (base: './')
├── docs/
│   └── TESTING.md                # Full QA verification & testing guide
├── scripts/
│   ├── install-panel.ps1         # Windows automated installer & registry setup
│   └── uninstall-panel.ps1       # Windows uninstaller script
├── .gitignore                    # Ignored artifacts & dependencies
└── README.md                     # Documentation & setup guide
```
