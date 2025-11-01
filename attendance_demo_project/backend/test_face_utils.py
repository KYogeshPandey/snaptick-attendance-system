# backend/test_face_utils.py
from utils.face_utils import get_face_encodings_with_alignment, validate_image_quality
import os
import glob

# Auto-detect all images in images folder
image_extensions = ['*.jpg', '*.jpeg', '*.png', '*.JPG', '*.JPEG', '*.PNG']
test_images = []

for ext in image_extensions:
    test_images.extend(glob.glob(f"images/{ext}"))

if not test_images:
    print("❌ No images found in images/ folder")
    print("Current directory:", os.getcwd())
    print("Images folder exists:", os.path.exists("images/"))
    exit()

print(f"📸 Found {len(test_images)} images to test\n")

for img_path in test_images:
    print(f"Testing: {img_path}")
    
    # Validate quality
    is_valid, error = validate_image_quality(img_path)
    if not is_valid:
        print(f"  ⚠️ Quality check failed: {error}\n")
        continue
    
    # Get encoding
    encodings, error = get_face_encodings_with_alignment(img_path)
    if error:
        print(f"  ❌ Encoding failed: {error}\n")
    else:
        print(f"  ✅ Success: {len(encodings)} encoding(s) generated\n")

print("✅ Test complete!")
