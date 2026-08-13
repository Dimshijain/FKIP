import pytest
import time
import io

def test_tc_doc_001_txt_document_upload(client, admin_headers):
    """TC-DOC-001: Upload text document and trigger processing."""
    content = f"# Test Document {int(time.time())}\n\nAutomated ingestion test content."
    file_tuple = ("test_doc.txt", io.BytesIO(content.encode("utf-8")), "text/plain")
    
    headers = {"Authorization": admin_headers["Authorization"]}
    res = client.post("/documents/upload", headers=headers, files={"file": file_tuple})
    assert res.status_code in [200, 201, 202], f"Upload failed: {res.text}"
    data = res.json()
    assert "id" in data
    assert data["filename"] == "test_doc.txt"

def test_tc_doc_004_invalid_file_extension(client, admin_headers):
    """TC-DOC-004: Upload unsupported file extension."""
    file_tuple = ("bad_file.exe", io.BytesIO(b"binary data"), "application/octet-stream")
    headers = {"Authorization": admin_headers["Authorization"]}
    res = client.post("/documents/upload", headers=headers, files={"file": file_tuple})
    assert res.status_code == 400

def test_tc_doc_005_list_documents(client, admin_headers):
    """TC-DOC-005: List documents."""
    docs_res = client.get("/documents", headers=admin_headers)
    assert docs_res.status_code == 200
    docs = docs_res.json()
    assert isinstance(docs, list)

def test_tc_doc_008_viewer_upload_restriction(client, consumer_headers):
    """TC-DOC-008: Viewer accounts cannot upload files."""
    file_tuple = ("test.txt", io.BytesIO(b"content"), "text/plain")
    headers = {"Authorization": consumer_headers["Authorization"]}
    res = client.post("/documents/upload", headers=headers, files={"file": file_tuple})
    assert res.status_code == 403
