import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.db.models import User, UserRole, DnaApplication
from app.db.schemas import DnaApplicationResponse, CapabilityCluster
from app.api.auth import get_current_user
from app.services.dna_clustering import ingest_dna_catalog, find_duplicate_capabilities

router = APIRouter(prefix="/dna", tags=["dna"])

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_dna_catalog(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.CREATOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to upload Core Banking catalog details."
        )
        
    filename = file.filename
    if not (filename.endswith(".json") or filename.endswith(".csv")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file extension. Please upload a .json application specification catalog."
        )
        
    try:
        content = await file.read()
        if filename.endswith(".json"):
            catalog_data = json.loads(content.decode("utf-8"))
        else:
            # Simple fallback / mock parser for CSV mapping
            # Just structure columns as dictionary list
            import csv
            import io
            f_stream = io.StringIO(content.decode("utf-8"))
            reader = csv.DictReader(f_stream)
            catalog_data = []
            apps_map = {}
            for row in reader:
                app_code = row.get("app_code", "").strip().upper()
                if not app_code:
                    continue
                if app_code not in apps_map:
                    apps_map[app_code] = {
                        "app_code": app_code,
                        "app_name": row.get("app_name", "App " + app_code),
                        "owner": row.get("owner", "CORE_BANKING_PORTAL"),
                        "description": row.get("description", ""),
                        "version": row.get("version", "1.0"),
                        "status": row.get("status", "ACTIVE"),
                        "platform": row.get("platform", "UNKNOWN"),
                        "features": []
                    }
                
                feat_name = row.get("feature_name", "").strip()
                if feat_name:
                    apps_map[app_code]["features"].append({
                        "feature_name": feat_name,
                        "feature_description": row.get("feature_description", ""),
                        "category": row.get("category", "Uncategorized")
                    })
            catalog_data = list(apps_map.values())
            
        if not isinstance(catalog_data, list):
            raise ValueError("Input Core Banking JSON catalog must be a list of application dictionary items.")
            
        indexed_count = ingest_dna_catalog(catalog_data, db)
        
        return {
            "message": "Core Banking applications and feature specifications ingested successfully.",
            "features_indexed": indexed_count
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error ingesting Core Banking catalog: {str(e)}"
        )

@router.get("/apps", response_model=List[DnaApplicationResponse])
def get_dna_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(DnaApplication).order_by(DnaApplication.app_code).all()

@router.get("/clusters", response_model=List[CapabilityCluster])
def get_capability_clusters(
    threshold: float = 0.80,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return find_duplicate_capabilities(db, similarity_threshold=threshold)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error computing capability clusters: {str(e)}"
        )
