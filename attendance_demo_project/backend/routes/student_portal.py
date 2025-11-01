# backend/routes/student_portal.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from extensions import db
from models import User, Student, Attendance, Classroom
from datetime import datetime, timedelta
from sqlalchemy import func

student_portal_bp = Blueprint('student_portal', __name__, url_prefix='/api/student')


def student_required(fn):
    """Custom decorator to ensure user is a student"""
    from functools import wraps
    
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        user_id = get_jwt_identity()
        
        # Get user from database
        user = User.query.get(user_id)
        
        if not user or user.role != 'student':
            return jsonify({"message": "Student access required"}), 403
        
        return fn(*args, **kwargs)
    
    return wrapper


# ==================== STUDENT DASHBOARD ====================
@student_portal_bp.route('/dashboard', methods=['GET'])
@student_required
def get_student_dashboard():
    """
    Get student dashboard with overall attendance and subject-wise breakdown
    Similar to MIET portal screenshots
    """
    try:
        user_id = get_jwt_identity()
        
        # Get user details
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"message": "User not found"}), 404
        
        # Get student profile (linked via email or user_id)
        student = Student.query.filter_by(user_id=user_id).first()
        
        if not student:
            # Try matching by email
            student = Student.query.filter_by(email=user.email).first()
            
            if student:
                # Link user_id if found
                student.user_id = user_id
                db.session.commit()
            else:
                return jsonify({"message": "Student profile not found"}), 404
        
        # Get all classrooms student is enrolled in
        student_classrooms = Classroom.query.join(Student).filter(
            Student.user_id == user_id
        ).all()
        
        # Calculate overall attendance
        total_classes = 0
        total_present = 0
        
        subject_breakdown = []
        
        for classroom in student_classrooms:
            # Get student record for this classroom
            student_record = Student.query.filter_by(
                user_id=user_id,
                classroom_id=classroom.id
            ).first()
            
            if not student_record:
                continue
            
            # Get attendance records
            attendance_records = Attendance.query.filter_by(
                student_id=student_record.id,
                classroom_id=classroom.id
            ).all()
            
            class_total = len(attendance_records)
            class_present = sum(1 for r in attendance_records if r.status == 'present')
            
            total_classes += class_total
            total_present += class_present
            
            # Calculate percentage
            percentage = round((class_present / class_total * 100) if class_total > 0 else 0, 2)
            
            subject_breakdown.append({
                "subject_name": classroom.subject,
                "subject_code": f"{classroom.branch}{classroom.semester}",  # e.g., "BCAI501"
                "faculty_name": classroom.teacher.name,
                "total_classes": class_total,
                "present": class_present,
                "absent": class_total - class_present,
                "percentage": percentage
            })
        
        # Overall percentage
        overall_percentage = round((total_present / total_classes * 100) if total_classes > 0 else 0, 2)
        
        return jsonify({
            "student": {
                "name": user.name,
                "email": user.email,
                "photo": student.photo_path if student else None
            },
            "overall_attendance": {
                "total_classes": total_classes,
                "present": total_present,
                "absent": total_classes - total_present,
                "percentage": overall_percentage
            },
            "subjects": subject_breakdown
        }), 200
        
    except Exception as e:
        print(f"[ERROR] Student dashboard failed: {str(e)}")
        return jsonify({"message": "Failed to fetch dashboard", "error": str(e)}), 500


