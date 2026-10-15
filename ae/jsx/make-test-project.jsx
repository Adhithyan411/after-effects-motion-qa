// ============================================================================
// Motion QA - Test Project Generator
// Run via: File > Scripts > Run Script File... inside Adobe After Effects
// Creates a test project with intentional motion QA errors and warnings.
// ============================================================================

(function makeTestProject() {
    if (!app.project) {
        app.newProject();
    }

    app.beginUndoGroup("Make Motion QA Test Project");

    try {
        var proj = app.project;

        // 1. Create Main Composition (1920x1080, 24 fps, 10 seconds)
        var mainComp = proj.items.addComp("Main Comp", 1920, 1080, 1.0, 10.0, 24);

        // 2. Layer: Default Shape Layer name (Warning: unnamed-layer)
        var shapeLayer = mainComp.layers.addShape();
        shapeLayer.name = "Shape Layer 1";

        // 3. Layer: Default Solid name (Warning: unnamed-layer)
        var solidLayer1 = mainComp.layers.addSolid([0.2, 0.4, 0.8], "Solid 1", 1920, 1080, 1.0, 10.0);

        // 4. Layer: Valid custom name (Passed QA check)
        var logoLayer = mainComp.layers.addSolid([1.0, 0.6, 0.2], "Logo", 400, 400, 1.0, 10.0);

        // 5. Layer: outPoint extends beyond comp duration (Warning: layer-extends-comp)
        var overflowLayer = mainComp.layers.addSolid([0.2, 0.7, 0.4], "Overflow Background", 1920, 1080, 1.0, 15.0);
        overflowLayer.outPoint = 15.0; // 15s in a 10s composition

        // 6. Layer: Broken Expression (Error: expression-error)
        var exprLayer = mainComp.layers.addSolid([0.8, 0.2, 0.2], "Expression Test Layer", 300, 300, 1.0, 10.0);
        var posProp = exprLayer.property("ADBE Transform Group").property("ADBE Position");
        if (posProp && posProp.canSetExpression) {
            posProp.expression = 'thisComp.layer("NonExistentLayer").transform.position;';
        }

        // 7. Create Secondary Comp at 30 fps (Warning: inconsistent-framerate vs 24 fps)
        var secComp = proj.items.addComp("Secondary Comp", 1920, 1080, 1.0, 10.0, 30);

        // 8. Create Unused Footage Item (Warning: unused-footage)
        // Add a solid to secComp, grab its FootageItem source, then remove layer
        var tempSolid = secComp.layers.addSolid([0.5, 0.5, 0.5], "Unused Solid Asset", 200, 200, 1.0, 5.0);
        var unusedFootage = tempSolid.source;
        if (unusedFootage) {
            unusedFootage.name = "Unused Solid Asset";
        }
        tempSolid.remove(); // Removed from composition, making it unused

        // Open the Main Comp in viewer
        mainComp.openInViewer();

        alert(
            "Motion QA Test Project Generated Successfully!\n\n" +
            "Summary of deliberate issues created:\n" +
            "--------------------------------------------------\n" +
            "• [ERROR] Expression error: 'Expression Test Layer' references missing layer\n" +
            "• [WARNING] Default layer name: 'Shape Layer 1'\n" +
            "• [WARNING] Default layer name: 'Solid 1'\n" +
            "• [WARNING] Overflow outPoint: 'Overflow Background' extends to 15s (comp is 10s)\n" +
            "• [WARNING] Inconsistent frame rate: 'Secondary Comp' is 30 fps (Main Comp is 24 fps)\n" +
            "• [WARNING] Unused footage: 'Unused Solid Asset' is not used in any comp\n\n" +
            "Now open 'Window > Extensions > Motion QA' and click 'Scan Project'."
        );

    } catch (err) {
        alert("Error generating test project: " + err.toString());
    } finally {
        app.endUndoGroup();
    }
})();
