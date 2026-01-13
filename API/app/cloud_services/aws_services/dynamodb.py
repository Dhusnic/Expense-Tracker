from typing import Optional, List, Type, TypeVar, Any, ClassVar, Dict, AnyStr
from pydantic import BaseModel, Field
from boto3 import client, resource
from botocore.exceptions import ClientError
import logging
from decouple import Config, RepositoryEnv
from pathlib import Path
import asyncio
from datetime import datetime
import json
from uuid import uuid4
from ...core.config import *

# SQLAlchemy imports (for existing auth system)
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# BASE_DIR = Path(__file__).resolve().parent
# ENV_PATH = BASE_DIR / "core" / "settings" / ".env"

# config = Config(RepositoryEnv(ENV_PATH))

# ==================== SQLAlchemy Configuration (Existing Auth) ====================
SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL

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

# ==================== DynamoDB Configuration ====================
AWS_ACCESS_KEY_ID = AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY = AWS_SECRET_ACCESS_KEY
AWS_REGION = AWS_REGION
DYNAMO_ENDPOINT_URL = DYNAMO_ENDPOINT_URL  # Optional for localstack
DB_NAME = DB_NAME

# Type variable for generic operations
T = TypeVar('T', bound='BaseDynamoModel')

class DynamoDBManager:
    """Singleton database manager for DynamoDB - Django-style"""
    
    _client: Optional[client] = None
    _resource: Optional[resource] = None
    _models: List[Type['BaseDynamoModel']] = []
    
    @classmethod
    async def connect(cls, models: List[Type['BaseDynamoModel']]):
        """Connect to DynamoDB and create tables if needed"""
        try:
            if DYNAMO_ENDPOINT_URL =="":
                cls._client = client(
                    'dynamodb',
                    aws_access_key_id=AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
                    region_name=AWS_REGION,
                    # endpoint_url=DYNAMO_ENDPOINT_URL,
                )
                cls._resource = resource(
                    'dynamodb',
                    aws_access_key_id=AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
                    region_name=AWS_REGION,
                    # endpoint_url=DYNAMO_ENDPOINT_URL,
                )
            else:
                cls._client = client(
                    'dynamodb',
                    aws_access_key_id=AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
                    region_name=AWS_REGION,
                    endpoint_url=DYNAMO_ENDPOINT_URL,
                )
            
                cls._resource = resource(
                    'dynamodb',
                    aws_access_key_id=AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
                    region_name=AWS_REGION,
                    endpoint_url=DYNAMO_ENDPOINT_URL,
                )
            cls._models = models
            
            # Create tables for all models
            for model in models:
                await model.ensure_table_exists()
            
            logger.info(f"✅ Connected to DynamoDB with prefix: {DB_NAME}")
        except Exception as e:
            logger.error(f"❌ DynamoDB connection failed: {e}")
            raise
    
    @classmethod
    async def close(cls):
        """Close database connection"""
        # DynamoDB connections are stateless, but cleanup if needed
        cls._client = None
        cls._resource = None
        logger.info("DynamoDB connection closed")
    
    @classmethod
    async def ping(cls) -> bool:
        """Check database health"""
        try:
            cls._client.list_tables()['TableNames']
            return True
        except Exception as e:
            logger.error(f"DynamoDB ping failed: {e}")
            return False

# Pydantic model for DynamoDB items
class DynamoItem(BaseModel):
    pk: str = Field(..., alias="_id")
    sk: str = Field(default_factory=lambda: str(uuid4()))
    gsi1pk: Optional[str] = None
    gsi1sk: Optional[str] = None
    data: Dict[str, Any] = {}
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    
    class Config:
        populate_by_name = True
        validate_by_name = True

