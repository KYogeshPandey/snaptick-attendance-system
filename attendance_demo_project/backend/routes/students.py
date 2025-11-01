# backend/routes/students.py
from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from werkzeug.utils import secure_filename
from models import Student, Classroom, User
from extensions import db
import pandas as pd
import os
import zipfile
import json  # ✅ PHASE 1
from utils.face_utils import get_face_encodings_with_alignment  # ✅ PHASE 1


student_bp = Blueprint('student', __name__, url_prefix='/api/students')


ALLOWED_EXTENSIONS = {'xlsx', 'xls'}
ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png'}
UPLOAD_FOLDER = 'images'


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def allowed_image_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS


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


# ==================== GET STUDENTS BY CLASSROOM ====================
@student_bp.route('/classroom/<int:classroom_id>', methods=['GET'])
@teacher_required
def get_students_by_classroom(classroom_id):
    """Get all students in a classroom"""
    user_id = get_jwt_identity()
    classroom = Classroom.query.get(classroom_id)
    if not classroom:
        return jsonify({"message": "Classroom not found"}), 404
    if classroom.teacher_id != int(user_id):
        return jsonify({"message": "Access denied"}), 403
    students = Student.query.filter_by(classroom_id=classroom_id).all()
    return jsonify([{
        "id": s.id,
        "name": s.name,
        "email": s.email,
        "roll_no": s.roll_no,
        "photo_path": s.photo_path,
        "has_photo": s.photo_path is not None and s.photo_path != '',
        "has_encoding": s.encodings is not None and s.encodings != ''  # ✅ PHASE 1
    } for s in students]), 200


# ==================== BULK UPLOAD STUDENTS (EXCEL) ====================
@student_bp.route('/bulk-upload', methods=['POST', 'OPTIONS'])
@cross_origin(origins=["http://localhost:5173"], supports_credentials=True)
@teacher_required
def bulk_upload_students():
    """
    Upload students via Excel file
    Expected columns: Name, Email, Roll No (Photo Path NOT needed)
    """
    user_id = get_jwt_identity()
    
    if 'file' not in request.files:
        return jsonify({"message": "No file uploaded"}), 400
    
    if 'classroom_id' not in request.form:
        return jsonify({"message": "Classroom ID required"}), 400
    
    file = request.files['file']
    classroom_id = request.form.get('classroom_id')
    
    classroom = Classroom.query.get(classroom_id)
    if not classroom:
        return jsonify({"message": "Classroom not found"}), 404
    
    if classroom.teacher_id != int(user_id):
        return jsonify({"message": "Access denied"}), 403
    
    if file.filename == '':
        return jsonify({"message": "No file selected"}), 400
    
    if not allowed_file(file.filename):
        return jsonify({"message": "Only .xlsx and .xls files allowed"}), 400
    
    try:
        df = pd.read_excel(file)
        
        # Normalize column names
        df.columns = df.columns.str.strip().str.replace('_', ' ').str.title()
        
        print(f"[DEBUG] Excel columns: {list(df.columns)}")
        
        required_columns = ['Name', 'Email', 'Roll No']
        
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            return jsonify({
                "message": f"Missing columns: {', '.join(missing_columns)}. Found: {', '.join(df.columns)}"
            }), 400
        
        students_added = []
        students_failed = []
        
        for index, row in df.iterrows():
            try:
                existing = Student.query.filter_by(
                    email=row['Email'],
                    classroom_id=classroom_id
                ).first()
                
                if existing:
                    students_failed.append({
                        "row": index + 2,
                        "name": row['Name'],
                        "reason": "Already exists"
                    })
                    continue
                
                # Create student WITHOUT photo initially
                new_student = Student(
                    name=str(row['Name']),
                    email=str(row['Email']),
                    roll_no=str(row['Roll No']),
                    photo_path=None,
                    encodings=None,  # ✅ PHASE 1: Will be set after ZIP upload
                    classroom_id=classroom_id
                )
                
                db.session.add(new_student)
                students_added.append({
                    "name": row['Name'],
                    "roll_no": row['Roll No']
                })
                
            except Exception as e:
                students_failed.append({
                    "row": index + 2,
                    "name": row.get('Name', 'Unknown'),
                    "reason": str(e)
                })
        
        db.session.commit()
        
        return jsonify({
            "message": f"✅ Upload complete: {len(students_added)} added, {len(students_failed)} failed. Now upload photos via ZIP.",
            "students_added": students_added,
            "students_failed": students_failed
        }), 201
        
    except Exception as e:
        print(f"[ERROR] Excel processing failed: {str(e)}")
        return jsonify({"message": f"Error processing file: {str(e)}"}), 500


