# backend/utils/liveness_detection.py - Liveness Detection with Blink Detection
import cv2
import numpy as np
from scipy.spatial import distance

class LivenessDetector:
    """
    Liveness detection using Eye Aspect Ratio (EAR) for blink detection
    Prevents photo-based spoofing attacks
    """
    
    # Eye landmarks indices for dlib/face_recognition (68-point model)
    LEFT_EYE_INDICES = [36, 37, 38, 39, 40, 41]
    RIGHT_EYE_INDICES = [42, 43, 44, 45, 46, 47]
    
    # Thresholds
    EAR_THRESHOLD = 0.21  # Below this = eye closed
    BLINK_FRAMES_THRESHOLD = 2  # Consecutive frames for valid blink
    REQUIRED_BLINKS = 2  # Minimum blinks required in time window
    TIME_WINDOW_SECONDS = 3  # Time window for blink detection
    
    def __init__(self):
        self.blink_counter = 0
        self.total_blinks = 0
        self.frame_counter = 0
        
    def calculate_ear(self, eye_landmarks):
        """
        Calculate Eye Aspect Ratio (EAR)
        
        EAR Formula:
        EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
        
        Where p1-p6 are eye landmark points
        
        Args:
            eye_landmarks: List of (x, y) coordinates for eye points
            
        Returns:
            float: Eye Aspect Ratio value
        """
        # Vertical eye distances
        A = distance.euclidean(eye_landmarks[1], eye_landmarks[5])
        B = distance.euclidean(eye_landmarks[2], eye_landmarks[4])
        
        # Horizontal eye distance
        C = distance.euclidean(eye_landmarks[0], eye_landmarks[3])
        
        # Eye Aspect Ratio
        ear = (A + B) / (2.0 * C)
        return ear
    
    def detect_blink(self, face_landmarks):
        """
        Detect if a blink occurred using facial landmarks
        
        Args:
            face_landmarks: Dictionary of facial landmarks from face_recognition
            
        Returns:
            tuple: (blink_detected: bool, ear_value: float)
        """
        # Extract eye landmarks
        left_eye = []
        right_eye = []
        
        for idx in self.LEFT_EYE_INDICES:
            if idx < len(face_landmarks['left_eye']):
                left_eye.append(face_landmarks['left_eye'][idx % 6])
        
        for idx in self.RIGHT_EYE_INDICES:
            if idx < len(face_landmarks['right_eye']):
                right_eye.append(face_landmarks['right_eye'][idx % 6])
        
        # Calculate EAR for both eyes
        left_ear = self.calculate_ear(left_eye) if len(left_eye) == 6 else 0.3
        right_ear = self.calculate_ear(right_eye) if len(right_eye) == 6 else 0.3
        
        # Average EAR
        avg_ear = (left_ear + right_ear) / 2.0
        
        # Detect blink
        blink_detected = False
        if avg_ear < self.EAR_THRESHOLD:
            self.blink_counter += 1
        else:
            if self.blink_counter >= self.BLINK_FRAMES_THRESHOLD:
                self.total_blinks += 1
                blink_detected = True
            self.blink_counter = 0
        
        return blink_detected, avg_ear
    
    def validate_liveness(self, video_frames, fps=30):
        """
        Validate liveness by analyzing video frames for blink detection
        
        Args:
            video_frames: List of video frames (numpy arrays)
            fps: Frames per second of video
            
        Returns:
            dict: Liveness validation result
        """
        import face_recognition
        
        self.total_blinks = 0
        self.blink_counter = 0
        self.frame_counter = 0
        
        max_frames = int(self.TIME_WINDOW_SECONDS * fps)
        frames_to_process = min(len(video_frames), max_frames)
        
        for frame in video_frames[:frames_to_process]:
            self.frame_counter += 1
            
            # Detect face landmarks
            face_landmarks_list = face_recognition.face_landmarks(frame)
            
            if face_landmarks_list:
                face_landmarks = face_landmarks_list[0]
                blink_detected, ear_value = self.detect_blink(face_landmarks)
                
                if blink_detected:
                    print(f"✅ Blink detected! Total blinks: {self.total_blinks}")
        
        # Liveness result
        is_live = self.total_blinks >= self.REQUIRED_BLINKS
        
        return {
            'is_live': is_live,
            'total_blinks': self.total_blinks,
            'required_blinks': self.REQUIRED_BLINKS,
            'frames_processed': self.frame_counter,
            'confidence': min(100, (self.total_blinks / self.REQUIRED_BLINKS) * 100) if self.REQUIRED_BLINKS > 0 else 0
        }
    
    def quick_liveness_check(self, image):
        """
        Quick liveness check on a single image
        Checks for basic anti-spoofing indicators
        
        Args:
            image: numpy array of image
            
        Returns:
            dict: Quick liveness indicators
        """
        import face_recognition
        
        # Convert to grayscale for analysis
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        
        # Calculate image quality metrics
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # Detect faces
        face_locations = face_recognition.face_locations(image)
        
        if not face_locations:
            return {
                'is_live': False,
                'reason': 'No face detected',
                'sharpness_score': laplacian_var
            }
        
        # Check image sharpness (blurry photos are suspicious)
        is_sharp = laplacian_var > 100
        
        # Check for single large face (photos typically have centered, large faces)
        face_area = (face_locations[0][2] - face_locations[0][0]) * (face_locations[0][1] - face_locations[0][3])
        image_area = image.shape[0] * image.shape[1]
        face_ratio = face_area / image_area
        
        # Suspicious if face is too large (printed photo) or too small
        is_natural_size = 0.1 < face_ratio < 0.6
        
        return {
            'is_live': is_sharp and is_natural_size,
            'sharpness_score': laplacian_var,
            'is_sharp': is_sharp,
            'face_ratio': face_ratio,
            'is_natural_size': is_natural_size,
            'confidence': 70 if (is_sharp and is_natural_size) else 30
        }


# Global instance
liveness_detector = LivenessDetector()
