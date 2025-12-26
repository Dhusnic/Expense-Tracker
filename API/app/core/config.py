import os

COGNITO_REGION = "eu-north-1"
COGNITO_USER_POOL_ID = "eu-north-1_kLYhLL7bg"

COGNITO_AUTHORITY = (
    f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}"
)

COGNITO_CLIENT_ID = "261grckd5dnsti9tvv7pcqr34v"
COGNITO_CLIENT_SECRET = "eae49aam0hvq4qpeu7urg52po9p2q9tep5738b6goob4emk35a9"

COGNITO_METADATA_URL = f"{COGNITO_AUTHORITY}/.well-known/openid-configuration"
