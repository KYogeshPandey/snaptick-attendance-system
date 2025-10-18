# backend/routes/attendance.py - CLEAN VERSION (NO AUDIT LOG)
# PHASE 2 + 4: MTCNN + RATE LIMITING ONLY
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import Attendance, Student, Classroom, User
from extensions import db
from datetime import datetime, date
import pandas as pd
from io import BytesIO
import json
import numpy as np
import face_recognition
import os
from utils.rate_limiter import rate_limiter

attendance_bp = Blueprint('attendance', __name__, url_prefix='/api/attendance')

def teacher_required(fn):
    """Custom decorator to ensure user is a teacher"""
    from functools import wraps
    
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != 'teacher':
            return jsonify({"message": "Teacher access required"}), 403
        
        return fn(*args, **kwargs)
    
    return wrapper


# ==================== PHASE 2 + 4: MTCNN + RATE LIMITING ====================
@attendance_bp.route('/mark_face', methods=['POST'])
@teacher_required
def mark_attendance_face():
    """
    Phase 2 + 4: Mark attendance using MTCNN + 4-tier + Rate Limiting
    Detection: MTCNN (96.4% accuracy, 35° angle tolerance)
    Rate Limit: 80 requests/hour per teacher
    """
    try:
        current_user_id = get_jwt_identity()
        
        # Rate Limiting
        allowed, message, remaining = rate_limiter.check_limit(current_user_id, limit=80, window_minutes=60)
        
        if not allowed:
            return jsonify({
                'error': message,
                'rate_limit': {'exceeded': True, 'limit': 80, 'window': '1 hour', 'remaining': 0}
            }), 429
        
        classroom_id = request.form.get('classroom_id')
        date_str = request.form.get('date')
        
        if not classroom_id or not date_str:
            return jsonify({'error': 'Missing classroom_id or date'}), 400
        
        try:
            attendance_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        # Verify classroom ownership
        classroom = Classroom.query.filter_by(id=classroom_id, teacher_id=current_user_id).first()
        if not classroom:
            return jsonify({'error': 'Classroom not found or unauthorized'}), 404
        
        # Get uploaded image
        if 'image' not in request.files:
            return jsonify({'error': 'No image uploaded'}), 400
        
        image_file = request.files['image']
        
        # Save uploaded image temporarily
        upload_folder = 'uploads'
        os.makedirs(upload_folder, exist_ok=True)
        temp_filename = f"attendance_{classroom_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
        temp_path = os.path.join(upload_folder, temp_filename)
        image_file.save(temp_path)
        
        # MTCNN Detection
        from utils.face_utils import detect_faces_mtcnn
        
        image = face_recognition.load_image_file(temp_path)
        face_locations = detect_faces_mtcnn(image)
        
        # Fallback to HOG if MTCNN fails
        if not face_locations:
            face_locations = face_recognition.face_locations(image, model='hog')
        
        face_encodings = face_recognition.face_encodings(image, face_locations)
        
        if len(face_encodings) == 0:
            os.remove(temp_path)
            return jsonify({'error': 'No faces detected in image'}), 400
        
        # Get classroom students
        students = Student.query.filter_by(classroom_id=classroom_id).all()
        
        if not students:
            os.remove(temp_path)
            return jsonify({'error': 'No students enrolled in classroom'}), 400
        
        # Build known encodings database
        known_encodings = []
        known_student_ids = []
        student_map = {}

        for student in students:
            student_map[student.id] = {
                'name': student.name,
                'roll_no': student.roll_no,
                'photo_path': student.photo_path
            }
            if student.encodings:
                try:
                    encodings_list = json.loads(student.encodings)
                    for enc in encodings_list:
                        known_encodings.append(enc)
                        known_student_ids.append(student.id)
                except:
                    pass
        
        if not known_encodings:
            os.remove(temp_path)
            return jsonify({'error': 'No student encodings found'}), 400
        
        # 4-TIER CONFIDENCE BANDS
        TOLERANCE_HIGH_CONFIDENCE = 0.45
        TOLERANCE_STANDARD_REVIEW = 0.60
        TOLERANCE_EXTENDED_REVIEW = 0.70
        
        marked_present = []
        uncertain_matches_high = []
        uncertain_matches_low = []
        unknown_faces = []
        matched_student_ids = set()
        
        for face_encoding in face_encodings:
            distances = face_recognition.face_distance(known_encodings, face_encoding)
            best_match_index = np.argmin(distances)
            min_distance = distances[best_match_index]
            student_id = known_student_ids[best_match_index]
            
            if student_id in matched_student_ids:
                continue
            
            confidence = (1 - min_distance) * 100
            
            # TIER 1: HIGH CONFIDENCE
            if min_distance < TOLERANCE_HIGH_CONFIDENCE:
                matched_student_ids.add(student_id)
                marked_present.append({
                    'student_id': student_id,
                    'student_name': student_map[student_id]['name'],
                    'roll_no': student_map[student_id]['roll_no'],
                    'confidence': round(confidence, 2),
                    'distance': round(min_distance, 4),
                    'status': 'high_confidence',
                    'tier': 1
                })
            
            # TIER 2: STANDARD REVIEW
            elif min_distance < TOLERANCE_STANDARD_REVIEW:
                uncertain_matches_high.append({
                    'student_id': student_id,
                    'student_name': student_map[student_id]['name'],
                    'roll_no': student_map[student_id]['roll_no'],
                    'confidence': round(confidence, 2),
                    'distance': round(min_distance, 4),
                    'status': 'uncertain_high',
                    'tier': 2,
                    'photo_path': student_map[student_id].get('photo_path')
                })
            
            # TIER 3: EXTENDED REVIEW
            elif min_distance < TOLERANCE_EXTENDED_REVIEW:
                uncertain_matches_low.append({
                    'student_id': student_id,
                    'student_name': student_map[student_id]['name'],
                    'roll_no': student_map[student_id]['roll_no'],
                    'confidence': round(confidence, 2),
                    'distance': round(min_distance, 4),
                    'status': 'uncertain_low',
                    'tier': 3,
                    'photo_path': student_map[student_id].get('photo_path')
                })
            
            # TIER 4: UNKNOWN
            else:
                unknown_faces.append({
                    'distance': round(min_distance, 4),
                    'confidence': round(confidence, 2),
                    'status': 'unknown',
                    'tier': 4
                })
        
        # Save high-confidence attendance records
        for match in marked_present:
            existing = Attendance.query.filter_by(
                student_id=match['student_id'],
                classroom_id=classroom_id,
                date=attendance_date
            ).first()
            
            if not existing:
                attendance_record = Attendance(
                    student_id=match['student_id'],
                    classroom_id=classroom_id,
                    date=attendance_date,
                    status='present',
                    confidence=match['confidence'],
                    distance=match['distance']
                )
                db.session.add(attendance_record)
            else:
                # Update if better confidence
                if match['confidence'] > (existing.confidence or 0):
                    existing.confidence = match['confidence']
                    existing.distance = match['distance']
                    existing.status = 'present'
        
        # Mark remaining students as absent
        all_student_ids = [s.id for s in students]
        present_ids = list(matched_student_ids)
        absent_ids = [sid for sid in all_student_ids if sid not in present_ids]
        
        for student_id in absent_ids:
            existing = Attendance.query.filter_by(
                student_id=student_id,
                classroom_id=classroom_id,
                date=attendance_date
            ).first()
            
            if not existing:
                attendance_record = Attendance(
                    student_id=student_id,
                    classroom_id=classroom_id,
                    date=attendance_date,
                    status='absent'
                )
                db.session.add(attendance_record)
        
        db.session.commit()
        os.remove(temp_path)
        
        all_uncertain = uncertain_matches_high + uncertain_matches_low
        
        return jsonify({
            'message': 'Attendance marked successfully',
            'summary': {
                'total_students': len(students),
                'present': len(marked_present),
                'absent': len(absent_ids),
                'uncertain_high': len(uncertain_matches_high),
                'uncertain_low': len(uncertain_matches_low),
                'unknown_faces': len(unknown_faces)
            },
            'high_confidence_matches': marked_present,
            'uncertain_matches': all_uncertain,
            'uncertain_matches_high': uncertain_matches_high,
            'uncertain_matches_low': uncertain_matches_low,
            'unknown_faces': unknown_faces,
            'detection_method': 'MTCNN' if face_locations else 'HOG',
            'date': date_str,
            'rate_limit': {
                'remaining': remaining,
                'limit': 80,
                'window': '1 hour'
            }
        }), 200
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to mark attendance: {str(e)}'}), 500


