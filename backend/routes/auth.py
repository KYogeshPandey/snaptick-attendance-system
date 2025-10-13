from flask import Blueprint, request, jsonify
from extensions import db, bcrypt
from models import User
from flask_jwt_extended import create_access_token

auth_bp = Blueprint('auth', __name__, url_prefix='/api')

@auth_bp.post('/register')
def register():
    data = request.get_json() or {}
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'teacher')

    if not all([name, email, password]):
        return jsonify({"message": "name, email, password required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "email already exists"}), 409

    hashed = bcrypt.generate_password_hash(password).decode('utf-8')
    user = User(name=name, email=email, password_hash=hashed, role=role)
    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "registered"}), 201

@auth_bp.post('/login')
def login():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({"message": "invalid credentials"}), 401

    # FIX: Identity as string (user ID), additional_claims for extra data
    token = create_access_token(
        identity=str(user.id),  # ← Must be string
        additional_claims={
            "email": user.email,
            "role": user.role,
            "name": user.name
        }
    )
    
    return jsonify({
        "token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role
        }
    }), 200
