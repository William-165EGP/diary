from flask import Flask, render_template, request, redirect, session, url_for, jsonify
from db import users_table, diaries_table, register_user, check_login
import hashlib
from random import choice
from datetime import datetime
import humanize
import os
import json
from gemini import generate_encouragement
from dotenv import load_dotenv

def time_since(timestr):
    try:
        created_time = datetime.strptime(timestr, '%Y-%m-%d %H:%M:%S')
        now = datetime.now()
        return humanize.naturaltime(now - created_time)
    except:
        return "unknown time"

app = Flask(__name__)
load_dotenv()
app.secret_key = os.getenv("FLASK_SECRET_KEY")


app.jinja_env.globals.update(time_since=time_since)

app.jinja_env.globals.update(zip=zip)

@app.route('/quiz', methods=['GET', 'POST'])
def quiz():
    with open('static/test.json', encoding='utf-8') as f:
        quiz_data = json.load(f)
    questions = quiz_data["questions"]
    total_questions = len(questions)

    if 'quiz_answers' not in session:
        session['quiz_answers'] = {}

    page = int(request.args.get('page', 1))

    if request.method == 'POST':
        current_q = questions[page - 1]
        selected = request.form.get(current_q["id"])
        if selected is not None:
            answers = session.get('quiz_answers', {})
            answers[current_q["id"]] = int(selected)
            session['quiz_answers'] = answers
            # print("目前累積的作答：", session['quiz_answers'])

        if page < total_questions:
            return redirect(url_for('quiz', page=page + 1))

        else:
            user_answers = []
            for q in questions:
                selected_val = session['quiz_answers'].get(q["id"])
                if selected_val is not None:
                    try:
                        idx = q["values"].index(selected_val)
                        selected_option = q["options"][idx]
                        user_answers.append({
                            "question": q["text"],
                            "selected": selected_option
                        })
                    except ValueError:
                        continue

            suggestion = generate_encouragement(user_answers)

            score = sum(session['quiz_answers'].values())
            session.pop('quiz_answers', None)

            return render_template('quiz_result.html', score=score, suggestion=suggestion)

    current_q = questions[page - 1]
    return render_template('quiz_page.html', q=current_q, page=page, total=total_questions, quiz=quiz_data)

@app.route('/gemini_suggestion', methods=['POST'])
def gemini_suggestion():
    content = request.json.get("content", "")
    suggestion = generate_encouragement(content)
    return jsonify({'suggestion': suggestion})

@app.route('/')
def index():
    if 'username' not in session:
        return redirect(url_for('login'))

    public_diaries = diaries_table.all()
    return render_template('diary_list.html', diaries=public_diaries, username=session['username'])


@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        success = register_user(request.form['username'], request.form['password'])
        if success:
            return redirect(url_for('login'))
        else:
            return '使用者已存在'
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        if check_login(request.form['username'], request.form['password']):
            session['username'] = request.form['username']
            return redirect(url_for('index'))
        else:
            error = '使用者名稱或密碼錯誤！'

    public_diaries = [d for d in diaries_table.all() if d.get('public')]
    sample_diary = choice(public_diaries) if public_diaries else None
    return render_template('login.html', sample=sample_diary, error=error)


@app.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('login'))

@app.route('/write', methods=['GET', 'POST'])
def write():
    if 'username' not in session:
        return redirect(url_for('login'))

    if request.method == 'POST':
        content = request.form['content']
        is_public = 'public' in request.form
        diaries_table.insert({
            'author': session['username'],
            'content': content,
            'public': is_public,
            'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
        return redirect(url_for('index'))

    public_diaries = [d for d in diaries_table.all() if d.get('public')]
    sample_diary = choice(public_diaries) if public_diaries else None

    return render_template('write.html', sample=sample_diary, username=session['username'])

@app.route('/my_diary')
def my_diary():
    if 'username' not in session:
        return redirect(url_for('login'))

    # doc_id
    diaries = [
        {**d, 'id': d.doc_id}
        for d in diaries_table.all()
        if d.get('author') == session['username']
    ]

    return render_template('my_diary.html', diaries=diaries, username=session['username'])

@app.route('/delete_diary/<int:diary_id>', methods=['POST'])
def delete_diary(diary_id):
    if 'username' not in session:
        return redirect(url_for('login'))

    diary = diaries_table.get(doc_id=diary_id)
    if diary and diary.get('author') == session['username']:
        diaries_table.remove(doc_ids=[diary_id])

    return redirect(url_for('my_diary'))

def time_since(timestr):
    try:
        created_time = datetime.strptime(timestr, '%Y-%m-%d %H:%M:%S')
        now = datetime.now()
        return humanize.naturaltime(now - created_time)
    except:
        return "unknown time"

if __name__ == '__main__':
    app.run(debug=True, port=5001)