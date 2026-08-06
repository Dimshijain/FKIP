import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.auth import router as auth_router
from app.api.search import router as search_router
from app.api.oracle import router as oracle_router
from app.api.dna import router as dna_router
from app.api.admin import router as admin_router
from app.api.reports import router as reports_router
from app.api.copilot import router as copilot_router
from app.api.innovation import router as innovation_router
from app.api.knowledge_graph import router as knowledge_graph_router
from app.api.docs import router as docs_router
from app.api.sql_writer import router as sql_writer_router
from app.db.session import engine, Base, SessionLocal
from app.db.models import User, UserRole
from app.api.auth import get_password_hash
from app.config import settings

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize FastAPI application
app = FastAPI(
    title="FKIP Core API",
    description="FinXSystems Knowledge Intelligence Platform Backend API",
    version="1.0.0"
)

# Enable CORS for local SPA client requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend service URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router, prefix="/api")
app.include_router(search_router, prefix="/api")
app.include_router(oracle_router, prefix="/api")
app.include_router(dna_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(copilot_router, prefix="/api")
app.include_router(innovation_router, prefix="/api")
app.include_router(knowledge_graph_router, prefix="/api")
app.include_router(docs_router, prefix="/api")
app.include_router(sql_writer_router, prefix="/api")

@app.on_event("startup")
def startup_event():
    logger.info("Initializing FKIP relational database tables...")
    Base.metadata.create_all(bind=engine)
    
    # Seed default admin and creator users if database is empty
    db = SessionLocal()
    try:
        if not db.query(User).first():
            logger.info("Seeding default platform user accounts...")
            seed_users = [
                ("admin@finxsystems.com", "password123", UserRole.ADMIN),
                ("creator@finxsystems.com", "password123", UserRole.CREATOR),
                ("user@finxsystems.com", "password123", UserRole.CONSUMER)
            ]
            for email, plain_pass, role in seed_users:
                hashed = get_password_hash(plain_pass)
                db.add(User(email=email, password_hash=hashed, role=role))
            db.commit()
            logger.info("Default platform user accounts seeded successfully!")
    except Exception as e:
        logger.error(f"Error seeding user accounts: {e}")
    finally:
        db.close()
    
    logger.info("FKIP Backend API has started up successfully.")

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "fkip-backend",
        "config": {
            "weaviate": settings.WEAVIATE_URL,
            "ollama": settings.OLLAMA_URL,
            "llm_model": settings.LLM_MODEL,
            "embeddings_model": settings.EMBEDDINGS_MODEL
        }
    }
