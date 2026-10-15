import json
import os
import sqlite3
from datetime import datetime, timezone
from typing import List, Optional

from app.models import Issue, SavedScan, SavedScanSummary, ScanResult


def get_default_db_path() -> str:
    env_path = os.getenv("MOTIONQA_DB_PATH")
    if env_path:
        return env_path
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(backend_dir, "data", "motionqa.db")


def get_db_connection(db_path: Optional[str] = None) -> sqlite3.Connection:
    target_path = db_path or get_default_db_path()
    # Ensure directory exists if not an in-memory database
    if target_path != ":memory:":
        os.makedirs(os.path.dirname(os.path.abspath(target_path)), exist_ok=True)
    conn = sqlite3.connect(target_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path: Optional[str] = None) -> None:
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS scans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_name TEXT NOT NULL,
                created_at TEXT NOT NULL,
                errors_count INTEGER NOT NULL,
                warnings_count INTEGER NOT NULL,
                passed_count INTEGER NOT NULL,
                total_issues INTEGER NOT NULL,
                comp_count INTEGER NOT NULL DEFAULT 0,
                layer_count INTEGER NOT NULL DEFAULT 0,
                footage_count INTEGER NOT NULL DEFAULT 0,
                scan_duration_ms REAL,
                data_json TEXT NOT NULL
            );
            """
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_scans_project ON scans(project_name);"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_scans_created ON scans(created_at DESC);"
        )
        conn.commit()


def save_scan(scan_result: ScanResult, db_path: Optional[str] = None) -> SavedScan:
    init_db(db_path)

    now_iso = datetime.now(timezone.utc).isoformat()
    errors = sum(1 for iss in scan_result.issues if iss.severity == "error")
    warnings = sum(1 for iss in scan_result.issues if iss.severity == "warning")
    passed = scan_result.passedCount
    total = len(scan_result.issues)

    data_payload = scan_result.model_dump()
    data_json = json.dumps(data_payload)

    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO scans (
                project_name, created_at, errors_count, warnings_count,
                passed_count, total_issues, comp_count, layer_count,
                footage_count, scan_duration_ms, data_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                scan_result.projectName,
                now_iso,
                errors,
                warnings,
                passed,
                total,
                scan_result.compCount,
                scan_result.layerCount,
                scan_result.footageCount,
                scan_result.scanDurationMs,
                data_json,
            ),
        )
        conn.commit()
        scan_id = cursor.lastrowid

    return SavedScan(
        id=scan_id,
        projectName=scan_result.projectName,
        createdAt=now_iso,
        compCount=scan_result.compCount,
        layerCount=scan_result.layerCount,
        footageCount=scan_result.footageCount,
        passedCount=scan_result.passedCount,
        scanDurationMs=scan_result.scanDurationMs,
        errors=errors,
        warnings=warnings,
        passed=passed,
        totalIssues=total,
        issues=scan_result.issues,
        scanResult=scan_result,
    )


def list_scans(
    project: Optional[str] = None,
    limit: Optional[int] = None,
    db_path: Optional[str] = None,
) -> List[SavedScanSummary]:
    init_db(db_path)

    query = """
        SELECT id, project_name, created_at, errors_count, warnings_count,
               passed_count, total_issues, comp_count, layer_count, footage_count
        FROM scans
    """
    params = []

    if project:
        query += " WHERE LOWER(project_name) = LOWER(?)"
        params.append(project)

    query += " ORDER BY id DESC"

    if limit is not None and limit > 0:
        query += " LIMIT ?"
        params.append(limit)

    results: List[SavedScanSummary] = []
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(query, tuple(params))
        for row in cursor.fetchall():
            results.append(
                SavedScanSummary(
                    id=row["id"],
                    projectName=row["project_name"],
                    createdAt=row["created_at"],
                    errors=row["errors_count"],
                    warnings=row["warnings_count"],
                    passed=row["passed_count"],
                    totalIssues=row["total_issues"],
                    compCount=row["comp_count"],
                    layerCount=row["layer_count"],
                    footageCount=row["footage_count"],
                )
            )
    return results


def get_scan(scan_id: int, db_path: Optional[str] = None) -> Optional[SavedScan]:
    init_db(db_path)

    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, project_name, created_at, errors_count, warnings_count,
                   passed_count, total_issues, comp_count, layer_count,
                   footage_count, scan_duration_ms, data_json
            FROM scans
            WHERE id = ?
            """,
            (scan_id,),
        )
        row = cursor.fetchone()
        if not row:
            return None

        data = json.loads(row["data_json"])
        issues_raw = data.get("issues", [])
        issues = [Issue(**iss) for iss in issues_raw]

        scan_result = ScanResult(
            projectName=row["project_name"],
            compCount=row["comp_count"],
            layerCount=row["layer_count"],
            footageCount=row["footage_count"],
            passedCount=row["passed_count"],
            issues=issues,
            scanDurationMs=row["scan_duration_ms"],
        )

        return SavedScan(
            id=row["id"],
            projectName=row["project_name"],
            createdAt=row["created_at"],
            compCount=row["comp_count"],
            layerCount=row["layer_count"],
            footageCount=row["footage_count"],
            passedCount=row["passed_count"],
            scanDurationMs=row["scan_duration_ms"],
            errors=row["errors_count"],
            warnings=row["warnings_count"],
            passed=row["passed_count"],
            totalIssues=row["total_issues"],
            issues=issues,
            scanResult=scan_result,
        )


def delete_scan(scan_id: int, db_path: Optional[str] = None) -> bool:
    init_db(db_path)

    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM scans WHERE id = ?", (scan_id,))
        conn.commit()
        return cursor.rowcount > 0
