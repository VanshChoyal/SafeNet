"""SafeNet - Flask backend
Run: python app.py
This app serves the static frontend and simple APIs that save quiz results and contact messages to SQLite.
"""
from flask import Flask, render_template, request, jsonify, g
import sqlite3
import os
from datetime import datetime

# Configuration
DATABASE = os.path.join(os.path.dirname(__file__), 'safenet.db')
DEBUG = True

app = Flask(__name__)
app.config.from_object(__name__)

# Database helpers
def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(app.config['DATABASE'])
        db.row_factory = sqlite3.Row
    return db

def init_db():
    db = get_db()
    cursor = db.cursor()
    # Create tables if they don't exist
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS quiz_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            score INTEGER,
            max_score INTEGER,
            details TEXT,
            created_at TIMESTAMP
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT,
            message TEXT,
            created_at TIMESTAMP
        )
    ''')
    db.commit()

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

# Routes
@app.route('/')
def index():
    # Ensure DB exists when someone visits
    init_db()
    return render_template('home.html')


@app.route('/quiz')
def quiz_page():
    init_db()
    return render_template('quiz.html')


@app.route('/about')
def about_page():
    return render_template('about.html')


@app.route('/contact')
def contact_page_get():
    return render_template('contact.html')

@app.route('/submit-quiz', methods=['POST'])
def submit_quiz():
    data = request.get_json()
    name = data.get('name', 'Anonymous')
    score = int(data.get('score', 0))
    max_score = int(data.get('max_score', 0))
    details = data.get('details', '')

    db = get_db()
    cursor = db.cursor()
    cursor.execute('''INSERT INTO quiz_results (name, score, max_score, details, created_at)
                      VALUES (?, ?, ?, ?, ?)''',
                   (name, score, max_score, details, datetime.utcnow()))
    db.commit()
    return jsonify({'status':'ok', 'message':'Quiz saved'})

@app.route('/contact', methods=['POST'])
def contact():
    data = request.get_json()
    name = data.get('name', 'Anonymous')
    email = data.get('email', '')
    message = data.get('message', '')

    db = get_db()
    cursor = db.cursor()
    cursor.execute('''INSERT INTO contacts (name, email, message, created_at)
                      VALUES (?, ?, ?, ?)''',
                   (name, email, message, datetime.utcnow()))
    db.commit()
    return jsonify({'status':'ok', 'message':'Contact saved'})

@app.route('/api/attack_count')
def attack_count():
    # Simulated counter. In a real app this would query an analytics backend or stream.
    # For demo we return a number and a growth rate
    base = 24981
    return jsonify({'phishing_attempts_today': base})

if __name__ == '__main__':
    # Allow running directly on Replit
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=DEBUG)
