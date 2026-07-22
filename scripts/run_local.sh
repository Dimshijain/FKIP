#!/bin/bash

# Exit on error
set -e

echo "=================================================================="
echo "⚡ Launching FKIP (FinXSystems Knowledge Intelligence Platform) ⚡"
echo "=================================================================="

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "Error: Docker daemon is not running. Please start Docker and try again."
    exit 1
fi

echo "Step 1: Copying environment variables if not exist..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo ".env created from .env.example"
fi

echo "Step 2: Building and starting Docker containers in background..."
docker compose up --build -d

echo "Step 3: Checking on-premise Ollama model status..."
echo "Waiting for Ollama to boot up..."
sleep 5

# Auto pull required models on local Ollama container
echo "Pulling local embeddings model (all-minilm)..."
docker exec -it fkip-ollama ollama pull all-minilm || true

echo "Pulling local LLM (llama3)..."
docker exec -it fkip-ollama ollama pull llama3 || true

echo "=================================================================="
echo "✅ FKIP Phase 1 Foundation Stack Launched Successfully!"
echo "=================================================================="
echo "• Frontend URL : http://localhost:5173"
echo "• Backend Health: http://localhost:8000/health"
echo "• Weaviate DB   : http://localhost:8080"
echo "• Ollama Engine : http://localhost:11434"
echo "=================================================================="
echo "Use 'docker compose logs -f' to monitor service diagnostics."
echo "Default login credentials:"
echo "  - Uploader: creator@finxsystems.com (password: password123)"
echo "  - Viewer  : consumer@finxsystems.com (password: password123)"
echo "=================================================================="
