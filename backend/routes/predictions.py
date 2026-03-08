from flask import Blueprint, request, jsonify
import json
from extensions import get_db, row_to_dict, rows_to_list
from ml.predictor import predict as run_prediction
from routes.auth import token_required, admin_required

predict_bp = Blueprint('predict', __name__)

@predict_bp.route('/predict', methods=['POST'])
@token_required
def make_prediction(current_user):
    data = request.get_json()
    if not data: return jsonify({'error': 'No data provided'}), 400
    for field in ['attendance', 'internal_marks', 'study_hours']:
        if field not in data: return jsonify({'error': f'Missing: {field}'}), 400

    conn = get_db()
    cur = conn.execute(
        'INSERT INTO academic_records (user_id,attendance,internal_marks,study_hours,backlogs,math_marks,physics_marks,chemistry_marks,english_marks,cs_marks) VALUES (?,?,?,?,?,?,?,?,?,?)',
        (current_user['id'], float(data['attendance']), float(data['internal_marks']),
         float(data['study_hours']), int(data.get('backlogs',0)),
         float(data.get('math_marks',60)), float(data.get('physics_marks',60)),
         float(data.get('chemistry_marks',60)), float(data.get('english_marks',60)),
         float(data.get('cs_marks',60)))
    )
    conn.commit()
    record_id = cur.lastrowid

    result = run_prediction(data)
    cur2 = conn.execute(
        'INSERT INTO predictions (user_id,record_id,prediction,risk_level,confidence,weak_subjects,recommendations) VALUES (?,?,?,?,?,?,?)',
        (current_user['id'], record_id, result['prediction'], result['risk_level'],
         result['confidence'], json.dumps(result['weak_subjects']), json.dumps(result['recommendations']))
    )
    conn.commit()
    conn.close()

    return jsonify({'prediction_id': cur2.lastrowid, **result}), 200

@predict_bp.route('/predictions', methods=['GET'])
@token_required
def get_my_predictions(current_user):
    conn = get_db()
    rows = rows_to_list(conn.execute(
        'SELECT * FROM predictions WHERE user_id=? ORDER BY created_at DESC LIMIT 20', (current_user['id'],)
    ).fetchall())
    conn.close()
    for r in rows:
        r['weak_subjects'] = json.loads(r.get('weak_subjects','[]'))
        r['recommendations'] = json.loads(r.get('recommendations','[]'))
    return jsonify({'predictions': rows}), 200

@predict_bp.route('/predictions/latest', methods=['GET'])
@token_required
def get_latest(current_user):
    conn = get_db()
    pred = row_to_dict(conn.execute(
        'SELECT * FROM predictions WHERE user_id=? ORDER BY created_at DESC LIMIT 1', (current_user['id'],)
    ).fetchone())
    record = row_to_dict(conn.execute(
        'SELECT * FROM academic_records WHERE user_id=? ORDER BY created_at DESC LIMIT 1', (current_user['id'],)
    ).fetchone())
    conn.close()
    if pred:
        pred['weak_subjects'] = json.loads(pred.get('weak_subjects','[]'))
        pred['recommendations'] = json.loads(pred.get('recommendations','[]'))
    return jsonify({'prediction': pred, 'record': record}), 200

@predict_bp.route('/academic-record', methods=['GET'])
@token_required
def get_record(current_user):
    conn = get_db()
    record = row_to_dict(conn.execute(
        'SELECT * FROM academic_records WHERE user_id=? ORDER BY created_at DESC LIMIT 1', (current_user['id'],)
    ).fetchone())
    conn.close()
    return jsonify({'record': record}), 200

@predict_bp.route('/admin/predictions', methods=['GET'])
@admin_required
def admin_all(current_user):
    conn = get_db()
    students = rows_to_list(conn.execute("SELECT * FROM users WHERE role='student'").fetchall())
    results = []
    for s in students:
        pred = row_to_dict(conn.execute('SELECT * FROM predictions WHERE user_id=? ORDER BY created_at DESC LIMIT 1', (s['id'],)).fetchone())
        record = row_to_dict(conn.execute('SELECT * FROM academic_records WHERE user_id=? ORDER BY created_at DESC LIMIT 1', (s['id'],)).fetchone())
        if pred:
            pred['weak_subjects'] = json.loads(pred.get('weak_subjects','[]'))
            pred['recommendations'] = json.loads(pred.get('recommendations','[]'))
        results.append({'student': s, 'latest_prediction': pred, 'latest_record': record})
    conn.close()
    return jsonify({'data': results}), 200
