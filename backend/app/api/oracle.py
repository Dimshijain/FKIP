from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.db.session import get_db
from app.db.models import User, UserRole, OracleMetadata, OracleDependency
from app.db.schemas import OracleMetadataResponse, OracleDependencyResponse, ImpactAnalysisItem
from app.api.auth import get_current_user
from app.services.oracle_parser import parse_ddl, get_impacted_objects

router = APIRouter(prefix="/oracle", tags=["oracle"])

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_oracle_ddl(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Enforce write access (ADMIN or CREATOR)
    if current_user.role not in [UserRole.ADMIN, UserRole.CREATOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to upload DDL files"
        )
        
    filename = file.filename
    if not (filename.endswith(".sql") or filename.endswith(".txt") or filename.endswith(".ddl")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file extension. Please upload a .sql, .ddl or .txt DDL script."
        )
        
    try:
        content = await file.read()
        ddl_text = content.decode("utf-8")
        
        objects_count, deps_count = parse_ddl(ddl_text, db, owner="HR")
        
        return {
            "message": "DDL parsed and relationships indexed successfully.",
            "objects_created": objects_count,
            "relationships_created": deps_count
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error parsing DDL file: {str(e)}"
        )

@router.get("/objects", response_model=List[OracleMetadataResponse])
def get_oracle_objects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(OracleMetadata).order_by(OracleMetadata.object_type, OracleMetadata.object_name).all()

@router.get("/dependencies", response_model=List[OracleDependencyResponse])
def get_oracle_dependencies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(OracleDependency).all()

@router.get("/impact-analysis", response_model=List[ImpactAnalysisItem])
def get_impact_analysis(
    object_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if object exists
    obj = db.query(OracleMetadata).filter(OracleMetadata.id == object_id).first()
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Oracle metadata object with ID {object_id} not found."
        )
        
    try:
        return get_impacted_objects(str(object_id), db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing impact analysis: {str(e)}"
        )
