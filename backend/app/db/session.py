from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings
import logging

logger = logging.getLogger(__name__)

try:
    # Try creating engine with primary DATABASE_URL
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True
    )
    # Test DB connection / driver import
    with engine.connect() as conn:
        pass
except Exception as err:
    logger.warning(f"Primary DB connection failed ({err}). Falling back to local SQLite database.")
    # Fallback to SQLite for local host execution
    engine = create_engine(
        "sqlite:///./fkip_dev.db",
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

