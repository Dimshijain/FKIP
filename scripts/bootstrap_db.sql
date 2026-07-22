-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if they exist (for easy re-running)
DROP TABLE IF EXISTS user_feedback CASCADE;
DROP TABLE IF EXISTS search_audit_logs CASCADE;
DROP TABLE IF EXISTS innovation_opportunities CASCADE;
DROP TABLE IF EXISTS dna_app_features CASCADE;
DROP TABLE IF EXISTS dna_applications CASCADE;
DROP TABLE IF EXISTS oracle_dependencies CASCADE;
DROP TABLE IF EXISTS oracle_metadata CASCADE;
DROP TABLE IF EXISTS document_chunks CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop Enums if they exist
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS ingestion_status CASCADE;
DROP TYPE IF EXISTS oracle_object_type CASCADE;
DROP TYPE IF EXISTS dependency_type CASCADE;
DROP TYPE IF EXISTS opportunity_source CASCADE;
DROP TYPE IF EXISTS opportunity_metric CASCADE;
DROP TYPE IF EXISTS opportunity_priority CASCADE;
DROP TYPE IF EXISTS opportunity_status CASCADE;

-- Define Enums
CREATE TYPE user_role AS ENUM ('ADMIN', 'CREATOR', 'CONSUMER');
CREATE TYPE ingestion_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE oracle_object_type AS ENUM ('TABLE', 'VIEW', 'PROCEDURE', 'TRIGGER', 'COLUMN');
CREATE TYPE dependency_type AS ENUM ('FOREIGN_KEY', 'VIEW_REFERENCE', 'TRIGGER_REFERENCE', 'CALLS');
CREATE TYPE opportunity_source AS ENUM ('ORACLE_METADATA', 'DNA_APPLICATIONS', 'SUPPORT_TICKETS', 'RELEASE_NOTES', 'GENERAL');
CREATE TYPE opportunity_metric AS ENUM ('HIGH', 'MEDIUM', 'LOW');
CREATE TYPE opportunity_priority AS ENUM ('P1', 'P2', 'P3');
CREATE TYPE opportunity_status AS ENUM ('BACKLOG', 'IN_PROGRESS', 'VALIDATING', 'COMPLETED');

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'CONSUMER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Documents Table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(1024) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    file_type VARCHAR(10) NOT NULL,
    file_hash VARCHAR(64) UNIQUE NOT NULL,
    author VARCHAR(255),
    status ingestion_status NOT NULL DEFAULT 'PENDING',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Document Chunks Table
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    chunk_content TEXT NOT NULL,
    token_count INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Oracle Metadata Table
CREATE TABLE oracle_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    object_name VARCHAR(255) NOT NULL,
    object_type oracle_object_type NOT NULL,
    owner VARCHAR(100) NOT NULL,
    schema_definition TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_oracle_object UNIQUE (owner, object_name, object_type)
);

-- 5. Oracle Dependencies Table
CREATE TABLE oracle_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_object_id UUID NOT NULL REFERENCES oracle_metadata(id) ON DELETE CASCADE,
    target_object_id UUID NOT NULL REFERENCES oracle_metadata(id) ON DELETE CASCADE,
    dep_type dependency_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_dependency UNIQUE (source_object_id, target_object_id, dep_type)
);

-- 6. Core Banking Applications Table
CREATE TABLE dna_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_code VARCHAR(50) UNIQUE NOT NULL,
    app_name VARCHAR(255) NOT NULL,
    owner VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    version VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    platform VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Core Banking Application Features Table
CREATE TABLE dna_app_features (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID NOT NULL REFERENCES dna_applications(id) ON DELETE CASCADE,
    feature_name VARCHAR(255) NOT NULL,
    feature_description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Product Opportunities Table (Innovation Pipeline)
CREATE TABLE innovation_opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    opp_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    source_type opportunity_source NOT NULL,
    business_value opportunity_metric NOT NULL,
    complexity opportunity_metric NOT NULL,
    priority opportunity_priority NOT NULL,
    status opportunity_status NOT NULL DEFAULT 'BACKLOG',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Search Audit Logs Table
CREATE TABLE search_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    query_text TEXT NOT NULL,
    response_text TEXT NOT NULL,
    response_latency_ms INT NOT NULL,
    relevance_score NUMERIC(5,4),
    faithfulness_score NUMERIC(5,4),
    hallucination_detected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. User Feedback Table
CREATE TABLE user_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_id UUID NOT NULL REFERENCES search_audit_logs(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for performance
CREATE INDEX idx_doc_chunks_doc_id ON document_chunks(document_id);
CREATE INDEX idx_oracle_dependencies_source ON oracle_dependencies(source_object_id);
CREATE INDEX idx_oracle_dependencies_target ON oracle_dependencies(target_object_id);
CREATE INDEX idx_dna_features_app_id ON dna_app_features(app_id);
CREATE INDEX idx_search_audit_user ON search_audit_logs(user_id);

-- Seed Default Users (Password is 'password123' using bcrypt hash)
-- Hashed using passlib.hash.bcrypt.hash("password123")
INSERT INTO users (id, email, password_hash, role) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin@finxsystems.com', '$2b$12$5asK3Kr4YhV8RJPdppKQHu6Wn6Ci0NR5FUeiZB4eMOj0RVBo80JNm', 'ADMIN'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'creator@finxsystems.com', '$2b$12$5asK3Kr4YhV8RJPdppKQHu6Wn6Ci0NR5FUeiZB4eMOj0RVBo80JNm', 'CREATOR'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'consumer@finxsystems.com', '$2b$12$5asK3Kr4YhV8RJPdppKQHu6Wn6Ci0NR5FUeiZB4eMOj0RVBo80JNm', 'CONSUMER')
ON CONFLICT (email) DO NOTHING;
