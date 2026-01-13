from decouple import Config, RepositoryEnv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / "settings" / ".env"

env_config = Config(RepositoryEnv(ENV_PATH))

#ENV Configs
IS_CLOUD = env_config("IS_CLOUD", default="false", cast=bool)


# AWS Cognito Configuration
COGNITO_USER_POOL_ID = env_config("COGNITO_USER_POOL_ID", default="eu-north-1_XXXXXXXXX")
COGNITO_CLIENT_ID = env_config("COGNITO_CLIENT_ID")
COGNITO_CLIENT_SECRET = env_config("COGNITO_CLIENT_SECRET")
COGNITO_REGION = env_config("COGNITO_REGION", default="eu-north-1")
AWS_ACCESS_KEY_ID = env_config("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = env_config("AWS_SECRET_ACCESS_KEY")
AWS_REGION = env_config("AWS_REGION", default="us-east-1")
DYNAMO_ENDPOINT_URL = env_config("DYNAMO_ENDPOINT_URL")  # Optional for localstack
DB_NAME = env_config("DYNAMO_PREFIX", default="expense_tracker")

# MongoDB Configuration
MONGO_URL = env_config("MONGO_URL", default="mongodb://localhost:27017")
DB_NAME = env_config("DB_NAME", default="expense_tracker")


SQLALCHEMY_DATABASE_URL = env_config(
    "DATABASE_URL",
    default="sqlite:///./sql_app.db"  # Default SQLite for testing
)