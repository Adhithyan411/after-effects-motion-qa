# Motion QA - After Effects Testing & Verification Guide

This document outlines the testing procedures for verifying the **Motion QA** CEP panel and ExtendScript engine inside Adobe After Effects.

---

## 🛠 Prerequisites & Installation

### Step 1: Run the Automated Installer
Open PowerShell and run the installer from the repository root:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-panel.ps1
```
The installer automatically:
1. Enables `PlayerDebugMode=1` in the Windows registry for CSXS 9, 10, 11, and 12.
2. Compiles the panel via `npm run build:panel` in `/frontend`.
3. Links the `/ae` folder to `%APPDATA%\Adobe\CEP\extensions\MotionQA`.

### Step 2: Restart After Effects
If Adobe After Effects was open during installation, close and relaunch it so it detects the newly registered extension.

---

## 🧪 Test Procedures

### Test 1: Empty / No Project State
1. Launch After Effects without opening any project (`.aep`). Close any default untitled project if prompted, or launch with an empty session.
2. In the menu bar, open: **Window > Extensions > Motion QA**.
3. Click the **Scan Project** button.
4. **Expected Result**:
   - The panel displays the empty state card: `No Active Project`.
   - Description states: *"No active project found in After Effects."*
   - Error, Warning, and Passed counters all display `0`.

---

### Test 2: Scan Test Project with Deliberate Issues
1. In After Effects, navigate to: **File > Scripts > Run Script File...**
2. Select `ae/jsx/make-test-project.jsx` from this repository.
3. An alert will confirm the test compositions, layers, and expressions have been created.
4. Switch to the **Motion QA** panel and click **Scan Project**.
5. **Expected Results Table**:

| Rule ID | Title | Severity | Comp / Item Name | Expected Count |
|---|---|---|---|:---:|
| `expression-error` | Expression error on Position | **Error** | `Expression Test Layer` in `Main Comp` | **1** |
| `unnamed-layer` | Unnamed layer detected (`Shape Layer 1`) | **Warning** | `Shape Layer 1` in `Main Comp` | **1** |
| `unnamed-layer` | Unnamed layer detected (`Solid 1`) | **Warning** | `Solid 1` in `Main Comp` | **1** |
| `layer-extends-comp` | Layer outPoint extends beyond comp | **Warning** | `Overflow Background` in `Main Comp` | **1** |
| `inconsistent-framerate` | Inconsistent frame rate | **Warning** | `Secondary Comp` (30 fps vs 24 fps) | **1** |
| `unused-footage` | Unused footage detected | **Warning** | `Unused Solid Asset` in Project Panel | **1** |

#### Expected Health Counters:
- **Errors**: `1`
- **Warnings**: `5`
- **Total Issues**: `6 Issues`
- **Passed**: `> 0` (e.g., properly named `Logo` layer, frame rate baseline, non-missing footage)

---

### Test 3: Severity Filter Verification
1. After scanning the test project, observe the filter buttons above the issues list:
   - **All (6)**: Shows all 6 issue cards (1 red border error + 5 yellow border warnings).
2. Click **Errors (1)**:
   - Only the red border card for `Expression Test Layer` is visible.
3. Click **Warnings (5)**:
   - Only the 5 yellow border warning cards are visible.
4. Verify clicking between tabs is instant and preserves the health card totals above.

---

### Test 4: Click-to-Select / Reveal in After Effects
Click each issue card (or focus it and press `Enter` / `Space`) to confirm the selection bridge operates as expected:

| Issue Clicked | Expected Action in Adobe After Effects |
|---|---|
| **Expression error on Position** (`Expression Test Layer`) | Opens **Main Comp** in the viewer, deselects all other layers, and selects **Expression Test Layer** in the timeline. |
| **Unnamed layer detected** (`Shape Layer 1`) | Opens **Main Comp** in the viewer, deselects all other layers, and selects **Shape Layer 1**. |
| **Unnamed layer detected** (`Solid 1`) | Opens **Main Comp** in the viewer, deselects all other layers, and selects **Solid 1**. |
| **Layer outPoint extends beyond comp** (`Overflow Background`) | Opens **Main Comp** in the viewer, deselects all other layers, and selects **Overflow Background**. |
| **Inconsistent frame rate** (`Secondary Comp`) | Deselects other items in Project panel, selects **Secondary Comp**, and opens it in the viewer. |
| **Unused footage detected** (`Unused Solid Asset`) | Deselects other items in Project panel and selects **Unused Solid Asset** in the Project panel. |

#### Deleted Item Error Handling:
1. Delete the layer `Solid 1` directly from `Main Comp` in After Effects (without clicking "Scan Project").
2. Click the **Solid 1** card in Motion QA.
3. **Expected Result**: An inline warning appears on that card: `Item not found. Rescan the project.` without throwing or crashing the panel.

---

## 🚨 Troubleshooting

| Symptom | Cause | Solution |
|---|---|---|
| **"Motion QA" missing under Window > Extensions** | `PlayerDebugMode` not set or extension junction not detected. | 1. Re-run `powershell -ExecutionPolicy Bypass -File .\scripts\install-panel.ps1`.<br>2. Confirm `%APPDATA%\Adobe\CEP\extensions\MotionQA` exists.<br>3. Completely restart After Effects. |
| **Blank panel opens (empty white or dark window)** | Script loading or CORS file restriction. | 1. Open Google Chrome to `http://localhost:8088`.<br>2. Click **Motion QA** to inspect the Chromium console for errors.<br>3. Confirm `ae/panel/index.html` uses `<script defer>` without `type="module"`. |
| **Red "Panel Initialization Error" card appears** | React failed to mount or index DOM root was missing. | The fallback card displays the exact error message and stack trace. Check if `bundle` scripts or styles failed to load. |
| **Scan button shows "ExtendScript error"** | ExtendScript file not evaluated or syntax error. | Ensure `ae/jsx/scan.jsx` exists and is referenced in `ae/CSXS/manifest.xml`. Verify ES3 compatibility (no `let`/`const` or un-polyfilled features). |
| **Scan returns "No Active Project" despite project open** | `app.project` has 0 items or no active comps. | Create at least one composition or import an asset in the project before scanning. |
