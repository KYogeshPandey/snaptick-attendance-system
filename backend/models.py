# backend/models.py
from extensions import db
from datetime import datetime


class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)  # Hashed password
    
    # ✅ Role-based access
    role = db.Column(db.String(20), nullable=False, default='teacher')  # 'teacher' or 'student'
    phone_number = db.Column(db.String(15), nullable=True)
    subject_taught = db.Column(db.String(100), nullable=True)  # Only for teachers
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    classrooms = db.relationship('Classroom', backref='teacher', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<User {self.email}>'


class Classroom(db.Model):
    __tablename__ = 'classrooms'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    subject = db.Column(db.String(100), nullable=False)
    
    # ✅ Additional metadata
    branch = db.Column(db.String(50), nullable=True)  # CSE, ECE, ME etc.
    section = db.Column(db.String(10), nullable=True)  # A, B, C
    semester = db.Column(db.Integer, nullable=True)  # 1-8
    
    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    students = db.relationship('Student', backref='classroom', lazy=True, cascade='all, delete-orphan')
    attendance_records = db.relationship('Attendance', backref='classroom', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Classroom {self.name}>'


class Student(db.Model):
    __tablename__ = 'students'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    roll_no = db.Column(db.String(50), nullable=False)
    photo_path = db.Column(db.String(200), nullable=True)
    
    # ✅ NEW: Multi-encoding storage for Phase 1 accuracy improvement
    encodings = db.Column(db.Text, nullable=True)  # JSON string: [encoding1, encoding2, ...]
    
    # ✅ Student login capability
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    classroom_id = db.Column(db.Integer, db.ForeignKey('classrooms.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    attendance_records = db.relationship('Attendance', backref='student', lazy=True, cascade='all, delete-orphan')
    user = db.relationship('User', backref='student_profile', foreign_keys=[user_id])
    
    def __repr__(self):
        return f'<Student {self.name} - {self.roll_no}>'


class Attendance(db.Model):
    __tablename__ = 'attendance'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    classroom_id = db.Column(db.Integer, db.ForeignKey('classrooms.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), nullable=False)  # 'present', 'absent', 'uncertain'
    
    # ✅ NEW: Recognition metadata for Phase 1
    confidence = db.Column(db.Float, nullable=True)  # Match confidence score
    distance = db.Column(db.Float, nullable=True)  # Face distance metric
    
    marked_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Attendance {self.student_id} - {self.date} - {self.status}>'