# ==================== MANUAL ATTENDANCE ====================
@attendance_bp.route('/mark', methods=['POST'])
@teacher_required
def mark_attendance():
    """Manual attendance marking"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    classroom_id = data.get('classroom_id')
    attendance_date = data.get('date')
    attendance_records = data.get('attendance', [])
    
    if not classroom_id or not attendance_date:
        return jsonify({"message": "Classroom ID and date required"}), 400
    
    classroom = Classroom.query.get(classroom_id)
    
    if not classroom:
        return jsonify({"message": "Classroom not found"}), 404
    
    if classroom.teacher_id != int(user_id):
        return jsonify({"message": "Access denied"}), 403
    
    try:
        attendance_date_obj = datetime.strptime(attendance_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"message": "Invalid date format. Use YYYY-MM-DD"}), 400
    
    marked_count = 0
    updated_count = 0
    
    for record in attendance_records:
        student_id = record.get('student_id')
        status = record.get('status', 'absent')
        
        existing = Attendance.query.filter_by(
            student_id=student_id,
            classroom_id=classroom_id,
            date=attendance_date_obj
        ).first()
        
        if existing:
            if existing.status != status:
                existing.status = status
                updated_count += 1
        else:
            new_attendance = Attendance(
                student_id=student_id,
                classroom_id=classroom_id,
                date=attendance_date_obj,
                status=status
            )
            db.session.add(new_attendance)
            marked_count += 1
    
    db.session.commit()
    
    return jsonify({
        "message": "Attendance marked successfully",
        "marked": marked_count,
        "updated": updated_count
    }), 201


# ==================== GET ATTENDANCE BY CLASSROOM & DATE ====================
@attendance_bp.route('/<int:classroom_id>', methods=['GET'])
@teacher_required
def get_attendance_by_classroom(classroom_id):
    """Get attendance for a classroom and specific date"""
    user_id = get_jwt_identity()
    attendance_date = request.args.get('date')
    
    classroom = Classroom.query.get(classroom_id)
    
    if not classroom:
        return jsonify({"message": "Classroom not found"}), 404
    
    if classroom.teacher_id != int(user_id):
        return jsonify({"message": "Access denied"}), 403
    
    if not attendance_date:
        return jsonify([]), 200
    
    try:
        date_obj = datetime.strptime(attendance_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"message": "Invalid date format. Use YYYY-MM-DD"}), 400
    
    records = Attendance.query.filter_by(
        classroom_id=classroom_id,
        date=date_obj
    ).all()
    
    if not records:
        return jsonify([]), 200
    
    result = []
    for r in records:
        result.append({
            "id": r.id,
            "student_id": r.student_id,
            "student_name": r.student.name,
            "roll_no": r.student.roll_no,
            "date": r.date.isoformat(),
            "status": r.status,
            "confidence": r.confidence,
            "distance": r.distance,
            "marked_at": r.marked_at.isoformat() if hasattr(r, 'marked_at') else None
        })
    
    return jsonify(result), 200


# ==================== GET ATTENDANCE HISTORY ====================
@attendance_bp.route('/classroom/<int:classroom_id>/history', methods=['GET'])
@teacher_required
def get_attendance_history(classroom_id):
    """Get all attendance records for a classroom"""
    user_id = get_jwt_identity()
    
    classroom = Classroom.query.get(classroom_id)
    
    if not classroom:
        return jsonify({"message": "Classroom not found"}), 404
    
    if classroom.teacher_id != int(user_id):
        return jsonify({"message": "Access denied"}), 403
    
    records = Attendance.query.filter_by(classroom_id=classroom_id).order_by(Attendance.date.desc()).all()
    
    return jsonify([{
        "id": r.id,
        "student_id": r.student_id,
        "student_name": r.student.name,
        "student_roll_no": r.student.roll_no,
        "date": r.date.isoformat(),
        "status": r.status,
        "confidence": r.confidence,
        "distance": r.distance,
        "marked_at": r.marked_at.isoformat() if hasattr(r, 'marked_at') else None
    } for r in records]), 200


# ==================== EXPORT ATTENDANCE TO EXCEL ====================
@attendance_bp.route('/export/excel', methods=['POST'])
@teacher_required
def export_to_excel():
    """Export attendance to Excel"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    classroom_id = data.get('classroom_id')
    attendance_date = data.get('date')
    
    classroom = Classroom.query.get(classroom_id)
    
    if not classroom:
        return jsonify({"message": "Classroom not found"}), 404
    
    if classroom.teacher_id != int(user_id):
        return jsonify({"message": "Access denied"}), 403
    
    try:
        date_obj = datetime.strptime(attendance_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"message": "Invalid date format"}), 400
    
    records = Attendance.query.filter_by(
        classroom_id=classroom_id,
        date=date_obj
    ).all()
    
    if not records:
        return jsonify({"message": "No attendance records found"}), 404
    
    data_rows = [{
        "Serial No": idx + 1,
        "Name": r.student.name,
        "Roll No": r.student.roll_no,
        "Status": r.status.upper(),
        "Confidence": f"{r.confidence:.2f}%" if r.confidence else "N/A",
        "Marked At": r.marked_at.strftime('%Y-%m-%d %H:%M:%S') if hasattr(r, 'marked_at') else 'N/A'
    } for idx, r in enumerate(records)]
    
    df = pd.DataFrame(data_rows)
    
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Attendance')
    
    output.seek(0)
    
    filename = f"Attendance_{classroom.name}_{attendance_date}.xlsx"
    
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=filename
    )


# ==================== DELETE ATTENDANCE RECORD ====================
@attendance_bp.route('/<int:attendance_id>', methods=['DELETE'])
@teacher_required
def delete_attendance(attendance_id):
    """Delete attendance record"""
    user_id = get_jwt_identity()
    
    attendance = Attendance.query.get(attendance_id)
    
    if not attendance:
        return jsonify({"message": "Attendance record not found"}), 404
    
    classroom = Classroom.query.get(attendance.classroom_id)
    
    if classroom.teacher_id != int(user_id):
        return jsonify({"message": "Access denied"}), 403
    
    db.session.delete(attendance)
    db.session.commit()
    
    return jsonify({"message": "Attendance record deleted"}), 200


# ==================== RATE LIMIT STATUS ====================
@attendance_bp.route('/rate_limit/status', methods=['GET'])
@teacher_required
def get_rate_limit_status():
    """Get current rate limit status for logged-in teacher"""
    user_id = get_jwt_identity()
    status = rate_limiter.get_status(user_id)
    
    return jsonify({
        'user_id': user_id,
        'rate_limit': status
    }), 200
