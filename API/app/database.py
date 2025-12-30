from typing import Optional, List, Type, TypeVar, Any, ClassVar
from beanie import Document, init_beanie, PydanticObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
import logging
from decouple import Config, RepositoryEnv
from pathlib import Path



# SQLAlchemy imports (for existing auth system)
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / "core" / "settings" / ".env"

config = Config(RepositoryEnv(ENV_PATH))
# ==================== SQLAlchemy Configuration (Existing Auth) ====================


SQLALCHEMY_DATABASE_URL = config(
    "DATABASE_URL",
    default="sqlite:///./sql_app.db"  # Default SQLite for testing
)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency for SQLAlchemy database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==================== MongoDB Configuration (Expense Tracker) ====================

MONGO_URL = config("MONGO_URL", default="mongodb://10.0.5.97:27017")
DB_NAME = config("DB_NAME", default="expense_tracker")

# Type variable for generic operations
T = TypeVar('T', bound=Document)

class MongoDBManager:
    """Singleton database manager - Django-style for MongoDB"""
    
    _client: Optional[AsyncIOMotorClient] = None
    _db = None
    _models: List[Type[Document]] = []
    
    @classmethod
    async def connect(cls, models: List[Type[Document]]):
        """Connect to MongoDB and initialize Beanie"""
        try:
            cls._client = AsyncIOMotorClient(MONGO_URL)
            cls._db = cls._client[DB_NAME]
            cls._models = models
            
            # Initialize Beanie with all models
            await init_beanie(
                database=cls._db,
                document_models=models
            )
            logger.info(f"✅ Connected to MongoDB: {DB_NAME}")
        except Exception as e:
            logger.error(f"❌ MongoDB connection failed: {e}")
            raise
    
    @classmethod
    async def close(cls):
        """Close database connection"""
        if cls._client:
            cls._client.close()
            logger.info("MongoDB connection closed")
    
    @classmethod
    async def ping(cls) -> bool:
        """Check database health"""
        try:
            await cls._client.admin.command('ping')
            return True
        except Exception as e:
            logger.error(f"Database ping failed: {e}")
            return False

# Django-style QuerySet wrapper
class QuerySet:
    """
    Django ORM-style QuerySet for MongoDB
    Usage: User.objects.filter(age__gte=18).order_by('-created_at')
    """
    
    def __init__(self, model: Type[T]):
        self.model = model
        self._query = {}
        self._sort = []
        self._skip_count = 0
        self._limit_count = None
        self._chain = self.model.find_all()
    
    def filter(self, **kwargs) -> 'QuerySet':
        """
        Filter documents - Django style
        Examples:
            .filter(name='John')
            .filter(age__gte=18)
            .filter(email__contains='@gmail.com')
        """
        query_filter = self._build_filter(kwargs)
        self._query = query_filter
        self._chain = self.model.find(query_filter)
        return self
    
    def get(self, **kwargs) -> Optional[T]:
        """
        Get single object - Django style
        Example: user = await User.objects.get(email='test@example.com')
        """
        query = self._build_filter(kwargs)
        return self.model.find_one(query)
    
    def all(self) -> 'QuerySet':
        """Get all documents"""
        self._chain = self.model.find_all()
        return self
    
    def order_by(self, *fields) -> 'QuerySet':
        """
        Order results - Django style
        Examples:
            .order_by('name')         # ascending
            .order_by('-created_at')  # descending
        """
        sort_list = []
        for field in fields:
            if field.startswith('-'):
                sort_list.append((field[1:], -1))
            else:
                sort_list.append((field, 1))
        
        self._sort = sort_list
        return self
    
    def skip(self, count: int) -> 'QuerySet':
        """Skip N documents"""
        self._skip_count = count
        return self
    
    def limit(self, count: int) -> 'QuerySet':
        """Limit results"""
        self._limit_count = count
        return self
    
    def first(self) -> Optional[T]:
        """Get first document"""
        return self.model.find_one(self._query)
    
    def last(self) -> Optional[T]:
        """Get last document"""
        return self.order_by('-_id').first()
    
    async def count(self) -> int:
        """Count documents"""
        return await self.model.find(self._query).count()
    
    async def exists(self) -> bool:
        """Check if any document exists"""
        count = await self.model.find(self._query).limit(1).count()
        return count > 0
    
    async def to_list(self, length: Optional[int] = None) -> List[T]:
        """Execute query and return list"""
        query = self._chain
        
        if self._sort:
            query = query.sort(self._sort)
        
        if self._skip_count:
            query = query.skip(self._skip_count)
        
        if self._limit_count:
            query = query.limit(self._limit_count)
        
        return await query.to_list(length=length)
    
    async def delete(self) -> int:
        """Delete all matching documents"""
        result = await self.model.find(self._query).delete()
        return result.deleted_count if result else 0
    
    async def update(self, **kwargs) -> int:
        """
        Update all matching documents
        Example: await User.objects.filter(age__lt=18).update(status='minor')
        """
        update_data = {"$set": kwargs}
        docs = await self.model.find(self._query).to_list()
        count = 0
        for doc in docs:
            await doc.update(update_data)
            count += 1
        return count
    
    def _build_filter(self, kwargs: dict) -> dict:
        """Build MongoDB query from Django-style filters"""
        query = {}
        
        for key, value in kwargs.items():
            if '__' in key:
                field, operator = key.rsplit('__', 1)
                
                # Django-style operators
                operator_map = {
                    'gte': '$gte',
                    'gt': '$gt',
                    'lte': '$lte',
                    'lt': '$lt',
                    'ne': '$ne',
                    'in': '$in',
                    'nin': '$nin',
                    'contains': '$regex',
                    'icontains': '$regex',
                    'startswith': '$regex',
                    'endswith': '$regex',
                    'isnull': '$exists',
                }
                
                if operator in operator_map:
                    mongo_op = operator_map[operator]
                    
                    # Handle regex patterns
                    if operator == 'contains':
                        query[field] = {mongo_op: value}
                    elif operator == 'icontains':
                        query[field] = {mongo_op: value, '$options': 'i'}
                    elif operator == 'startswith':
                        query[field] = {mongo_op: f'^{value}'}
                    elif operator == 'endswith':
                        query[field] = {mongo_op: f'{value}$'}
                    elif operator == 'isnull':
                        query[field] = {mongo_op: not value}
                    else:
                        query[field] = {mongo_op: value}
            else:
                query[key] = value
        
        return query

