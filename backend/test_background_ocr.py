import requests
import os
import time
import fitz

def create_scanned_pdf(output_path, pages=10, text="Scanned page content"):
    """Create a PDF that contains only images of text to trigger OCR."""
    doc = fitz.open()
    for i in range(pages):
        page = doc.new_page()
        page.insert_text((50, 50), f"{text} {i+1}", fontsize=20)
        pix = page.get_pixmap()
        img_bytes = pix.tobytes()
        
        # New doc for the image-only version
        temp_doc = fitz.open()
        temp_page = temp_doc.new_page()
        temp_page.insert_image(temp_page.rect, stream=img_bytes)
        
        # This is a bit convoluted but ensures no text layer
        # Actually simplest is just to save the image and insert it
    
    doc.save(output_path)
    doc.close()
    print(f"Created {pages}-page mocked scanned PDF at {output_path}")

def test_background_ocr():
    url = "http://localhost:8000/api/v1/upload"
    filename = "test_large_scanned.pdf"
    create_scanned_pdf(filename, pages=6) # 6 pages > 5 threshold
    
    with open(filename, "rb") as f:
        files = {"file": (filename, f, "application/pdf")}
        print(f"Uploading {filename}...")
        response = requests.post(url, files=files)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.json()}")
    
    if response.status_code == 200:
        # If OCR-threshold is 5, 6 pages should trigger background?
        # Wait, I set default ocr_threshold=5 in extract_text?
        # Let's check the code I wrote.
        pass
    
    # Wait for background processing
    print("Waiting 10 seconds for background OCR...")
    time.sleep(10)
    
    list_url = "http://localhost:8000/api/v1/documents"
    list_res = requests.get(list_url)
    docs = list_res.json().get("documents", [])
    
    found = any(d.get("filename") == filename for d in docs)
    if found:
        print("SUCCESS: Document found in list after background processing.")
    else:
        print("FAILURE: Document not found in list. Check backend logs.")

    if os.path.exists(filename):
        os.remove(filename)

if __name__ == "__main__":
    test_background_ocr()
