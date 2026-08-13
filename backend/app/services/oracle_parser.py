import re
import logging
from sqlalchemy.orm import Session
from app.db.models import OracleMetadata, OracleDependency, OracleObjectType, DependencyType

logger = logging.getLogger(__name__)

def clean_sql_statement(statement: str) -> str:
    # Strip comments and extra spaces
    statement = re.sub(r'--.*?\n', '', statement)
    statement = re.sub(r'/\*.*?\*/', '', statement, flags=re.DOTALL)
    return statement.strip()

def parse_ddl(ddl_content: str, db: Session, owner: str = "HR"):
    logger.info(f"Parsing Oracle SQL DDL script (length: {len(ddl_content)})...")
    
    # Split by semicolon to get individual SQL statements
    raw_statements = ddl_content.split(";")
    parsed_objects = []
    
    # 1. First Pass: Create Metadata Entries for Tables, Views, Procedures, Triggers
    for raw in raw_statements:
        cleaned = clean_sql_statement(raw)
        if not cleaned:
            continue
            
        obj_name = None
        obj_type = None
        
        # Check CREATE TABLE
        table_match = re.search(r'CREATE\s+TABLE\s+(?:(\w+)\.)?(\w+)', cleaned, re.IGNORECASE)
        if table_match:
            obj_name = table_match.group(2).upper()
            obj_type = OracleObjectType.TABLE
            
        # Check CREATE VIEW
        view_match = re.search(r'CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+(?:(\w+)\.)?(\w+)', cleaned, re.IGNORECASE)
        if view_match and not obj_type:
            obj_name = view_match.group(2).upper()
            obj_type = OracleObjectType.VIEW
            
        # Check CREATE PROCEDURE
        proc_match = re.search(r'CREATE\s+(?:OR\s+REPLACE\s+)?PROCEDURE\s+(?:(\w+)\.)?(\w+)', cleaned, re.IGNORECASE)
        if proc_match and not obj_type:
            obj_name = proc_match.group(2).upper()
            obj_type = OracleObjectType.PROCEDURE
            
        # Check CREATE TRIGGER
        trig_match = re.search(r'CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\s+(?:(\w+)\.)?(\w+)', cleaned, re.IGNORECASE)
        if trig_match and not obj_type:
            obj_name = trig_match.group(2).upper()
            obj_type = OracleObjectType.TRIGGER

        if obj_name and obj_type:
            # Overwrite or create new
            existing = db.query(OracleMetadata).filter(
                OracleMetadata.owner == owner,
                OracleMetadata.object_name == obj_name,
                OracleMetadata.object_type == obj_type
            ).first()
            
            if existing:
                existing.schema_definition = cleaned
                db_obj = existing
            else:
                db_obj = OracleMetadata(
                    object_name=obj_name,
                    object_type=obj_type,
                    owner=owner,
                    schema_definition=cleaned
                )
                db.add(db_obj)
            
            db.flush()
            parsed_objects.append(db_obj)
            
    db.commit()
    logger.info(f"Step 1 Complete: Indexed {len(parsed_objects)} database objects.")

    # 2. Second Pass: Extract Dependencies
    logger.info("Step 2: Resolving relationships and table dependencies...")
    all_metadata = db.query(OracleMetadata).filter(OracleMetadata.owner == owner).all()
    metadata_map = {m.object_name: m for m in all_metadata}
    
    dependencies_created = 0
    
    for obj in all_metadata:
        definition = obj.schema_definition.upper()
        
        # Case A: Foreign Keys (for tables)
        if obj.object_type == OracleObjectType.TABLE:
            # Look for REFERENCES keyword
            fk_matches = re.findall(r'REFERENCES\s+(?:(\w+)\.)?(\w+)', definition, re.IGNORECASE)
            for fk in fk_matches:
                ref_table_name = fk[1].upper()
                if ref_table_name in metadata_map:
                    target_obj = metadata_map[ref_table_name]
                    # Source depends on Target (e.g. EMPLOYEES references DEPARTMENTS)
                    create_dependency(db, obj.id, target_obj.id, DependencyType.FOREIGN_KEY)
                    dependencies_created += 1

        # Case B: Views referencing other tables/views
        elif obj.object_type == OracleObjectType.VIEW:
            # Look for occurrences of known tables/views in view SQL
            for name, target in metadata_map.items():
                if name == obj.object_name:
                    continue
                # Verify match is not substring (use word boundaries)
                if re.search(r'\b' + name + r'\b', definition):
                    create_dependency(db, obj.id, target.id, DependencyType.VIEW_REFERENCE)
                    dependencies_created += 1
                    
        # Case C: Triggers referencing tables
        elif obj.object_type == OracleObjectType.TRIGGER:
            # Look for ON table_name
            on_match = re.search(r'ON\s+(?:(\w+)\.)?(\w+)', definition, re.IGNORECASE)
            if on_match:
                table_name = on_match.group(2).upper()
                if table_name in metadata_map:
                    target_obj = metadata_map[table_name]
                    create_dependency(db, obj.id, target_obj.id, DependencyType.TRIGGER_REFERENCE)
                    dependencies_created += 1
                    
        # Case D: Procedures calling tables/views
        elif obj.object_type == OracleObjectType.PROCEDURE:
            for name, target in metadata_map.items():
                if name == obj.object_name:
                    continue
                if re.search(r'\b' + name + r'\b', definition):
                    create_dependency(db, obj.id, target.id, DependencyType.CALLS)
                    dependencies_created += 1

    db.commit()
    logger.info(f"Dependency extraction complete. Created {dependencies_created} relationships.")
    return len(parsed_objects), dependencies_created

