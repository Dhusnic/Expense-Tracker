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
        "http://13.61.45.146:4200"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router, prefix="/api")
