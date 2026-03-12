from flask import Blueprint, request, jsonify
from extensions import get_db, row_to_dict, rows_to_list
from routes.auth import token_required

semester_bp = Blueprint('semester', __name__)


@semester_bp.route('/semesters', methods=['GET'])
@token_required
def get_semesters(current_user):
    conn = get_db()
    rows = rows_to_list(conn.execute(
        'SELECT * FROM semester_results WHERE user_id=? ORDER BY semester_no ASC',
        (current_user['id'],)
    ).fetchall())
    conn.close()
    return jsonify({'semesters': rows}), 200


@semester_bp.route('/semesters', methods=['POST'])
@token_required
def add_semester(current_user):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    semester_no = int(data.get('semester_no', 1))
    if semester_no not in [1, 2]:
        return jsonify({'error': 'Only Semester 1 and Semester 2 are allowed.'}), 400
    conn = get_db()

    # Check if semester already exists for this user
    existing = conn.execute(
        'SELECT id FROM semester_results WHERE user_id=? AND semester_no=?',
        (current_user['id'], semester_no)
    ).fetchone()

    if existing:
        # Update existing
        conn.execute('''UPDATE semester_results SET
            semester_name=?, math_marks=?, physics_marks=?, chemistry_marks=?,
            english_marks=?, cs_marks=?, other1_name=?, other1_marks=?,
            other2_name=?, other2_marks=?, cgpa=?, attendance=?, backlogs=?
            WHERE user_id=? AND semester_no=?''',
            (
                data.get('semester_name', f'Semester {semester_no}'),
                float(data.get('math_marks', 0)),
                float(data.get('physics_marks', 0)),
                float(data.get('chemistry_marks', 0)),
                float(data.get('english_marks', 0)),
                float(data.get('cs_marks', 0)),
                data.get('other1_name', ''),
                float(data.get('other1_marks', 0)),
                data.get('other2_name', ''),
                float(data.get('other2_marks', 0)),
                float(data.get('cgpa', 0)),
                float(data.get('attendance', 0)),
                int(data.get('backlogs', 0)),
                current_user['id'], semester_no
            )
        )
        conn.commit()
        conn.close()
        return jsonify({'message': f'Semester {semester_no} updated successfully'}), 200
    else:
        conn.execute('''INSERT INTO semester_results
            (user_id, semester_no, semester_name, math_marks, physics_marks, chemistry_marks,
             english_marks, cs_marks, other1_name, other1_marks, other2_name, other2_marks,
             cgpa, attendance, backlogs)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
            (
                current_user['id'],
                semester_no,
                data.get('semester_name', f'Semester {semester_no}'),
                float(data.get('math_marks', 0)),
                float(data.get('physics_marks', 0)),
                float(data.get('chemistry_marks', 0)),
                float(data.get('english_marks', 0)),
                float(data.get('cs_marks', 0)),
                data.get('other1_name', ''),
                float(data.get('other1_marks', 0)),
                data.get('other2_name', ''),
                float(data.get('other2_marks', 0)),
                float(data.get('cgpa', 0)),
                float(data.get('attendance', 0)),
                int(data.get('backlogs', 0)),
            )
        )
        conn.commit()
        conn.close()
        return jsonify({'message': f'Semester {semester_no} added successfully'}), 201


@semester_bp.route('/semesters/<int:sem_no>', methods=['DELETE'])
@token_required
def delete_semester(current_user, sem_no):
    conn = get_db()
    conn.execute('DELETE FROM semester_results WHERE user_id=? AND semester_no=?',
                 (current_user['id'], sem_no))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Deleted'}), 200


@semester_bp.route('/semester-analysis', methods=['GET'])
@token_required
def get_analysis(current_user):
    """Analyze semester trends and generate insights."""
    conn = get_db()
    semesters = rows_to_list(conn.execute(
        'SELECT * FROM semester_results WHERE user_id=? ORDER BY semester_no ASC',
        (current_user['id'],)
    ).fetchall())
    conn.close()

    if not semesters:
        return jsonify({'analysis': None, 'message': 'No semester data found'}), 200

    # Compute trends
    subjects = ['math_marks', 'physics_marks', 'chemistry_marks', 'english_marks', 'cs_marks']
    subject_names = ['Mathematics', 'Physics', 'Chemistry', 'English', 'Computer Science']

    trends = {}
    for subj, name in zip(subjects, subject_names):
        marks_over_sems = [s[subj] for s in semesters if s[subj] > 0]
        if len(marks_over_sems) >= 2:
            trend = marks_over_sems[-1] - marks_over_sems[-2]
            trends[name] = {
                'marks': marks_over_sems,
                'trend': round(trend, 1),
                'direction': 'improving' if trend > 2 else 'declining' if trend < -2 else 'stable',
                'latest': marks_over_sems[-1],
                'average': round(sum(marks_over_sems) / len(marks_over_sems), 1)
            }
        elif len(marks_over_sems) == 1:
            trends[name] = {
                'marks': marks_over_sems,
                'trend': 0,
                'direction': 'stable',
                'latest': marks_over_sems[0],
                'average': marks_over_sems[0]
            }

    # Overall CGPA trend
    cgpa_trend = [s['cgpa'] for s in semesters if s['cgpa'] > 0]
    overall_trend = 'improving' if len(cgpa_trend) >= 2 and cgpa_trend[-1] > cgpa_trend[-2] else \
                    'declining' if len(cgpa_trend) >= 2 and cgpa_trend[-1] < cgpa_trend[-2] else 'stable'

    # Weak subjects (consistently below 60)
    consistently_weak = [name for name, data in trends.items()
                         if data['average'] < 65]

    # Most improved
    most_improved = max(trends.items(), key=lambda x: x[1]['trend'], default=None)
    most_declined = min(trends.items(), key=lambda x: x[1]['trend'], default=None)

    # Generate insights
    insights = []
    for name, data in trends.items():
        if data['direction'] == 'declining':
            insights.append({
                'type': 'warning',
                'subject': name,
                'message': f'{name} dropped by {abs(data["trend"])} marks this semester. Needs immediate attention.',
                'icon': '📉'
            })
        elif data['direction'] == 'improving':
            insights.append({
                'type': 'success',
                'subject': name,
                'message': f'{name} improved by {data["trend"]} marks. Keep it up!',
                'icon': '📈'
            })

    if cgpa_trend and cgpa_trend[-1] < 6.0:
        insights.append({
            'type': 'warning',
            'subject': 'Overall',
            'message': f'Your CGPA {cgpa_trend[-1]} is below 6.0. Focus on improving all subjects.',
            'icon': '⚠️'
        })

    return jsonify({
        'analysis': {
            'total_semesters': len(semesters),
            'cgpa_trend': cgpa_trend,
            'overall_trend': overall_trend,
            'subject_trends': trends,
            'consistently_weak': consistently_weak,
            'most_improved': most_improved[0] if most_improved and most_improved[1]['trend'] > 0 else None,
            'most_declined': most_declined[0] if most_declined and most_declined[1]['trend'] < 0 else None,
            'insights': insights,
            'semesters': semesters
        }
    }), 200


@semester_bp.route('/study-schedule', methods=['POST'])
@token_required
def generate_schedule(current_user):
    """Generate a personalized weekly study schedule."""
    data = request.get_json() or {}
    weak_subjects = data.get('weak_subjects', [])
    study_hours = float(data.get('daily_hours', 4))

    # Subject priority based on weakness
    all_subjects = ['Mathematics', 'Physics', 'Chemistry', 'English', 'Computer Science']
    priority_subjects = weak_subjects + [s for s in all_subjects if s not in weak_subjects]

    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    schedule = []
    for i, day in enumerate(days):
        if day == 'Sunday':
            schedule.append({
                'day': day,
                'sessions': [{'subject': 'Revision & Rest', 'hours': 2, 'activity': 'Review the week\'s topics and rest', 'icon': '🔄'}],
                'total_hours': 2
            })
            continue

        sessions = []
        remaining = study_hours

        # Prioritize weak subjects
        if i % 3 == 0 and len(priority_subjects) > 0:
            main = priority_subjects[0]
            sessions.append({'subject': main, 'hours': min(2.5, remaining * 0.6), 'activity': f'Practice problems and concept review', 'icon': get_subject_icon(main)})
            remaining -= sessions[-1]['hours']
        if i % 3 == 1 and len(priority_subjects) > 1:
            main = priority_subjects[1 % len(priority_subjects)]
            sessions.append({'subject': main, 'hours': min(2.5, remaining * 0.6), 'activity': 'Watch tutorial videos and take notes', 'icon': get_subject_icon(main)})
            remaining -= sessions[-1]['hours']
        if i % 3 == 2 and len(priority_subjects) > 2:
            main = priority_subjects[2 % len(priority_subjects)]
            sessions.append({'subject': main, 'hours': min(2, remaining * 0.5), 'activity': 'Solve past exam questions', 'icon': get_subject_icon(main)})
            remaining -= sessions[-1]['hours']

        # Fill with secondary subject
        if remaining > 1:
            sec_idx = (i + 2) % len(priority_subjects)
            sessions.append({'subject': priority_subjects[sec_idx], 'hours': round(remaining, 1), 'activity': 'Light reading and formula revision', 'icon': get_subject_icon(priority_subjects[sec_idx])})

        schedule.append({'day': day, 'sessions': sessions, 'total_hours': study_hours})

    return jsonify({'schedule': schedule, 'weak_subjects': weak_subjects, 'daily_hours': study_hours}), 200


def get_subject_icon(subject):
    icons = {
        'Mathematics': '📐', 'Physics': '⚛️', 'Chemistry': '🧪',
        'English': '📖', 'Computer Science': '💻'
    }
    return icons.get(subject, '📚')
