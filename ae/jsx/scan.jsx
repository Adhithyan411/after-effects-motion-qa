// ============================================================================
// After Effects Motion QA - ExtendScript Scanner & Issue Revealer
// ES3-Compatible (No let/const/arrow functions/template literals)
// ============================================================================

// --- JSON Polyfill (json2.js) ---
if (typeof JSON !== "object") {
    JSON = {};
}
(function () {
    "use strict";
    function f(t) { return t < 10 ? "0" + t : t; }
    function this_value() { return this.valueOf(); }
    function quote(t) {
        rx_escapable.lastIndex = 0;
        return rx_escapable.test(t) ? '"' + t.replace(rx_escapable, function (t) {
            var e = meta[t];
            return typeof e === "string" ? e : "\\u" + ("0000" + t.charCodeAt(0).toString(16)).slice(-4);
        }) + '"' : '"' + t + '"';
    }
    function str(t, e) {
        var r, n, o, u, f, a = gap, i = e[t];
        switch (i && typeof i === "object" && typeof i.toJSON === "function" && (i = i.toJSON(t)), typeof rep === "function" && (i = rep.call(e, t, i)), typeof i) {
            case "string": return quote(i);
            case "number": return isFinite(i) ? String(i) : "null";
            case "boolean":
            case "null": return String(i);
            case "object":
                if (!i) return "null";
                if (gap += indent, f = [], "[object Array]" === Object.prototype.toString.apply(i)) {
                    for (u = i.length, r = 0; r < u; r += 1) f[r] = str(r, i) || "null";
                    return o = 0 === f.length ? "[]" : gap ? "[\n" + gap + f.join(",\n" + gap) + "\n" + a + "]" : "[" + f.join(",") + "]", gap = a, o;
                }
                if (rep && typeof rep === "object") {
                    for (u = rep.length, r = 0; r < u; r += 1) typeof rep[r] === "string" && (n = rep[r], (o = str(n, i)) && f.push(quote(n) + (gap ? ": " : ":") + o));
                } else {
                    for (n in i) Object.prototype.hasOwnProperty.call(i, n) && ((o = str(n, i)) && f.push(quote(n) + (gap ? ": " : ":") + o));
                }
                return o = 0 === f.length ? "{}" : gap ? "{\n" + gap + f.join(",\n" + gap) + "\n" + a + "}" : "{" + f.join(",") + "}", gap = a, o;
        }
    }
    var rx_one = /^[\],:{}\s]*$/,
        rx_two = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,
        rx_three = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,
        rx_four = /(?:^|:|,)(?:\s*\[)+/g,
        rx_escapable = /[\\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap, indent, meta = { "\b": "\\b", "\t": "\\t", "\n": "\\n", "\f": "\\f", "\r": "\\r", '"': '\\"', "\\": "\\\\" }, rep;
    
    if (typeof JSON.stringify !== "function") {
        JSON.stringify = function (t, e, r) {
            var n;
            if (gap = "", indent = "", typeof r === "number") for (n = 0; n < r; n += 1) indent += " ";
            else typeof r === "string" && (indent = r);
            if (rep = e, e && typeof e !== "function" && (typeof e !== "object" || typeof e.length !== "number")) throw new Error("JSON.stringify");
            return str("", { "": t });
        };
    }
    if (typeof JSON.parse !== "function") {
        JSON.parse = function (text) {
            if (rx_one.test(String(text).replace(rx_two, "@").replace(rx_three, "]").replace(rx_four, ""))) {
                return eval("(" + text + ")");
            }
            throw new SyntaxError("JSON.parse");
        };
    }
}());

// --- Scanner Helpers ---

/**
 * Recursively scans property groups to find expression errors.
 */
function scanPropertiesForExpressionErrors(group, compName, layerName, compId, layerIndex, layerId, issues, maxDepth) {
    if (!group || !group.numProperties || maxDepth <= 0) {
        return 0; // return count of expressions checked
    }
    var exprChecked = 0;
    for (var p = 1; p <= group.numProperties; p++) {
        var prop;
        try {
            prop = group.property(p);
        } catch (eProp) {
            continue;
        }
        if (!prop) continue;

        if (prop.propertyType === PropertyType.PROPERTY) {
            try {
                if (prop.canSetExpression && prop.expression !== "") {
                    exprChecked++;
                    var errorMsg = prop.expressionError;
                    if (errorMsg && typeof errorMsg === "string" && errorMsg.length > 0) {
                        issues.push({
                            id: "issue-expr-" + (issues.length + 1),
                            severity: "error",
                            rule: "expression-error",
                            title: "Expression error on " + prop.name,
                            description: "Layer '" + layerName + "' property '" + prop.name + "' has an expression error: " + errorMsg,
                            compName: compName,
                            layerName: layerName,
                            compId: compId,
                            layerIndex: layerIndex,
                            layerId: layerId
                        });
                    }
                }
            } catch (eExpr) {
                // Ignore property read failure
            }
        } else if (prop.propertyType === PropertyType.INDEXED_GROUP || prop.propertyType === PropertyType.NAMED_GROUP) {
            exprChecked += scanPropertiesForExpressionErrors(prop, compName, layerName, compId, layerIndex, layerId, issues, maxDepth - 1);
        }
    }
    return exprChecked;
}

/**
 * Computes the maximum upward nesting depth for a composition.
 */
function getCompUpwardNestingDepth(comp, visited) {
    if (!comp || !comp.usedIn || comp.usedIn.length === 0) {
        return 0;
    }
    if (!visited) visited = {};
    if (visited[comp.id]) return 0;
    visited[comp.id] = true;

    var maxDepth = 0;
    for (var u = 0; u < comp.usedIn.length; u++) {
        var parentComp = comp.usedIn[u];
        if (parentComp && parentComp instanceof CompItem && parentComp.id !== comp.id) {
            var depth = 1 + getCompUpwardNestingDepth(parentComp, visited);
            if (depth > maxDepth) {
                maxDepth = depth;
            }
        }
    }
    delete visited[comp.id];
    return maxDepth;
}

/**
 * Computes the maximum downward nesting depth for a composition.
 */
function getCompDownwardNestingDepth(comp, visited) {
    if (!comp || !comp.numLayers) return 0;
    if (!visited) visited = {};
    if (visited[comp.id]) return 0;
    visited[comp.id] = true;

    var maxSubDepth = 0;
    for (var l = 1; l <= comp.numLayers; l++) {
        try {
            var layer = comp.layer(l);
            if (layer && layer.source && layer.source instanceof CompItem && layer.source.id !== comp.id) {
                var subDepth = 1 + getCompDownwardNestingDepth(layer.source, visited);
                if (subDepth > maxSubDepth) {
                    maxSubDepth = subDepth;
                }
            }
        } catch (eLayer) {}
    }
    delete visited[comp.id];
    return maxSubDepth;
}

/**
 * Main project scanning function.
 * Returns a JSON string matching the Motion QA schema.
 */
function scanProject() {
    try {
        // Handle "no project open" gracefully
        if (!app.project || !app.project.items || (app.project.items.length === 0 && !app.project.file)) {
            return JSON.stringify({
                error: "No active project found in After Effects.",
                noProject: true,
                projectName: "No Project Open",
                compCount: 0,
                layerCount: 0,
                footageCount: 0,
                issues: [],
                passedCount: 0
            });
        }

        var proj = app.project;
        var projectName = (proj.file && proj.file.name) ? proj.file.name : "Untitled Project";

        var compCount = 0;
        var layerCount = 0;
        var footageCount = 0;
        var passedCount = 0;
        var issues = [];

        var firstComp = null;
        var defaultLayerRegex = /^((Shape Layer|Solid|Null|Text|Camera|Light|Adjustment Layer)\s*\d+|.*Solid\s*\d+)$/i;
        var defaultCompRegex = /^((Comp|Pre-comp|Precomp)\s*\d+)$/i;

        // Map to track duplicate file paths across footage items
        var footageByFilePath = {};

        // Iterate through all project items
        var numItems = proj.numItems || proj.items.length;
        for (var i = 1; i <= numItems; i++) {
            var item = proj.item(i);
            if (!item) continue;

            // ================================================================
            // 1. FOOTAGE ITEM CHECKS
            // ================================================================
            if (item instanceof FootageItem) {
                footageCount++;

                // Rule c: Missing / offline footage
                try {
                    if (item.footageMissing) {
                        issues.push({
                            id: "issue-footage-missing-" + (issues.length + 1),
                            severity: "error",
                            rule: "missing-footage",
                            title: "Missing footage detected",
                            description: "Footage file '" + item.name + "' is offline or cannot be found on disk.",
                            compName: "",
                            layerName: item.name,
                            itemId: item.id
                        });
                    } else {
                        passedCount++;
                    }
                } catch (eMissing) {}

                // Rule b: Unused footage items
                try {
                    if (item.usedIn && item.usedIn.length === 0) {
                        issues.push({
                            id: "issue-footage-unused-" + (issues.length + 1),
                            severity: "warning",
                            rule: "unused-footage",
                            title: "Unused footage detected",
                            description: "Footage item '" + item.name + "' is imported but not used in any composition.",
                            compName: "",
                            layerName: item.name,
                            itemId: item.id
                        });
                    } else {
                        passedCount++;
                    }
                } catch (eUnused) {}

                // Rule 4 (New): Track file paths for Duplicate Footage check
                try {
                    if (item.file) {
                        var fPath = item.file.fsName || item.file.fullName || item.file.absoluteURI;
                        if (fPath) {
                            var normalizedPath = fPath.toLowerCase();
                            if (!footageByFilePath[normalizedPath]) {
                                footageByFilePath[normalizedPath] = [];
                            }
                            footageByFilePath[normalizedPath].push(item);
                        }
                    }
                } catch (ePath) {}

                // Rule 6 (New): Oversized footage items
                try {
                    if (item.width > 0 && item.usedIn && item.usedIn.length > 0) {
                        var isOversized = false;
                        for (var u = 0; u < item.usedIn.length; u++) {
                            var targetComp = item.usedIn[u];
                            if (targetComp && targetComp instanceof CompItem) {
                                if (item.width > (targetComp.width * 2) || item.height > (targetComp.height * 2)) {
                                    isOversized = true;
                                    issues.push({
                                        id: "issue-oversized-" + (issues.length + 1),
                                        severity: "warning",
                                        rule: "oversized-footage",
                                        title: "Oversized footage asset",
                                        description: "Footage '" + item.name + "' (" + item.width + "x" + item.height + ") is more than 2x larger than comp '" + targetComp.name + "' (" + targetComp.width + "x" + targetComp.height + ").",
                                        compName: targetComp.name,
                                        layerName: item.name,
                                        itemId: item.id,
                                        compId: targetComp.id
                                    });
                                }
                            }
                        }
                        if (!isOversized) {
                            passedCount++;
                        }
                    }
                } catch (eOver) {}
            }

            // ================================================================
            // 2. COMPOSITION CHECKS
            // ================================================================
            if (item instanceof CompItem) {
                compCount++;

                // Rule e: Comps with inconsistent frame rate vs the first/main comp
                try {
                    if (firstComp === null) {
                        firstComp = item;
                        passedCount++; // First comp establishes baseline
                    } else {
                        if (Math.abs(item.frameRate - firstComp.frameRate) > 0.01) {
                            issues.push({
                                id: "issue-framerate-" + (issues.length + 1),
                                severity: "warning",
                                rule: "inconsistent-framerate",
                                title: "Inconsistent frame rate",
                                description: "Composition '" + item.name + "' (" + item.frameRate + " fps) differs from '" + firstComp.name + "' (" + firstComp.frameRate + " fps).",
                                compName: item.name,
                                layerName: "",
                                compId: item.id,
                                itemId: item.id
                            });
                        } else {
                            passedCount++;
                        }
                    }
                } catch (eFps) {}

                // Rule 3 (New): Precomp organization - Default comp name ("Comp 1", "Pre-comp 1")
                try {
                    if (defaultCompRegex.test(item.name)) {
                        issues.push({
                            id: "issue-comp-name-" + (issues.length + 1),
                            severity: "warning",
                            rule: "precomp-organization",
                            title: "Default composition name",
                            description: "Composition '" + item.name + "' appears to use an unrenamed default name.",
                            compName: item.name,
                            layerName: "",
                            compId: item.id,
                            itemId: item.id
                        });
                    } else {
                        passedCount++;
                    }
                } catch (eCompName) {}

                // Rule 3 (New): Precomp organization - Nested more than 4 levels deep
                try {
                    var upDepth = getCompUpwardNestingDepth(item, {});
                    var downDepth = getCompDownwardNestingDepth(item, {});
                    var totalNesting = Math.max(upDepth, downDepth);

                    if (totalNesting > 4) {
                        issues.push({
                            id: "issue-comp-depth-" + (issues.length + 1),
                            severity: "warning",
                            rule: "precomp-organization",
                            title: "Deeply nested composition",
                            description: "Composition '" + item.name + "' is nested " + totalNesting + " levels deep (exceeds recommended max of 4).",
                            compName: item.name,
                            layerName: "",
                            compId: item.id,
                            itemId: item.id
                        });
                    } else {
                        passedCount++;
                    }
                } catch (eDepth) {}

                // ============================================================
                // 3. LAYER CHECKS INSIDE COMPOSITION
                // ============================================================
                var numLayers = item.numLayers;
                for (var l = 1; l <= numLayers; l++) {
                    layerCount++;
                    var layer = item.layer(l);
                    if (!layer) continue;

                    var compId = item.id;
                    var layerIndex = layer.index;
                    var layerId = (typeof layer.id !== "undefined" && layer.id !== null) ? layer.id : layer.index;

                    // Rule a: Default / unnamed layers
                    try {
                        if (defaultLayerRegex.test(layer.name)) {
                            issues.push({
                                id: "issue-layer-name-" + (issues.length + 1),
                                severity: "warning",
                                rule: "unnamed-layer",
                                title: "Unnamed layer detected",
                                description: "Layer '" + layer.name + "' in comp '" + item.name + "' appears to use an unrenamed default name.",
                                compName: item.name,
                                layerName: layer.name,
                                compId: compId,
                                layerIndex: layerIndex,
                                layerId: layerId
                            });
                        } else {
                            passedCount++;
                        }
                    } catch (eLayerName) {}

                    // Rule d: Layers whose outPoint extends beyond comp duration
                    try {
                        var compDuration = item.duration;
                        var layerOut = layer.outPoint;
                        if (layerOut > compDuration + 0.005) {
                            var outSec = Math.round(layerOut * 100) / 100;
                            var durSec = Math.round(compDuration * 100) / 100;
                            issues.push({
                                id: "issue-layer-outpoint-" + (issues.length + 1),
                                severity: "warning",
                                rule: "layer-extends-comp",
                                title: "Layer outPoint extends beyond comp",
                                description: "Layer '" + layer.name + "' extends past composition duration (out: " + outSec + "s, comp: " + durSec + "s).",
                                compName: item.name,
                                layerName: layer.name,
                                compId: compId,
                                layerIndex: layerIndex,
                                layerId: layerId
                            });
                        } else {
                            passedCount++;
                        }
                    } catch (eOutPoint) {}

                    // Rule 5 (New): Disabled-but-present layers (switched off, not guide layer)
                    try {
                        if (!layer.enabled && !layer.guideLayer) {
                            issues.push({
                                id: "issue-disabled-layer-" + (issues.length + 1),
                                severity: "warning",
                                rule: "disabled-layer",
                                title: "Disabled layer present",
                                description: "Layer '" + layer.name + "' is disabled (hidden) and not marked as a guide layer.",
                                compName: item.name,
                                layerName: layer.name,
                                compId: compId,
                                layerIndex: layerIndex,
                                layerId: layerId
                            });
                        } else {
                            passedCount++;
                        }
                    } catch (eDisabled) {}

                    // Rule 2 (New): Heavy effects (Gaussian Blur, Glow, Fast Box Blur > 50, etc.)
                    try {
                        var fxGroup = layer.property("ADBE Effect Parade") || layer.property("Effects");
                        var foundHeavy = false;
                        if (fxGroup && fxGroup.numProperties) {
                            for (var ef = 1; ef <= fxGroup.numProperties; ef++) {
                                var eff = fxGroup.property(ef);
                                if (!eff) continue;
                                var efName = eff.name || "";
                                var efMatch = eff.matchName || "";
                                var isHeavy = false;
                                var heavyName = "";

                                if (/Gaussian Blur/i.test(efName) || /Gaussian/i.test(efMatch)) {
                                    isHeavy = true;
                                    heavyName = "Gaussian Blur";
                                } else if (/Directional Blur/i.test(efName) || /Directional/i.test(efMatch)) {
                                    isHeavy = true;
                                    heavyName = "Directional Blur";
                                } else if (/Glow/i.test(efName) || /Glo2/i.test(efMatch)) {
                                    isHeavy = true;
                                    heavyName = "Glow";
                                } else if (/Motion Tile/i.test(efName) || /Motion2/i.test(efMatch)) {
                                    isHeavy = true;
                                    heavyName = "Motion Tile";
                                } else if (/Time Displacement/i.test(efName) || /Time Displacement/i.test(efMatch)) {
                                    isHeavy = true;
                                    heavyName = "Time Displacement";
                                } else if (/Particle/i.test(efName) || /Particle/i.test(efMatch)) {
                                    isHeavy = true;
                                    heavyName = efName;
                                } else if (/Fast Box Blur|Box Blur/i.test(efName) || /Box Blur/i.test(efMatch)) {
                                    var blurRadius = null;
                                    try {
                                        var rProp = eff.property("Blur Radius") || eff.property("Radius") || eff.property(1);
                                        if (rProp && typeof rProp.value === "number") {
                                            blurRadius = rProp.value;
                                        }
                                    } catch (eR) {}
                                    if (blurRadius === null || blurRadius > 50) {
                                        isHeavy = true;
                                        heavyName = "Fast Box Blur" + (blurRadius !== null ? " (Radius: " + Math.round(blurRadius) + ")" : "");
                                    }
                                }

                                if (isHeavy) {
                                    foundHeavy = true;
                                    issues.push({
                                        id: "issue-heavy-effect-" + (issues.length + 1),
                                        severity: "warning",
                                        rule: "heavy-effect",
                                        title: "Performance heavy effect",
                                        description: "Layer '" + layer.name + "' uses known render-heavy effect: " + heavyName + ".",
                                        compName: item.name,
                                        layerName: layer.name,
                                        compId: compId,
                                        layerIndex: layerIndex,
                                        layerId: layerId
                                    });
                                }
                            }
                        }
                        if (!foundHeavy) {
                            passedCount++;
                        }
                    } catch (eFx) {}

                    // Rule 1 (New): Missing or substituted fonts
                    try {
                        var textProps = layer.property("ADBE Text Properties") || layer.property("Text");
                        var srcTextProp = textProps ? (textProps.property("ADBE Text Document") || textProps.property("Source Text")) : layer.property("Source Text");
                        if (srcTextProp) {
                            var textDoc = srcTextProp.value;
                            if (textDoc) {
                                var fontName = textDoc.font || "";
                                var isMissingFont = false;

                                // Modern AE font verification API (AE 24.0+)
                                if (app.fonts && app.fonts.missingOrSubstitutedFonts && app.fonts.missingOrSubstitutedFonts.length > 0) {
                                    var missingList = app.fonts.missingOrSubstitutedFonts;
                                    for (var mf = 0; mf < missingList.length; mf++) {
                                        var fontObj = missingList[mf];
                                        if (fontObj && (fontObj.postScriptName === fontName || fontObj.fullName === fontName || fontObj.family === fontName)) {
                                            isMissingFont = true;
                                            break;
                                        }
                                    }
                                }

                                // Traditional AE bracket check for substituted/missing fonts
                                if (!isMissingFont && fontName && (fontName.indexOf("[") === 0 || /^\[.*\]$/.test(fontName))) {
                                    isMissingFont = true;
                                }

                                if (isMissingFont) {
                                    issues.push({
                                        id: "issue-font-missing-" + (issues.length + 1),
                                        severity: "warning",
                                        rule: "missing-font",
                                        title: "Missing or substituted font",
                                        description: "Text layer '" + layer.name + "' uses missing or substituted font: " + fontName + ".",
                                        compName: item.name,
                                        layerName: layer.name,
                                        compId: compId,
                                        layerIndex: layerIndex,
                                        layerId: layerId
                                    });
                                } else {
                                    passedCount++;
                                }
                            }
                        }
                    } catch (eFont) {}

                    // Rule f: Expressions with errors
                    try {
                        var issuesBeforeExpr = issues.length;
                        var exprsChecked = scanPropertiesForExpressionErrors(layer, item.name, layer.name, compId, layerIndex, layerId, issues, 6);
                        var exprIssuesFound = issues.length - issuesBeforeExpr;
                        if (exprsChecked > exprIssuesFound) {
                            passedCount += (exprsChecked - exprIssuesFound);
                        }
                    } catch (eExprs) {}
                }
            }
        }

        // Rule 4 (New): Process duplicate footage paths
        try {
            for (var pKey in footageByFilePath) {
                if (footageByFilePath.hasOwnProperty(pKey)) {
                    var itemsList = footageByFilePath[pKey];
                    if (itemsList && itemsList.length > 1) {
                        for (var d = 1; d < itemsList.length; d++) {
                            var dupFootage = itemsList[d];
                            issues.push({
                                id: "issue-duplicate-footage-" + (issues.length + 1),
                                severity: "warning",
                                rule: "duplicate-footage",
                                title: "Duplicate footage item",
                                description: "Footage item '" + dupFootage.name + "' references the same file path as '" + itemsList[0].name + "'.",
                                compName: "",
                                layerName: dupFootage.name,
                                itemId: dupFootage.id
                            });
                        }
                    } else if (itemsList && itemsList.length === 1) {
                        passedCount++;
                    }
                }
            }
        } catch (eDupCheck) {}

        var result = {
            projectName: projectName,
            compCount: compCount,
            layerCount: layerCount,
            footageCount: footageCount,
            issues: issues,
            passedCount: passedCount
        };

        return JSON.stringify(result);

    } catch (err) {
        return JSON.stringify({
            error: "ExtendScript scan error: " + err.toString(),
            projectName: "Scan Error",
            compCount: 0,
            layerCount: 0,
            footageCount: 0,
            issues: [],
            passedCount: 0
        });
    }
}

// --- Reveal Helpers ---

function findCompByIdOrName(compId, compName) {
    if (!app.project) return null;
    var numItems = app.project.numItems || app.project.items.length;
    var fallback = null;
    for (var i = 1; i <= numItems; i++) {
        var it = app.project.item(i);
        if (it && it instanceof CompItem) {
            if (compId && it.id === compId) {
                return it;
            }
            if (compName && it.name === compName && !fallback) {
                fallback = it;
            }
        }
    }
    return fallback;
}

function findProjectItem(itemId, itemName) {
    if (!app.project) return null;
    var numItems = app.project.numItems || app.project.items.length;
    var fallback = null;
    for (var i = 1; i <= numItems; i++) {
        var it = app.project.item(i);
        if (it) {
            if (itemId && it.id === itemId) {
                return it;
            }
            if (itemName && it.name === itemName && !fallback) {
                fallback = it;
            }
        }
    }
    return fallback;
}

/**
 * Selects and reveals an issue in Adobe After Effects.
 * Returns JSON: { ok: true } or { ok: false, error: string }
 */
function revealIssue(jsonString) {
    try {
        if (!app.project) {
            return JSON.stringify({ ok: false, error: "No active project open in After Effects." });
        }

        var issue;
        if (typeof jsonString === "string") {
            issue = JSON.parse(jsonString);
        } else if (typeof jsonString === "object" && jsonString !== null) {
            issue = jsonString;
        } else {
            return JSON.stringify({ ok: false, error: "Invalid parameter provided to revealIssue." });
        }

        // Case 1: Layer issue (unnamed layer, outpoint, expression error, disabled layer, heavy effect, missing font)
        var isLayerIssue = issue.compId && (
            issue.rule === "unnamed-layer" ||
            issue.rule === "layer-extends-comp" ||
            issue.rule === "expression-error" ||
            issue.rule === "disabled-layer" ||
            issue.rule === "heavy-effect" ||
            issue.rule === "missing-font" ||
            (typeof issue.layerId !== "undefined" && issue.rule !== "inconsistent-framerate" && issue.rule !== "precomp-organization" && issue.rule !== "oversized-footage")
        );

        if (isLayerIssue) {
            var comp = findCompByIdOrName(issue.compId, issue.compName);
            if (!comp) {
                return JSON.stringify({
                    ok: false,
                    error: "Composition '" + (issue.compName || "Comp " + issue.compId) + "' not found. It may have been deleted."
                });
            }

            // Open composition in viewer
            comp.openInViewer();

            // Deselect all layers in the composition
            for (var l = 1; l <= comp.numLayers; l++) {
                try {
                    comp.layer(l).selected = false;
                } catch (eDesel) {}
            }

            // Find target layer by id, falling back to index, then name
            var targetLayer = null;

            // Try layerId
            if (typeof issue.layerId !== "undefined" && issue.layerId !== null) {
                for (var li = 1; li <= comp.numLayers; li++) {
                    var lyr = comp.layer(li);
                    if (lyr && typeof lyr.id !== "undefined" && lyr.id === issue.layerId) {
                        targetLayer = lyr;
                        break;
                    }
                }
            }

            // Fallback: layerIndex
            if (!targetLayer && typeof issue.layerIndex === "number" && issue.layerIndex >= 1 && issue.layerIndex <= comp.numLayers) {
                var lyrByIndex = comp.layer(issue.layerIndex);
                if (lyrByIndex && (!issue.layerName || lyrByIndex.name === issue.layerName)) {
                    targetLayer = lyrByIndex;
                }
            }

            // Fallback: layerName
            if (!targetLayer && issue.layerName) {
                for (var ln = 1; ln <= comp.numLayers; ln++) {
                    if (comp.layer(ln).name === issue.layerName) {
                        targetLayer = comp.layer(ln);
                        break;
                    }
                }
            }

            if (!targetLayer) {
                return JSON.stringify({
                    ok: false,
                    error: "Layer '" + (issue.layerName || "target") + "' not found in comp '" + comp.name + "'. It may have been deleted or renamed."
                });
            }

            targetLayer.selected = true;
            return JSON.stringify({ ok: true });
        }

        // Case 2: Project-level footage issue (unused, missing, or duplicate footage)
        if (issue.rule === "unused-footage" || issue.rule === "missing-footage" || issue.rule === "duplicate-footage") {
            var targetItem = findProjectItem(issue.itemId, issue.layerName);
            if (!targetItem) {
                return JSON.stringify({
                    ok: false,
                    error: "Footage item '" + (issue.layerName || "target") + "' not found in Project panel."
                });
            }

            // Deselect other items in Project panel
            var numItems = app.project.numItems || app.project.items.length;
            for (var p = 1; p <= numItems; p++) {
                try {
                    app.project.item(p).selected = false;
                } catch (eP) {}
            }

            targetItem.selected = true;
            return JSON.stringify({ ok: true });
        }

        // Case 3: Oversized footage issue (open comp and select footage in Project panel)
        if (issue.rule === "oversized-footage") {
            if (issue.compId) {
                var overComp = findCompByIdOrName(issue.compId, issue.compName);
                if (overComp) {
                    overComp.openInViewer();
                }
            }
            if (issue.itemId) {
                var overItem = findProjectItem(issue.itemId, issue.layerName);
                if (overItem) {
                    var totalP = app.project.numItems || app.project.items.length;
                    for (var pi = 1; pi <= totalP; pi++) {
                        try {
                            app.project.item(pi).selected = false;
                        } catch (eO) {}
                    }
                    overItem.selected = true;
                    return JSON.stringify({ ok: true });
                }
            }
            return JSON.stringify({ ok: true });
        }

        // Case 4: Comp-level issue (inconsistent-framerate or precomp-organization)
        if (issue.rule === "inconsistent-framerate" || issue.rule === "precomp-organization" || (issue.compId && !issue.layerName)) {
            var targetComp = findCompByIdOrName(issue.compId, issue.compName);
            if (!targetComp) {
                return JSON.stringify({
                    ok: false,
                    error: "Composition '" + (issue.compName || "target") + "' not found."
                });
            }

            // Deselect other items in Project panel
            var totalItems = app.project.numItems || app.project.items.length;
            for (var c = 1; c <= totalItems; c++) {
                try {
                    app.project.item(c).selected = false;
                } catch (eC) {}
            }

            targetComp.selected = true;
            targetComp.openInViewer();
            return JSON.stringify({ ok: true });
        }

        return JSON.stringify({ ok: false, error: "Unable to determine issue target type." });

    } catch (err) {
        return JSON.stringify({
            ok: false,
            error: "ExtendScript reveal error: " + err.toString()
        });
    }
}

// Expose globally
$.global.scanProject = scanProject;
$.global.revealIssue = revealIssue;
