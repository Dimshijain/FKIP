import weaviate
import weaviate.classes.config as wconfig
import os
import sys

# Load environment variable or default
weaviate_url = os.getenv("WEAVIATE_URL", "http://localhost:8080")

print(f"Connecting to Weaviate instance at {weaviate_url}...")

from urllib.parse import urlparse
parsed = urlparse(weaviate_url)
host = parsed.hostname or "localhost"
port = parsed.port or 8080
secure = parsed.scheme == "https"
grpc_port = int(os.getenv("WEAVIATE_GRPC_PORT", "50052"))

try:
    client = weaviate.connect_to_custom(
        http_host=host,
        http_port=port,
        http_secure=secure,
        grpc_host=host,
        grpc_port=grpc_port,
        grpc_secure=False
    )
except Exception as e:
    print(f"Error: Unable to connect to Weaviate: {str(e)}")
    sys.exit(1)

try:
    if not client.collections.exists("DocumentChunk"):
        print("Creating collection 'DocumentChunk'...")
        client.collections.create(
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
        print("Collection 'DocumentChunk' created successfully.")
    else:
        print("Collection 'DocumentChunk' already exists.")
        
    client.close()
    print("Schema setup completed successfully!")

except Exception as e:
    print(f"Schema setup failed: {str(e)}")
    sys.exit(1)
