# attendance_demo_project

# SnapTick — AI-Powered Smart Attendance System

An intelligent, real-time face recognition-based attendance management system designed for educational institutions of Uttar Pradesh.

## 🚀 Features
- Real-time face detection using **MTCNN + dlib**
- Automatic attendance marking — no manual effort
- Role-based access: **Admin & Teacher** login via JWT
- Live dashboard with attendance trends and reports
- Scalable Flask REST API + React.js frontend

## 🛠️ Tech Stack
| Layer | Technology |
|---|---|
| Backend | Python, Flask, SQLAlchemy, Flask-Migrate |
| Frontend | React.js, Vite |
| AI/ML | Face Recognition, MTCNN, TensorFlow, OpenCV |
| Auth | JWT (Flask-JWT-Extended) |
| Database | SQLite / PostgreSQL |

## ⚙️ How to Run

### Backend
```bash
cd attendance_demo_project/backend
python -m venv env
.\env\Scripts\activate
pip install -r requirements.txt
python init_db.py
python encode_known_faces.py
python app.py
```

### Frontend
```bash
cd attendance_demo_project/frontend
npm install
npm run dev
```

## 👥 Contributors
- KYogeshPandey
- 09765432sx

## 📌 Project developed for HackwithUttarPradesh Hackathon