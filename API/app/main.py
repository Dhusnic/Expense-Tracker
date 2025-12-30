from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .database import Base, engine, MongoDBManager
from .auth.routes import router as auth_router
from .expense_tracker.routes import router as expense_router
from .models_list import models_list
from decouple import Config, RepositoryEnv
from pathlib import Path
from .categories.routes import router as categories_router
BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / "core" / "settings" / ".env"

env_config = Config(RepositoryEnv(ENV_PATH))
# SQLAlchemy for auth (existing)
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup: Initialize MongoDB for expense tracker
    await MongoDBManager.connect(models=models_list)
    yield
    # Shutdown: Close MongoDB connections
    await MongoDBManager.close()

app = FastAPI(
    title="FastAPI Auth & Expense Tracker System",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",   # Angular
        "http://127.0.0.1:4200",
        "http://127.0.0.1:8000",
        "http://10.131.38.133:4200",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(expense_router, prefix="/api/transactions", tags=["Expense Tracker"])
app.include_router(categories_router, prefix="/api/categories", tags=["Categories"])
# Health check
@app.get("/health")
async def health_check():
    """Check system health"""
    mongo_healthy = await MongoDBManager.ping()
    return {
        "status": "healthy" if mongo_healthy else "degraded",
        "services": {
            "postgres_auth": "healthy",
            "mongodb_expense": "healthy" if mongo_healthy else "unhealthy"
        }
    }
