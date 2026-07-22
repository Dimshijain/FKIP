import logging
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.db.models import User, Document, OracleMetadata, OracleDependency, DnaApplication, DnaAppFeature, Opportunity
from app.db.schemas import KnowledgeGraphResponse, GraphNode, GraphEdge
from app.api.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/knowledge-graph", tags=["knowledge-graph"])

@router.get("", response_model=KnowledgeGraphResponse)
def get_connected_knowledge_graph(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    nodes = []
    edges = []
    
    # 1. Fetch all elements from DB
    documents = db.query(Document).all()
    oracle_objects = db.query(OracleMetadata).all()
    oracle_deps = db.query(OracleDependency).all()
    dna_apps = db.query(DnaApplication).all()
    dna_features = db.query(DnaAppFeature).all()
    opps = db.query(Opportunity).all()

    # 2. Map Document Nodes
    for doc in documents:
        nodes.append(GraphNode(
            id=f"doc-{doc.id}",
            label=doc.filename,
            type="document",
            metadata={"file_type": doc.file_type, "status": doc.status.value}
        ))

    # 3. Map Oracle Object Nodes
    for obj in oracle_objects:
        nodes.append(GraphNode(
            id=f"ora-{obj.id}",
            label=obj.object_name,
            type="oracle_object",
            metadata={"object_type": obj.object_type.value, "owner": obj.owner}
        ))

    # 4. Map Core Banking Application Nodes
    for app in dna_apps:
        nodes.append(GraphNode(
            id=f"dna-app-{app.id}",
            label=app.app_name,
            type="dna_application",
            metadata={"app_code": app.app_code, "platform": app.platform}
        ))

    # 5. Map Core Banking Feature Nodes
    for feat in dna_features:
        nodes.append(GraphNode(
            id=f"dna-feat-{feat.id}",
            label=feat.feature_name,
            type="dna_feature",
            metadata={"category": feat.category}
        ))
        
        # Add 'belongs_to' edge from Feature to its Application
        edges.append(GraphEdge(
            id=f"edge-dna-feat-app-{feat.id}",
            source=f"dna-feat-{feat.id}",
            target=f"dna-app-{feat.app_id}",
            type="belongs_to"
        ))

    # 6. Map Opportunity Nodes
    for o in opps:
        nodes.append(GraphNode(
            id=f"opp-{o.id}",
            label=o.name,
            type="opportunity",
            metadata={"opp_code": o.opp_code, "priority": o.priority.value, "status": o.status.value}
        ))

    # 7. Map Relational Edges
    
    # A. Oracle-to-Oracle Dependencies
    for dep in oracle_deps:
        edges.append(GraphEdge(
            id=f"edge-ora-ora-{dep.id}",
            source=f"ora-{dep.source_object_id}",
            target=f"ora-{dep.target_object_id}",
            type="depends_on"
        ))

    # B. Opportunity-to-Source Links
    # Try to dynamically link opportunities to documents or applications
    for o in opps:
        # Check if the opportunity source or description matches a document's filename or type
        linked_to_doc = False
        for doc in documents:
            clean_filename = doc.filename.lower().split(".")[0]
            if clean_filename in o.description.lower() or clean_filename in o.name.lower():
                edges.append(GraphEdge(
                    id=f"edge-opp-doc-{o.id}-{doc.id}",
                    source=f"opp-{o.id}",
                    target=f"doc-{doc.id}",
                    type="source_of"
                ))
                linked_to_doc = True
        
        # Link to Core Banking application if code or name is mentioned
        linked_to_app = False
        for app in dna_apps:
            if app.app_code.lower() in o.description.lower() or app.app_name.lower() in o.description.lower():
                edges.append(GraphEdge(
                    id=f"edge-opp-app-{o.id}-{app.id}",
                    source=f"opp-{o.id}",
                    target=f"dna-app-{app.id}",
                    type="references"
                ))
                linked_to_app = True
                
        # Fallback general link to first doc if nothing is linked, to ensure graph is connected
        if not linked_to_doc and documents:
            edges.append(GraphEdge(
                id=f"edge-opp-doc-fallback-{o.id}",
                source=f"opp-{o.id}",
                target=f"doc-{documents[0].id}",
                type="source_of"
            ))

    # C. Core Banking Application-to-Oracle database linkages
    # We dynamically link Core Banking Features to Oracle Objects if the category names, table names, or feature texts match.
    for feat in dna_features:
        for obj in oracle_objects:
            obj_name = obj.object_name.lower()
            feat_desc = feat.feature_description.lower()
            feat_name = feat.feature_name.lower()
            
            # Simple substring mapping (e.g. if 'employee' is in feature name, link to 'EMPLOYEES' table node)
            if obj_name in feat_desc or obj_name in feat_name or feat.category.lower() in obj_name:
                edges.append(GraphEdge(
                    id=f"edge-feat-ora-{feat.id}-{obj.id}",
                    source=f"dna-feat-{feat.id}",
                    target=f"ora-{obj.id}",
                    type="references"
                ))

    # D. Link Documents to database schemas if schema names are mentioned in document titles
    for doc in documents:
        for obj in oracle_objects:
            obj_name = doc.filename.lower()
            if obj.object_name.lower() in obj_name:
                edges.append(GraphEdge(
                    id=f"edge-doc-ora-{doc.id}-{obj.id}",
                    source=f"doc-{doc.id}",
                    target=f"ora-{obj.id}",
                    type="contains"
                ))

    return KnowledgeGraphResponse(nodes=nodes, edges=edges)
