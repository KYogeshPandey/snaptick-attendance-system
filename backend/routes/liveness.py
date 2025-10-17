# backend/routes/liveness.py - Liveness Detection API (Enhanced)
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import numpy as np
import cv2
from utils.liveness_detection import liveness_detector

liveness_bp = Blueprint('liveness', __name__, url_prefix='/api/liveness')


@liveness_bp.route('/validate', methods=['POST'])
@jwt_required()
def validate_liveness():
    """
    Quick liveness validation on uploaded image
    Anti-spoofing check
    """
    try:
        user_id = get_jwt_identity()
        
        if 'image' not in request.files:
            return jsonify({'error': 'No image uploaded'}), 400
        
        image_file = request.files['image']
        
        # Read image
        image_bytes = image_file.read()
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            return jsonify({'error': 'Invalid image format'}), 400
        
        # Convert BGR to RGB
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Perform liveness check
        result = liveness_detector.quick_liveness_check(image_rgb)
        
        print(f"🔍 Liveness check for user {user_id}: {result['is_live']} (confidence: {result.get('confidence', 0)}%)")
        
        return jsonify({
            'success': True,
            'liveness_result': result
        }), 200
        
    except Exception as e:
        print(f"❌ Liveness validation error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@liveness_bp.route('/check_photo', methods=['POST'])
@jwt_required()
def check_if_photo():
    """
    Check if uploaded image is a photo/print (anti-spoofing)
    """
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image uploaded'}), 400
        
        image_file = request.files['image']
        
        # Read image
        image_bytes = image_file.read()
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            return jsonify({'error': 'Invalid image format'}), 400
        
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Analyze image
        result = liveness_detector.quick_liveness_check(image_rgb)
        
        # Determine if likely a photo
        is_photo = not result['is_live']
        confidence = result.get('confidence', 0)
        
        return jsonify({
            'success': True,
            'is_likely_photo': is_photo,
            'is_likely_live': result['is_live'],
            'confidence': confidence,
            'analysis': result,
            'warning': 'This appears to be a photo/print' if is_photo else 'Live capture detected'
        }), 200
        
    except Exception as e:
        print(f"❌ Photo check error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@liveness_bp.route('/info', methods=['GET'])
def get_liveness_info():
    """Get information about liveness detection feature"""
    return jsonify({
        'feature': 'Liveness Detection & Anti-Spoofing',
        'version': '1.0',
        'methods': [
            'Eye Aspect Ratio (EAR) - Blink detection',
            'Sharpness analysis (Laplacian variance)',
            'Face size ratio validation',
            'Texture pattern analysis'
        ],
        'thresholds': {
            'ear_threshold': 0.21,
            'sharpness_min': 100,
            'face_ratio_min': 0.1,
            'face_ratio_max': 0.6,
            'required_blinks': 2
        },
        'confidence_levels': {
            'high': '>=70% - All checks passed',
            'low': '<70% - Failed multiple checks'
        },
        'endpoints': {
            '/validate': 'Quick liveness check on single image',
            '/check_photo': 'Detailed anti-spoofing analysis',
            '/info': 'Get feature information'
        }
    }), 200


@liveness_bp.route('/blink_detection', methods=['POST'])
@jwt_required()
def detect_blinks():
    """
    Detect blinks in uploaded video frames (future feature)
    Advanced liveness detection
    """
    try:
        # Placeholder for video-based blink detection
        return jsonify({
            'success': True,
            'message': 'Blink detection endpoint - video support coming soon',
            'required_blinks': 2,
            'time_window': 3,
            'note': 'Currently supports single image liveness check via /validate'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
