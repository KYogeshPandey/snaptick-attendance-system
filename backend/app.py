# backend/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin  # ✅ UPDATED: Added cross_origin
from flask_jwt_extended import (
    create_access_token, 
    JWTManager, 
    jwt_required, 
    get_jwt_identity,
    get_jwt
)
from flask_migrate import Migrate  # ✅ ADD THIS
from datetime import timedelta
import os
import glob
import face_recognition
from functools import wraps  # ✅ ADD THIS for custom decorators


from extensions import db, bcrypt


app = Flask(__name__)


# -------------------- CONFIG --------------------
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'dev-secret-key-change-in-production'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)


# -------------------- INITIALIZE EXTENSIONS --------------------
db.init_app(app)
bcrypt.init_app(app)
jwt = JWTManager(app)
migrate = Migrate(app, db)  # ✅ ADD THIS - Initialize Flask-Migrate


# ⚠️ CRITICAL: CORS MUST BE AFTER APP CONFIG - ✅ UPDATED FOR EXCEL UPLOAD
CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": ["http://localhost:5173"]}})


# -------------------- IMPORT MODELS --------------------
from models import User, Student, Classroom, Attendance


# -------------------- CUSTOM DECORATORS FOR ROLE-BASED ACCESS --------------------
def teacher_required():
    """Decorator to ensure user has teacher role"""
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request = jwt_required()
            claims = get_jwt()
            current_user_id = get_jwt_identity()
            
            # Get user from database
            user = User.query.get(current_user_id)
            
            if not user or user.role != 'teacher':
                return jsonify({"message": "Teacher access required"}), 403
            
            return fn(*args, **kwargs)
        return decorator
    return wrapper



def student_required():
    """Decorator to ensure user has student role"""
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request = jwt_required()
            claims = get_jwt()
            current_user_id = get_jwt_identity()
            
            # Get user from database
            user = User.query.get(current_user_id)
            
            if not user or user.role != 'student':
                return jsonify({"message": "Student access required"}), 403
            
            return fn(*args, **kwargs)
        return decorator
    return wrapper



# -------------------- AUTH ROUTES (UPDATED) --------------------
@app.route('/api/auth/login', methods=['POST'])
def login():
    """Common login for both teachers and students"""
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"message": "Email and password required"}), 400
    
    user = User.query.filter_by(email=data.get('email')).first()
    
    if user and bcrypt.check_password_hash(user.password, data.get('password')):
        # ✅ UPDATED: Include role in JWT claims
        additional_claims = {"role": user.role}
        token = create_access_token(
            identity=str(user.id), 
            additional_claims=additional_claims
        )
        
        return jsonify({
            "access_token": token,
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role  # ✅ SEND ROLE TO FRONTEND
            }
        }), 200
    
    return jsonify({"message": "Invalid email or password"}), 401



@app.route('/api/auth/signup', methods=['POST'])
def signup():
    """
    Updated signup to handle both teacher and student registration
    Expected JSON:
    {
        "name": "John Doe",
        "email": "john@example.com",
        "password": "password123",
        "user_type": "teacher",  // or "student"
        "phone_number": "1234567890",  // optional for teachers
        "subject_taught": "Mathematics"  // optional for teachers
    }
    """
    data = request.get_json()
    
    # Validate required fields
    if not data.get('email') or not data.get('password') or not data.get('name'):
        return jsonify({"message": "Name, email and password required"}), 400
    
    # Check if user already exists
    if User.query.filter_by(email=data.get('email')).first():
        return jsonify({"message": "Email already exists"}), 400
    
    # Get user type (default to teacher for backward compatibility)
    user_type = data.get('user_type', 'teacher')
    
    if user_type not in ['teacher', 'student']:
        return jsonify({"message": "Invalid user type. Must be 'teacher' or 'student'"}), 400
    
    # Hash password
    hashed_password = bcrypt.generate_password_hash(data.get('password')).decode('utf-8')
    
    # ✅ CREATE USER WITH ROLE
    new_user = User(
        name=data.get('name'),
        email=data.get('email'),
        password=hashed_password,
        role=user_type,  # ✅ SET ROLE
        phone_number=data.get('phone_number'),  # ✅ NEW FIELD
        subject_taught=data.get('subject_taught') if user_type == 'teacher' else None  # ✅ NEW FIELD
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    # ✅ IF STUDENT SIGNUP, LINK TO EXISTING STUDENT RECORD
    if user_type == 'student':
        # Find student record by email
        student = Student.query.filter_by(email=data.get('email')).first()
        if student:
            student.user_id = new_user.id
            db.session.commit()
    
    return jsonify({
        "message": "User created successfully",
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
            "role": new_user.role
        }
    }), 201



# -------------------- Register blueprints --------------------
from routes.classroom import classroom_bp
from routes.students import student_bp
from routes.attendance import attendance_bp
from routes.analytics import analytics_bp
from routes.student_portal import student_portal_bp  


app.register_blueprint(classroom_bp)
app.register_blueprint(student_bp)
app.register_blueprint(attendance_bp)
app.register_blueprint(analytics_bp)
app.register_blueprint(student_portal_bp) 




# -------------------- JWT HANDLERS --------------------
@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({"message": "Token has expired"}), 401