def create_dependency(db: Session, source_id: str, target_id: str, dep_type: DependencyType):
    existing = db.query(OracleDependency).filter(
        OracleDependency.source_object_id == source_id,
        OracleDependency.target_object_id == target_id,
        OracleDependency.dep_type == dep_type
    ).first()
    if not existing:
        dep = OracleDependency(
            source_object_id=source_id,
            target_object_id=target_id,
            dep_type=dep_type
        )
        db.add(dep)

def get_impacted_objects(object_id: str, db: Session, max_depth: int = 5) -> list[dict]:
    # BFS traversal to find all source nodes that depend on this target node (downstream impacts)
    impacted = []
    visited = set()
    queue = [(object_id, 0, "DIRECT")]  # (current_id, depth, dependency_type)
    
    # Map for easy metadata resolution
    all_metadata = db.query(OracleMetadata).all()
    metadata_cache = {str(m.id): m for m in all_metadata}
    known_object_names = {m.object_name.upper() for m in all_metadata}
    
    while queue:
        curr_id, depth, d_type = queue.pop(0)
        curr_id_str = str(curr_id)
        
        if curr_id_str in visited:
            continue
            
        if curr_id_str != str(object_id):
            visited.add(curr_id_str)
            obj = metadata_cache.get(curr_id_str)
            if obj:
                # Determine reference validity and risk level based on actual schema metadata
                is_valid = True
                status = "VALID_REFERENCE"
                status_label = "Valid reference"
                risk_level = "LOW" if depth > 1 else "MEDIUM"
                
                # Check for broken references (e.g. foreign keys to tables not present in schema)
                if obj.schema_definition:
                    definition = obj.schema_definition.upper()
                    fk_matches = re.findall(r'REFERENCES\s+(?:(\w+)\.)?(\w+)', definition, re.IGNORECASE)
                    for fk in fk_matches:
                        ref_table = fk[1].upper()
                        if ref_table not in known_object_names:
                            is_valid = False
                            status = "BROKEN_REFERENCE"
                            status_label = "Broken reference risk"
                            risk_level = "HIGH"
                            break

                impacted.append({
                    "id": obj.id,
                    "object_name": obj.object_name,
                    "object_type": obj.object_type.value,
                    "dep_type": d_type,
                    "depth": depth,
                    "status": status,
                    "status_label": status_label,
                    "risk_level": risk_level,
                    "is_broken": not is_valid
                })
        else:
            visited.add(curr_id_str)
            
        if depth >= max_depth:
            continue
            
        # Find all dependencies where target_object_id is curr_id (objects that depend on curr_id)
        downstream = db.query(OracleDependency).filter(OracleDependency.target_object_id == curr_id).all()
        for dep in downstream:
            queue.append((dep.source_object_id, depth + 1, dep.dep_type.value))
            
    return sorted(impacted, key=lambda x: (x["depth"], x["object_type"], x["object_name"]))

