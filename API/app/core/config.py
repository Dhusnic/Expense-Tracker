from decouple import Config, RepositoryEnv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / "settings" / ".env"

env_config = Config(RepositoryEnv(ENV_PATH))

COGNITO_CLIENT_ID = env_config("COGNITO_CLIENT_ID")

# AWS Cognito Configuration
COGNITO_USER_POOL_ID = env_config("COGNITO_USER_POOL_ID", default="eu-north-1_XXXXXXXXX")
COGNITO_CLIENT_ID = env_config("COGNITO_CLIENT_ID")
COGNITO_CLIENT_SECRET = env_config("COGNITO_CLIENT_SECRET")
COGNITO_REGION = env_config("COGNITO_REGION", default="eu-north-1")

# MongoDB Configuration
MONGO_URL = env_config("MONGO_URL", default="mongodb://localhost:27017")
DB_NAME = env_config("DB_NAME", default="expense_tracker")
