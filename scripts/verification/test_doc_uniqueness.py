import httpx
import json

def test_uniqueness():
    print("==========================================================")
    print("      FKIP DOCUMENT GENERATOR UNIQUENESS TEST            ")
    print("==========================================================")

    # 1. Login
    auth_resp = httpx.post(
        'http://localhost:8000/api/auth/login',
        json={'email': 'admin@finxsystems.com', 'password': 'password123', 'role': 'ADMIN'},
        timeout=30.0
    )
    assert auth_resp.status_code == 200, f"Auth failed: {auth_resp.text}"
    token = auth_resp.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    doc_types = ["BRD", "SRS", "TECH_DESIGN", "API_DOCS", "RELEASE_NOTES", "USER_MANUAL"]
    generated_results = {}

    print("\n1. GENERATING DOCUMENTS ACROSS ALL 6 TEMPLATES...")
    for dt in doc_types:
        title = f"Project FKIP Spec - {dt}"
        res = httpx.post(
            'http://localhost:8000/api/docs/generate',
            json={'doc_type': dt, 'title': title},
            headers=headers,
            timeout=60.0
        )
        assert res.status_code == 201, f"Failed for doc_type: {dt} -> {res.text}"
        doc_data = res.json()
        content = doc_data['content']
        
        # Extract main section headings (lines starting with ##)
        headings = [line.strip() for line in content.split('\n') if line.strip().startswith('## ')]
        
        generated_results[dt] = {
            'title': doc_data['title'],
            'content_length': len(content),
            'headings': headings,
            'content_snippet': content[:150].replace('\n', ' ')
        }
        
        print(f"\n[Generated {dt}] ({len(content)} chars)")
        print(f"  Title: {doc_data['title']}")
        print(f"  Headings Count: {len(headings)}")
        print(f"  Headings: {headings[:3]}")

    print("\n==========================================================")
    print("2. VERIFYING STRUCTURAL & CONTENT UNIQUENESS MATRIX")
    print("==========================================================")

    # Compare SRS vs API_DOCS specifically
    srs_headings = set(generated_results['SRS']['headings'])
    api_headings = set(generated_results['API_DOCS']['headings'])
    
    heading_intersection = srs_headings.intersection(api_headings)
    print(f"SRS Headings: {srs_headings}")
    print(f"API_DOCS Headings: {api_headings}")
    print(f"Overlap between SRS and API_DOCS headings: {len(heading_intersection)} headings")
    
    assert len(heading_intersection) <= 1, "SRS and API_DOCS should have distinct section structures!"

    # Verify all 6 templates have distinct heading signatures
    heading_signatures = [tuple(res['headings']) for res in generated_results.values()]
    unique_signatures = set(heading_signatures)
    
    print(f"\nTotal Template Types Tested: {len(doc_types)}")
    print(f"Unique Template Section Signatures: {len(unique_signatures)}")
    
    assert len(unique_signatures) == len(doc_types), f"Expected {len(doc_types)} unique document structures, got {len(unique_signatures)}"

    print("\nSUCCESS: All document templates generate 100% unique, template-specific content!")
    print("==========================================================")

if __name__ == "__main__":
    test_uniqueness()
