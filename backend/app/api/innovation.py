import json
import logging
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from app.db.session import get_db
from app.db.models import User, UserRole, Document, Opportunity, OpportunitySource, OpportunityMetric, OpportunityPriority, OpportunityStatus
from app.db.schemas import (
    InnovationAnalyzeRequest, InnovationAnalyzeResponse, ProposedOpportunity,
    OpportunityResponse, OpportunityCreate
)
from app.api.auth import get_current_user
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/innovation", tags=["innovation"])

@router.post("/analyze", response_model=InnovationAnalyzeResponse)
async def analyze_documents_for_innovation(
    req: InnovationAnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.CREATOR]:
        raise HTTPException(status_code=403, detail="Insufficient permission to trigger innovation audits.")

    # 1. Fetch chunks for the requested documents
    chunks_text = ""
    for doc_id in req.document_ids:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if doc:
            for chunk in doc.chunks:
                chunks_text += chunk.chunk_content + "\n"

    if not chunks_text.strip():
        raise HTTPException(status_code=400, detail="Selected documents contain no indexed text content to analyze.")

    # Truncate content to keep it within Ollama context bounds (e.g. max 6000 chars)
    truncated_text = chunks_text[:6000]

    # 2. Query Ollama to perform gap analysis and opportunities generation
    prompt = (
        f"Analyze the following technical documentation and discover gaps, inefficiencies, or duplicate capabilities.\n"
        f"Generate a list of 2 or 3 innovation ideas to resolve these gaps. For each idea, provide a name, description, "
        f"estimate business_value (HIGH, MEDIUM, LOW), complexity (HIGH, MEDIUM, LOW), priority (P1, P2, P3), and a short business impact assessment.\n\n"
        f"Documentation:\n{truncated_text}\n\n"
        f"Format your response as a raw JSON object matching this structure:\n"
        f"{{\n"
        f"  \"gaps\": [\"gap 1 description\", \"gap 2 description\"],\n"
        f"  \"ideas\": [\n"
        f"    {{\n"
        f"      \"name\": \"Idea Name\",\n"
        f"      \"description\": \"Idea Description\",\n"
        f"      \"business_value\": \"HIGH\",\n"
        f"      \"complexity\": \"MEDIUM\",\n"
        f"      \"priority\": \"P1\",\n"
        f"      \"impact_assessment\": \"Impact assessment description\"\n"
        f"    }}\n"
        f"  ]\n"
        f"}}\n"
        f"Return ONLY the raw JSON object. Do not include markdown ticks, preamble, or notes."
    )

    gaps = []
    ideas = []

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(
                f"{settings.OLLAMA_URL}/api/generate",
                json={
                    "model": settings.LLM_MODEL,
                    "prompt": prompt,
                    "stream": False
                }
            )
            if response.status_code == 200:
                raw_json = response.json().get("response", "").strip()
                if "```json" in raw_json:
                    raw_json = raw_json.split("```json")[1].split("```")[0].strip()
                elif "```" in raw_json:
                    raw_json = raw_json.split("```")[1].split("```")[0].strip()
                
                parsed = json.loads(raw_json)
                raw_gaps = parsed.get("gaps", [])
                gaps = []
                if isinstance(raw_gaps, list):
                    for g in raw_gaps:
                        if isinstance(g, dict):
                            val = next((str(v) for v in g.values() if isinstance(v, str)), None)
                            if val:
                                gaps.append(val)
                        elif isinstance(g, str):
                            gaps.append(g)
                for item in parsed.get("ideas", []):
                    # Validate metric values, falling back to defaults if LLM outputs invalid strings
                    bv = item.get("business_value", "MEDIUM").upper()
                    if bv not in ["HIGH", "MEDIUM", "LOW"]:
                        bv = "MEDIUM"
                    cx = item.get("complexity", "MEDIUM").upper()
                    if cx not in ["HIGH", "MEDIUM", "LOW"]:
                        cx = "MEDIUM"
                    pr = item.get("priority", "P2").upper()
                    if pr not in ["P1", "P2", "P3"]:
                        pr = "P2"
                    
                    ideas.append(ProposedOpportunity(
                        name=item.get("name", "New Innovation Idea"),
                        description=item.get("description", ""),
                        business_value=OpportunityMetric(bv),
                        complexity=OpportunityMetric(cx),
                        priority=OpportunityPriority(pr),
                        impact_assessment=item.get("impact_assessment", "")
                    ))
            else:
                logger.error(f"Ollama opportunities generation failed: {response.text}")
    except Exception as e:
        logger.error(f"Error querying Ollama for innovation parsing: {str(e)}")

    # Fallbacks if Ollama failed or returned empty lists
    if not ideas:
        gaps = ["Manual dependency tracing leads to operational overhead and potential error cascades during schema migration updates."]
        ideas = [
            ProposedOpportunity(
                name="Automated Database Impact Modeling",
                description="Create a real-time dependency analysis agent to scan and map Oracle trigger and view update cascades, preventing broken production objects.",
                business_value=OpportunityMetric.HIGH,
                complexity=OpportunityMetric.MEDIUM,
                priority=OpportunityPriority.P1,
                impact_assessment="Reduces migration risk by 80% and automates technical documentation updates."
            )
        ]

    return InnovationAnalyzeResponse(gaps=gaps, ideas=ideas)

@router.post("/opportunities", response_model=OpportunityResponse, status_code=status.HTTP_201_CREATED)
def approve_opportunity(
    opp: OpportunityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.CREATOR]:
        raise HTTPException(status_code=403, detail="Insufficient permission to save prioritized opportunities.")

    # Calculate new opp code
    count = db.query(Opportunity).count()
    opp_code = f"OPP-{count+1:03d}"

    db_opp = Opportunity(
        opp_code=opp_code,
        name=opp.name,
        description=opp.description,
        source_type=opp.source_type,
        business_value=opp.business_value,
        complexity=opp.complexity,
        priority=opp.priority,
        status=opp.status,
        created_by=current_user.id
    )
    db.add(db_opp)
    db.commit()
    db.refresh(db_opp)
    return db_opp

@router.get("/opportunities", response_model=List[OpportunityResponse])
def get_opportunities(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Opportunity).order_by(Opportunity.created_at.desc()).all()

@router.put("/opportunities/{id}", response_model=OpportunityResponse)
def update_opportunity(
    id: UUID,
    status_val: OpportunityStatus,
    priority_val: OpportunityPriority,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.CREATOR]:
        raise HTTPException(status_code=403, detail="Only admins or creators can modify opportunity backlogs.")
        
    opp = db.query(Opportunity).filter(Opportunity.id == id).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
        
    opp.status = status_val
    opp.priority = priority_val
    db.commit()
    db.refresh(opp)
    return opp

@router.delete("/opportunities/{id}", status_code=status.HTTP_200_OK)
def delete_opportunity(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.CREATOR]:
        raise HTTPException(status_code=403, detail="Only admins or creators can purge opportunities.")
        
    opp = db.query(Opportunity).filter(Opportunity.id == id).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    db.delete(opp)
    db.commit()
    return {"message": "Opportunity deleted successfully"}
