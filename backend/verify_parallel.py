import httpx
import os
import time
import asyncio

BASE_URL = "http://localhost:8000/api/v1"

async def verify_parallel_analysis():
    print("\n--- Verifying Backend Parallel Analysis ---")
    
    # 1. Create a large text file (triggering ~5 windows of 8k each)
    content = "This is a test sentence that will be repeated to create a large file. " * 500 # ~35,000 chars
    with open("large_test.txt", "w") as f:
        f.write(content)

    async with httpx.AsyncClient(timeout=120.0) as client:
        # a. Upload
        print("Uploading large document...")
        with open("large_test.txt", "rb") as f:
            files = {"file": ("large_test.txt", f, "text/plain")}
            r = await client.post(f"{BASE_URL}/upload", files=files)
            doc_id = r.json()["document_id"]
        
        # b. Analyze with timing
        print(f"Analyzing document '{doc_id}' (should take ~2-3s if parallel, >10s if sequential)...")
        start_time = time.perf_counter()
        
        # We need to set FORCE_MOCK_LLM=true in the environment where the server runs.
        # But here we are calling the API, so we assume the server is already running with that env var.
        
        r = await client.post(f"{BASE_URL}/analyze", json={"document_id": doc_id})
        duration = time.perf_counter() - start_time
        
        print(f"Analysis Status: {r.status_code}")
        print(f"Total time: {duration:.2f} seconds")
        
        if duration < 6.0:
            print("✅ SUCCESS: Parallelization confirmed! (Processed ~5 windows in under 6s)")
        else:
            print("❌ FAILURE: Analysis seems sequential or slower than expected.")

async def verify_parallel_upload():
    print("\n--- Verifying Frontend-style Parallel Upload/Analyze ---")
    
    # Create 3 small files
    filenames = ["p1.txt", "p2.txt", "p3.txt"]
    for fn in filenames:
        with open(fn, "w") as f:
            f.write(f"Content for {fn}")

    async with httpx.AsyncClient(timeout=120.0) as client:
        print(f"Uploading and analyzing {len(filenames)} files in parallel...")
        start_time = time.perf_counter()
        
        async def process_file(fn):
            with open(fn, "rb") as f:
                # Upload
                r_up = await client.post(f"{BASE_URL}/upload", files={"file": (fn, f, "text/plain")})
                did = r_up.json()["document_id"]
                # Analyze
                await client.post(f"{BASE_URL}/analyze", json={"document_id": did})
                return fn

        results = await asyncio.gather(*[process_file(fn) for fn in filenames])
        duration = time.perf_counter() - start_time
        
        print(f"Total time for {len(filenames)} files: {duration:.2f} seconds")
        
        # Each analysis takes 2s (mock). 3 in parallel should take ~2-3s.
        if duration < 5.0:
            print("✅ SUCCESS: Parallel uploads confirmed!")
        else:
            print("❌ FAILURE: Uploads/Analyze seem sequential.")

async def main():
    try:
        await verify_parallel_analysis()
        await verify_parallel_upload()
    finally:
        # Cleanup
        for fn in ["large_test.txt", "p1.txt", "p2.txt", "p3.txt"]:
            if os.path.exists(fn):
                os.remove(fn)

if __name__ == "__main__":
    asyncio.run(main())
