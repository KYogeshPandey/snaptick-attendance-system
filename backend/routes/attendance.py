# backend/routes/attendance.py
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import Attendance, Student, Classroom, User
from extensions import db
from datetime import datetime, date
import pandas as pd
from io import BytesIO


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


# ==================== SAVE ATTENDANCE ====================
@attendance_bp.route('/mark', methods=['POST'])
@teacher_required
def mark_attendance():
    """
    Mark attendance for students
    Request body: {
        "classroom_id": 1,
        "date": "2025-10-12",
        "attendance": [
            {"student_id": 1, "status": "present"},
            {"student_id": 2, "status": "absent"}
        ]
    }
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    
    classroom_id = data.get('classroom_id')
    attendance_date = data.get('date')
    attendance_records = data.get('attendance', [])
    
    # Validate inputs
    if not classroom_id or not attendance_date:
        return jsonify({"message": "Classroom ID and date required"}), 400
    
    # Verify classroom belongs to teacher
    classroom = Classroom.query.get(classroom_id)
    
    if not classroom:
        return jsonify({"message": "Classroom not found"}), 404
    
    if classroom.teacher_id != int(user_id):
        return jsonify({"message": "Access denied"}), 403
    
    try:
        # Parse date
        attendance_date_obj = datetime.strptime(attendance_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"message": "Invalid date format. Use YYYY-MM-DD"}), 400
    
    # Save attendance records
    marked_count = 0
    updated_count = 0
    
    for record in attendance_records:
        student_id = record.get('student_id')
        status = record.get('status', 'absent')
        
        # Check if attendance already exists
        existing = Attendance.query.filter_by(
            student_id=student_id,
            classroom_id=classroom_id,
            date=attendance_date_obj
        ).first()
        
        if existing:
            # Update existing record
            existing.status = status
            updated_count += 1
        else:
            # Create new record
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
    """
    Get attendance for a classroom and specific date
    Query params: ?date=2025-10-12
    
    ✅ UPDATED: Returns saved attendance with student details
    If no date provided or no records found, returns empty array
    """
    user_id = get_jwt_identity()
    attendance_date = request.args.get('date')  # ✅ Get date from query params
    
    # Verify classroom belongs to teacher
    classroom = Classroom.query.get(classroom_id)
    
    if not classroom:
        return jsonify({"message": "Classroom not found"}), 404
    
    if classroom.teacher_id != int(user_id):
        return jsonify({"message": "Access denied"}), 403
    
    # ✅ If no date provided, return empty array (frontend will handle)
    if not attendance_date:
        return jsonify([]), 200
    
    # ✅ Parse date
    try:
        date_obj = datetime.strptime(attendance_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"message": "Invalid date format. Use YYYY-MM-DD"}), 400
    
    # ✅ Get attendance records for specific date
    records = Attendance.query.filter_by(
        classroom_id=classroom_id,
        date=date_obj
    ).all()
    
    # ✅ If no records found, return empty array
    if not records:
        return jsonify([]), 200
    
    # ✅ Build response with student details
    result = []
    for r in records:
        result.append({
            "id": r.id,
            "student_id": r.student_id,
            "student_name": r.student.name,
            "roll_no": r.student.roll_no,
            "date": r.date.isoformat(),
            "status": r.status,
            "marked_at": r.marked_at.isoformat() if hasattr(r, 'marked_at') else None
        })
    
    return jsonify(result), 200


# ==================== GET ATTENDANCE HISTORY (OPTIONAL) ====================
@attendance_bp.route('/classroom/<int:classroom_id>/history', methods=['GET'])
@teacher_required
def get_attendance_history(classroom_id):
    """
    Get all attendance records for a classroom (without date filter)
    Useful for analytics/reports
    """
    user_id = get_jwt_identity()
    
    # Verify classroom
    classroom = Classroom.query.get(classroom_id)
    
    if not classroom:
        return jsonify({"message": "Classroom not found"}), 404
    
    if classroom.teacher_id != int(user_id):
        return jsonify({"message": "Access denied"}), 403
    
    # Get all records
    records = Attendance.query.filter_by(classroom_id=classroom_id).order_by(Attendance.date.desc()).all()
    
    return jsonify([{
        "id": r.id,
        "student_id": r.student_id,
        "student_name": r.student.name,
        "student_roll_no": r.student.roll_no,
        "date": r.date.isoformat(),
        "status": r.status,
        "marked_at": r.marked_at.isoformat() if hasattr(r, 'marked_at') else None
    } for r in records]), 200


# ==================== EXPORT ATTENDANCE TO EXCEL ====================
@attendance_bp.route('/export/excel', methods=['POST'])
@teacher_required
def export_to_excel():
    """
    Export attendance to Excel
    Request body: {
        "classroom_id": 1,
        "date": "2025-10-12"
    }
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    
    classroom_id = data.get('classroom_id')
    attendance_date = data.get('date')
    
    # Verify classroom
    classroom = Classroom.query.get(classroom_id)
    
    if not classroom:
        return jsonify({"message": "Classroom not found"}), 404
    
    if classroom.teacher_id != int(user_id):
        return jsonify({"message": "Access denied"}), 403
    
    try:
        date_obj = datetime.strptime(attendance_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"message": "Invalid date format"}), 400
    
    # Get attendance records
    records = Attendance.query.filter_by(
        classroom_id=classroom_id,
        date=date_obj
    ).all()
    
    if not records:
        return jsonify({"message": "No attendance records found"}), 404
    
    # Create DataFrame
    data_rows = [{
        "Serial No": idx + 1,
        "Name": r.student.name,
        "Roll No": r.student.roll_no,
        "Status": r.status.upper(),
        "Marked At": r.marked_at.strftime('%Y-%m-%d %H:%M:%S') if hasattr(r, 'marked_at') else 'N/A'
    } for idx, r in enumerate(records)]
    
    df = pd.DataFrame(data_rows)
    
    # Create Excel file in memory
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
    
    # Verify classroom belongs to teacher
    classroom = Classroom.query.get(attendance.classroom_id)
    
    if classroom.teacher_id != int(user_id):
        return jsonify({"message": "Access denied"}), 403
    
    db.session.delete(attendance)
    db.session.commit()
    
    return jsonify({"message": "Attendance record deleted"}), 200