@jwt.invalid_token_loader
def invalid_token_callback(error):
    return jsonify({"message": "Invalid token"}), 422



@jwt.unauthorized_loader
def missing_token_callback(error):
    return jsonify({"message": "Authorization token is missing"}), 401



# -------------------- HELPER FUNCTIONS --------------------
def find_student_image(student):
    """
    Smart image finder - tries 4 different methods
    1. Exact path from photo_path column
    2. Name-based matching (john_doe.jpg)
    3. Roll number-based matching (101.jpg)
    4. Partial name matching
    """
    images_dir = "images"
    
    # Method 1: Exact path
    if student.photo_path:
        exact_path = os.path.join(images_dir, student.photo_path)
        if os.path.exists(exact_path):
            return exact_path
    
    # Method 2: Name-based (with spaces replaced by underscores)
    name_cleaned = student.name.replace(" ", "_").lower()
    name_pattern = os.path.join(images_dir, f"{name_cleaned}.*")
    name_matches = glob.glob(name_pattern)
    if name_matches:
        return name_matches[0]
    
    # Method 3: Roll number-based
    roll_pattern = os.path.join(images_dir, f"{student.roll_no}.*")
    roll_matches = glob.glob(roll_pattern)
    if roll_matches:
        return roll_matches[0]
    
    # Method 4: Case-insensitive partial matching
    for filename in os.listdir(images_dir):
        if student.name.lower() in filename.lower() or student.roll_no.lower() in filename.lower():
            return os.path.join(images_dir, filename)
    
    return None



# -------------------- FACE RECOGNITION --------------------
@app.route("/api/recognize", methods=["POST"])
@jwt_required()  # ✅ ADD JWT PROTECTION
def recognize():
    """
    Face recognition endpoint
    Requires: JWT token, classroom_id, file (image)
    Returns: List of present/absent students
    """
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400


    file = request.files["file"]
    classroom_id = request.form.get('classroom_id')
    
    if not classroom_id:
        return jsonify({"error": "Classroom ID required"}), 400


    try:
        # Get all students in classroom
        classroom_students = Student.query.filter_by(classroom_id=int(classroom_id)).all()
        
        if not classroom_students:
            return jsonify({"error": "No students found in this classroom"}), 400
        
        # Build face encodings for all students
        classroom_encodings = []
        classroom_names = []
        classroom_ids = []
        students_without_photos = []
        
        for student in classroom_students:
            image_path = find_student_image(student)
            if image_path:
                try:
                    img = face_recognition.load_image_file(image_path)
                    encodings = face_recognition.face_encodings(img)
                    if len(encodings) > 0:
                        classroom_encodings.append(encodings[0])
                        classroom_names.append(student.name)
                        classroom_ids.append(student.id)
                    else:
                        students_without_photos.append(student.name)
                except Exception as e:
                    students_without_photos.append(student.name)
            else:
                students_without_photos.append(student.name)
        
        if not classroom_encodings:
            return jsonify({
                "error": "No valid face encodings found for any student",
                "students_without_photos": students_without_photos
            }), 400
        
        # Load uploaded image and detect faces
        img = face_recognition.load_image_file(file)
        encodings = face_recognition.face_encodings(img)


        if not encodings:
            return jsonify({"error": "No faces detected in uploaded image"}), 400


        # Match detected faces with student database
        present = []
        present_ids = []
        detected_names = set()


        for enc in encodings:
            matches = face_recognition.compare_faces(classroom_encodings, enc, tolerance=0.6)
            if True in matches:
                idx = matches.index(True)
                name = classroom_names[idx]
                if name not in detected_names:  # Avoid duplicates
                    detected_names.add(name)
                    present.append(name)
                    present_ids.append(classroom_ids[idx])


        # Calculate absent students
        absent = [s.name for s in classroom_students if s.name not in detected_names]
        absent_ids = [s.id for s in classroom_students if s.name not in detected_names]


        return jsonify({
            "success": True,
            "present": present,
            "present_ids": present_ids,
            "absent": absent,
            "absent_ids": absent_ids,
            "total_students": len(classroom_students),
            "total_detected": len(encodings),
            "students_without_photos": students_without_photos
        }), 200


    except Exception as e:
        return jsonify({"error": str(e)}), 500



# -------------------- HOME ROUTE --------------------
@app.route("/")
def home():
    return jsonify({
        "message": "SnapTick API - Face Recognition Attendance System",
        "version": "2.0",
        "endpoints": {
            "auth": "/api/auth/login, /api/auth/signup",
            "classrooms": "/api/classrooms",
            "students": "/api/students",
            "attendance": "/api/attendance",
            "face_recognition": "/api/recognize"
        }
    })



# -------------------- RUN --------------------
if __name__ == "__main__":
    with app.app_context():
        # ✅ IMPORTANT: Remove db.create_all() when using Flask-Migrate
        # Use 'flask db upgrade' instead
        pass
    
    print("\n" + "="*50)
    print("🚀 SnapTick API Server Starting...")
    print("="*50)
    print("📍 Server: http://localhost:5000")
    print("📍 API Docs: http://localhost:5000/")
    print("="*50 + "\n")
    
    app.run(host='0.0.0.0', port=5000, debug=True)
