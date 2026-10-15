# Motion QA - After Effects Project Quality Assistant

**Motion QA** is an automated quality assurance panel for **Adobe After Effects**. It scans open After Effects projects for common animation errors, naming convention issues, broken expressions, missing assets, and timeline inconsistencies before delivery or rendering.

---

## 🛠 Tech Stack & Architecture

- **Panel Frontend (`/frontend`)**: React 19, Vite, Vanilla CSS. Features real-time counters, severity filters (All, Errors, Warnings), and clean dark-mode UI.
- **CEP Bridge (`/ae`)**: Adobe Common Extensibility Platform (CEP 11, Host: `AEFT`) panel manifest and configuration (`CSXS/manifest.xml`, `.debug`).
- **ExtendScript Scanner (`/ae/jsx/scan.jsx`)**: ES3-compatible After Effects scripting engine that inspects compositions, layers, properties, and project footage items.
- **Backend API (`/backend`)**: FastAPI service reserved for cloud validation, rulesets, and automated report generation.

---

## 🔍 QA Rules Checked

| Rule | Severity | Description |
|---|---|---|
| **Default / Unnamed Layers** | `Warning` | Flags unrenamed layers matching patterns like `Shape Layer 1`, `Solid 1`, `Null 1`, `Text 1`. |
| **Unused Footage Items** | `Warning` | Identifies imported footage or assets in the Project panel not used in any comp. |
| **Missing / Offline Footage** | `Error` | Catches missing files or unlinked media (`footageMissing == true`). |
| **Layer OutPoint Overflow** | `Warning` | Identifies layers whose `outPoint` extends past the composition's total duration. |
| **Inconsistent Frame Rates** | `Warning` | Detects compositions with mismatched frame rates compared to the main composition. |
| **Expression Errors** | `Error` | Inspects layer properties for broken expressions reporting runtime errors. |

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
│   │   └── scan.jsx              # ExtendScript project & layer QA scanner
│   ├── lib/
│   │   └── CSInterface.js        # Official Adobe CSInterface library (v11.0.0)
│   └── panel/                    # Built frontend assets loaded by CEP
├── backend/                      # FastAPI Backend
│   └── app/
│       ├── __init__.py
│       └── main.py               # API entrypoint
├── frontend/                     # React 19 + Vite Application
│   ├── dist/                     # Vite production build output
│   ├── scripts/
│   │   └── copy-to-panel.mjs     # Deploys dist/ to ae/panel/
│   ├── src/
│   │   ├── lib/
│   │   │   └── ae.js             # CEP bridge & browser dev fallback helper
│   │   ├── App.css               # Dark mode styling for panel
│   │   ├── App.jsx               # QA dashboard UI, filters & counters
│   │   └── main.jsx              # React root
│   ├── index.html                # Panel HTML entrypoint ("Motion QA")
│   ├── package.json
│   └── vite.config.js            # Vite config (base: './')
├── .gitignore                    # Ignored artifacts & dependencies
└── README.md                     # Documentation & setup guide
```
