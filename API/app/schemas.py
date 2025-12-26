from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    username: str | None = None
    phone_number: str | None = None
    region: str | None = None
    birthdate: str | None = None  # Format: DD-MM-YYYY
    gender: str | None = None

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
