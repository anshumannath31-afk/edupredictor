from flask import Blueprint, jsonify
import json
from extensions import get_db, row_to_dict, rows_to_list
from routes.auth import admin_required, token_required

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/analytics/overview', methods=['GET'])
@admin_required
def overview(current_user):
    conn = get_db()
    total_students = conn.execute("SELECT COUNT(*) FROM users WHERE role='student'").fetchone()[0]
    total_preds = conn.execute("SELECT COUNT(*) FROM predictions").fetchone()[0]
    pass_count = conn.execute("SELECT COUNT(*) FROM predictions WHERE prediction='Pass'").fetchone()[0]
    fail_count = conn.execute("SELECT COUNT(*) FROM predictions WHERE prediction='Fail'").fetchone()[0]
    high_risk = conn.execute("SELECT COUNT(*) FROM predictions WHERE risk_level='High'").fetchone()[0]
    med_risk = conn.execute("SELECT COUNT(*) FROM predictions WHERE risk_level='Medium'").fetchone()[0]
    low_risk = conn.execute("SELECT COUNT(*) FROM predictions WHERE risk_level='Low'").fetchone()[0]
    avg_att = conn.execute("SELECT AVG(attendance) FROM academic_records").fetchone()[0] or 0
    avg_marks = conn.execute("SELECT AVG(internal_marks) FROM academic_records").fetchone()[0] or 0

    records = rows_to_list(conn.execute("SELECT * FROM academic_records").fetchall())
    subj_data = {'Mathematics':[],'Physics':[],'Chemistry':[],'English':[],'Computer Science':[]}
    for r in records:
        subj_data['Mathematics'].append(r['math_marks'])
        subj_data['Physics'].append(r['physics_marks'])
        subj_data['Chemistry'].append(r['chemistry_marks'])
        subj_data['English'].append(r['english_marks'])
        subj_data['Computer Science'].append(r['cs_marks'])
    subj_avg, subj_pass = {}, {}
    for s, ml in subj_data.items():
        if ml:
            subj_avg[s] = round(sum(ml)/len(ml), 1)
            subj_pass[s] = round(sum(1 for m in ml if m>=60)/len(ml)*100, 1)
        else:
            subj_avg[s] = subj_pass[s] = 0

    recent = rows_to_list(conn.execute("SELECT p.*,u.name as student_name FROM predictions p JOIN users u ON p.user_id=u.id ORDER BY p.created_at DESC LIMIT 10").fetchall())
    for r in recent:
        r['weak_subjects'] = json.loads(r.get('weak_subjects','[]'))

    at_risk_rows = rows_to_list(conn.execute(
        "SELECT DISTINCT p.user_id,p.risk_level,p.confidence,p.weak_subjects,u.name,u.email,ar.attendance,ar.internal_marks "
        "FROM predictions p JOIN users u ON p.user_id=u.id "
        "LEFT JOIN academic_records ar ON ar.user_id=p.user_id "
        "WHERE p.risk_level='High' ORDER BY p.created_at DESC LIMIT 20"
    ).fetchall())
    seen, at_risk = set(), []
    for r in at_risk_rows:
        if r['user_id'] not in seen:
            seen.add(r['user_id'])
            at_risk.append({**r, 'weak_subjects': json.loads(r.get('weak_subjects','[]'))})

    conn.close()
    return jsonify({
        'overview': {'total_students':total_students,'total_predictions':total_preds,
            'pass_count':pass_count,'fail_count':fail_count,
            'pass_rate': round(pass_count/total_preds*100,1) if total_preds else 0,
            'high_risk':high_risk,'medium_risk':med_risk,'low_risk':low_risk,
            'avg_attendance':round(avg_att,1),'avg_marks':round(avg_marks,1)},
        'subject_stats': {'avg_marks':subj_avg,'pass_rate':subj_pass},
        'recent_predictions': recent,
        'at_risk_students': at_risk[:10]
    }), 200

@analytics_bp.route('/analytics/students', methods=['GET'])
@admin_required
def all_students(current_user):
    conn = get_db()
    students = rows_to_list(conn.execute("SELECT * FROM users WHERE role='student'").fetchall())
    result = []
    for s in students:
        pred = row_to_dict(conn.execute("SELECT * FROM predictions WHERE user_id=? ORDER BY created_at DESC LIMIT 1", (s['id'],)).fetchone())
        rec = row_to_dict(conn.execute("SELECT * FROM academic_records WHERE user_id=? ORDER BY created_at DESC LIMIT 1", (s['id'],)).fetchone())
        result.append({
            'id': s['id'], 'name': s['name'], 'email': s['email'], 'created_at': s['created_at'],
            'prediction': pred['prediction'] if pred else None,
            'risk_level': pred['risk_level'] if pred else None,
            'confidence': pred['confidence'] if pred else None,
            'attendance': rec['attendance'] if rec else None,
            'internal_marks': rec['internal_marks'] if rec else None,
            'weak_subjects': json.loads(pred['weak_subjects']) if pred and pred.get('weak_subjects') else []
        })
    conn.close()
    return jsonify({'students': result}), 200

@analytics_bp.route('/analytics/student/<int:sid>', methods=['GET'])
@admin_required
def student_detail(current_user, sid):
    conn = get_db()
    student = row_to_dict(conn.execute("SELECT * FROM users WHERE id=?", (sid,)).fetchone())
    if not student: conn.close(); return jsonify({'error':'Not found'}), 404
    records = rows_to_list(conn.execute("SELECT * FROM academic_records WHERE user_id=? ORDER BY created_at DESC", (sid,)).fetchall())
    preds = rows_to_list(conn.execute("SELECT * FROM predictions WHERE user_id=? ORDER BY created_at DESC", (sid,)).fetchall())
    for p in preds:
        p['weak_subjects'] = json.loads(p.get('weak_subjects','[]'))
        p['recommendations'] = json.loads(p.get('recommendations','[]'))
    conn.close()
    return jsonify({'student': student, 'records': records, 'predictions': preds}), 200

@analytics_bp.route('/resources', methods=['GET'])
@token_required
def get_resources(current_user):
    conn = get_db()
    resources = rows_to_list(conn.execute("SELECT * FROM resources").fetchall())
    conn.close()
    return jsonify({'resources': resources}), 200
