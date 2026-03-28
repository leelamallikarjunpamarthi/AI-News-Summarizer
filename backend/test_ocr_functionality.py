import sys
import os

# Add backend to path
sys.path.append(os.getcwd())

from app.services.document_service import extract_text
import fitz  # PyMuPDF

def create_scanned_pdf(output_path, text="This is a test document for OCR verification."):
    """Create a PDF that contains only an image of text."""
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), text, fontsize=20)
    pix = page.get_pixmap()
    img_bytes = pix.tobytes()
    doc.close()
    
    doc2 = fitz.open()
    page2 = doc2.new_page()
    page2.insert_image(page2.rect, stream=img_bytes)
    doc2.save(output_path)
    doc2.close()
    print(f"Created mock scanned PDF at {output_path}")

def test_ocr():
    mock_pdf = "mock_scanned.pdf"
    test_text = "This is a SECRET test for OCR verification."
    create_scanned_pdf(mock_pdf, test_text)
    
    with open(mock_pdf, "rb") as f:
        file_bytes = f.read()
    
    print("Testing extraction...")
    try:
        result = extract_text(file_bytes, mock_pdf, "application/pdf")
        print(f"Extracted Total Chars: {result.total_chars}")
        print(f"--- START EXTRACTED TEXT ---")
        print(result.full_text)
        print(f"--- END EXTRACTED TEXT ---")
        
        if test_text.lower() in result.full_text.lower():
            print("SUCCESS: OCR extracted the expected text.")
        else:
            print("FAILURE: OCR did not extract the expected text.")
    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        if os.path.exists(mock_pdf):
            os.remove(mock_pdf)

if __name__ == "__main__":
    test_ocr()