# Django-style Manager
class Manager:
    """
    Django ORM-style Manager
    Usage: User.objects.filter(...)
    """
    
    def __init__(self, model: Type[T]):
        self.model = model
    
    def filter(self, **kwargs) -> QuerySet:
        """Filter documents"""
        return QuerySet(self.model).filter(**kwargs)
    
    async def get(self, **kwargs) -> Optional[T]:
        """Get single document"""
        return await QuerySet(self.model).get(**kwargs)
    
    async def get_or_create(self, defaults: dict = None, **kwargs) -> tuple[T, bool]:
        """
        Get or create document - Django style
        Returns: (object, created)
        """
        obj = await self.get(**kwargs)
        if obj:
            return obj, False
        
        create_data = {**kwargs, **(defaults or {})}
        new_obj = self.model(**create_data)
        await new_obj.save()
        return new_obj, True
    
    async def create(self, **kwargs) -> T:
        """Create new document"""
        obj = self.model(**kwargs)
        await obj.save()
        return obj
    
    async def bulk_create(self, objects: List[dict]) -> List[T]:
        """Create multiple documents"""
        docs = [self.model(**obj) for obj in objects]
        await self.model.insert_many(docs)
        return docs
    
    def all(self) -> QuerySet:
        """Get all documents"""
        return QuerySet(self.model).all()
    
    async def count(self) -> int:
        """Count all documents"""
        return await self.model.count()
    
    async def first(self) -> Optional[T]:
        """Get first document"""
        return await QuerySet(self.model).first()
    
    async def last(self) -> Optional[T]:
        """Get last document"""
        return await QuerySet(self.model).last()
    
    def order_by(self, *fields) -> QuerySet:
        """Order documents"""
        return QuerySet(self.model).order_by(*fields)

# Base model with Django-style methods
class BaseDocument(Document):
    """
    Base document class with Django ORM-style methods
    All your models should inherit from this
    """
    
    # Use ClassVar to exclude from Pydantic validation
    objects: ClassVar[Manager] = None  # Will be set automatically
    
    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        # Auto-assign Manager to each model
        cls.objects = Manager(cls)
    
    async def save(self, **kwargs):
        """
        Save document - Django style
        Handles both create and update
        """
        try:
            if self.id:
                # Update existing
                await self.replace()
            else:
                # Create new
                await self.insert()
            return self
        except Exception as e:
            logger.error(f"Error saving document: {e}")
            raise
    
    async def update(self, **kwargs):
        """
        Update specific fields - Django style
        Example: await user.update(name='New Name', age=30)
        """
        from datetime import datetime
        
        update_data = {"$set": kwargs}
        await super().update(update_data)
        
        # Refresh the instance
        for key, value in kwargs.items():
            setattr(self, key, value)
        
        return self
    
    async def delete(self, **kwargs):
        """Delete document - Django style"""
        try:
            await super().delete()
            logger.info(f"Deleted document: {self.id}")
        except Exception as e:
            logger.error(f"Error deleting document: {e}")
            raise
    
    async def refresh_from_db(self):
        """Refresh document from database - Django style"""
        if not self.id:
            raise ValueError("Cannot refresh unsaved document")
        
        fresh = await self.__class__.get(self.id)
        if fresh:
            for field, value in fresh.dict().items():
                setattr(self, field, value)
    
    @classmethod
    async def get_by_id(cls: Type[T], id: PydanticObjectId) -> Optional[T]:
        """Get document by ID"""
        return await cls.get(id)
    
    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return self.dict()
    
    class Settings:
        # Use snake_case for MongoDB collection names
        use_state_management = True
        validate_on_save = True

# Utility functions
async def get_or_404(model: Type[T], id: PydanticObjectId) -> T:
    """Get object or raise 404 - FastAPI helper"""
    from fastapi import HTTPException
    
    obj = await model.get(id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
    return obj

async def filter_or_404(model: Type[T], **kwargs) -> T:
    """Filter single object or raise 404"""
    from fastapi import HTTPException
    
    obj = await model.objects.get(**kwargs)
    if not obj:
        raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
    return obj
