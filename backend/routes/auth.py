from flask import Blueprint, request, jsonify
import jwt
import datetime
import hashlib
import os
from functools import wraps
from extensions import get_db, row_to_dict
from config import Config

auth_bp = Blueprint('auth', __name__)

def hash_password(password):
    salt = os.urandom(16).hex()
    hashed = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}:{hashed}"

def verify_password(password, password_hash):
    try:
        salt, hashed = password_hash.split(':')
        return hashlib.sha256((password + salt).encode()).hexdigest() == hashed
    except:
        return False

def generate_token(user_id, role):
    payload = {
        'user_id': user_id, 'role': role,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24),
        'iat': datetime.datetime.utcnow()
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm='HS256')

def get_current_user(token):
    data = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=['HS256'])
    conn = get_db()
    user = row_to_dict(conn.execute('SELECT * FROM users WHERE id=?', (data['user_id'],)).fetchone())
    conn.close()
    return user

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        if not token:
            return jsonify({'error': 'Token missing'}), 401
        try:
            user = get_current_user(token)
            if not user:
                return jsonify({'error': 'User not found'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        return f(user, *args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        if not token:
            return jsonify({'error': 'Token missing'}), 401
        try:
            user = get_current_user(token)
            if not user or user['role'] != 'admin':
                return jsonify({'error': 'Admin access required'}), 403
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        return f(user, *args, **kwargs)
    return decorated

def user_to_dict(u):
    if not u: return None
    return {'id': u['id'], 'name': u['name'], 'email': u['email'], 'role': u['role'], 'created_at': u['created_at']}

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data: return jsonify({'error': 'No data provided'}), 400
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    role = data.get('role', 'student')
    if not all([name, email, password]): return jsonify({'error': 'Name, email, password required'}), 400
    if len(password) < 6: return jsonify({'error': 'Password min 6 chars'}), 400
    if role not in ['student', 'admin']: role = 'student'
    conn = get_db()
    if conn.execute('SELECT id FROM users WHERE email=?', (email,)).fetchone():
        conn.close()
        return jsonify({'error': 'Email already registered'}), 409
    pwd_hash = hash_password(password)
    cursor = conn.execute('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)', (name,email,pwd_hash,role))
    conn.commit()
    user = row_to_dict(conn.execute('SELECT * FROM users WHERE id=?', (cursor.lastrowid,)).fetchone())
    conn.close()
    token = generate_token(user['id'], user['role'])
    return jsonify({'message': 'Registration successful', 'token': token, 'user': user_to_dict(user)}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data: return jsonify({'error': 'No data provided'}), 400
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    if not all([email, password]): return jsonify({'error': 'Email and password required'}), 400
    conn = get_db()
    user = row_to_dict(conn.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone())
    conn.close()
    if not user or not verify_password(password, user['password_hash']):
        return jsonify({'error': 'Invalid email or password'}), 401
    token = generate_token(user['id'], user['role'])
    return jsonify({'message': 'Login successful', 'token': token, 'user': user_to_dict(user)}), 200

@auth_bp.route('/me', methods=['GET'])
@token_required
def get_profile(current_user):
    return jsonify({'user': user_to_dict(current_user)}), 200
