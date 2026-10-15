import csv
import html
import io
import re
from datetime import datetime
from typing import Tuple

from app.models import SavedScan


def sanitize_filename_part(text: str) -> str:
    cleaned = re.sub(r"[^\w\-]+", "_", text).strip("_")
    return cleaned if cleaned else "project"


def make_report_filename(project_name: str, created_at: str, extension: str) -> str:
    slug = sanitize_filename_part(project_name)
    try:
        # Try parsing ISO date
        dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        date_str = dt.strftime("%Y-%m-%d")
    except Exception:
        date_str = created_at[:10] if len(created_at) >= 10 else "scan"
    date_slug = sanitize_filename_part(date_str)
    return f"motionqa-{slug}-{date_slug}.{extension}"


def build_json_report(scan: SavedScan) -> Tuple[str, str, str]:
    filename = make_report_filename(scan.projectName, scan.createdAt, "json")
    content = scan.model_dump_json(indent=2)
    media_type = "application/json; charset=utf-8"
    return content, media_type, filename


def build_csv_report(scan: SavedScan) -> Tuple[str, str, str]:
    filename = make_report_filename(scan.projectName, scan.createdAt, "csv")
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(
        [
            "id",
            "severity",
            "rule",
            "title",
            "description",
            "compName",
            "layerName",
            "compId",
            "layerId",
            "layerIndex",
            "itemId",
        ]
    )

    for issue in scan.issues:
        writer.writerow(
            [
                issue.id,
                issue.severity,
                issue.rule,
                issue.title,
                issue.description,
                issue.compName,
                issue.layerName,
                issue.compId if issue.compId is not None else "",
                issue.layerId if issue.layerId is not None else "",
                issue.layerIndex if issue.layerIndex is not None else "",
                issue.itemId if issue.itemId is not None else "",
            ]
        )

    media_type = "text/csv; charset=utf-8"
    return output.getvalue(), media_type, filename


