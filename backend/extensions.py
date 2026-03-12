"""
Database layer using Python's built-in sqlite3 — no external ORM needed.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'edupredictor.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'student',
        created_at TEXT DEFAULT (datetime('now'))
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS academic_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        semester TEXT DEFAULT 'Current',
        attendance REAL NOT NULL,
        internal_marks REAL NOT NULL,
        study_hours REAL NOT NULL,
        backlogs INTEGER DEFAULT 0,
        math_marks REAL DEFAULT 0,
        physics_marks REAL DEFAULT 0,
        chemistry_marks REAL DEFAULT 0,
        english_marks REAL DEFAULT 0,
        cs_marks REAL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        record_id INTEGER,
        prediction TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        confidence REAL NOT NULL,
        weak_subjects TEXT DEFAULT '[]',
        recommendations TEXT DEFAULT '[]',
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS resources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject TEXT NOT NULL,
        title TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        url TEXT DEFAULT '#',
        duration TEXT DEFAULT '',
        rating REAL DEFAULT 4.5,
        description TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
    )''')

    conn.commit()
    conn.close()
    print("✅ Database initialized")


def row_to_dict(row):
    return dict(row) if row else None

def rows_to_list(rows):
    return [dict(r) for r in rows]


def init_semester_table():
    """Add semester results table if not exists."""
    conn = get_db()
    conn.execute('''CREATE TABLE IF NOT EXISTS semester_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        semester_no INTEGER NOT NULL,
        semester_name TEXT DEFAULT '',
        math_marks REAL DEFAULT 0,
        physics_marks REAL DEFAULT 0,
        chemistry_marks REAL DEFAULT 0,
        english_marks REAL DEFAULT 0,
        cs_marks REAL DEFAULT 0,
        other1_name TEXT DEFAULT '',
        other1_marks REAL DEFAULT 0,
        other2_name TEXT DEFAULT '',
        other2_marks REAL DEFAULT 0,
        cgpa REAL DEFAULT 0,
        attendance REAL DEFAULT 0,
        backlogs INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )''')
    conn.commit()
    conn.close()

