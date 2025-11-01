# backend/routes/classroom.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import Classroom, User, Student
from extensions import db

classroom_bp = Blueprint('classroom', __name__, url_prefix='/api/classrooms')

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

# ==================== GET ALL CLASSROOMS ====================
@classroom_bp.route('', methods=['GET'])
@teacher_required
def get_classrooms():
    """Get all classrooms for current teacher"""
    user_id = get_jwt_identity()
    
    classrooms = Classroom.query.filter_by(teacher_id=user_id).all()
    
    return jsonify([{
        "id": c.id,
        "name": c.name,
        "subject": c.subject,
        "branch": c.branch,
        "section": c.section,
        "semester": c.semester,
        "teacher_id": c.teacher_id,
        "created_at": c.created_at.isoformat()
    } for c in classrooms]), 200

# ==================== GET SINGLE CLASSROOM ====================
@classroom_bp.route('/<int:classroom_id>', methods=['GET'])
@teacher_required
def get_classroom(classroom_id):
    """Get single classroom details"""
    user_id = get_jwt_identity()
    
    classroom = Classroom.query.get(classroom_id)
    
    if not classroom:
        return jsonify({"message": "Classroom not found"}), 404
    
    if classroom.teacher_id != int(user_id):
        return jsonify({"message": "Access denied"}), 403
    
    return jsonify({
        "id": classroom.id,
        "name": classroom.name,
        "subject": classroom.subject,
        "branch": classroom.branch,
        "section": classroom.section,
        "semester": classroom.semester,
        "teacher_id": classroom.teacher_id,
        "student_count": len(classroom.students),
        "created_at": classroom.created_at.isoformat()
    }), 200

# ==================== CREATE CLASSROOM ====================
@classroom_bp.route('', methods=['POST'])
@teacher_required
def create_classroom():
    """Create new classroom"""
    data = request.get_json()
    user_id = get_jwt_identity()
    
    if not data.get('name') or not data.get('subject'):
        return jsonify({"message": "Name and subject are required"}), 400
    
    new_classroom = Classroom(
        name=data.get('name'),
        subject=data.get('subject'),
        branch=data.get('branch'),
        section=data.get('section'),
        semester=data.get('semester'),
        teacher_id=user_id
    )
    
    db.session.add(new_classroom)
    db.session.commit()
    
    return jsonify({
        "message": "Classroom created successfully",
        "classroom": {
            "id": new_classroom.id,
            "name": new_classroom.name,
            "subject": new_classroom.subject,
            "branch": new_classroom.branch,
            "section": new_classroom.section,
            "semester": new_classroom.semester
        }
    }), 201

