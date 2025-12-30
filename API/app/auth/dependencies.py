from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from typing import Optional, Dict, Any
import requests
import logging
from functools import lru_cache
from datetime import datetime
import json

logger = logging.getLogger(__name__)

# AWS Cognito configuration
from ..core.config import (
    COGNITO_CLIENT_ID,
    COGNITO_USER_POOL_ID,
    COGNITO_REGION
)

# Construct Cognito URLs
COGNITO_ISSUER = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}"
COGNITO_JWKS_URL = f"{COGNITO_ISSUER}/.well-known/jwks.json"

# Security scheme
security = HTTPBearer()

# ==================== JWKS CACHE ====================

@lru_cache(maxsize=1)
def get_cognito_jwks() -> Dict[str, Any]:
    """
    Fetch and cache Cognito's public keys for JWT verification
    """
    try:
        response = requests.get(COGNITO_JWKS_URL)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"Failed to fetch JWKS: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to verify tokens at this time"
        )

def get_cognito_public_key(token: str) -> Optional[Dict[str, Any]]:
    """
    Get the public key matching the token's kid (key ID)
    """
    try:
        # Decode token header without verification
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        
        if not kid:
            return None
        
        # Get JWKS
        jwks = get_cognito_jwks()
        
        # Find matching key
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                return key
        
        return None
    except Exception as e:
        logger.error(f"Error getting public key: {e}")
        return None

# ==================== TOKEN VERIFICATION ====================

def verify_cognito_token(token: str, token_use: str = "access") -> Dict[str, Any]:
    """
    Verify Cognito JWT token (access_token or id_token)
    
    Args:
        token: JWT token string
        token_use: Either "access" or "id" to verify token type
    
    Returns:
        Decoded token payload
    
    Raises:
        HTTPException: If token is invalid
    """
    try:
        # Get public key
        public_key = get_cognito_public_key(token)
        
        if not public_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to verify token signature",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        # Verify and decode token
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=COGNITO_CLIENT_ID,
            issuer=COGNITO_ISSUER,
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_aud": True,
                "verify_iss": True
            }
        )
        
        # Verify token use (access vs id)
        if payload.get("token_use") != token_use:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token type. Expected {token_use} token",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        return payload
    
    except JWTError as e:
        logger.error(f"JWT verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token verification failed",
            headers={"WWW-Authenticate": "Bearer"}
        )

# ==================== USER MODELS ====================

class CognitoUser:
    """
    Represents authenticated Cognito user
    """
    def __init__(self, token_payload: Dict[str, Any]):
        self.token_payload = token_payload
        
        # Access token fields
        self.username = token_payload.get("username")
        self.sub = token_payload.get("sub")  # Cognito user UUID
        self.token_use = token_payload.get("token_use")
        self.scope = token_payload.get("scope", "").split()
        self.auth_time = token_payload.get("auth_time")
        self.exp = token_payload.get("exp")
        self.iat = token_payload.get("iat")
        
        # Groups (if using Cognito Groups)
        self.groups = token_payload.get("cognito:groups", [])
        
        # Custom attributes (from ID token)
        self.email = token_payload.get("email")
        self.email_verified = token_payload.get("email_verified", False)
        self.phone_number = token_payload.get("phone_number")
        self.phone_verified = token_payload.get("phone_number_verified", False)
        self.name = token_payload.get("name")
        self.given_name = token_payload.get("given_name")
        self.family_name = token_payload.get("family_name")
        self.birthdate = token_payload.get("birthdate")
        self.gender = token_payload.get("gender")
        self.zoneinfo = token_payload.get("zoneinfo")  # region
    
    @property
    def id(self) -> str:
        """User ID (use sub as unique identifier)"""
        return self.sub
    
    @property
    def is_active(self) -> bool:
        """Check if token is still valid"""
        return datetime.utcnow().timestamp() < self.exp
    
    @property
    def is_admin(self) -> bool:
        """Check if user is in admin group"""
        return "admin" in self.groups or "admins" in self.groups
    
    def has_group(self, group_name: str) -> bool:
        """Check if user belongs to a specific group"""
        return group_name in self.groups
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "email_verified": self.email_verified,
            "phone_number": self.phone_number,
            "name": self.name,
            "groups": self.groups,
            "is_admin": self.is_admin
        }