# ==================== ✅ PHASE 1: UPLOAD PHOTOS ZIP WITH AUTO-ENCODING ====================
@student_bp.route('/upload-photos-zip', methods=['POST', 'OPTIONS'])
@cross_origin(origins=["http://localhost:5173"], supports_credentials=True)
@teacher_required
def upload_photos_zip():
    """
    Phase 1: Upload a ZIP file containing student photos
    Photos will be matched by Roll No or Name
    ✅ Auto-generates face encodings for matched students
    """
    try:
        if 'file' not in request.files:
            return jsonify({"message": "No file uploaded"}), 400
        
        if 'classroom_id' not in request.form:
            return jsonify({"message": "Classroom ID required"}), 400
        
        file = request.files['file']
        classroom_id = request.form.get('classroom_id')
        user_id = get_jwt_identity()
        
        classroom = Classroom.query.filter_by(id=classroom_id, teacher_id=int(user_id)).first()
        if not classroom:
            return jsonify({"message": "Classroom not found or access denied"}), 404
        
        if not file.filename.endswith('.zip'):
            return jsonify({"message": "Only ZIP files allowed"}), 400
        
        uploads_dir = 'uploads'
        images_dir = 'images'
        os.makedirs(uploads_dir, exist_ok=True)
        os.makedirs(images_dir, exist_ok=True)
        
        zip_path = os.path.join(uploads_dir, secure_filename(file.filename))
        file.save(zip_path)
        
        uploaded_count = 0
        matched_count = 0
        encoding_success = 0  # ✅ PHASE 1
        encoding_failed = 0   # ✅ PHASE 1
        unmatched = []
        
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            for file_name in zip_ref.namelist():
                if file_name.endswith('/') or file_name.startswith('__MACOSX'):
                    continue
                
                if not allowed_image_file(file_name):
                    continue
                
                extracted_path = zip_ref.extract(file_name, images_dir)
                uploaded_count += 1
                
                base_name = os.path.splitext(os.path.basename(file_name))[0]
                name_cleaned = base_name.lower().replace('_', ' ').replace('-', ' ')
                
                # Try roll number match first
                student = Student.query.filter_by(
                    classroom_id=classroom_id,
                    roll_no=base_name
                ).first()
                
                # Try name match
                if not student:
                    students = Student.query.filter_by(classroom_id=classroom_id).all()
                    for s in students:
                        student_name_cleaned = s.name.lower().replace(' ', '_')
                        if student_name_cleaned == name_cleaned or s.name.lower() == name_cleaned:
                            student = s
                            break
                
                if student:
                    relative_path = os.path.basename(file_name)
                    student.photo_path = relative_path
                    matched_count += 1
                    
                    # ✅ PHASE 1: Generate face encodings
                    full_image_path = os.path.join(images_dir, relative_path)
                    print(f"🔄 Generating encodings for {student.name}...")
                    
                    encodings_list, error = get_face_encodings_with_alignment(full_image_path, num_jitters=1)
                    
                    if encodings_list and not error:
                        student.encodings = json.dumps(encodings_list)
                        encoding_success += 1
                        print(f"  ✅ {len(encodings_list)} encoding(s) generated for {student.name}")
                    else:
                        encoding_failed += 1
                        print(f"  ⚠️ Encoding failed for {student.name}: {error}")
                    
                    print(f"✅ Matched: {file_name} → {student.name} (Roll: {student.roll_no})")
                else:
                    unmatched.append(file_name)
                    print(f"❌ Unmatched: {file_name}")
        
        db.session.commit()
        
        try:
            os.remove(zip_path)
        except:
            pass
        
        return jsonify({
            "message": f"✅ Upload complete: {matched_count}/{uploaded_count} photos matched, {encoding_success} encodings generated",
            "uploaded": uploaded_count,
            "matched": matched_count,
            "encoding_success": encoding_success,  # ✅ PHASE 1
            "encoding_failed": encoding_failed,    # ✅ PHASE 1
            "unmatched": unmatched
        }), 201
        
    except Exception as e:
        print(f"[ERROR] ZIP upload failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"message": f"Upload failed: {str(e)}"}), 500


# ==================== UPDATE STUDENT ====================
@student_bp.route('/<int:student_id>', methods=['PUT'])
@teacher_required
def update_student(student_id):
    """Update student details"""
    user_id = get_jwt_identity()
    data = request.get_json()
    student = Student.query.get(student_id)
    if not student:
        return jsonify({"message": "Student not found"}), 404
    classroom = Classroom.query.get(student.classroom_id)
    if classroom.teacher_id != int(user_id):
        return jsonify({"message": "Access denied"}), 403
    if data.get('name'):
        student.name = data.get('name')
    if data.get('email'):
        student.email = data.get('email')
    if data.get('roll_no'):
        student.roll_no = data.get('roll_no')
    if data.get('photo_path'):
        student.photo_path = data.get('photo_path')
    db.session.commit()
    return jsonify({
        "message": "Student updated successfully",
        "student": {
            "id": student.id,
            "name": student.name,
            "email": student.email,
            "roll_no": student.roll_no
        }
    }), 200


# ==================== DELETE STUDENT ====================
@student_bp.route('/<int:student_id>', methods=['DELETE'])
@teacher_required
def delete_student(student_id):
    """Delete student"""
    user_id = get_jwt_identity()
    student = Student.query.get(student_id)
    if not student:
        return jsonify({"message": "Student not found"}), 404
    classroom = Classroom.query.get(student.classroom_id)
    if classroom.teacher_id != int(user_id):
        return jsonify({"message": "Access denied"}), 403
    db.session.delete(student)
    db.session.commit()
    return jsonify({"message": "Student deleted successfully"}), 200