def build_html_report(scan: SavedScan) -> Tuple[str, str, str]:
    filename = make_report_filename(scan.projectName, scan.createdAt, "html")

    esc_project = html.escape(scan.projectName)
    esc_date = html.escape(scan.createdAt)

    error_issues = [iss for iss in scan.issues if iss.severity == "error"]
    warning_issues = [iss for iss in scan.issues if iss.severity == "warning"]

    def render_issue_card(iss, border_color, badge_bg, badge_fg) -> str:
        esc_title = html.escape(iss.title)
        esc_rule = html.escape(iss.rule)
        esc_desc = html.escape(iss.description)
        esc_comp = html.escape(iss.compName) if iss.compName else "None"
        esc_layer = html.escape(iss.layerName) if iss.layerName else "None"

        meta_parts = []
        if iss.compName:
            meta_parts.append(f"<strong>Comp:</strong> {esc_comp}")
        if iss.layerName:
            meta_parts.append(f"<strong>Layer / Asset:</strong> {esc_layer}")
        if iss.compId is not None:
            meta_parts.append(f"<strong>Comp ID:</strong> {html.escape(str(iss.compId))}")
        if iss.layerId is not None:
            meta_parts.append(f"<strong>Layer ID:</strong> {html.escape(str(iss.layerId))}")
        if iss.layerIndex is not None:
            meta_parts.append(f"<strong>Layer Index:</strong> {html.escape(str(iss.layerIndex))}")
        if iss.itemId is not None:
            meta_parts.append(f"<strong>Item ID:</strong> {html.escape(str(iss.itemId))}")

        meta_html = " &bull; ".join(meta_parts) if meta_parts else "Project-level issue"

        return f"""
        <div class="issue-card" style="border-left: 4px solid {border_color};">
            <div class="issue-header">
                <span class="badge" style="background: {badge_bg}; color: {badge_fg};">{html.escape(iss.severity.upper())}</span>
                <span class="issue-rule">{esc_rule}</span>
                <span class="issue-title">{esc_title}</span>
            </div>
            <p class="issue-desc">{esc_desc}</p>
            <div class="issue-meta">{meta_html}</div>
        </div>
        """

    error_cards = "".join(
        render_issue_card(iss, "#ef4444", "#fee2e2", "#991b1b") for iss in error_issues
    )
    warning_cards = "".join(
        render_issue_card(iss, "#f59e0b", "#fef3c7", "#92400e") for iss in warning_issues
    )

    empty_state_html = ""
    if not scan.issues:
        empty_state_html = """
        <div class="empty-state">
            <h3>✓ All QA Checks Passed</h3>
            <p>No errors or warnings detected in this After Effects project scan.</p>
        </div>
        """

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Motion QA Report - {esc_project}</title>
    <style>
        :root {{
            --bg: #0f172a;
            --surface: #1e293b;
            --surface-border: #334155;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --error: #ef4444;
            --warning: #f59e0b;
            --success: #10b981;
            --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }}
        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}
        body {{
            font-family: var(--font);
            background-color: var(--bg);
            color: var(--text-main);
            padding: 2.5rem 1.5rem;
            line-height: 1.5;
        }}
        .container {{
            max-width: 960px;
            margin: 0 auto;
        }}
        header {{
            border-bottom: 1px solid var(--surface-border);
            padding-bottom: 1.5rem;
            margin-bottom: 2rem;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            flex-wrap: wrap;
            gap: 1rem;
        }}
        .brand {{
            font-size: 0.85rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #60a5fa;
            margin-bottom: 0.25rem;
        }}
        h1 {{
            font-size: 1.85rem;
            font-weight: 800;
            color: var(--text-main);
        }}
        .report-date {{
            font-size: 0.875rem;
            color: var(--text-muted);
            margin-top: 0.25rem;
        }}
        .kpi-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 1rem;
            margin-bottom: 2.5rem;
        }}
        .kpi-card {{
            background: var(--surface);
            border: 1px solid var(--surface-border);
            border-radius: 8px;
            padding: 1.25rem;
            text-align: center;
        }}
        .kpi-value {{
            font-size: 2.25rem;
            font-weight: 800;
            line-height: 1;
            margin-bottom: 0.5rem;
        }}
        .kpi-label {{
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
            font-weight: 600;
        }}
        .section-title {{
            font-size: 1.25rem;
            font-weight: 700;
            margin: 2rem 0 1rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }}
        .issue-card {{
            background: var(--surface);
            border: 1px solid var(--surface-border);
            border-radius: 6px;
            padding: 1.25rem;
            margin-bottom: 1rem;
        }}
        .issue-header {{
            display: flex;
            align-items: center;
            gap: 0.75rem;
            flex-wrap: wrap;
            margin-bottom: 0.5rem;
        }}
        .badge {{
            font-size: 0.7rem;
            font-weight: 700;
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            letter-spacing: 0.05em;
        }}
        .issue-rule {{
            font-family: monospace;
            font-size: 0.8rem;
            color: #93c5fd;
            background: rgba(147, 197, 253, 0.1);
            padding: 0.15rem 0.4rem;
            border-radius: 3px;
        }}
        .issue-title {{
            font-weight: 600;
            font-size: 1rem;
        }}
        .issue-desc {{
            color: #cbd5e1;
            font-size: 0.925rem;
            margin-bottom: 0.75rem;
        }}
        .issue-meta {{
            font-size: 0.8rem;
            color: var(--text-muted);
            border-top: 1px solid rgba(255, 255, 255, 0.06);
            padding-top: 0.5rem;
        }}
        .empty-state {{
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.3);
            border-radius: 8px;
            padding: 2rem;
            text-align: center;
            color: #34d399;
        }}
        @media print {{
            body {{
                background: #ffffff !important;
                color: #0f172a !important;
                padding: 1cm;
            }}
            .kpi-card, .issue-card {{
                background: #f8fafc !important;
                border-color: #cbd5e1 !important;
                color: #0f172a !important;
                break-inside: avoid;
            }}
            .issue-desc {{
                color: #334155 !important;
            }}
            .issue-meta {{
                color: #64748b !important;
                border-top-color: #e2e8f0 !important;
            }}
            .brand {{
                color: #2563eb !important;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div>
                <div class="brand">Motion QA Inspection Report</div>
                <h1>{esc_project}</h1>
                <div class="report-date">Generated on {esc_date}</div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 0.875rem; color: var(--text-muted);">Scope</div>
                <div style="font-size: 0.95rem; font-weight: 600;">{scan.compCount} Comps &bull; {scan.layerCount} Layers &bull; {scan.footageCount} Assets</div>
            </div>
        </header>

        <section class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-value" style="color: {'#ef4444' if scan.errors > 0 else 'var(--text-main)'};">{scan.errors}</div>
                <div class="kpi-label">Errors</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value" style="color: {'#f59e0b' if scan.warnings > 0 else 'var(--text-main)'};">{scan.warnings}</div>
                <div class="kpi-label">Warnings</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value" style="color: var(--success);">{scan.passed}</div>
                <div class="kpi-label">Passed Checks</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">{scan.totalIssues}</div>
                <div class="kpi-label">Total Issues</div>
            </div>
        </section>

        {empty_state_html}

        {f'<h2 class="section-title" style="color: var(--error);">Errors ({len(error_issues)})</h2>' + error_cards if error_issues else ''}

        {f'<h2 class="section-title" style="color: var(--warning);">Warnings ({len(warning_issues)})</h2>' + warning_cards if warning_issues else ''}
    </div>
</body>
</html>
"""
    media_type = "text/html; charset=utf-8"
    return html_content, media_type, filename
