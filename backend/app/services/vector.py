import weaviate
from weaviate.classes.query import HybridFusion, MetadataQuery
import weaviate.classes.config as wconfig
import httpx
from app.config import settings
import logging

logger = logging.getLogger(__name__)

import time
import socket

def is_host_reachable(host, port, timeout=0.05):
    # Fast path: skip docker-internal hostnames when running locally without docker network
    if host in ["fkip-weaviate", "weaviate"]:
        return False
    try:
        s = socket.create_connection((host, port), timeout=timeout)
        s.close()
        return True
    except Exception:
        return False

class VectorService:
    def __init__(self):
        self._client = None
        self._is_disabled = False
        self._last_failed_time = 0

    @property
    def client(self):
        if self._is_disabled and (time.time() - self._last_failed_time < 60):
            return None

        if self._client is None:
            try:
                from urllib.parse import urlparse
                parsed = urlparse(settings.WEAVIATE_URL)
                host = parsed.hostname or "localhost"
                port = parsed.port or 8080
                secure = parsed.scheme == "https"
                
                # Fast socket check before blocking gRPC connect
                if not is_host_reachable(host, port, timeout=0.05):
                    logger.info(f"Weaviate host {host}:{port} unreachable. Disabling vector client.")
                    self._is_disabled = True
                    self._last_failed_time = time.time()
                    return None

                logger.info(f"Connecting to Weaviate at {settings.WEAVIATE_URL}...")
                # Deduce grpc port
                grpc_port = 50051
                if port == 8081:
                    grpc_port = 50052
                
                self._client = weaviate.connect_to_custom(
                    http_host=host,
                    http_port=port,
                    http_secure=secure,
                    grpc_host=host,
                    grpc_port=grpc_port,
                    grpc_secure=False
                )
                self._is_disabled = False
                self.init_schema()
            except Exception as e:
                logger.error(f"Failed to connect to Weaviate: {str(e)}")
                self._is_disabled = True
                self._last_failed_time = time.time()
                return None
        return self._client

    def init_schema(self):
        try:
            if not self._client.collections.exists("DocumentChunk"):
                logger.info("Creating DocumentChunk collection in Weaviate...")
                self._client.collections.create(
                    name="DocumentChunk",
                    description="Represents semantic chunks extracted from uploaded documents.",
                    vectorizer_config=None,
                    properties=[
                        wconfig.Property(
                            name="content",
                            data_type=wconfig.DataType.TEXT,
                            tokenization=wconfig.Tokenization.WORD
                        ),
                        wconfig.Property(
                            name="documentId",
                            data_type=wconfig.DataType.TEXT
                        ),
                        wconfig.Property(
                            name="fileName",
                            data_type=wconfig.DataType.TEXT
                        ),
                        wconfig.Property(
                            name="chunkIndex",
                            data_type=wconfig.DataType.INT
                        ),
                        wconfig.Property(
                            name="author",
                            data_type=wconfig.DataType.TEXT
                        ),
                        wconfig.Property(
                            name="createdDate",
                            data_type=wconfig.DataType.TEXT
                        )
                    ]
                )
            else:
                logger.info("DocumentChunk collection already exists in Weaviate.")
            
            if not self._client.collections.exists("DnaAppFeature"):
                logger.info("Creating DnaAppFeature collection in Weaviate...")
                self._client.collections.create(
                    name="DnaAppFeature",
                    description="Represents application features from the Core Banking catalog for similarity analysis.",
                    vectorizer_config=None,
                    properties=[
                        wconfig.Property(name="featureId", data_type=wconfig.DataType.TEXT),
                        wconfig.Property(name="appCode", data_type=wconfig.DataType.TEXT),
                        wconfig.Property(name="appName", data_type=wconfig.DataType.TEXT),
                        wconfig.Property(name="featureName", data_type=wconfig.DataType.TEXT),
                        wconfig.Property(name="featureDescription", data_type=wconfig.DataType.TEXT),
                        wconfig.Property(name="category", data_type=wconfig.DataType.TEXT)
                    ]
                )
            else:
                logger.info("DnaAppFeature collection already exists in Weaviate.")
        except Exception as e:
            logger.error(f"Error initializing Weaviate schema: {str(e)}")
            raise e

    def get_embedding(self, text: str):
        if not text or not text.strip():
            # Return zero vector fallback if text is empty
            return [0.0] * 384
        
        import time
        max_retries = 2
        for attempt in range(max_retries):
            try:
                response = httpx.post(
                    f"{settings.OLLAMA_URL}/api/embeddings",
                    json={
                        "model": settings.EMBEDDINGS_MODEL,
                        "prompt": text.strip()
                    },
                    timeout=5.0
                )
                if response.status_code == 200:
                    return response.json()["embedding"]
                else:
                    logger.warning(f"Ollama embedding attempt {attempt+1} failed: {response.status_code}")
            except Exception as e:
                logger.warning(f"Error calling Ollama embeddings API (attempt {attempt+1}/{max_retries}): {str(e)}")
                if attempt < max_retries - 1:
                    time.sleep(0.2)
        # Fallback to zero vector if embeddings fail or timeout
        return [0.0] * 384

    def index_chunks(self, chunks: list[dict]):
        collection = self.client.collections.get("DocumentChunk")
        with collection.batch.dynamic() as batch:
            for chunk in chunks:
                vector = self.get_embedding(chunk["content"])
                properties = {
                    "content": chunk["content"],
                    "documentId": str(chunk["document_id"]),
                    "fileName": chunk["file_name"],
                    "chunkIndex": chunk["chunk_index"],
                    "author": chunk.get("author") or "",
                    "createdDate": chunk.get("created_date") or ""
                }
                batch.add_object(
                    properties=properties,
                    vector=vector
                )
        logger.info(f"Successfully indexed {len(chunks)} chunks in Weaviate.")

    def hybrid_search(self, query: str, limit: int = 5, document_id: str = None, min_score: float = 0.35):
        if not query or not query.strip():
            return []
        try:
            collection = self.client.collections.get("DocumentChunk")
            query_vector = self.get_embedding(query)
            
            filters = None
            if document_id:
                from weaviate.classes.query import Filter
                filters = Filter.by_property("documentId").equal(str(document_id))
                
            response = collection.query.hybrid(
                query=query,
                vector=query_vector,
                limit=limit * 2,
                filters=filters,
                fusion_type=HybridFusion.RELATIVE_SCORE,
                return_metadata=MetadataQuery(score=True),
                alpha=0.5
            )
            results = []
            for obj in response.objects:
                score = obj.metadata.score if (obj.metadata and obj.metadata.score is not None) else 0.0
                if score >= min_score:
                    results.append({
                        "document_id": obj.properties.get("documentId"),
                        "filename": obj.properties.get("fileName"),
                        "chunk_content": obj.properties.get("content"),
                        "score": score
                    })
            results.sort(key=lambda x: x["score"], reverse=True)
            return results[:limit]
        except Exception as e:
            logger.error(f"Error during Weaviate hybrid search: {str(e)}")
            return []

vector_service = VectorService()
