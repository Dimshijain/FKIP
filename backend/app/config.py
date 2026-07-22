import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://fkip_user:fkip_pass@fkip-postgres:5432/fkip_db"
    SECRET_KEY: str = "supersecretjwtkeyforfkipenterprise2026!"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    WEAVIATE_URL: str = "http://fkip-weaviate:8080"
    OLLAMA_URL: str = "http://fkip-ollama:11434"
    EMBEDDINGS_MODEL: str = "all-minilm"
    LLM_MODEL: str = "llama3"
    
    # Path for document uploads
    UPLOAD_DIR: str = "/app/uploads"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
