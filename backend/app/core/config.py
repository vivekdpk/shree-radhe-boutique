from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
REPO_DIR = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(REPO_DIR / ".env"), str(BACKEND_DIR / ".env")),
        extra="ignore",
    )

    database_url: str = "postgresql+psycopg://localhost:5432/shree_radhe_boutique"
    owner_password_hash: str = ""
    session_secret: str = ""
    cookie_secure: bool = False
    app_env: str = "development"
    frontend_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    log_level: str = "INFO"


settings = Settings()
