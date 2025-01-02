from flask import Flask, render_template, request, jsonify, redirect, url_for, session, flash
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from main import generate_subtasks
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os

load_dotenv()
app = Flask(__name__)

app.secret_key = os.getenv('SECRET_KEY')
GOOGLE_GEMINI_API_KEY = os.getenv('GOOGLE_GEMINI_API_KEY')
   
   # Validate environment variables
if not app.secret_key:
       raise ValueError("No SECRET_KEY set for Flask application")
if not GOOGLE_GEMINI_API_KEY:
       raise ValueError("No GOOGLE_GEMINI_API_KEY set for Flask application")
   
   # Configure Google Gemini in main.py or here as needed
   # Example: genai.configure(api_key=GOOGLE_GEMINI_API_KEY)
   
   # Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Define User and Progress models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    google_id = db.Column(db.String(100), unique=True, nullable=True)  # Nullable since not all users may use Google Sign-In
    first_name = db.Column(db.String(100), nullable=True)
    last_name = db.Column(db.String(100), nullable=True)
    username = db.Column(db.String(80), unique=True, nullable=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=True)
    
    # Relationship to store user's progress
    progress = db.relationship('Progress', backref='user', uselist=False)

class Progress(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    study_hours = db.Column(db.Integer, default=0)
    streak = db.Column(db.Integer, default=0)
    total_usage_hours = db.Column(db.Float, default=0.0)  # Changed to Float for fractional hours
    last_active = db.Column(db.Date, nullable=True)  # For streak tracking
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

# Create all database tables
with app.app_context():
    db.create_all()

# Authentication Decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please log in to access this page.')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Signup Route
@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        # Retrieve form data
        first_name = request.form.get('first_name').strip()
        last_name = request.form.get('last_name').strip()
        username = request.form.get('username').strip()
        email = request.form.get('email').strip().lower()
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')

        # Input validation
        if not all([first_name, last_name, username, email, password, confirm_password]):
            flash('Please fill out all fields.')
            return redirect(url_for('signup'))
        
        if password != confirm_password:
            flash('Passwords do not match.')
            return redirect(url_for('signup'))

        # Check if username or email already exists
        existing_user = User.query.filter(
            (User.username == username) | (User.email == email)
        ).first()
        if existing_user:
            flash('Username or email already exists.')
            return redirect(url_for('signup'))
        
        # Hash the password using the correct method
        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')

        # Create new user
        new_user = User(
            first_name=first_name,
            last_name=last_name,
            username=username,
            email=email,
            password_hash=hashed_password
        )
        db.session.add(new_user)
        db.session.commit()

        # Initialize user progress
        user_progress = Progress(user_id=new_user.id)
        db.session.add(user_progress)
        db.session.commit()

        flash('Account created successfully! Please log in.')
        return redirect(url_for('login'))
    
    return render_template('signup.html')

# Login Route
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        # Retrieve form data
        email_or_username = request.form.get('email_or_username').strip()
        password = request.form.get('password')

        # Input validation
        if not all([email_or_username, password]):
            flash('Please fill out all fields.')
            return redirect(url_for('login'))

        # Check if user exists
        user = User.query.filter(
            (User.email == email_or_username.lower()) | (User.username == email_or_username)
        ).first()

        if user and user.password_hash and check_password_hash(user.password_hash, password):
            # Successful login
            session['user_id'] = user.id
            session['username'] = user.username
            flash('Logged in successfully!')
            return redirect(url_for('profile'))
        else:
            flash('Invalid credentials.')
            return redirect(url_for('login'))
    
    return render_template('login.html')

# Logout Route
@app.route('/logout')
def logout():
    session.pop('user_id', None)
    session.pop('username', None)
    flash('You have been logged out.')
    return redirect(url_for('login'))

# Profile Route
@app.route('/profile')
@login_required
def profile():
    user_id = session.get('user_id')
    user = User.query.get(user_id)
    user_progress = user.progress
    return render_template('profile.html', user=user, progress=user_progress)

# Home Route
@app.route('/')
def index():
    return render_template('index.html')

# Sub-Task Generation Route
@app.route('/generate_subtasks', methods=['POST'])
@login_required
def generate_subtasks_route():
    data = request.json
    task_description = data.get('taskDescription', '')
    sub_tasks = generate_subtasks(task_description)
    return jsonify({'subTasks': sub_tasks})

# Update Usage Route
@app.route('/update_usage', methods=['POST'])
@login_required
def update_usage():
    user_id = session.get('user_id')
    user = User.query.get(user_id)
    if user and user.progress:
        # Increment usage by 1 minute
        user.progress.total_usage_hours += 1/60  # 1 minute

        # Update streak
        today = datetime.utcnow().date()
        if user.progress.last_active:
            last_active = user.progress.last_active
            if today - last_active == timedelta(days=1):
                user.progress.streak += 1
            elif today - last_active > timedelta(days=1):
                user.progress.streak = 1
            # If the user is active on the same day, do not change streak
        else:
            user.progress.streak = 1  # First active day
        
        user.progress.last_active = today

        db.session.commit()
        return jsonify({
            'status': 'success',
            'total_usage_hours': round(user.progress.total_usage_hours, 2),
            'streak': user.progress.streak
        }), 200
    return jsonify({'status': 'failure'}), 400

# Run the app
if __name__ == "__main__":
    app.run(debug=True)