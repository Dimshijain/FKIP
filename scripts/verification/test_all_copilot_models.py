import sys
import time
import json
import httpx

BASE_URL = "http://localhost:8000/api"

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

def run_all_model_tests():
    print("=" * 70)
    print("[START] TESTING ALL CONFIGURED COPILOT AI MODELS (SSE STREAMING)")
    print("=" * 70)

    # 1. Login
    login_res = httpx.post(
        f"{BASE_URL}/auth/login",
        json={"email": "admin@finxsystems.com", "password": "password123"},
        timeout=15.0
    )
    assert login_res.status_code == 200, "Login failed"
    token = login_res.json()["access_token"]
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    print("[AUTH] Successfully authenticated as admin.")

    # 2. Get Available Models
    models_res = httpx.get(f"{BASE_URL}/copilot/models", headers=headers, timeout=10.0)
    assert models_res.status_code == 200, "Failed to get models"
    configured_models = models_res.json()
    print(f"[MODELS] Retrieved {len(configured_models)} configured models from backend:")
    for m in configured_models:
        print(f"   * {m['name']} (ID: {m['id']}) - {m['parameter_size']}")

    # 3. Test Each Model with SSE Stream
    test_models = [
        ("qwen2:0.5b", "Qwen 2.5 (0.5B Fast)"),
        ("mistral:latest", "Mistral (7B Instruct)"),
        ("gemma:latest", "Gemma 3 (Google 2B)"),
        ("deepseek-r1:latest", "DeepSeek R1 (Reasoning)"),
        ("llama3:latest", "Llama 3.1 (8B Heavy)")
    ]

    results = []

    for model_id, model_label in test_models:
        print(f"\n" + "-" * 60)
        print(f"Testing Model: {model_label} [ID: {model_id}]")
        print("-" * 60)
        
        t0 = time.time()
        first_token_time = None
        accumulated_text = ""
        received_tokens = 0
        sse_done_payload = None

        timeout_val = 180.0 if "llama3" in model_id else 45.0
        client = httpx.Client(timeout=httpx.Timeout(timeout_val, connect=10.0, read=timeout_val))

        try:
            with client.stream(
                "POST",
                f"{BASE_URL}/copilot/chat/stream",
                headers=headers,
                json={"message": f"What is Python and how does {model_label} process code?", "model": model_id}
            ) as resp:
                assert resp.status_code == 200, f"SSE streaming HTTP status error: {resp.status_code}"
                
                for line in resp.iter_lines():
                    if not line:
                        continue
                    if line.startswith("data: "):
                        try:
                            payload = json.loads(line[6:])
                            token = payload.get("token", "")
                            if token:
                                if first_token_time is None:
                                    first_token_time = time.time() - t0
                                accumulated_text += token
                                received_tokens += 1
                            if payload.get("done", False):
                                sse_done_payload = payload
                                if payload.get("full_text"):
                                    accumulated_text = payload["full_text"]
                                break
                        except Exception as e:
                            pass
            
            total_duration = time.time() - t0
            ft_str = f"{first_token_time:.2f}s" if first_token_time else "N/A"
            
            print(f"[PASS] Model: {model_label}")
            print(f"   * Status: SUCCESS (200 OK)")
            print(f"   * Time to First Token: {ft_str}")
            print(f"   * Total Stream Time: {total_duration:.2f}s")
            print(f"   * Tokens Received: {received_tokens}")
            print(f"   * Conversation ID: {sse_done_payload.get('conversation_id') if sse_done_payload else 'N/A'}")
            print(f"   * Generated Text Sample:\n     {accumulated_text[:160]}...\n")
            
            results.append({
                "model": model_label,
                "id": model_id,
                "status": "PASS",
                "first_token_time": ft_str,
                "total_time": f"{total_duration:.2f}s",
                "preview": accumulated_text[:120]
            })
        except Exception as err:
            total_duration = time.time() - t0
            print(f"[FAIL] Model {model_label} encountered error: {str(err)} (after {total_duration:.2f}s)")
            results.append({
                "model": model_label,
                "id": model_id,
                "status": "FAIL",
                "error": str(err)
            })

    print("\n" + "=" * 70)
    print("ALL COPILOT MODELS TEST SUMMARY TABLE")
    print("=" * 70)
    for r in results:
        status_icon = "[PASS]" if r["status"] == "PASS" else "[FAIL]"
        print(f"{status_icon} {r['model']:<26} | TTFT: {r.get('first_token_time', 'N/A'):<8} | Total: {r.get('total_time', 'N/A'):<8} | Status: {r['status']}")

    return all(r["status"] == "PASS" for r in results)

if __name__ == "__main__":
    success = run_all_model_tests()
    sys.exit(0 if success else 1)
