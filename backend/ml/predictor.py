import numpy as np
import json
import os
import pickle
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'trained_model.pkl')

SUBJECT_THRESHOLD = 60  # marks below this = weak subject
ATTENDANCE_THRESHOLD = 75
BACKLOG_PENALTY = 5

SUBJECT_RECOMMENDATIONS = {
    "Mathematics": [
        "Focus on calculus fundamentals – practice 10 problems daily",
        "Watch 3Blue1Brown's Essence of Calculus series on YouTube",
        "Complete Khan Academy Algebra & Trigonometry module",
        "Solve previous year exam papers for Mathematics"
    ],
    "Physics": [
        "Review Newton's Laws and mechanics chapter thoroughly",
        "Practice numerical problems for 1 hour daily",
        "Watch MIT OpenCourseWare Physics lectures",
        "Form a study group for Physics problem-solving"
    ],
    "Chemistry": [
        "Make flashcards for organic chemistry reactions",
        "Practice balancing chemical equations daily",
        "Watch JEE Chemistry videos for strong concepts",
        "Complete NCERT exercises before moving to advanced material"
    ],
    "English": [
        "Read one article daily to improve comprehension",
        "Practice grammar exercises on Grammarly",
        "Work on essay writing structure and vocabulary",
        "Join an English speaking club or practice group"
    ],
    "Computer Science": [
        "Build small projects to apply programming concepts",
        "Complete a Data Structures course on Coursera",
        "Practice coding problems on LeetCode daily",
        "Study algorithms with GeeksforGeeks tutorials"
    ]
}

def generate_synthetic_data(n=2000):
    """Generate realistic student data for training."""
    np.random.seed(42)
    data = []
    labels = []

    for _ in range(n):
        attendance = np.clip(np.random.normal(75, 18), 30, 100)
        study_hours = np.clip(np.random.normal(4, 2), 0.5, 12)
        backlogs = max(0, int(np.random.exponential(1.2)))
        internal = np.clip(np.random.normal(65, 18), 0, 100)
        math = np.clip(np.random.normal(62, 20), 0, 100)
        physics = np.clip(np.random.normal(65, 19), 0, 100)
        chemistry = np.clip(np.random.normal(68, 17), 0, 100)
        english = np.clip(np.random.normal(72, 15), 0, 100)
        cs = np.clip(np.random.normal(70, 18), 0, 100)

        avg_subject = (math + physics + chemistry + english + cs) / 5

        # Score formula
        score = (
            attendance * 0.25 +
            avg_subject * 0.40 +
            internal * 0.20 +
            study_hours * 1.5 -
            backlogs * BACKLOG_PENALTY
        )

        passed = 1 if score >= 58 else 0
        # Add noise
        if np.random.random() < 0.05:
            passed = 1 - passed

        data.append([attendance, internal, study_hours, backlogs,
                      math, physics, chemistry, english, cs, avg_subject])
        labels.append(passed)

    return np.array(data), np.array(labels)


def train_model():
    """Train and save the ML model."""
    print("🤖 Training ML model on synthetic data...")
    X, y = generate_synthetic_data(2000)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('model', GradientBoostingClassifier(
            n_estimators=150,
            max_depth=4,
            learning_rate=0.1,
            random_state=42
        ))
    ])

    pipeline.fit(X_train, y_train)
    acc = accuracy_score(y_test, pipeline.predict(X_test))
    print(f"✅ Model trained — Accuracy: {acc:.2%}")

    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(pipeline, f)

    return pipeline


def load_model():
    """Load saved model or train a new one."""
    if os.path.exists(MODEL_PATH):
        with open(MODEL_PATH, 'rb') as f:
            return pickle.load(f)
    return train_model()


# Global model instance
_model = None

def get_model():
    global _model
    if _model is None:
        _model = load_model()
    return _model


def get_risk_level(confidence, prediction):
    """Determine risk level from confidence and prediction."""
    if prediction == "Pass":
        if confidence >= 80:
            return "Low"
        elif confidence >= 65:
            return "Medium"
        else:
            return "High"
    else:
        if confidence >= 80:
            return "High"
        elif confidence >= 60:
            return "High"
        else:
            return "Medium"


