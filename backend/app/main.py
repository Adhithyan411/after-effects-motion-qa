from fastapi import FastAPI

app = FastAPI(
    title="After Effects Motion QA API",
    description="Backend API for the After Effects Motion QA tool",
    version="1.0.0",
)


@app.get("/health")
def health_check():
    return {
        "status": "ok"
    }