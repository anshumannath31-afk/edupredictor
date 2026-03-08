# 🎓 EduPredictor – AI-Powered Student Performance Platform

A full-stack web application with Flask REST API, scikit-learn ML model, SQLite database, and React frontend.

---

## 🏗️ Architecture

```
EduPredictor/
├── backend/                   # Flask REST API
│   ├── app.py                 # Main entry point & DB seeder
│   ├── config.py              # Configuration
│   ├── extensions.py          # SQLAlchemy instance
│   ├── models/
│   │   └── models.py          # User, AcademicRecord, Prediction, Resource
│   ├── routes/
│   │   ├── auth.py            # /api/auth/* (register, login, me)
│   │   ├── predictions.py     # /api/predict, /api/predictions
│   │   ├── upload.py          # /api/upload (CSV/Excel bulk)
│   │   └── analytics.py       # /api/analytics/* (admin)
│   └── ml/
│       └── predictor.py       # Gradient Boosting ML model
│
└── frontend/
    └── src/
        └── App.jsx            # Full React SPA (all pages)
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Sora + DM Sans fonts |
| Backend | Python Flask 3.x |
| Database | SQLite via SQLAlchemy |
| ML Model | scikit-learn GradientBoostingClassifier |
| Auth | JWT (PyJWT) |
| Data Processing | pandas, openpyxl |

---

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend

# Install dependencies
pip install flask flask-cors flask-sqlalchemy pyjwt scikit-learn pandas openpyxl python-dotenv

# Start the server
python app.py
```

The backend will:
- Auto-create SQLite database (`edupredictor.db`)
- Train the ML model on synthetic data (~2000 records)
- Seed demo users and academic records
- Start on **http://localhost:5000**

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
# or
npm start
```

Frontend runs on **http://localhost:3000** (or 5173 for Vite)

---

## 🔐 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Student | priya@demo.com | Student@123 |
| Student (at-risk) | rahul@demo.com | Student@123 |
| Admin | admin@edupredictor.com | Admin@123 |

---

## 📡 API Endpoints

### Auth
```
POST   /api/auth/register       Register new user
POST   /api/auth/login          Login → returns JWT token
GET    /api/auth/me             Get current user profile
```

### Student
```
POST   /api/predict             Run ML prediction (saves record)
GET    /api/predictions         Get prediction history
GET    /api/predictions/latest  Get latest prediction + record
GET    /api/academic-record     Get latest academic record
GET    /api/resources           Get study resources
```

### Admin
```
POST   /api/upload              Upload CSV/Excel → batch predict
GET    /api/analytics/overview  Full analytics overview
GET    /api/analytics/students  All students with predictions
GET    /api/analytics/student/:id  Student detail
GET    /api/admin/predictions   All student predictions
```

---

## 🤖 ML Model

**Algorithm:** Gradient Boosting Classifier (scikit-learn)

**Features (10 total):**
- `attendance` – Class attendance percentage
- `internal_marks` – Internal assessment marks  
- `study_hours` – Daily study hours
- `backlogs` – Number of failed/pending subjects
- `math_marks`, `physics_marks`, `chemistry_marks`, `english_marks`, `cs_marks`
- `avg_subject_marks` – Computed average

**Training:** 2000 synthetic student records with realistic distributions

**Output:**
```json
{
  "prediction": "Pass",
  "risk_level": "Low",
  "confidence": 87.4,
  "weak_subjects": ["Mathematics"],
  "recommendations": [
    {"priority": "High", "icon": "📐", "text": "Focus on calculus fundamentals..."}
  ]
}
```

---

## 📤 CSV Upload Format

```csv
student_name,email,attendance,internal_marks,study_hours,backlogs,math_marks,physics_marks,chemistry_marks,english_marks,cs_marks
Priya Sharma,priya@college.edu,85,72,4.5,0,78,82,85,91,78
Rahul Mehta,rahul@college.edu,62,45,1.5,3,38,42,55,60,48
```

---

## 🖥️ Pages

### Student Portal
| Page | Description |
|------|-------------|
| Dashboard | Prediction banner, weak subjects, AI guidance, subject progress bars |
| Academic Data | Form to enter marks → runs ML prediction → shows JSON response |
| Resources | Filtered study materials by subject |
| History | All past predictions with timestamps |

### Admin Portal
| Page | Description |
|------|-------------|
| Overview | Stats cards, subject pass rates, at-risk students, recent predictions |
| Students | Full student table with search, risk badges, weak subjects |
| Upload | Drag & drop CSV/Excel → batch ML predictions → summary report |
| Analytics | Charts: pass/fail distribution, subject averages, risk breakdown |

---

## 🗄️ Database Schema

```
users               (id, name, email, password_hash, role, created_at)
academic_records    (id, user_id, attendance, internal_marks, study_hours, backlogs, *_marks)
predictions         (id, user_id, record_id, prediction, risk_level, confidence, weak_subjects, recommendations)
resources           (id, subject, title, resource_type, url, duration, rating, description)
```

---

## 🔧 Configuration

Edit `backend/config.py`:
```python
SECRET_KEY = "your-secret-key"
JWT_SECRET_KEY = "your-jwt-secret"
SQLALCHEMY_DATABASE_URI = "sqlite:///edupredictor.db"
```

---

## 📦 Production Deployment

```bash
# Backend (use gunicorn)
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 "app:create_app()"

# Frontend (build static)
npm run build
# Serve dist/ with nginx or serve
```