# Django-style QuerySet wrapper for DynamoDB
class QuerySet:
    """
    Django ORM-style QuerySet for DynamoDB
    Usage: User.objects.filter(age__gte=18).order_by('-created_at')
    """
    
    def __init__(self, model: Type[T]):
        self.model = model
        self._query = {}
        self._index = None
        self._limit_count = None
        self._scan_forward = True
    
    def filter(self, **kwargs) -> 'QuerySet':
        """Filter documents - Django style"""
        self._query = self.model._build_filter(kwargs)
        return self
    
   
    
    async def get(self, **kwargs) -> Optional[T]:
        """Get single object - Django style"""
        query = self.model._build_filter(kwargs)
        items = await self.model._query_items(query, limit=1)
        return items[0] if items else None
    
    def all(self) -> 'QuerySet':
        """Get all documents"""
        self._query = {}
        return self
    
    def order_by(self, *fields) -> 'QuerySet':
        """Order results (DynamoDB limited sorting)"""
        # DynamoDB sorting is limited to sort keys
        if fields:
            self._scan_forward = not fields[0].startswith('-')
        return self
    
    def skip(self, count: int) -> 'QuerySet':
        """Skip - FIXED CHAINING"""
        self._skip_count = count
        return self
    
    def limit(self, count: int) -> 'QuerySet':
        """Limit results"""
        self._limit_count = count
        return self
    
    async def count(self) -> int:
        """Count documents (scan operation)"""
        return await self.model._count_items(self._query)
    
    async def exists(self) -> bool:
        """Check if any document exists"""
        count = await self.model._count_items(self._query, limit=1)
        return count > 0
    
    async def to_list(self, length: Optional[int] = None) -> List[T]:
        """Execute query and return list"""
        limit = length or self._limit_count
        return await self.model._query_items(self._query, limit=limit)
    
    async def delete(self) -> int:
        """Delete all matching documents"""
        items = await self.to_list()
        count = 0
        for item in items:
            await item.delete()
            count += 1
        return count
    
    async def update(self, **kwargs) -> int:
        """Update all matching documents"""
        items = await self.to_list()
        count = 0
        for item in items:
            await item.update(**kwargs)
            count += 1
        return count

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
        """Get or create document - Django style"""
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
        for doc in docs:
            await doc.save()
        return docs
    
    def all(self) -> QuerySet:
        """Get all documents"""
        return QuerySet(self.model).all()
    
    async def count(self) -> int:
        """Count all documents"""
        return await self.model._count_items({})
    
    async def first(self) -> Optional[T]:
        """Get first document"""
        return await QuerySet(self.model).first()
    
    async def last(self) -> Optional[T]:
        """Get last document"""
        items = await QuerySet(self.model).order_by('-sk').limit(1).to_list()
        return items[0] if items else None
    
    def order_by(self, *fields) -> QuerySet:
        """Order documents"""
        return QuerySet(self.model).order_by(*fields)

