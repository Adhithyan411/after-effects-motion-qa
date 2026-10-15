// ============================================================================
// Motion QA - Test Project Generator
// Run via: File > Scripts > Run Script File... inside Adobe After Effects
// Creates a comprehensive test project with intentional motion QA errors/warnings.
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

        // --- Original Rules ---
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
        var tempSolid = secComp.layers.addSolid([0.5, 0.5, 0.5], "Unused Solid Asset", 200, 200, 1.0, 5.0);
        var unusedFootage = tempSolid.source;
        if (unusedFootage) {
            unusedFootage.name = "Unused Solid Asset";
        }
        tempSolid.remove(); // Removed from composition, making it unused

        // --- New Rules ---
        // 9. Default-named comp "Comp 1" (Warning: precomp-organization)
        var defaultNamedComp = proj.items.addComp("Comp 1", 1920, 1080, 1.0, 10.0, 24);

        // 10. Disabled-but-present layer (Warning: disabled-layer)
        var disabledLayer = mainComp.layers.addSolid([0.3, 0.3, 0.3], "Hidden Old Layout", 1920, 1080, 1.0, 10.0);
        disabledLayer.enabled = false;
        disabledLayer.guideLayer = false;

        // 11. Layer with Heavy Effects: Gaussian Blur and Glow (Warning: heavy-effect)
        var heavyFxLayer = mainComp.layers.addSolid([0.9, 0.8, 0.1], "Heavy FX Layer", 1920, 1080, 1.0, 10.0);
        try {
            var fxParade = heavyFxLayer.property("ADBE Effect Parade") || heavyFxLayer.property("Effects");
            fxParade.addProperty("ADBE Gaussian Blur 2");
            fxParade.addProperty("ADBE Glo2");
        } catch (eFxAdd) {
            try {
                heavyFxLayer.Effects.addProperty("Gaussian Blur");
                heavyFxLayer.Effects.addProperty("Glow");
            } catch (eFxAdd2) {}
        }

        // 12. Oversized footage: width > 2x comp width (Warning: oversized-footage)
        var oversizedLayer = mainComp.layers.addSolid([0.6, 0.2, 0.7], "Oversized Texture", 4200, 2400, 1.0, 10.0);

        // 13. Duplicate footage items (Warning: duplicate-footage)
        // Safely creates a tiny 1x1 BMP temp file and imports it twice
        try {
            var bmpBytes = [
                0x42, 0x4D, 0x3A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x36, 0x00, 0x00, 0x00,
                0x28, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00,
                0x18, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x13, 0x0B, 0x00, 0x00,
                0x13, 0x0B, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0xFF, 0x00
            ];
            var bmpFile = new File(Folder.temp.fsName + "/motion_qa_dup_sample.bmp");
            bmpFile.encoding = "BINARY";
            bmpFile.open("w");
            for (var b = 0; b < bmpBytes.length; b++) {
                bmpFile.write(String.fromCharCode(bmpBytes[b]));
            }
            bmpFile.close();

            if (bmpFile.exists) {
                var io1 = new ImportOptions(bmpFile);
                var fItem1 = proj.importFile(io1);
                fItem1.name = "Texture Asset.bmp";

                var io2 = new ImportOptions(bmpFile);
                var fItem2 = proj.importFile(io2);
                fItem2.name = "Texture Asset Duplicate.bmp";
            }
        } catch (eDup) {}

        // Open Main Comp in viewer
        mainComp.openInViewer();

        alert(
            "Motion QA Test Project Generated Successfully!\n\n" +
            "Summary of deliberate issues created:\n" +
            "--------------------------------------------------\n" +
            "• [ERROR] Expression error: 'Expression Test Layer' references missing layer\n" +
            "• [WARNING] Default layer name: 'Shape Layer 1'\n" +
            "• [WARNING] Default layer name: 'Solid 1'\n" +
            "• [WARNING] Overflow outPoint: 'Overflow Background' extends past comp duration\n" +
            "• [WARNING] Inconsistent frame rate: 'Secondary Comp' is 30 fps (Main Comp is 24 fps)\n" +
            "• [WARNING] Unused footage: 'Unused Solid Asset' is not used in any comp\n" +
            "• [WARNING] Default comp name: 'Comp 1' uses unrenamed default name\n" +
            "• [WARNING] Disabled layer: 'Hidden Old Layout' is switched off\n" +
            "• [WARNING] Heavy effects: 'Heavy FX Layer' uses Gaussian Blur & Glow\n" +
            "• [WARNING] Oversized footage: 'Oversized Texture' (4200x2400 in 1920x1080 comp)\n" +
            "• [WARNING] Duplicate footage: 'Texture Asset Duplicate.bmp' shares file path\n\n" +
            "Now open 'Window > Extensions > Motion QA' and click 'Scan Project'."
        );

    } catch (err) {
        alert("Error generating test project: " + err.toString());
    } finally {
        app.endUndoGroup();
    }
})();
