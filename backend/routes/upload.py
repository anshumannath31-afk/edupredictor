from flask import Blueprint, request, jsonify
import pandas as pd
import json
from extensions import get_db, row_to_dict
from ml.predictor import predict as run_prediction
from routes.auth import admin_required, hash_password

upload_bp = Blueprint('upload', __name__)
ALLOWED = {'csv', 'xlsx', 'xls'}

COLUMN_MAP = {
    'student_name': ['student_name','name','student name','studentname'],
    'email': ['email','email_id'],
    'attendance': ['attendance','attendance_pct'],
    'internal_marks': ['internal_marks','internal marks','marks','internal'],
    'study_hours': ['study_hours','study hours','hours'],
    'backlogs': ['backlogs','backlog','arrears'],
    'math_marks': ['math_marks','mathematics','math','maths'],
    'physics_marks': ['physics_marks','physics'],
    'chemistry_marks': ['chemistry_marks','chemistry','chem'],
    'english_marks': ['english_marks','english'],
    'cs_marks': ['cs_marks','computer_science','cs','computer science'],
}

def normalize(df):
    df.columns = [c.strip().lower().replace(' ','_') for c in df.columns]
    rename = {}
    for std, variants in COLUMN_MAP.items():
        for col in df.columns:
            if col in variants and std not in df.columns:
                rename[col] = std; break
    return df.rename(columns=rename)

@upload_bp.route('/upload', methods=['POST'])
@admin_required
def upload(current_user):
    if 'file' not in request.files: return jsonify({'error': 'No file'}), 400
    file = request.files['file']
    ext = file.filename.rsplit('.',1)[-1].lower() if '.' in file.filename else ''
    if ext not in ALLOWED: return jsonify({'error': 'Use .csv or .xlsx'}), 400
    try:
        df = pd.read_csv(file) if ext == 'csv' else pd.read_excel(file)
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    df = normalize(df)
    missing = [c for c in ['student_name','email','attendance','internal_marks','study_hours'] if c not in df.columns]
    if missing: return jsonify({'error': f'Missing columns: {", ".join(missing)}'}), 400

    conn = get_db()
    results, errors, created, updated = [], [], 0, 0

    for idx, row in df.iterrows():
        try:
            email = str(row['email']).strip().lower()
            name = str(row['student_name']).strip()
            existing = row_to_dict(conn.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone())
            if not existing:
                conn.execute('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)',
                    (name, email, hash_password('Student@123'), 'student'))
                conn.commit()
                user = row_to_dict(conn.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone())
                created += 1
            else:
                user = existing; updated += 1

            rd = {
                'attendance': float(row.get('attendance', 75)),
                'internal_marks': float(row.get('internal_marks', 60)),
                'study_hours': float(row.get('study_hours', 3)),
                'backlogs': int(row.get('backlogs', 0)),
                'math_marks': float(row.get('math_marks', 60)),
                'physics_marks': float(row.get('physics_marks', 60)),
                'chemistry_marks': float(row.get('chemistry_marks', 60)),
                'english_marks': float(row.get('english_marks', 60)),
                'cs_marks': float(row.get('cs_marks', 60)),
            }
            cur = conn.execute(
                'INSERT INTO academic_records (user_id,attendance,internal_marks,study_hours,backlogs,math_marks,physics_marks,chemistry_marks,english_marks,cs_marks) VALUES (?,?,?,?,?,?,?,?,?,?)',
                (user['id'], rd['attendance'], rd['internal_marks'], rd['study_hours'], rd['backlogs'],
                 rd['math_marks'], rd['physics_marks'], rd['chemistry_marks'], rd['english_marks'], rd['cs_marks'])
            )
            conn.commit()
            record_id = cur.lastrowid
            res = run_prediction(rd)
            conn.execute('INSERT INTO predictions (user_id,record_id,prediction,risk_level,confidence,weak_subjects,recommendations) VALUES (?,?,?,?,?,?,?)',
                (user['id'], record_id, res['prediction'], res['risk_level'], res['confidence'],
                 json.dumps(res['weak_subjects']), json.dumps(res['recommendations'])))
            conn.commit()
            results.append({'name': name, 'email': email, 'prediction': res['prediction'],
                'risk_level': res['risk_level'], 'confidence': res['confidence'], 'weak_subjects': res['weak_subjects']})
        except Exception as e:
            errors.append({'row': idx+2, 'error': str(e)})

    conn.close()
    at_risk = sum(1 for r in results if r['risk_level'] == 'High')
    pass_c = sum(1 for r in results if r['prediction'] == 'Pass')
    return jsonify({
        'message': f'Processed {len(results)} students',
        'summary': {'total_processed': len(results), 'new_students': created, 'updated_students': updated,
                    'predicted_pass': pass_c, 'predicted_fail': len(results)-pass_c, 'at_risk': at_risk, 'errors': len(errors)},
        'results': results, 'errors': errors
    }), 200