# ==================== DEPENDENCIES ====================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> CognitoUser:
    """
    Dependency to get current authenticated user from access token
    
    Usage in routes:
        @app.get("/protected")
        async def protected_route(current_user: CognitoUser = Depends(get_current_user)):
            return {"user_id": current_user.id}
    """
    token = credentials.credentials
    
    # Verify access token
    payload = verify_cognito_token(token, token_use="access")
    
    return CognitoUser(payload)

async def get_current_user_from_id_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> CognitoUser:
    """
    Dependency to get current user from ID token (includes more user attributes)
    """
    token = credentials.credentials
    
    # Verify ID token
    payload = verify_cognito_token(token, token_use="id")
    
    return CognitoUser(payload)

async def get_current_active_user(
    current_user: CognitoUser = Depends(get_current_user)
) -> CognitoUser:
    """
    Dependency to ensure user is active (token not expired)
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User token has expired"
        )
    return current_user

async def get_current_admin_user(
    current_user: CognitoUser = Depends(get_current_user)
) -> CognitoUser:
    """
    Dependency to ensure user is admin
    
    Usage:
        @app.delete("/admin/users/{user_id}")
        async def delete_user(
            user_id: str,
            admin: CognitoUser = Depends(get_current_admin_user)
        ):
            ...
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

async def get_optional_current_user(
    request: Request
) -> Optional[CognitoUser]:
    """
    Dependency for optional authentication
    Returns user if valid token exists, otherwise None
    """
    try:
        auth_header = request.headers.get("Authorization")
        
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
        
        token = auth_header.split(" ")[1]
        payload = verify_cognito_token(token, token_use="access")
        
        return CognitoUser(payload)
    except:
        return None

def require_group(group_name: str):
    """
    Dependency factory to require specific Cognito group membership
    
    Usage:
        @app.get("/premium")
        async def premium_route(
            user: CognitoUser = Depends(require_group("premium_users"))
        ):
            ...
    """
    async def group_checker(
        current_user: CognitoUser = Depends(get_current_user)
    ) -> CognitoUser:
        if not current_user.has_group(group_name):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. '{group_name}' group membership required"
            )
        return current_user
    
    return group_checker

def require_verified_email():
    """
    Dependency to ensure user has verified email
    """
    async def email_verified_checker(
        current_user: CognitoUser = Depends(get_current_user_from_id_token)
    ) -> CognitoUser:
        if not current_user.email_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email verification required"
            )
        return current_user
    
    return email_verified_checker

def require_verified_phone():
    """
    Dependency to ensure user has verified phone
    """
    async def phone_verified_checker(
        current_user: CognitoUser = Depends(get_current_user_from_id_token)
    ) -> CognitoUser:
        if not current_user.phone_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Phone verification required"
            )
        return current_user
    
    return phone_verified_checker

# ==================== TOKEN EXTRACTION HELPERS ====================

def extract_token_from_request(request: Request) -> Optional[str]:
    """
    Extract token from Authorization header or cookies
    """
    # Try Authorization header first
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.split(" ")[1]
    
    # Try cookies (if you store access token in cookies)
    access_token = request.cookies.get("access_token")
    if access_token:
        return access_token
    
    return None

async def get_user_from_request(request: Request) -> Optional[CognitoUser]:
    """
    Get user from request (checks both header and cookies)
    """
    token = extract_token_from_request(request)
    
    if not token:
        return None
    
    try:
        payload = verify_cognito_token(token, token_use="access")
        return CognitoUser(payload)
    except:
        return None
