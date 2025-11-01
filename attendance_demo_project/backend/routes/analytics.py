# backend/routes/analytics.py - PHASE 5: ENHANCED WITH HEATMAP
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from extensions import db
from models import Attendance, Student, Classroom, User
from datetime import datetime, timedelta, date
from sqlalchemy import func
import pandas as pd
import io


analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')


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


# ==================== ✅ NEW: GITHUB-STYLE HEATMAP ====================
@analytics_bp.get('/heatmap')
@teacher_required
def get_attendance_heatmap():
    """
    Get GitHub-style attendance heatmap for last 30/60/90 days
    Returns daily attendance percentage with color intensity
    """
    try:
        teacher_id = int(get_jwt_identity())
        classroom_id = request.args.get('classroom_id')
        days = int(request.args.get('days', 30))  # Default: 30 days
        
        # Validate classroom ownership
        if not classroom_id:
            return jsonify({"message": "Classroom ID required"}), 400
        
        classroom = Classroom.query.filter_by(id=classroom_id, teacher_id=teacher_id).first()
        if not classroom:
            return jsonify({"message": "Classroom not found or access denied"}), 404
        
        # Get total students in classroom
        total_students = Student.query.filter_by(classroom_id=classroom_id).count()
        
        if total_students == 0:
            return jsonify({
                "classroom_id": int(classroom_id),
                "classroom_name": classroom.name,
                "total_students": 0,
                "date_range": {"start": None, "end": None},
                "heatmap": [],
                "stats": {"avg_attendance": 0, "total_days": 0, "best_day": None, "worst_day": None}
            }), 200
        
        # Calculate date range
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=days - 1)
        
        # Query attendance grouped by date
        attendance_by_date = db.session.query(
            Attendance.date,
            func.count(Attendance.id).label('total_marked'),
            func.sum(db.case((Attendance.status == 'present', 1), else_=0)).label('present_count')
        ).filter(
            Attendance.classroom_id == classroom_id,
            Attendance.date >= start_date,
            Attendance.date <= end_date
        ).group_by(Attendance.date).all()
        
        # Build date-to-stats mapping
        date_stats = {}
        for record in attendance_by_date:
            att_date = record.date
            present = int(record.present_count or 0)
            total_marked = int(record.total_marked or 0)
            percentage = round((present / total_students) * 100, 1)
            
            # Color intensity based on percentage
            # 🟩 90-100% = high (level 4)
            # 🟨 70-89% = medium-high (level 3)
            # 🟧 50-69% = medium (level 2)
            # 🟥 <50% = low (level 1)
            # ⬜ No data = none (level 0)
            
            if percentage >= 90:
                intensity = 4
                color = 'high'
            elif percentage >= 70:
                intensity = 3
                color = 'medium-high'
            elif percentage >= 50:
                intensity = 2
                color = 'medium'
            else:
                intensity = 1
                color = 'low'
            
            date_stats[att_date.isoformat()] = {
                'date': att_date.isoformat(),
                'day_of_week': att_date.strftime('%a'),  # Mon, Tue, Wed
                'present': present,
                'total_students': total_students,
                'total_marked': total_marked,
                'percentage': percentage,
                'intensity': intensity,
                'color': color
            }
        
        # Generate complete heatmap (fill missing dates)
        heatmap = []
        current_date = start_date
        
        while current_date <= end_date:
            date_str = current_date.isoformat()
            day_name = current_date.strftime('%a')
            
            if date_str in date_stats:
                heatmap.append(date_stats[date_str])
            else:
                # No attendance marked on this day
                heatmap.append({
                    'date': date_str,
                    'day_of_week': day_name,
                    'present': 0,
                    'total_students': total_students,
                    'total_marked': 0,
                    'percentage': 0,
                    'intensity': 0,
                    'color': 'none'
                })
            
            current_date += timedelta(days=1)
        
        # Calculate summary stats
        valid_days = [d for d in heatmap if d['total_marked'] > 0]
        
        stats = {
            'total_days': len(heatmap),
            'marked_days': len(valid_days),
            'avg_attendance': round(sum([d['percentage'] for d in valid_days]) / len(valid_days), 1) if valid_days else 0,
            'best_day': max(valid_days, key=lambda x: x['percentage']) if valid_days else None,
            'worst_day': min(valid_days, key=lambda x: x['percentage']) if valid_days else None
        }
        
        return jsonify({
            "classroom_id": int(classroom_id),
            "classroom_name": classroom.name,
            "total_students": total_students,
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "days": days
            },
            "heatmap": heatmap,
            "stats": stats
        }), 200
        
    except Exception as e:
        print(f"❌ Heatmap error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"message": "Failed to generate heatmap", "error": str(e)}), 500


# ==================== OVERVIEW STATISTICS ====================
@analytics_bp.get('/overview')
@teacher_required
def get_overview():
    """Get overall statistics for teacher's classrooms"""
    try:
        teacher_id = int(get_jwt_identity())
        classrooms = Classroom.query.filter_by(teacher_id=teacher_id).all()
        classroom_ids = [c.id for c in classrooms]
        total_students = Student.query.filter(Student.classroom_id.in_(classroom_ids)).count()
        today = datetime.now().strftime('%Y-%m-%d')
        today_attendance = Attendance.query.filter(
            Attendance.classroom_id.in_(classroom_ids),
            Attendance.date == today
        ).all()
        present_today = sum(1 for a in today_attendance if a.status == 'present')
        absent_today = len(today_attendance) - present_today
        thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        all_attendance = Attendance.query.filter(
            Attendance.classroom_id.in_(classroom_ids),
            Attendance.date >= thirty_days_ago
        ).all()
        total_records = len(all_attendance)
        total_present = sum(1 for a in all_attendance if a.status == 'present')
        overall_rate = round((total_present / total_records * 100) if total_records > 0 else 0, 2)
        return jsonify({
            "total_students": total_students,
            "total_classrooms": len(classrooms),
            "today": {
                "present": present_today,
                "absent": absent_today,
                "total": len(today_attendance)
            },
            "overall_rate": overall_rate,
            "last_30_days": {
                "total_records": total_records,
                "present": total_present,
                "absent": total_records - total_present
            }
        }), 200
    except Exception as e:
        print(f"[ERROR] Analytics overview failed: {str(e)}")
        return jsonify({"message": "Failed to fetch analytics", "error": str(e)}), 500


# ==================== DATE-WISE ATTENDANCE TREND ====================
@analytics_bp.get('/trend')
@teacher_required
def get_trend():
    """Get date-wise attendance trend for last N days"""
    try:
        teacher_id = int(get_jwt_identity())
        classroom_id = request.args.get('classroom_id')
        days = int(request.args.get('days', 7))
        if classroom_id:
            classroom = Classroom.query.filter_by(id=classroom_id, teacher_id=teacher_id).first()
            if not classroom:
                return jsonify({"message": "Classroom not found or access denied"}), 404
            classroom_ids = [int(classroom_id)]
        else:
            classrooms = Classroom.query.filter_by(teacher_id=teacher_id).all()
            classroom_ids = [c.id for c in classrooms]
        start_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
        attendance_records = Attendance.query.filter(
            Attendance.classroom_id.in_(classroom_ids),
            Attendance.date >= start_date
        ).all()
        date_stats = {}
        for record in attendance_records:
            if record.date not in date_stats:
                date_stats[record.date] = {"present": 0, "absent": 0, "total": 0}
            date_stats[record.date]["total"] += 1
            if record.status == 'present':
                date_stats[record.date]["present"] += 1
            else:
                date_stats[record.date]["absent"] += 1
        trend_data = []
        for date, stats in sorted(date_stats.items()):
            trend_data.append({
                "date": str(date),
                "present": stats["present"],
                "absent": stats["absent"],
                "total": stats["total"],
                "rate": round((stats["present"] / stats["total"] * 100) if stats["total"] > 0 else 0, 2)
            })
        return jsonify(trend_data), 200
    except Exception as e:
        print(f"[ERROR] Trend analysis failed: {str(e)}")
        return jsonify({"message": "Failed to fetch trend", "error": str(e)}), 500


# ==================== STUDENT-WISE ATTENDANCE ====================
@analytics_bp.get('/students')
@teacher_required
def get_student_analytics():
    """Get student-wise attendance summary for a classroom"""
    try:
        teacher_id = int(get_jwt_identity())
        classroom_id = request.args.get('classroom_id')
        if not classroom_id:
            return jsonify({"message": "Classroom ID required"}), 400
        classroom = Classroom.query.filter_by(id=classroom_id, teacher_id=teacher_id).first()
        if not classroom:
            return jsonify({"message": "Classroom not found or access denied"}), 404
        students = Student.query.filter_by(classroom_id=classroom_id).all()
        result = []
        for student in students:
            records = Attendance.query.filter_by(student_id=student.id).all()
            total = len(records)
            present = sum(1 for r in records if r.status == 'present')
            absent = total - present
            result.append({
                "student_id": student.id,
                "name": student.name,
                "roll_no": student.roll_no,
                "email": student.email,
                "total_days": total,
                "present_days": present,
                "absent_days": absent,
                "attendance_rate": round((present / total * 100) if total > 0 else 0, 2)
            })
        result.sort(key=lambda x: x['attendance_rate'])
        return jsonify(result), 200
    except Exception as e:
        print(f"[ERROR] Student analytics failed: {str(e)}")
        return jsonify({"message": "Failed to fetch student analytics", "error": str(e)}), 500


# ==================== CLASSROOM COMPARISON ====================
@analytics_bp.get('/classrooms')
@teacher_required
def get_classroom_comparison():
    """Compare attendance rates across all teacher's classrooms"""
    try:
        teacher_id = int(get_jwt_identity())
        classrooms = Classroom.query.filter_by(teacher_id=teacher_id).all()
        result = []
        for classroom in classrooms:
            records = Attendance.query.filter_by(classroom_id=classroom.id).all()
            total = len(records)
            present = sum(1 for r in records if r.status == 'present')
            student_count = Student.query.filter_by(classroom_id=classroom.id).count()
            result.append({
                "classroom_id": classroom.id,
                "name": classroom.name,
                "subject": classroom.subject,
                "branch": classroom.branch,
                "section": classroom.section,
                "semester": classroom.semester,
                "total_students": student_count,
                "total_records": total,
                "present": present,
                "absent": total - present,
                "attendance_rate": round((present / total * 100) if total > 0 else 0, 2)
            })
        result.sort(key=lambda x: x['attendance_rate'], reverse=True)
        return jsonify(result), 200
    except Exception as e:
        print(f"[ERROR] Classroom comparison failed: {str(e)}")
        return jsonify({"message": "Failed to fetch classroom comparison", "error": str(e)}), 500


# ==================== EXPORT EXCEL ====================
@analytics_bp.get('/export-excel')
@teacher_required
def export_excel():
    """Export attendance data as Excel"""
    try:
        teacher_id = int(get_jwt_identity())
        classroom_id = request.args.get('classroom_id')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = db.session.query(
            Attendance.date,
            Student.name,
            Student.roll_no,
            Attendance.status,
            Classroom.name.label('classroom')
        ).join(Student).join(Classroom).filter(Classroom.teacher_id == int(teacher_id))
        
        if classroom_id:
            query = query.filter(Classroom.id == int(classroom_id))
        if start_date:
            query = query.filter(Attendance.date >= start_date)
        if end_date:
            query = query.filter(Attendance.date <= end_date)
        
        results = query.all()
        
        df = pd.DataFrame([{
            'Date': str(r.date),
            'Student Name': r.name,
            'Roll No': r.roll_no,
            'Status': r.status.upper(),
            'Classroom': r.classroom
        } for r in results])
        
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Attendance', index=False)
        output.seek(0)
        
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f'attendance_{datetime.now().strftime("%Y%m%d")}.xlsx'
        )
    except Exception as e:
        print(f"[ERROR] Export Excel failed: {str(e)}")
        return jsonify({"message": "Export failed", "error": str(e)}), 500
