# backend/utils/face_utils.py - PHASE 2: MTCNN Integration
import face_recognition
import numpy as np
import cv2
import os
from mtcnn import MTCNN

# Initialize MTCNN detector (singleton - load once)
mtcnn_detector = MTCNN()


def detect_faces_mtcnn(image):
    """
    Detect faces using MTCNN (Multi-task Cascaded CNN)
    Returns face locations in (top, right, bottom, left) format
    """
    try:
        # MTCNN expects RGB image
        if len(image.shape) == 2:  # Grayscale
            image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
        
        # Detect faces with MTCNN
        faces = mtcnn_detector.detect_faces(image)
        
        if not faces:
            return []
        
        # Convert MTCNN format to face_recognition format
        # MTCNN: {'box': [x, y, width, height], 'confidence': 0.99, 'keypoints': {...}}
        # face_recognition: (top, right, bottom, left)
        face_locations = []
        for face in faces:
            x, y, width, height = face['box']
            top = y
            right = x + width
            bottom = y + height
            left = x
            
            # Add padding (10% on each side)
            padding = int(max(width, height) * 0.1)
            top = max(0, top - padding)
            left = max(0, left - padding)
            bottom = min(image.shape[0], bottom + padding)
            right = min(image.shape[1], right + padding)
            
            face_locations.append((top, right, bottom, left))
            
            # Log confidence and landmarks
            confidence = face['confidence']
            print(f"  📍 Face detected: confidence {confidence:.2%}")
            if confidence < 0.95:
                print(f"    ⚠️ Low confidence - possible false positive")
        
        return face_locations
        
    except Exception as e:
        print(f"⚠️ MTCNN detection failed: {e}")
        return []


def align_face_with_landmarks(image, face_location, keypoints=None):
    """
    Enhanced face alignment using MTCNN landmarks
    keypoints: {'left_eye', 'right_eye', 'nose', 'mouth_left', 'mouth_right'}
    """
    try:
        if keypoints:
            # Use MTCNN landmarks for precise alignment
            left_eye = keypoints['left_eye']
            right_eye = keypoints['right_eye']
            
            # Calculate rotation angle
            dy = right_eye[1] - left_eye[1]
            dx = right_eye[0] - left_eye[0]
            angle = np.degrees(np.arctan2(dy, dx))
            
            # Eye center
            eye_center = ((left_eye[0] + right_eye[0]) // 2,
                         (left_eye[1] + right_eye[1]) // 2)
            
            # Rotation matrix
            M = cv2.getRotationMatrix2D(tuple(eye_center), angle, scale=1.0)
            
            # Apply rotation
            h, w = image.shape[:2]
            aligned = cv2.warpAffine(image, M, (w, h))
            
            # Crop aligned face
            top, right, bottom, left = face_location
            return aligned[top:bottom, left:right]
        else:
            # Fallback to simple crop
            top, right, bottom, left = face_location
            return image[top:bottom, left:right]
            
    except Exception as e:
        print(f"⚠️ Alignment failed: {e}, using simple crop")
        top, right, bottom, left = face_location
        return image[top:bottom, left:right]


def get_face_encodings_with_alignment(image_path, num_jitters=1, use_mtcnn=True):
    """
    Phase 2: Get face encoding(s) with MTCNN detection
    Returns (encodings_list, error_message).
    """
    try:
        if not os.path.exists(image_path):
            return None, f"Image not found: {image_path}"
        
        # Load image
        image = face_recognition.load_image_file(image_path)
        
        if use_mtcnn:
            # ✅ Use MTCNN for better angle tolerance
            print(f"🔍 Using MTCNN detection for {os.path.basename(image_path)}")
            face_locations = detect_faces_mtcnn(image)
            
            if not face_locations:
                # Fallback to HOG if MTCNN fails
                print("  ⚠️ MTCNN failed, trying HOG fallback...")
                face_locations = face_recognition.face_locations(image, model='hog')
        else:
            # Use original HOG/CNN
            face_locations = face_recognition.face_locations(image, model='hog')
        
        if len(face_locations) == 0:
            return None, "No face detected"
        
        if len(face_locations) > 1:
            return None, f"Multiple faces detected ({len(face_locations)}). Use single-person photo."
        
        face_location = face_locations[0]
        
        # Generate encoding (face_recognition library)
        encodings = face_recognition.face_encodings(image, [face_location], num_jitters=num_jitters)
        
        if not encodings:
            return None, "Failed to generate encoding"
        
        encoding_list = [encodings[0].tolist()]
        
        print(f"✅ Generated {len(encoding_list)} encoding(s) with MTCNN")
        return encoding_list, None
        
    except Exception as e:
        return None, f"Encoding failed: {str(e)}"


def validate_image_quality(image_path):
    """
    Basic image quality checks before encoding.
    Returns (is_valid, error_message).
    """
    try:
        if not os.path.exists(image_path):
            return False, "File does not exist"
        
        image = cv2.imread(image_path)
        
        if image is None:
            return False, "Invalid image file"
        
        h, w = image.shape[:2]
        if w < 200 or h < 200:
            return False, f"Image too small ({w}x{h}). Minimum 200x200 required."
        
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        if laplacian_var < 50:
            return False, f"Image too blurry (variance: {laplacian_var:.1f})"
        
        mean_brightness = np.mean(gray)
        if mean_brightness < 40:
            return False, "Image too dark"
        if mean_brightness > 220:
            return False, "Image overexposed"
        
        return True, None
        
    except Exception as e:
        return False, f"Validation error: {str(e)}"


def compare_encodings(known_encodings, face_encoding, tolerance=0.6):
    """
    Compare face encoding against known encodings.
    Returns (best_match_index, min_distance).
    """
    if not known_encodings:
        return None, 1.0
    
    distances = face_recognition.face_distance(known_encodings, face_encoding)
    
    best_match_index = np.argmin(distances)
    min_distance = distances[best_match_index]
    
    if min_distance > tolerance:
        return None, min_distance
    
    return best_match_index, min_distance
