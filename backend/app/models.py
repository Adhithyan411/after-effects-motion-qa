from typing import List, Literal, Optional, Union
from pydantic import BaseModel, Field


class Issue(BaseModel):
    id: str
    severity: Literal["error", "warning"]
    rule: str
    title: str
    description: str
    compName: str = ""
    layerName: str = ""
    compId: Optional[Union[int, str]] = None
    layerId: Optional[Union[int, str]] = None
    layerIndex: Optional[int] = None
    itemId: Optional[Union[int, str]] = None


class ScanResult(BaseModel):
    projectName: str
    compCount: int = 0
    layerCount: int = 0
    footageCount: int = 0
    passedCount: int = 0
    issues: List[Issue] = Field(default_factory=list)
    scanDurationMs: Optional[Union[int, float]] = None


class SavedScanSummary(BaseModel):
    id: int
    projectName: str
    createdAt: str
    errors: int
    warnings: int
    passed: int
    totalIssues: int
    compCount: int = 0
    layerCount: int = 0
    footageCount: int = 0


class SavedScan(BaseModel):
    id: int
    projectName: str
    createdAt: str
    compCount: int = 0
    layerCount: int = 0
    footageCount: int = 0
    passedCount: int = 0
    scanDurationMs: Optional[Union[int, float]] = None
    errors: int
    warnings: int
    passed: int
    totalIssues: int
    issues: List[Issue] = Field(default_factory=list)
    scanResult: Optional[ScanResult] = None


class CompareResult(BaseModel):
    baseScanId: int
    targetScanId: int
    added: List[Issue]
    resolved: List[Issue]
    retained: List[Issue]
    remaining: List[Issue]
    errorDelta: int
    warningDelta: int
