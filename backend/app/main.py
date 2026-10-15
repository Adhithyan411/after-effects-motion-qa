from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import db
from app.models import CompareResult, SavedScan, SavedScanSummary, ScanResult
from app.reports import build_csv_report, build_html_report, build_json_report


@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    db.init_db()
    yield


app = FastAPI(
    title="After Effects Motion QA API",
    description="Backend API for the After Effects Motion QA tool",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS setup for CEP panel (loaded from file://, null, or dev servers)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "null",
        "file://",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8088",
    ],
    allow_origin_regex=r"^(null|file:\/\/.*|http:\/\/localhost:\d+|http:\/\/127\.0\.0\.1:\d+)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": "Request validation failed", "errors": exc.errors()},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Hide internal tracebacks to prevent information leakage
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error occurred."},
    )


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/scans", response_model=SavedScanSummary, status_code=201)
def create_scan(scan_result: ScanResult):
    saved = db.save_scan(scan_result)
    return SavedScanSummary(
        id=saved.id,
        projectName=saved.projectName,
        createdAt=saved.createdAt,
        errors=saved.errors,
        warnings=saved.warnings,
        passed=saved.passed,
        totalIssues=saved.totalIssues,
        compCount=saved.compCount,
        layerCount=saved.layerCount,
        footageCount=saved.footageCount,
    )


@app.get("/scans", response_model=List[SavedScanSummary])
def get_scans(
    project: Optional[str] = Query(None, description="Filter by project name"),
    limit: Optional[int] = Query(None, ge=1, description="Max records to return"),
):
    return db.list_scans(project=project, limit=limit)


@app.get("/scans/{scan_id}", response_model=SavedScan)
def get_scan_by_id(scan_id: int):
    scan = db.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan


@app.delete("/scans/{scan_id}")
def delete_scan_by_id(scan_id: int):
    deleted = db.delete_scan(scan_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Scan not found")
    return {"status": "deleted", "id": scan_id}


@app.get("/scans/{scan_id}/compare/{other_id}", response_model=CompareResult)
def compare_scans(scan_id: int, other_id: int):
    base_scan = db.get_scan(scan_id)
    if not base_scan:
        raise HTTPException(
            status_code=404, detail=f"Base scan with ID {scan_id} not found"
        )

    target_scan = db.get_scan(other_id)
    if not target_scan:
        raise HTTPException(
            status_code=404, detail=f"Target scan with ID {other_id} not found"
        )

    def issue_key(issue):
        return (issue.rule, issue.compName or "", issue.layerName or "")

    base_map = {}
    for iss in base_scan.issues:
        k = issue_key(iss)
        base_map.setdefault(k, []).append(iss)

    target_map = {}
    for iss in target_scan.issues:
        k = issue_key(iss)
        target_map.setdefault(k, []).append(iss)

    added = []
    resolved = []
    retained = []

    all_keys = set(base_map.keys()) | set(target_map.keys())
    for k in sorted(all_keys):
        base_list = base_map.get(k, [])
        target_list = target_map.get(k, [])
        matched = min(len(base_list), len(target_list))

        retained.extend(target_list[:matched])
        if len(target_list) > matched:
            added.extend(target_list[matched:])
        if len(base_list) > matched:
            resolved.extend(base_list[matched:])

    error_delta = target_scan.errors - base_scan.errors
    warning_delta = target_scan.warnings - base_scan.warnings

    return CompareResult(
        baseScanId=scan_id,
        targetScanId=other_id,
        added=added,
        resolved=resolved,
        retained=retained,
        remaining=retained,
        errorDelta=error_delta,
        warningDelta=warning_delta,
    )


@app.get("/scans/{scan_id}/report")
def export_scan_report(
    scan_id: int,
    format: str = Query(
        "html",
        pattern="^(json|csv|html)$",
        description="Report format: json, csv, or html",
    ),
):
    scan = db.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    fmt = format.lower()
    if fmt == "json":
        content, media_type, filename = build_json_report(scan)
    elif fmt == "csv":
        content, media_type, filename = build_csv_report(scan)
    elif fmt == "html":
        content, media_type, filename = build_html_report(scan)
    else:
        raise HTTPException(
            status_code=422,
            detail="Invalid format. Supported formats: json, csv, html",
        )

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )