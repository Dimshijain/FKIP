import os
from pydantic import Field, Extra
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database credentials
    postgres_user: str = Field("fkip_user", env="POSTGRES_USER")
    postgres_password: str = Field("fkip_pass", env="POSTGRES_PASSWORD")
    postgres_db: str = Field("fkip_db", env="POSTGRES_DB")

    # Main database URL
    DATABASE_URL: str = "postgresql://fkip_user:fkip_pass@fkip-postgres:5432/fkip_db"
    SECRET_KEY: str = "supersecretjwtkeyforfkipenterprise2026!"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    WEAVIATE_URL: str = "http://fkip-weaviate:8080"
    OLLAMA_URL: str = "http://fkip-ollama:11434"
    EMBEDDINGS_MODEL: str = "all-minilm"
    LLM_MODEL: str = "qwen2:0.5b"
    REDIS_URL: str = "redis://fkip-redis:6379/0"

    # Path for document uploads
    UPLOAD_DIR: str = "/app/uploads"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": Extra.ignore,
    }

settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
