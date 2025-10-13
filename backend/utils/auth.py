from app import bcrypt

def hash_password(plain):
    return bcrypt.generate_password_hash(plain).decode('utf-8')

def check_password(hash_value, plain):
    return bcrypt.check_password_hash(hash_value, plain)
