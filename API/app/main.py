from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine
from .auth.routes import router as auth_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="FastAPI Auth System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",   # Angular
        "http://127.0.0.1:4200",
        "http://127.0.0.1:8000",
        "http://10.131.38.133:4200",  # Django
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router, prefix="/api")
