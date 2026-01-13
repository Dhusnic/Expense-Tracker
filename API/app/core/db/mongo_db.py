from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
from ..config import *

class MongoDB:
    client: Optional[AsyncIOMotorClient] = None
    # db = None
    
mongodb = MongoDB()

async def connect_to_mongo():
    mongodb.client = AsyncIOMotorClient(
        MONGO_URL,
        maxPoolSize=50,
        minPoolSize=10,
        serverSelectionTimeoutMS=5000,
    )

async def close_mongo_connection():
    if mongodb.client:
        await mongodb.client.close()
        
    