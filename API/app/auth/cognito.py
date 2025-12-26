from authlib.integrations.starlette_client import OAuth
from fastapi import Request
from starlette.config import Config
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import (
    COGNITO_AUTHORITY,
    COGNITO_CLIENT_ID,
    COGNITO_CLIENT_SECRET,
    COGNITO_METADATA_URL,
)

config = Config(environ={})
oauth = OAuth(config)

oauth.register(
    name="oidc",
    client_id=COGNITO_CLIENT_ID,
    client_secret=COGNITO_CLIENT_SECRET,
    server_metadata_url=COGNITO_METADATA_URL,
    client_kwargs={
        "scope": "openid email phone"
    },
)
