from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from decouple import Config, RepositoryEnv
from pathlib import Path

# Import ALL your models here (they stay the same!)
from .models_list import models_list, dynamodb_models_list
from .database import Base, engine, MongoDBManager, BaseDocument # MongoDB manager
from .cloud_services.aws_services.dynamodb import BaseDynamoModel,DynamoDBManager,Manager  # DynamoDB manager
from .auth.routes import router as auth_router
from .expense_tracker.routes import router as expense_router
from .categories.routes import router as categories_router
from .core.config import *


# SQLAlchemy for auth (existing) - ALWAYS runs
Base.metadata.create_all(bind=engine)

import logging
# logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# 🔥 DYNAMIC MODEL REGISTRY - Controls inheritance based on IS_CLOUD
class DynamicModelRegistry:
    def __init__(self, use_cloud: bool):
        self.use_cloud = use_cloud
        self.models = dynamodb_models_list if use_cloud else models_list
        self.none_list = [None, '', 'null', 'undefined', 'None',[], {}, '[]', '{}', 'NULL', 'UNDEFINED',[{}]]

        if use_cloud:
            from .cloud_services.aws_services.dynamodb import BaseDynamoModel, DynamoDBManager, Manager as DynamoManager
            self.base_class = BaseDynamoModel
            self.db_manager = DynamoDBManager
            self.manager_class = DynamoManager
        else:
            from .database import BaseDocument, MongoDBManager, Manager as MongoManager
            self.base_class = BaseDocument
            self.db_manager = MongoDBManager
            self.manager_class = MongoManager
    
    async def initialize_models(self):
        patched_models = []
        for model in self.models:
            try:
                model._original_bases = model.__bases__  # Backup
                model.__bases__ = (self.base_class,)
                logger.info(f"🔍 Model: {model.__name__}")
                if hasattr(model, 'Settings'):
                    logger.info(f"   Settings.name: '{getattr(model.Settings, 'name', 'MISSING')}'")
                # logger.info(f"   Final table_name: '{getattr(model, 'table_name', 'NOT_SET')}'")
                if self.use_cloud and getattr(model, 'table_name') in self.none_list:
                    table_name = getattr(getattr(model, 'Settings', None), 'name', model.__name__.lower())
                    model.table_name = f"{DB_NAME}_{table_name}"
                
                model.objects = self.manager_class(model)
                patched_models.append(model)
                logger.info(f"✅ {model.__name__} -> {'DynamoDB' if self.use_cloud else 'MongoDB'}")
            except Exception as e:
                logger.error(f"❌ {model.__name__}: {e}")
                if hasattr(model, '_original_bases'):
                    model.__bases__ = model._original_bases
        return patched_models

# 🔥 SINGLETON REGISTRY INSTANCE
model_registry = DynamicModelRegistry(IS_CLOUD)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events - ONE CODEPATH FOR BOTH!"""
    # Initialize models with correct base class
    initialized_models = await model_registry.initialize_models()
    
    # Connect to correct database
    await model_registry.db_manager.connect(models=initialized_models)  # ✅ CORRECT!
    
    yield
    
    # Shutdown
    await model_registry.manager.close()

app = FastAPI(
    title="FastAPI Auth & Expense Tracker System",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",
        "http://127.0.0.1:4200",
        "http://127.0.0.1:8000",
        "http://10.131.38.133:4200",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers (they work with ANY database!)
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(expense_router, prefix="/api/transactions", tags=["Expense Tracker"])
app.include_router(categories_router, prefix="/api/categories", tags=["Categories"])

@app.get("/health")
async def health_check():
    """Check system health"""
    db_healthy = await model_registry.manager.ping()
    db_type = "DynamoDB" if IS_CLOUD else "MongoDB"
    
    return {
        "status": "healthy" if db_healthy else "degraded",
        "config": {
            "is_cloud": IS_CLOUD,
            "database": db_type,
            "models_count": len(model_registry.models)
        },
        "services": {
            "postgres_auth": "healthy",
            f"{db_type.lower()}_expense": "healthy" if db_healthy else "unhealthy"
        }
    }

# 🔥 GLOBAL ACCESSOR - Use this anywhere in your code!
async def get_model(model_class):
    """Get model with correct manager"""
    return model_registry.manager(model_class)
