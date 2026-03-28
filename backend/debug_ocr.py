import sys
import os
import fitz
import easyocr
import numpy as np
from PIL import Image

def debug_ocr():
    text = "This is a SECRET test for OCR verification."
    pdf_path = "debug_scanned.pdf"
    
    # 1. Create PDF
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), text, fontsize=20)
    pix = page.get_pixmap(matrix=fitz.Matrix(300/72, 300/72))
    img_bytes = pix.tobytes()
    doc.close()
    
    doc2 = fitz.open()
    page2 = doc2.new_page()
    page2.insert_image(page2.rect, stream=img_bytes)
    doc2.save(pdf_path)
    doc2.close()
    
    # 2. Run OCR directly
    reader = easyocr.Reader(['en'])
    doc3 = fitz.open(pdf_path)
    page3 = doc3[0]
    pix3 = page3.get_pixmap(matrix=fitz.Matrix(300/72, 300/72))
    img3 = Image.frombytes("RGB", [pix3.width, pix3.height], pix3.samples)
    img_np = np.array(img3)
    results = reader.readtext(img_np, detail=0)
    
    print(f"Original: {text}")
    print(f"Extracted: {' '.join(results)}")
    
    doc3.close()
    if os.path.exists(pdf_path):
        os.remove(pdf_path)

if __name__ == "__main__":
    debug_ocr()
