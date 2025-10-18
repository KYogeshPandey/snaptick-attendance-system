# backend/create_audit_table.py
import sqlite3

conn = sqlite3.connect('instance/attendance.db')
cursor = conn.cursor()

# Create audit log table
cursor.execute('''
CREATE TABLE IF NOT EXISTS attendance_audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL,
    attendance_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    classroom_id INTEGER NOT NULL,
    date DATE NOT NULL,
    old_status VARCHAR(20) NOT NULL,
    new_status VARCHAR(20) NOT NULL,
    change_type VARCHAR(50) NOT NULL,
    change_reason VARCHAR(200),
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id),
    FOREIGN KEY (attendance_id) REFERENCES attendance(id),
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (classroom_id) REFERENCES classrooms(id)
)
''')

conn.commit()

# Verify
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='attendance_audit_logs'")
result = cursor.fetchone()

if result:
    print("✅ attendance_audit_logs table created successfully!")
    
    # Show table structure
    cursor.execute("PRAGMA table_info(attendance_audit_logs)")
    columns = cursor.fetchall()
    print("\n📋 Table Structure:")
    for col in columns:
        print(f"  - {col[1]} ({col[2]})")
else:
    print("❌ Failed to create table")

conn.close()
