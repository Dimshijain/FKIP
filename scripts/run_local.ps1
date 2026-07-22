Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "⚡ Launching FKIP (FinXSystems Knowledge Intelligence Platform) ⚡" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# Check if Docker is running
& docker info >$null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Docker daemon is not running. Please start Docker and try again." -ForegroundColor Red
    Exit 1
}

Write-Host "Step 1: Copying environment variables if not exist..." -ForegroundColor Yellow
if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host ".env created from .env.example"
}

Write-Host "Step 2: Building and starting Docker containers in background..." -ForegroundColor Yellow
& docker compose up --build -d

Write-Host "Step 3: Checking on-premise Ollama model status..." -ForegroundColor Yellow
Write-Host "Waiting for Ollama to boot up..."
Start-Sleep -Seconds 5

# Auto pull required models on local Ollama container
Write-Host "Pulling local embeddings model (all-minilm)..." -ForegroundColor Green
& docker exec -it fkip-ollama ollama pull all-minilm

Write-Host "Pulling local LLM (llama3)..." -ForegroundColor Green
& docker exec -it fkip-ollama ollama pull llama3

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "✅ FKIP Phase 1 Foundation Stack Launched Successfully!" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "• Frontend URL : http://localhost:5173"
Write-Host "• Backend Health: http://localhost:8000/health"
Write-Host "• Weaviate DB   : http://localhost:8080"
Write-Host "• Ollama Engine : http://localhost:11434"
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "Use 'docker compose logs -f' to monitor service diagnostics."
Write-Host "Default login credentials:"
Write-Host "  - Uploader: creator@finxsystems.com (password: password123)"
Write-Host "  - Viewer  : consumer@finxsystems.com (password: password123)"
Write-Host "==================================================================" -ForegroundColor Cyan
