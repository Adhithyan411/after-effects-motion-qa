import os
import tempfile
import pytest
from fastapi.testclient import TestClient

# Configure temporary database before importing app
tmp_db_file = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
tmp_db_file.close()
os.environ["MOTIONQA_DB_PATH"] = tmp_db_file.name

from app import db
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_db():
    # Initialize fresh database before each test
    db.init_db(tmp_db_file.name)
    with db.get_db_connection(tmp_db_file.name) as conn:
        conn.execute("DELETE FROM scans;")
        conn.commit()
    yield


@pytest.fixture(scope="session", autouse=True)
def cleanup_temp_db():
    yield
    try:
        if os.path.exists(tmp_db_file.name):
            os.remove(tmp_db_file.name)
    except Exception:
        pass


def make_sample_payload(
    project_name="Motion QA Test Project", issues=None, passed_count=8
):
    if issues is None:
        issues = [
            {
                "id": "issue-expr-1",
                "severity": "error",
                "rule": "expression-error",
                "title": "Expression error on Position",
                "description": "Expression disabled due to error",
                "compName": "Main Comp",
                "layerName": "Expression Test Layer",
                "compId": 1,
                "layerId": 10,
                "layerIndex": 1,
            },
            {
                "id": "issue-name-1",
                "severity": "warning",
                "rule": "unnamed-layer",
                "title": "Unnamed layer detected",
                "description": "Layer uses default name Shape Layer 1",
                "compName": "Main Comp",
                "layerName": "Shape Layer 1",
                "compId": 1,
                "layerId": 11,
                "layerIndex": 2,
            },
        ]
    return {
        "projectName": project_name,
        "compCount": 2,
        "layerCount": 5,
        "footageCount": 3,
        "passedCount": passed_count,
        "scanDurationMs": 142.5,
        "issues": issues,
    }


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_save_scan():
    payload = make_sample_payload()
    response = client.post("/scans", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["id"] > 0
    assert data["projectName"] == "Motion QA Test Project"
    assert data["errors"] == 1
    assert data["warnings"] == 1
    assert data["passed"] == 8
    assert data["totalIssues"] == 2
    assert "createdAt" in data


def test_save_scan_validation_error():
    # Missing required field 'projectName'
    response = client.post("/scans", json={"compCount": 1})
    assert response.status_code == 422
    assert "detail" in response.json()


def test_list_scans():
    # Save two different scans
    client.post("/scans", json=make_sample_payload(project_name="Project Alpha"))
    client.post("/scans", json=make_sample_payload(project_name="Project Beta"))

    # Test list all
    res_all = client.get("/scans")
    assert res_all.status_code == 200
    scans = res_all.json()
    assert len(scans) == 2
    # Verify newest first (Project Beta was inserted second)
    assert scans[0]["projectName"] == "Project Beta"
    assert scans[1]["projectName"] == "Project Alpha"

    # Test filter by project
    res_filter = client.get("/scans?project=Project Alpha")
    assert res_filter.status_code == 200
    filtered = res_filter.json()
    assert len(filtered) == 1
    assert filtered[0]["projectName"] == "Project Alpha"

    # Test limit
    res_limit = client.get("/scans?limit=1")
    assert res_limit.status_code == 200
    assert len(res_limit.json()) == 1


def test_get_scan():
    save_res = client.post("/scans", json=make_sample_payload())
    scan_id = save_res.json()["id"]

    res = client.get(f"/scans/{scan_id}")
    assert res.status_code == 200
    scan = res.json()
    assert scan["id"] == scan_id
    assert scan["projectName"] == "Motion QA Test Project"
    assert len(scan["issues"]) == 2
    assert scan["issues"][0]["rule"] == "expression-error"
    assert scan["scanResult"]["projectName"] == "Motion QA Test Project"

    # Non-existent scan
    res_404 = client.get("/scans/99999")
    assert res_404.status_code == 404
    assert res_404.json() == {"detail": "Scan not found"}


def test_delete_scan():
    save_res = client.post("/scans", json=make_sample_payload())
    scan_id = save_res.json()["id"]

    del_res = client.delete(f"/scans/{scan_id}")
    assert del_res.status_code == 200
    assert del_res.json() == {"status": "deleted", "id": scan_id}

    # Verify scan is gone
    get_res = client.get(f"/scans/{scan_id}")
    assert get_res.status_code == 404

    # Deleting again returns 404
    del_404 = client.delete(f"/scans/{scan_id}")
    assert del_404.status_code == 404


def test_compare_scans():
    issue_a = {
        "id": "iss-1",
        "severity": "error",
        "rule": "expression-error",
        "title": "Expr error",
        "description": "Syntax error",
        "compName": "Comp 1",
        "layerName": "Layer 1",
    }
    issue_b = {
        "id": "iss-2",
        "severity": "warning",
        "rule": "unnamed-layer",
        "title": "Unnamed",
        "description": "Default name",
        "compName": "Comp 1",
        "layerName": "Solid 1",
    }
    issue_c = {
        "id": "iss-3",
        "severity": "warning",
        "rule": "heavy-effect",
        "title": "Heavy effect",
        "description": "Gaussian Blur",
        "compName": "Comp 1",
        "layerName": "Layer 2",
    }

    # Scan 1 has issue_a and issue_b
    s1 = client.post(
        "/scans", json=make_sample_payload(issues=[issue_a, issue_b])
    ).json()["id"]
    # Scan 2 has issue_b and issue_c (issue_a resolved, issue_c added)
    s2 = client.post(
        "/scans", json=make_sample_payload(issues=[issue_b, issue_c])
    ).json()["id"]

    cmp_res = client.get(f"/scans/{s1}/compare/{s2}")
    assert cmp_res.status_code == 200
    cmp_data = cmp_res.json()

    assert cmp_data["baseScanId"] == s1
    assert cmp_data["targetScanId"] == s2

    # Added should be issue_c
    assert len(cmp_data["added"]) == 1
    assert cmp_data["added"][0]["rule"] == "heavy-effect"

    # Resolved should be issue_a
    assert len(cmp_data["resolved"]) == 1
    assert cmp_data["resolved"][0]["rule"] == "expression-error"

    # Retained should be issue_b
    assert len(cmp_data["retained"]) == 1
    assert cmp_data["retained"][0]["rule"] == "unnamed-layer"

    # s1 had 1 error, 1 warning. s2 has 0 errors, 2 warnings.
    # errorDelta: 0 - 1 = -1
    # warningDelta: 2 - 1 = +1
    assert cmp_data["errorDelta"] == -1
    assert cmp_data["warningDelta"] == 1

    # Compare with non-existent ID
    cmp_404 = client.get(f"/scans/{s1}/compare/99999")
    assert cmp_404.status_code == 404


def test_export_report_json():
    save_res = client.post("/scans", json=make_sample_payload())
    scan_id = save_res.json()["id"]

    res = client.get(f"/scans/{scan_id}/report?format=json")
    assert res.status_code == 200
    assert "application/json" in res.headers["content-type"]
    assert "attachment; filename=" in res.headers["content-disposition"]
    assert "json" in res.headers["content-disposition"]

    data = res.json()
    assert data["id"] == scan_id
    assert data["projectName"] == "Motion QA Test Project"


def test_export_report_csv():
    save_res = client.post("/scans", json=make_sample_payload())
    scan_id = save_res.json()["id"]

    res = client.get(f"/scans/{scan_id}/report?format=csv")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "attachment; filename=" in res.headers["content-disposition"]
    assert "csv" in res.headers["content-disposition"]

    text = res.text
    lines = text.strip().splitlines()
    assert len(lines) == 3  # 1 header + 2 issues
    assert "severity,rule,title" in lines[0]
    assert "expression-error" in lines[1]
    assert "unnamed-layer" in lines[2]


def test_export_report_html():
    save_res = client.post(
        "/scans",
        json=make_sample_payload(
            project_name="<script>alert('xss')</script> Safe Comp"
        ),
    )
    scan_id = save_res.json()["id"]

    res = client.get(f"/scans/{scan_id}/report?format=html")
    assert res.status_code == 200
    assert "text/html" in res.headers["content-type"]
    assert "attachment; filename=" in res.headers["content-disposition"]
    assert "html" in res.headers["content-disposition"]

    html_content = res.text
    # Verify XSS escaping
    assert "<script>alert('xss')</script>" not in html_content
    assert "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;" in html_content
    assert "@media print" in html_content
    assert "Motion QA Inspection Report" in html_content


def test_export_report_invalid_format():
    save_res = client.post("/scans", json=make_sample_payload())
    scan_id = save_res.json()["id"]

    res = client.get(f"/scans/{scan_id}/report?format=pdf")
    assert res.status_code == 422


def test_cors_headers():
    response = client.options(
        "/scans",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert response.status_code in [200, 204]
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