# Base DynamoDB model with Django-style methods
class BaseDynamoModel(BaseModel):
    """
    Base document class with Django ORM-style methods for DynamoDB
    All your models should inherit from this
    """
    # Use ClassVar to exclude from Pydantic validation
    objects: ClassVar[Manager] = None
    table_name: ClassVar[str] = ""
    
    # DynamoDB item fields
    pk: str  # Partition key
    sk: str = Field(default_factory=lambda: str(uuid4()))  # Sort key
    data: Dict[str, Any] = {}
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    
    def __init_subclass__(cls, table_name: str, **kwargs):
        super().__init_subclass__(**kwargs)
        cls.table_name = f"{DB_NAME}_{table_name}"
        cls.objects = Manager(cls)
    
    @classmethod
    async def ensure_table_exists(cls):
        """Create table if it doesn't exist"""
        try:
            table = DynamoDBManager._resource.Table(cls.table_name)
            table.load()
        except ClientError:
            await cls._create_table()
        except Exception as e:
            logger.warning(f"Table check failed {cls.table_name}: {e}")
    
    @classmethod
    async def _create_table(cls):
        """Create DynamoDB table - FIXED"""
        try:
            client = DynamoDBManager._client
            client.create_table(
                TableName=cls.table_name,
                KeySchema=[
                    {'AttributeName': 'pk', 'KeyType': 'HASH'},
                    {'AttributeName': 'sk', 'KeyType': 'RANGE'}
                ],
                AttributeDefinitions=[
                    {'AttributeName': 'pk', 'AttributeType': 'S'},
                    {'AttributeName': 'sk', 'AttributeType': 'S'}
                ],
                BillingMode='PAY_PER_REQUEST'
            )
            
            # Wait for table to be active - FIXED
            waiter = client.get_waiter('table_exists')
            await asyncio.get_event_loop().run_in_executor(
                None, lambda: waiter.wait(TableName=cls.table_name)
            )
            logger.info(f"✅ Created table: {cls.table_name}")
        except Exception as e:
            logger.error(f"❌ Failed to create table {cls.table_name}: {e}")
            raise
    async def save(self, **kwargs) -> 'BaseDynamoModel':
        """Save document - Django style"""
        self.updated_at = datetime.utcnow().isoformat()
        
        item = self.dict(by_alias=True)
        item['data'] = self.dict(exclude={'pk', 'sk', 'created_at', 'updated_at', 'data'})
        
        try:
            table = DynamoDBManager._resource.Table(self.table_name)
            await asyncio.get_event_loop().run_in_executor(
                None, table.put_item, Item=item
            )
            return self
        except Exception as e:
            logger.error(f"Error saving document: {e}")
            raise
    
    async def update(self, **kwargs) -> 'BaseDynamoModel':
        """Update specific fields - Django style"""
        self.updated_at = datetime.utcnow().isoformat()
        
        update_expression = "SET " + ", ".join([f"#field{idx} = :val{idx}" for idx in range(len(kwargs))])
        expression_attribute_names = {f"#field{idx}": key for idx, key in enumerate(kwargs.keys())}
        expression_attribute_values = {f":val{idx}": value for idx, (key, value) in enumerate(kwargs.items())}
        expression_attribute_values[':updated_at'] = self.updated_at
        
        try:
            table = DynamoDBManager._resource.Table(self.table_name)
            await asyncio.get_event_loop().run_in_executor(
                None,
                table.update_item,
                Key={'pk': self.pk, 'sk': self.sk},
                UpdateExpression=f"{update_expression}, updated_at = :updated_at",
                ExpressionAttributeNames=expression_attribute_names,
                ExpressionAttributeValues=expression_attribute_values
            )
            
            # Update local instance
            for key, value in kwargs.items():
                setattr(self, key, value)
            return self
        except Exception as e:
            logger.error(f"Error updating document: {e}")
            raise
    
    async def delete(self, **kwargs) -> None:
        """Delete document - Django style"""
        try:
            table = DynamoDBManager._resource.Table(self.table_name)
            await asyncio.get_event_loop().run_in_executor(
                None, table.delete_item, Key={'pk': self.pk, 'sk': self.sk}
            )
            logger.info(f"Deleted document: {self.pk}/{self.sk}")
        except Exception as e:
            logger.error(f"Error deleting document: {e}")
            raise
    
    @classmethod
    async def get(cls: Type[T], pk: str, sk: Optional[str] = None) -> Optional[T]:
        """Get document by primary key"""
        try:
            table = DynamoDBManager._resource.Table(cls.table_name)
            key = {'pk': pk}
            if sk:
                key['sk'] = sk
            
            result = await asyncio.get_event_loop().run_in_executor(
                None, table.get_item, Key=key
            )
            
            if 'Item' in result:
                item = result['Item']
                data = {**item['data'], 'pk': item['pk'], 'sk': item['sk']}
                return cls(**data)
            return None
        except Exception as e:
            logger.error(f"Error getting document: {e}")
            return None
    
    @classmethod
    async def _query_items(cls, filters: dict, limit: Optional[int] = None) -> List[T]:
        """Internal query - FIXED DynamoDB scan"""
        try:
            table = DynamoDBManager._resource.Table(cls.table_name)
            # ✅ FIXED: SIMPLE SCAN (ignore complex filters for now)
            params = {}
            if limit:
                params['Limit'] = limit
            
            # ✅ FIXED: NO FilterExpression in run_in_executor
            response = await asyncio.get_event_loop().run_in_executor(
                None, table.scan, **params  # ✅ Only simple params
            )
            items = []
            for item in response.get('Items', []):
                # Manual filter (DynamoDB scan limitation)
                data = item.get('data', {})
                if cls._item_matches_filters(data, filters):
                    full_item = {**data, 'pk': item['pk'], 'sk': item['sk']}
                    items.append(cls(**full_item))
            return items
        except Exception as e:
            logger.error(f"Query error: {e}")
            return []
        
    @classmethod
    def _item_matches_filters(cls, item_data: dict, filters: dict) -> bool:
        """Manual filter matching (DynamoDB workaround)"""
        for field, value in filters.items():
            if field.endswith('__in'):
                real_field = field.split('__')[0]
                if real_field not in item_data or item_data[real_field] not in value:
                    return False
            elif field.endswith('__contains'):
                real_field = field.split('__')[0]
                if real_field not in item_data or str(value).lower() not in str(item_data[real_field]).lower():
                    return False
            elif field not in item_data or item_data[field] != value:
                return False
        return True

    @classmethod
    async def _count_items(cls, query_filter: Dict, limit: Optional[int] = None) -> int:
        """Internal count method"""
        items = await cls._query_items(query_filter, limit)
        return len(items)
    
    @classmethod
    def _build_filter(cls, kwargs: Dict) -> Dict:
        """Build DynamoDB filter from Django-style filters"""
        # Simplified filter building for common operators
        filter_parts = []
        for key, value in kwargs.items():
            if '__' in key:
                field, operator = key.rsplit('__', 1)
                if operator == 'gte':
                    filter_parts.append(f"{field} >= :{field}")
                elif operator == 'gt':
                    filter_parts.append(f"{field} > :{field}")
                elif operator == 'lte':
                    filter_parts.append(f"{field} <= :{field}")
                elif operator == 'lt':
                    filter_parts.append(f"{field} < :{field}")
                elif operator == 'contains':
                    filter_parts.append(f"contains({field}, :{field})")
            else:
                filter_parts.append(f"{key} = :{key}")
        
        return {'expression': ' AND '.join(filter_parts), 'values': kwargs}
    
    @classmethod
    def _build_filter_expression(cls, filter_dict: Dict):
        """Build actual filter expression"""
        # This is simplified - full implementation would need awsgi or similar
        return "attribute_exists(pk)"
    
    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return self.dict(by_alias=True)

    class Config:
        populate_by_name = True
        validate_by_name = True  # ✅ ADD THIS

# Utility functions
async def get_or_404(model: Type[T], pk: str, sk: Optional[str] = None) -> T:
    """Get object or raise 404 - FastAPI helper"""
    from fastapi import HTTPException
    
    obj = await model.get(pk, sk)
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