# ==================== UPDATE CLASSROOM ====================
@classroom_bp.route('/<int:classroom_id>', methods=['PUT'])
@teacher_required
def update_classroom(classroom_id):
    """Update classroom details"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    classroom = Classroom.query.get(classroom_id)
    
    if not classroom:
        return jsonify({"message": "Classroom not found"}), 404
    
    if classroom.teacher_id != int(user_id):
        return jsonify({"message": "Access denied"}), 403
    
    if data.get('name'):
        classroom.name = data.get('name')
    if data.get('subject'):
        classroom.subject = data.get('subject')
    if data.get('branch'):
        classroom.branch = data.get('branch')
    if data.get('section'):
        classroom.section = data.get('section')
    if data.get('semester'):
        classroom.semester = data.get('semester')
    
    db.session.commit()
    
    return jsonify({
        "message": "Classroom updated successfully",
        "classroom": {
            "id": classroom.id,
            "name": classroom.name,
            "subject": classroom.subject,
            "branch": classroom.branch,
            "section": classroom.section,
            "semester": classroom.semester
        }
    }), 200

# ==================== DELETE CLASSROOM ====================
@classroom_bp.route('/<int:classroom_id>', methods=['DELETE'])
@teacher_required
def delete_classroom(classroom_id):
    """Delete classroom (cascade deletes students and attendance)"""
    user_id = get_jwt_identity()
    
    classroom = Classroom.query.get(classroom_id)
    
    if not classroom:
        return jsonify({"message": "Classroom not found"}), 404
    
    if classroom.teacher_id != int(user_id):
        return jsonify({"message": "Access denied"}), 403
    
    db.session.delete(classroom)
    db.session.commit()
    
    return jsonify({"message": "Classroom deleted successfully"}), 200

# ==================== UPLOAD STUDENTS WITH UPDATE SUPPORT ====================
@classroom_bp.route('/<int:classroom_id>/students/upload', methods=['POST'])
@teacher_required
def upload_students(classroom_id):
    """Upload students CSV or Excel file with UPDATE support"""
    user_id = get_jwt_identity()
    
    classroom = Classroom.query.get(classroom_id)
    if not classroom:
        return jsonify({"message": "Classroom not found"}), 404
    
    if classroom.teacher_id != int(user_id):
        return jsonify({"message": "Access denied"}), 403
    
    file = request.files.get('file')
    if not file:
        return jsonify({"message": "No file uploaded"}), 400

    import pandas as pd
    
    try:
        filename = file.filename.lower()
        
        if filename.endswith('.csv'):
            df = pd.read_csv(file)
        elif filename.endswith('.xlsx') or filename.endswith('.xls'):
            df = pd.read_excel(file, engine='openpyxl')
        else:
            return jsonify({"message": "Invalid file format. Upload CSV or Excel (.xlsx, .xls)"}), 400
            
    except Exception as e:
        return jsonify({"message": f"File parsing failed: {str(e)}"}), 400

    # Case-insensitive columns
    df.columns = df.columns.str.strip().str.lower()
    
    required_cols = ['name', 'email', 'roll_no']
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        return jsonify({
            "message": f"Missing columns: {', '.join(missing_cols)}. Required: name, email, roll_no"
        }), 400

    # ✅ Get existing students and create lookup dictionaries
    existing_students = Student.query.filter_by(classroom_id=classroom_id).all()
    existing_by_email = {s.email.lower(): s for s in existing_students}
    existing_by_roll = {s.roll_no.lower(): s for s in existing_students if s.roll_no}
    
    new_students = 0
    updated_students = 0
    skipped = 0
    
    for _, row in df.iterrows():
        email = row.get('email')
        roll_no = row.get('roll_no')
        name = row.get('name')
        
        # Skip if essential data is missing
        if not email or pd.isna(email) or not name or pd.isna(name):
            skipped += 1
            continue
        
        # Normalize data
        email = str(email).strip().lower()
        roll_no = str(roll_no).strip() if roll_no and not pd.isna(roll_no) else ''
        name = str(name).strip()
        
        # ✅ CHECK FOR EXISTING STUDENT (by email OR roll_no)
        existing_student = existing_by_email.get(email)
        if not existing_student and roll_no:
            existing_student = existing_by_roll.get(roll_no.lower())
        
        if existing_student:
            # ✅ UPDATE EXISTING STUDENT
            existing_student.name = name
            existing_student.email = email
            existing_student.roll_no = roll_no
            
            # Update lookup dictionaries
            existing_by_email[email] = existing_student
            if roll_no:
                existing_by_roll[roll_no.lower()] = existing_student
            
            updated_students += 1
        else:
            # ✅ CREATE NEW STUDENT
            student = Student(
                name=name,
                email=email,
                roll_no=roll_no,
                classroom_id=classroom_id
            )
            db.session.add(student)
            
            # Add to lookup dictionaries
            existing_by_email[email] = student
            if roll_no:
                existing_by_roll[roll_no.lower()] = student
            
            new_students += 1

    db.session.commit()

    # ✅ Enhanced response with detailed stats
    return jsonify({
        "message": f"✅ Upload complete! {new_students} new, {updated_students} updated, {skipped} skipped.",
        "total_students": len(classroom.students),
        "new_students": new_students,
        "updated_students": updated_students,
        "skipped": skipped
    }), 201
