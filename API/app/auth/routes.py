from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from ..database import SessionLocal
from ..models import User
from ..schemas import UserCreate, UserLogin, Token
from .auth_utils import hash_password, verify_password, create_access_token, SECRET_KEY, ALGORITHM
import boto3
from ..core.config import COGNITO_CLIENT_ID as CLIENT_ID,COGNITO_CLIENT_SECRET
# from  import AWS_REGION
import hmac
import hashlib
import base64
from datetime import datetime
import re
from fastapi import APIRouter, Request, HTTPException, Response

from typing import Dict, Any
import json
import logging

logger = logging.getLogger(__name__)

def get_secret_hash(username: str, client_id: str, client_secret: str) -> str:
    message = username + client_id
    dig = hmac.new(
        key=client_secret.encode("utf-8"),
        msg=message.encode("utf-8"),
        digestmod=hashlib.sha256
    ).digest()
    return base64.b64encode(dig).decode()

cognito = boto3.client(
    "cognito-idp",
    region_name="eu-north-1"
)

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register")
def register(user: UserCreate):
    try:
        attributes = []

        # Email (triggers email verification)
        if user.email:
            attributes.append({
                "Name": "email",
                "Value": user.email.lower()
            })

        # Phone number (triggers SMS verification)
        if user.phone_number:
            attributes.append({
                "Name": "phone_number",
                "Value": normalize_phone(user.phone_number)  # must be +91XXXXXXXXXX
            })

        # Region / Country
        if user.region:
            attributes.append({
                "Name": "zoneinfo",
                "Value": user.region.upper()  # IN, US, etc.
            })

        # Birthdate
        if user.birthdate:
            birthdate = datetime.strptime(user.birthdate, "%Y-%m-%d").date().isoformat()
            attributes.append({
                "Name": "birthdate",
                "Value": birthdate
            })

        # Gender
        if user.gender:
            attributes.append({
                "Name": "gender",
                "Value": user.gender.lower()
            })

        # Cognito requires secret hash if app client has secret
        secret_hash = get_secret_hash(
            user.username,
            CLIENT_ID,
            COGNITO_CLIENT_SECRET
        )

        # Sign up
        cognito.sign_up(
            ClientId=CLIENT_ID,
            Username=user.username,  # can be email also
            Password=user.password,
            UserAttributes=attributes,
            SecretHash=secret_hash
        )

        return {
            "message": "Registration successful. Verification codes sent to email and phone."
        }

    except cognito.exceptions.UsernameExistsException:
        raise HTTPException(
            status_code=400,
            detail="User already exists"
        )

    except cognito.exceptions.InvalidPasswordException as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@router.post("/login")
def login(user: UserLogin, response: Response):
    try:
        cognito_response = cognito.initiate_auth(
            ClientId=CLIENT_ID,
            AuthFlow="USER_PASSWORD_AUTH",
            AuthParameters={
                "USERNAME": user.email,
                "PASSWORD": user.password,
                "SECRET_HASH": get_secret_hash(
                    user.email,
                    CLIENT_ID,
                    COGNITO_CLIENT_SECRET
                )
            }
        )

        auth = cognito_response["AuthenticationResult"]

        # ✅ SET REFRESH TOKEN AS HttpOnly COOKIE (ONLY HERE)
        response.set_cookie(
            key="refresh_token",
            value=auth["RefreshToken"],
            httponly=True,
            secure=False,          # REQUIRED for SameSite=None
            samesite="lax",      # REQUIRED for cross-site
            path="/"
        )

        # ✅ Return ONLY short-lived tokens
        return {
            "access_token": auth["AccessToken"],
            "id_token": auth["IdToken"],
            "expires_in": auth["ExpiresIn"],
            "token_type": auth["TokenType"],
            "refresh_token": auth["RefreshToken"]  # For UI to store in localStorage
        }

    except cognito.exceptions.NotAuthorizedException:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    except cognito.exceptions.UserNotConfirmedException:
        raise HTTPException(status_code=403, detail="Email not verified")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
@router.post("/refresh")
def refresh_token(payload: dict):
    refresh_token = payload.get("refresh_token")

    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    res = cognito.initiate_auth(
        ClientId=CLIENT_ID,
        AuthFlow="REFRESH_TOKEN_AUTH",
        AuthParameters={
            "REFRESH_TOKEN": refresh_token,
            "SECRET_HASH": get_secret_hash(
                "dhusnic", CLIENT_ID, COGNITO_CLIENT_SECRET
            )
        }
    )

    auth = res["AuthenticationResult"]

    return {
        "access_token": auth["AccessToken"],
        "expires_in": auth["ExpiresIn"]
    }


@router.post("/logout")
def logout(request: Request, response: Response):
    refresh_token = request.cookies.get("refresh_token")
    # data = get_request_payload(request)
    if refresh_token:
        try:
            cognito.revoke_token(
                Token=refresh_token,
                ClientId=CLIENT_ID,
                ClientSecret=get_secret_hash(
                    "dhusnic",
                    CLIENT_ID,
                    COGNITO_CLIENT_SECRET
                )
            )
        except Exception:
            pass  # ignore revoke failure

    # Clear refresh cookie
    response.delete_cookie(
        key="refresh_token",
        httponly=True,
        secure=True,
        samesite="none"
    )

    return {"message": "Logged out successfully"}

def normalize_phone(phone: str) -> str:
    phone = re.sub(r'\D', '', phone)
    return f"+{phone}"

async def get_request_payload(request: Request) -> Dict[str, Any]:
    """
    Extracts payload from any POST request type:
    - JSON
    - form-data
    - x-www-form-urlencoded
    - raw text
    Always returns a dictionary.
    """

    try:
        content_type = request.headers.get("content-type", "")

        # ---------------- JSON ----------------
        if "application/json" in content_type:
            try:
                return await request.json()
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid JSON payload")

        # ---------------- FORM / MULTIPART ----------------
        if (
            "application/x-www-form-urlencoded" in content_type
            or "multipart/form-data" in content_type
        ):
            form = await request.form()
            return dict(form)

        # ---------------- RAW BODY ----------------
        raw_body = await request.body()
        if raw_body:
            return {"raw": raw_body.decode("utf-8")}

        # ---------------- EMPTY BODY ----------------
        return {}

    except HTTPException:
        raise

    except Exception as e:
        logger.exception("Failed to parse request payload")
        raise HTTPException(
            status_code=500,
            detail="Failed to read request payload"
        )