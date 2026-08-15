import httpx

def debug_chat():
    print("Testing /api/search/chat endpoint...")
    auth_resp = httpx.post(
        'http://localhost:8000/api/auth/login',
        json={'email': 'admin@finxsystems.com', 'password': 'password123', 'role': 'ADMIN'},
        timeout=30.0
    )
    token = auth_resp.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    for query in ["Hi", "Hello", "Tell me about core banking architecture", "What database tables are used in FKIP?"]:
        print(f"\nSending query: '{query}'")
        res = httpx.post(
            'http://localhost:8000/api/search/chat',
            json={'messages': [{'role': 'user', 'content': query}]},
            headers=headers,
            timeout=30.0
        )
        print(f"Status Code: {res.status_code}")
        print(f"Response: {res.text}")

if __name__ == "__main__":
    debug_chat()
