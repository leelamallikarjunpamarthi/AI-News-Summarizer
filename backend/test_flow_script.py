import httpx
import os

BASE_URL = "http://localhost:8000/api/v1"

def test_flow():
    client = httpx.Client(timeout=120.0)
    
    # Create a dummy test file if not exists
    if not os.path.exists("test_upload.txt"):
        with open("test_upload.txt", "w") as f:
            f.write("This is a test document for simulation.")

    # 1. Upload
    print("Uploading...")
    with open("test_upload.txt", "rb") as f:
        files = {"file": ("test_upload.txt", f, "text/plain")}
        r = client.post(f"{BASE_URL}/upload", files=files)
        print(f"Upload Status: {r.status_code}")
        if r.status_code != 200:
            print(r.json())
            return
        doc_id = r.json()["document_id"]
        print(f"Document ID: {doc_id}")

    # 2. Analyze
    print("Analyzing...")
    r = client.post(f"{BASE_URL}/analyze", json={"document_id": doc_id})
    print(f"Analyze Status: {r.status_code}")
    if r.status_code != 200:
        print(r.json())
    else:
        data = r.json()
        print(f"Success! Summary: {data.get('summary', '')[:100]}")

if __name__ == "__main__":
    test_flow()