# ==================== STUDENT ATTENDANCE HISTORY ====================
@student_portal_bp.route('/attendance', methods=['GET'])
@student_required
def get_student_attendance():
    """
    Get student's attendance history with date filtering
    Query params: ?from_date=2025-09-01&to_date=2025-10-12&subject=AI
    """
    try:
        user_id = get_jwt_identity()
        
        # Get query parameters
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')
        subject = request.args.get('subject')
        
        # Get all student records for this user
        student_records = Student.query.filter_by(user_id=user_id).all()
        
        if not student_records:
            return jsonify({"message": "No student records found"}), 404
        
        student_ids = [s.id for s in student_records]
        
        # Build query
        query = Attendance.query.filter(Attendance.student_id.in_(student_ids))
        
        # Apply date filters
        if from_date:
            try:
                from_date_obj = datetime.strptime(from_date, '%Y-%m-%d').date()
                query = query.filter(Attendance.date >= from_date_obj)
            except ValueError:
                return jsonify({"message": "Invalid from_date format. Use YYYY-MM-DD"}), 400
        
        if to_date:
            try:
                to_date_obj = datetime.strptime(to_date, '%Y-%m-%d').date()
                query = query.filter(Attendance.date <= to_date_obj)
            except ValueError:
                return jsonify({"message": "Invalid to_date format. Use YYYY-MM-DD"}), 400
        
        # Apply subject filter
        if subject:
            classroom_ids = [c.id for c in Classroom.query.filter_by(subject=subject).all()]
            query = query.filter(Attendance.classroom_id.in_(classroom_ids))
        
        # Get records
        attendance_records = query.order_by(Attendance.date.desc()).all()
        
        # Format response
        result = []
        for record in attendance_records:
            result.append({
                "date": record.date.isoformat(),
                "subject": record.classroom.subject,
                "faculty": record.classroom.teacher.name,
                "status": record.status,
                "marked_at": record.marked_at.isoformat()
            })
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"[ERROR] Student attendance history failed: {str(e)}")
        return jsonify({"message": "Failed to fetch attendance", "error": str(e)}), 500


# ==================== SUBJECT-WISE DETAILED ATTENDANCE ====================
@student_portal_bp.route('/attendance/<subject_name>', methods=['GET'])
@student_required
def get_subject_attendance(subject_name):
    """
    Get detailed attendance for a specific subject
    Returns date-wise breakdown like MIET portal screenshots
    """
    try:
        user_id = get_jwt_identity()
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')
        
        # Get student records
        student_records = Student.query.filter_by(user_id=user_id).all()
        student_ids = [s.id for s in student_records]
        
        # Get classroom for this subject
        classrooms = Classroom.query.filter_by(subject=subject_name).all()
        classroom_ids = [c.id for c in classrooms]
        
        # Build query
        query = Attendance.query.filter(
            Attendance.student_id.in_(student_ids),
            Attendance.classroom_id.in_(classroom_ids)
        )
        
        # Apply date filters
        if from_date:
            from_date_obj = datetime.strptime(from_date, '%Y-%m-%d').date()
            query = query.filter(Attendance.date >= from_date_obj)
        
        if to_date:
            to_date_obj = datetime.strptime(to_date, '%Y-%m-%d').date()
            query = query.filter(Attendance.date <= to_date_obj)
        
        # Get records
        records = query.order_by(Attendance.date.desc()).all()
        
        # Format response
        attendance_list = []
        for record in records:
            attendance_list.append({
                "date": record.date.isoformat(),
                "day": record.date.strftime('%A'),  # Monday, Tuesday etc.
                "status": record.status,
                "marked_at": record.marked_at.isoformat()
            })
        
        # Summary
        total = len(records)
        present = sum(1 for r in records if r.status == 'present')
        percentage = round((present / total * 100) if total > 0 else 0, 2)
        
        return jsonify({
            "subject": subject_name,
            "faculty": records[0].classroom.teacher.name if records else "N/A",
            "summary": {
                "total": total,
                "present": present,
                "absent": total - present,
                "percentage": percentage
            },
            "attendance": attendance_list
        }), 200
        
    except Exception as e:
        print(f"[ERROR] Subject attendance failed: {str(e)}")
        return jsonify({"message": "Failed to fetch subject attendance", "error": str(e)}), 500


# ==================== STUDENT PROFILE ====================
@student_portal_bp.route('/profile', methods=['GET'])
@student_required
def get_student_profile():
    """Get student's personal profile information"""
    try:
        user_id = get_jwt_identity()
        
        user = User.query.get(user_id)
        student = Student.query.filter_by(user_id=user_id).first()
        
        if not student:
            return jsonify({"message": "Student profile not found"}), 404
        
        return jsonify({
            "name": user.name,
            "email": user.email,
            "roll_no": student.roll_no,
            "photo": student.photo_path,
            "classroom": student.classroom.name,
            "branch": student.classroom.branch,
            "section": student.classroom.section,
            "semester": student.classroom.semester
        }), 200
        
    except Exception as e:
        print(f"[ERROR] Student profile failed: {str(e)}")
        return jsonify({"message": "Failed to fetch profile", "error": str(e)}), 500