def get_weak_subjects(data):
    """Identify subjects below threshold."""
    weak = []
    subject_map = {
        'Mathematics': data.get('math_marks', 0),
        'Physics': data.get('physics_marks', 0),
        'Chemistry': data.get('chemistry_marks', 0),
        'English': data.get('english_marks', 0),
        'Computer Science': data.get('cs_marks', 0),
    }
    for subject, marks in subject_map.items():
        if marks < SUBJECT_THRESHOLD:
            weak.append(subject)
    return weak


def get_recommendations(weak_subjects, attendance, backlogs, study_hours):
    """Generate personalized recommendations."""
    recs = []

    if attendance < ATTENDANCE_THRESHOLD:
        recs.append({
            "priority": "High",
            "icon": "📅",
            "text": f"Increase attendance from {attendance:.0f}% to at least 75%. Each 5% increase significantly boosts your prediction."
        })

    if backlogs > 0:
        recs.append({
            "priority": "High",
            "icon": "📌",
            "text": f"Clear {backlogs} backlog(s) within the next 2 weeks. Backlogs heavily impact your final prediction."
        })

    if study_hours < 3:
        recs.append({
            "priority": "High",
            "icon": "⏱",
            "text": f"Increase study hours from {study_hours:.1f}h to at least 3-4 hours daily for better outcomes."
        })

    for subject in weak_subjects[:3]:
        subject_recs = SUBJECT_RECOMMENDATIONS.get(subject, [])
        if subject_recs:
            recs.append({
                "priority": "High" if len(weak_subjects) <= 2 else "Medium",
                "icon": "📚",
                "text": subject_recs[0]
            })

    if not recs:
        recs.append({
            "priority": "Low",
            "icon": "✅",
            "text": "You're on track! Maintain your current study habits and attendance."
        })
        recs.append({
            "priority": "Low",
            "icon": "🎯",
            "text": "Focus on strengthening your strongest subjects for distinction grades."
        })

    return recs[:6]


def predict(data: dict) -> dict:
    """
    Run full prediction pipeline.
    data keys: attendance, internal_marks, study_hours, backlogs,
                math_marks, physics_marks, chemistry_marks, english_marks, cs_marks
    """
    model = get_model()

    attendance = float(data.get('attendance', 75))
    internal = float(data.get('internal_marks', 60))
    study_hours = float(data.get('study_hours', 3))
    backlogs = int(data.get('backlogs', 0))
    math = float(data.get('math_marks', 60))
    physics = float(data.get('physics_marks', 60))
    chemistry = float(data.get('chemistry_marks', 60))
    english = float(data.get('english_marks', 60))
    cs = float(data.get('cs_marks', 60))
    avg_subject = (math + physics + chemistry + english + cs) / 5

    features = np.array([[attendance, internal, study_hours, backlogs,
                          math, physics, chemistry, english, cs, avg_subject]])

    pred_label = model.predict(features)[0]
    proba = model.predict_proba(features)[0]
    confidence = round(float(max(proba)) * 100, 1)

    prediction = "Pass" if pred_label == 1 else "Fail"
    risk_level = get_risk_level(confidence, prediction)
    weak_subjects = get_weak_subjects(data)
    recommendations = get_recommendations(weak_subjects, attendance, backlogs, study_hours)

    return {
        "prediction": prediction,
        "risk_level": risk_level,
        "confidence": confidence,
        "weak_subjects": weak_subjects,
        "recommendations": recommendations,
        "breakdown": {
            "attendance": attendance,
            "internal_marks": internal,
            "study_hours": study_hours,
            "backlogs": backlogs,
            "avg_subject_marks": round(avg_subject, 1),
            "subject_marks": {
                "Mathematics": math,
                "Physics": physics,
                "Chemistry": chemistry,
                "English": english,
                "Computer Science": cs
            }
        }
    }
