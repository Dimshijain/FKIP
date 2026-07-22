import uuid
import logging
import weaviate.classes.query as wquery
from sqlalchemy.orm import Session
from app.db.models import DnaApplication, DnaAppFeature
from app.services.vector import vector_service

logger = logging.getLogger(__name__)

def ingest_dna_catalog(catalog_data: list[dict], db: Session) -> int:
    logger.info(f"Ingesting Core Banking Application catalog (count: {len(catalog_data)})...")
    
    total_features_indexed = 0
    client = vector_service.client
    collection = client.collections.get("DnaAppFeature")
    
    for app_data in catalog_data:
        app_code = app_data["app_code"].upper()
        app_name = app_data["app_name"]
        
        # 1. Upsert Core Banking Application record
        app_rec = db.query(DnaApplication).filter(DnaApplication.app_code == app_code).first()
        if app_rec:
            app_rec.app_name = app_name
            app_rec.owner = app_data.get("owner", "CORE_BANKING_PORTAL")
            app_rec.description = app_data.get("description", "")
            app_rec.version = app_data.get("version", "1.0")
            app_rec.status = app_data.get("status", "ACTIVE")
            app_rec.platform = app_data.get("platform", "UNKNOWN")
        else:
            app_rec = DnaApplication(
                app_code=app_code,
                app_name=app_name,
                owner=app_data.get("owner", "CORE_BANKING_PORTAL"),
                description=app_data.get("description", ""),
                version=app_data.get("version", "1.0"),
                status=app_data.get("status", "ACTIVE"),
                platform=app_data.get("platform", "UNKNOWN")
            )
            db.add(app_rec)
            
        db.flush()
        
        # 2. Delete existing features for this app (in DB and Weaviate)
        db_features = db.query(DnaAppFeature).filter(DnaAppFeature.app_id == app_rec.id).all()
        for f in db_features:
            # Delete from Weaviate
            from weaviate.classes.query import Filter
            collection.data.delete_many(
                where=Filter.by_property("featureId").equal(str(f.id))
            )
        db.query(DnaAppFeature).filter(DnaAppFeature.app_id == app_rec.id).delete()
        db.flush()

        # 3. Add and Index new features
        features_to_add = app_data.get("features", [])
        for feat in features_to_add:
            feat_name = feat["feature_name"]
            feat_desc = feat["feature_description"]
            feat_cat = feat.get("category", "Uncategorized")
            
            db_feat = DnaAppFeature(
                app_id=app_rec.id,
                feature_name=feat_name,
                feature_description=feat_desc,
                category=feat_cat
            )
            db.add(db_feat)
            db.flush()
            
            # Compute vector embedding
            text_to_embed = f"{feat_name}: {feat_desc} (Category: {feat_cat})"
            try:
                vector = vector_service.get_embedding(text_to_embed)
                
                # Index in Weaviate
                properties = {
                    "featureId": str(db_feat.id),
                    "appCode": app_code,
                    "appName": app_name,
                    "featureName": feat_name,
                    "featureDescription": feat_desc,
                    "category": feat_cat
                }
                collection.data.insert(
                    properties=properties,
                    vector=vector
                )
                total_features_indexed += 1
            except Exception as embed_err:
                logger.error(f"Failed to generate embedding or index feature '{feat_name}': {str(embed_err)}")
                
    db.commit()
    logger.info(f"Core Banking ingestion complete. Indexed {total_features_indexed} features.")
    return total_features_indexed

def find_duplicate_capabilities(db: Session, similarity_threshold: float = 0.80) -> list[dict]:
    # Groups similar features across DIFFERENT applications based on cosine distance.
    logger.info(f"Clustering duplicate capabilities with similarity threshold: {similarity_threshold}...")
    
    client = vector_service.client
    collection = client.collections.get("DnaAppFeature")
    
    all_features = db.query(DnaAppFeature).all()
    # Map feature ID to its application name/code details
    features_map = {f.id: f for f in all_features}
    
    processed_ids = set()
    clusters = []
    cluster_idx = 1
    
    for feat in all_features:
        if feat.id in processed_ids:
            continue
            
        # Get embedding of current feature from Weaviate
        # Query Weaviate object to retrieve vector
        weav_obj = collection.query.fetch_objects(
            filters=wquery.Filter.by_property("featureId").equal(str(feat.id)),
            include_vector=True,
            limit=1
        )
        if not weav_obj.objects or not weav_obj.objects[0].vector:
            continue
            
        feat_vector = weav_obj.objects[0].vector
        if isinstance(feat_vector, dict):
            feat_vector = list(feat_vector.values())[0]
        
        # Search Weaviate for nearest features
        matches = collection.query.near_vector(
            near_vector=feat_vector,
            limit=10,
            return_metadata=wquery.MetadataQuery(distance=True)
        )
        
        duplicates = []
        
        for match in matches.objects:
            m_feat_id = uuid.UUID(match.properties["featureId"])
            m_app_code = match.properties["appCode"]
            m_app_name = match.properties["appName"]
            m_feat_name = match.properties["featureName"]
            m_feat_desc = match.properties["featureDescription"]
            
            # Skip if it is the same feature or same application
            if m_feat_id == feat.id or m_app_code == feat.application.app_code:
                continue
                
            distance = match.metadata.distance if match.metadata.distance is not None else 1.0
            similarity = 1.0 - distance
            
            if similarity >= similarity_threshold:
                duplicates.append({
                    "app_code": m_app_code,
                    "app_name": m_app_name,
                    "feature_name": m_feat_name,
                    "feature_description": m_feat_desc,
                    "similarity_score": round(similarity, 4)
                })
                processed_ids.add(m_feat_id)
                
        if duplicates:
            processed_ids.add(feat.id)
            clusters.append({
                "cluster_id": f"CLUSTR-{cluster_idx:03d}",
                "primary_capability": feat.feature_name,
                "category": feat.category,
                "features": [
                    {
                        "app_code": feat.application.app_code,
                        "app_name": feat.application.app_name,
                        "feature_name": feat.feature_name,
                        "feature_description": feat.feature_description,
                        "similarity_score": 1.0
                    }
                ] + duplicates
            })
            cluster_idx += 1
            
    return clusters
