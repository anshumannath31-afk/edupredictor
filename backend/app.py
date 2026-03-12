import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, jsonify
# flask_cors not available - using manual headers
from config import Config
from extensions import init_db, get_db, row_to_dict
from routes.auth import auth_bp, hash_password
from routes.predictions import predict_bp
from routes.upload import upload_bp
from routes.analytics import analytics_bp
from routes.semesters import semester_bp
import json

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    # CORS handled via after_request

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(predict_bp, url_prefix='/api')
    app.register_blueprint(upload_bp, url_prefix='/api')
    app.register_blueprint(analytics_bp, url_prefix='/api')
    app.register_blueprint(semester_bp, url_prefix='/api')


    @app.after_request
    def add_cors(response):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        return response

    @app.route('/api/<path:path>', methods=['OPTIONS'])
    def options_handler(path):
        from flask import Response
        return Response(status=200, headers={
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        })
    init_db()
    from extensions import init_semester_table
    init_semester_table()
    seed_data()
    train_ml_model()

    @app.route('/api/health')
    def health():
        return jsonify({'status': 'ok', 'message': 'EduPredictor API running ✅'}), 200

    @app.errorhandler(404)
    def not_found(e): return jsonify({'error': 'Not found'}), 404

    @app.errorhandler(500)
    def server_error(e): return jsonify({'error': 'Server error'}), 500

    return app

def train_ml_model():
    try:
        from ml.predictor import get_model
        get_model()
        print("✅ ML Model ready")
    except Exception as e:
        print(f"⚠️  ML warning: {e}")

def seed_data():
    from ml.predictor import predict as run_prediction
    conn = get_db()

    # Admin
    if not conn.execute("SELECT id FROM users WHERE email='admin@edupredictor.com'").fetchone():
        conn.execute("INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)",
            ('Admin User','admin@edupredictor.com', hash_password('Admin@123'), 'admin'))
        conn.commit()
        print("✅ Admin: admin@edupredictor.com / Admin@123")

    demo = [
        ('Priya Sharma','priya@demo.com', 85,76,4.5,0,78,82,88,91,85),
        ('Rahul Mehta','rahul@demo.com', 62,45,1.5,3,38,42,55,60,48),
        ('Ananya Iyer','ananya@demo.com', 74,63,3.0,1,55,68,72,79,65),
        ('Vikram Singh','vikram@demo.com', 94,88,6.0,0,91,85,89,87,93),
        ('Shreya Das','shreya@demo.com', 55,40,1.0,4,32,38,45,55,40),
    ]

    for name,email,att,im,sh,bl,mm,pm,cm,em,csm in demo:
        if conn.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone():
            continue
        conn.execute("INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)",
            (name, email, hash_password('Student@123'), 'student'))
        conn.commit()
        user = row_to_dict(conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone())
        cur = conn.execute(
            "INSERT INTO academic_records (user_id,attendance,internal_marks,study_hours,backlogs,math_marks,physics_marks,chemistry_marks,english_marks,cs_marks) VALUES (?,?,?,?,?,?,?,?,?,?)",
            (user['id'],att,im,sh,bl,mm,pm,cm,em,csm))
        conn.commit()
        rd = {'attendance':att,'internal_marks':im,'study_hours':sh,'backlogs':bl,'math_marks':mm,'physics_marks':pm,'chemistry_marks':cm,'english_marks':em,'cs_marks':csm}
        res = run_prediction(rd)
        conn.execute("INSERT INTO predictions (user_id,record_id,prediction,risk_level,confidence,weak_subjects,recommendations) VALUES (?,?,?,?,?,?,?)",
            (user['id'],cur.lastrowid,res['prediction'],res['risk_level'],res['confidence'],json.dumps(res['weak_subjects']),json.dumps(res['recommendations'])))
        conn.commit()

        # Seed past semester results for demo students
        sem_data = {
            'priya@demo.com': [
                (1,'Sem 1',72,75,80,85,78,7.8,88,0),(2,'Sem 2',74,78,82,87,80,8.0,90,0),
            ],
            'rahul@demo.com': [
                (1,'Sem 1',55,48,60,65,50,5.5,70,2),(2,'Sem 2',48,44,55,60,46,5.0,65,3),
            ],
            'ananya@demo.com': [
                (1,'Sem 1',60,65,70,75,62,6.8,78,1),(2,'Sem 2',58,66,71,77,63,6.9,76,1),
            ],
            'vikram@demo.com': [
                (1,'Sem 1',85,80,84,82,88,8.8,92,0),(2,'Sem 2',87,82,86,84,90,9.0,93,0),
            ],
            'shreya@demo.com': [
                (1,'Sem 1',45,40,50,55,42,4.5,65,3),(2,'Sem 2',40,38,48,52,40,4.2,62,4),
            ],
        }
        if email in sem_data:
            for sem_no,sem_name,mm,pm,cm,em,csm,cgpa,att,bl in sem_data[email]:
                conn.execute('''INSERT INTO semester_results
                    (user_id,semester_no,semester_name,math_marks,physics_marks,chemistry_marks,
                     english_marks,cs_marks,cgpa,attendance,backlogs)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?)''',
                    (user['id'],sem_no,sem_name,mm,pm,cm,em,csm,cgpa,att,bl))
            conn.commit()

    # Resources
    if conn.execute("SELECT COUNT(*) FROM resources").fetchone()[0] == 0:
        resources = [
            ('Mathematics','Calculus Fundamentals','Video','#','2h 15m',4.8,'Master differentiation and integration'),
            ('Mathematics','Algebra Problem Set','Practice','#','45m',4.6,'100+ practice problems with solutions'),
            ('Mathematics','Linear Algebra Crash Course','Video','#','1h 30m',4.7,'Vectors, matrices, transformations'),
            ('Physics','Mechanics & Motion','Video','#','1h 30m',4.7,"Newton's laws and kinematics"),
            ('Physics','Electromagnetism Notes','PDF','#','30m read',4.5,'Comprehensive EM theory notes'),
            ('Chemistry','Organic Chemistry Basics','Video','#','1h 45m',4.9,'Functional groups and reactions'),
            ('Chemistry','Chemical Equations Practice','Practice','#','1h',4.6,'Balance and solve 50 equations'),
            ('English','Essay Writing Masterclass','Course','#','3h',4.6,'Structure, argumentation, and style'),
            ('Computer Science','Data Structures Deep Dive','Course','#','4h',4.9,'Arrays, trees, graphs with code'),
            ('Computer Science','Algorithm Design','Video','#','2h',4.8,'Sorting, searching, dynamic programming'),
        ]
        for r in resources:
            conn.execute("INSERT INTO resources (subject,title,resource_type,url,duration,rating,description) VALUES (?,?,?,?,?,?,?)", r)
        conn.commit()
    conn.close()
    print("✅ Demo data ready | priya@demo.com / Student@123")

if __name__ == '__main__':
    app = create_app()
    print("\n🚀 EduPredictor API → http://localhost:5000")
    print("📚 Frontend  → http://localhost:3000\n")
    app.run(debug=True, port=5000)
