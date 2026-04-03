# backend/encode_known_faces.py - COMPLETE FULL VERSION
"""
Encode known faces using MTCNN detection from face_utils.py
Reuses existing utility functions for consistency
MEDIUM MODE: Balanced between strict and loose (NUM_JITTERS = 3)
"""

import os
import pickle
import logging
import numpy as np
from utils.face_utils import (
    get_face_encodings_with_alignment,
    validate_image_quality
)

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Paths (relative to backend folder)
KNOWN_FACES_DIR = "images"
ENCODINGS_PATH = "encodings.pkl"

# ✅ IMPROVED SETTINGS - MEDIUM MODE
USE_MTCNN = True   # Set False to use HOG fallback
NUM_JITTERS = 3    # ✅ Changed from 2 to 3 - Better accuracy (MEDIUM MODE)
# Jitters explanation:
# 1 = Fast but less accurate (0.5 sec per face)
# 2 = Balanced (1 sec per face)
# 3 = Better accuracy ✅ MEDIUM MODE (1.5 sec per face)
# 5+ = Excellent but slow (3+ sec per face)

def encode_all_faces():
    """
    Encode all face images in KNOWN_FACES_DIR using MTCNN pipeline
    MEDIUM MODE: Higher quality encodings with improved jitters
    """
    known_encodings = []
    known_names = []
    stats = {
        'processed': 0,
        'encoded': 0,
        'skipped': 0,
        'errors': []
    }
    
    # Check directory
    if not os.path.exists(KNOWN_FACES_DIR):
        logger.error(f"❌ Directory not found: {KNOWN_FACES_DIR}")
        logger.info(f"💡 Please create folder: {os.path.abspath(KNOWN_FACES_DIR)}")
        return
    
    # Get image files
    image_files = [
        f for f in os.listdir(KNOWN_FACES_DIR) 
        if f.lower().endswith(('.jpg', '.png', '.jpeg'))
    ]
    
    if not image_files:
        logger.warning(f"⚠️ No image files found in: {os.path.abspath(KNOWN_FACES_DIR)}")
        logger.info("💡 Add .jpg/.png/.jpeg images to the folder")
        return
    
    logger.info(f"📁 Found {len(image_files)} images in: {os.path.abspath(KNOWN_FACES_DIR)}")
    logger.info(f"🔧 Settings: MTCNN={USE_MTCNN}, Jitters={NUM_JITTERS} (MEDIUM MODE)")
    logger.info("=" * 60)
    
    # Process each image
    for idx, filename in enumerate(image_files, 1):
        stats['processed'] += 1
        path = os.path.join(KNOWN_FACES_DIR, filename)
        name = os.path.splitext(filename)[0]
        
        logger.info(f"[{idx}/{len(image_files)}] Processing: {filename}")
        
        try:
            # Step 1: Quality validation
            is_valid, error_msg = validate_image_quality(path)
            if not is_valid:
                logger.warning(f"  ⚠️ Quality check failed: {error_msg}")
                stats['skipped'] += 1
                stats['errors'].append({
                    'file': filename,
                    'reason': error_msg
                })
                continue
            
            # Step 2: MTCNN detection + encoding (MEDIUM MODE with 3 jitters)
            encodings, error_msg = get_face_encodings_with_alignment(
                path, 
                num_jitters=NUM_JITTERS,  # ✅ Using 3 for MEDIUM MODE
                use_mtcnn=USE_MTCNN
            )
            
            if encodings is None:
                logger.warning(f"  ❌ Encoding failed: {error_msg}")
                stats['skipped'] += 1
                stats['errors'].append({
                    'file': filename,
                    'reason': error_msg
                })
                continue
            
            # Step 3: Add to collection
            known_encodings.append(encodings[0])  # encodings returns list
            known_names.append(name)
            stats['encoded'] += 1
            
            logger.info(f"  ✅ Successfully encoded: {name}")
        
        except Exception as e:
            logger.error(f"  ❌ Unexpected error: {str(e)}")
            stats['skipped'] += 1
            stats['errors'].append({
                'file': filename,
                'reason': f"Exception: {str(e)}"
            })
            continue
    
    # Save encodings
    logger.info("=" * 60)
    if stats['encoded'] > 0:
        try:
            with open(ENCODINGS_PATH, "wb") as f:
                pickle.dump({
                    "encodings": known_encodings,
                    "names": known_names
                }, f)
            
            logger.info(f"💾 Saved {stats['encoded']} encodings to: {os.path.abspath(ENCODINGS_PATH)}")
        
        except Exception as e:
            logger.error(f"❌ Failed to save encodings: {e}")
            return
    
    else:
        logger.error("❌ No valid encodings generated!")
    
    # Print summary
    print_summary(stats)


def print_summary(stats):
    """Print encoding summary report"""
    logger.info("=" * 60)
    logger.info("📊 ENCODING SUMMARY")
    logger.info("=" * 60)
    logger.info(f"Total Processed:  {stats['processed']}")
    logger.info(f"✅ Encoded:       {stats['encoded']}")
    logger.info(f"⚠️ Skipped:       {stats['skipped']}")
    
    if stats['errors']:
        logger.info("\n❌ ERRORS:")
        for err in stats['errors']:
            logger.info(f"  • {err['file']}: {err['reason']}")
    
    logger.info("=" * 60)
    
    # Success rate
    if stats['processed'] > 0:
        success_rate = (stats['encoded'] / stats['processed']) * 100
        logger.info(f"Success Rate: {success_rate:.1f}%")


def load_encodings():
    """
    Load previously saved encodings
    Returns: dict with 'encodings' and 'names' or None
    """
    if not os.path.exists(ENCODINGS_PATH):
        logger.error(f"❌ Encodings file not found: {ENCODINGS_PATH}")
        return None
    
    try:
        with open(ENCODINGS_PATH, "rb") as f:
            data = pickle.load(f)
        
        logger.info(f"✅ Loaded {len(data['names'])} encodings from {ENCODINGS_PATH}")
        return data
    
    except Exception as e:
        logger.error(f"❌ Failed to load encodings: {e}")
        return None


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("🎭 FACE ENCODING SCRIPT (MTCNN-Powered - MEDIUM MODE)")
    print("=" * 60 + "\n")
    
    encode_all_faces()
    
    print("\n✨ Encoding complete!\n")
