# backend/seed_users.py
from app import app, db
from models import User
from extensions import bcrypt

# Demo users
demo_users = [
    {'name': 'Dr. Nidhi Sharma', 'email': 'teacher@demo.com', 'password': 'password123', 'role': 'teacher'},
    {'name': 'Yogesh Pandey', 'email': 'student@demo.com', 'password': 'password123', 'role': 'student'},
    {'name': 'Krish Sharma', 'email': 'krish@demo.com', 'password': 'password123', 'role': 'student'},
]

with app.app_context():
    print("🌱 Seeding demo users...\n")
    
    for u in demo_users:
        # Check if user already exists
        existing = User.query.filter_by(email=u['email']).first()
        if existing:
            print(f"⚠️  User already exists: {u['email']}")
            continue
        
        # Create new user
        user = User(
            name=u['name'],
            email=u['email'],
            role=u['role']
        )
        # Set password using property setter
        user.password = bcrypt.generate_password_hash(u['password']).decode('utf-8')
        
        db.session.add(user)
        print(f"✅ Created: {u['name']} ({u['email']}) - Role: {u['role']}")
    
    db.session.commit()
    print("\n🎉 Seeding complete!")
    print("\n📝 Login Credentials:")
    print("=" * 50)
    for u in demo_users:
        print(f"\n{u['role'].upper()}:")
        print(f"  Email: {u['email']}")
        print(f"  Password: {u['password']}")
    print("\n" + "=" * 50)
