from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/linkedin_agent"
    SECRET_KEY: str = "change-me"
    REDIS_URL: str = "redis://localhost:6379/0"

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    APOLLO_API_KEY: str = ""

    BASE_URL: str = "http://localhost:8000"

    SCRAPE_INTERVAL_HOURS: int = 6
    EMAIL_CHECK_INTERVAL_MINUTES: int = 15

    class Config:
        env_file = ".env"


settings = Settings()
