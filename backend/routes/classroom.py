# backend/routes/classroom.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import Classroom, User
from extensions import db

classroom_bp = Blueprint('classroom', __name__, url_prefix='/api/classrooms')


def teacher_required(fn):
    """Custom decorator to ensure user is a teacher"""
    from functools import wraps
    
    @wraps(fn)
    @jwt_required()  # First verify JWT is present
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        user_id = get_jwt_identity()
        
        # Get user from database
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
    
    # Only return classrooms created by this teacher
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
    
    # Verify teacher owns this classroom
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
    
    # Validate required fields
    if not data.get('name') or not data.get('subject'):
        return jsonify({"message": "Name and subject are required"}), 400
    
    # Create classroom
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
    
    # Verify teacher owns this classroom
    if classroom.teacher_id != int(user_id):
        return jsonify({"message": "Access denied"}), 403
    
    # Update fields
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
    
    # Verify teacher owns this classroom
    if classroom.teacher_id != int(user_id):
        return jsonify({"message": "Access denied"}), 403
    
    # Delete classroom (cascade will delete students & attendance)
    db.session.delete(classroom)
    db.session.commit()
    
    return jsonify({"message": "Classroom deleted successfully"}), 200
