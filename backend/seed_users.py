from app import app
from extensions import db, bcrypt
from models import User

SEED_USERS = [
    {"name": "Teacher One", "email": "teacher@example.com", "password": "Pass@123", "role": "teacher"},
    {"name": "Student A", "email": "studentA@example.com", "password": "Pass@123", "role": "student"},
    {"name": "Student B", "email": "studentB@example.com", "password": "Pass@123", "role": "student"},
]

with app.app_context():
    for u in SEED_USERS:
        existing = User.query.filter_by(email=u['email']).first()
        if not existing:
            hashed = bcrypt.generate_password_hash(u['password']).decode('utf-8')
            user = User(name=u['name'], email=u['email'], password_hash=hashed, role=u['role'])
            db.session.add(user)
            print(f"✅ Added: {u['name']} ({u['email']})")
        else:
            print(f"⏭️  Skipped (already exists): {u['email']}")
    db.session.commit()
    print('\n🎉 Seed users complete!')
