from flask import Flask, jsonify
from flask_cors import CORS
from flask import send_from_directory
import sqlite3
from pathlib import Path
from datetime import datetime, timezone

app = Flask(__name__)
CORS(app)
DB_PATH = Path(__file__).with_name('tickets.db')
FRONTEND_DIST = Path(__file__).resolve().parent.parent / 'frontend' / 'dist' / 'turnos-atencion' / 'browser'
TABLES = [1, 2, 3, 4]


def connect():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute('PRAGMA foreign_keys = ON')
    return connection


def initialize_database():
    with connect() as db:
        db.execute('''CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            number INTEGER NOT NULL UNIQUE,
            status TEXT NOT NULL CHECK(status IN ('open', 'attending', 'completed')),
            desk INTEGER CHECK(desk IS NULL OR desk BETWEEN 1 AND 4),
            created_at TEXT NOT NULL,
            called_at TEXT,
            completed_at TEXT
        )''')
        db.execute('CREATE INDEX IF NOT EXISTS idx_tickets_status_number ON tickets(status, number)')


def ticket_dict(row):
    return dict(row) if row else None


def error(message, status=400):
    return jsonify({'error': message}), status


@app.get('/api/health')
def health():
    return jsonify({'status': 'ok'})


@app.get('/api/tickets')
def list_tickets():
    with connect() as db:
        rows = db.execute('SELECT * FROM tickets ORDER BY number DESC LIMIT 100').fetchall()
        return jsonify([ticket_dict(row) for row in rows])


@app.post('/api/tickets')
def create_ticket():
    now = datetime.now(timezone.utc).isoformat()
    with connect() as db:
        row = db.execute('SELECT COALESCE(MAX(number), 0) + 1 AS next_number FROM tickets').fetchone()
        number = row['next_number']
        cursor = db.execute('INSERT INTO tickets(number, status, created_at) VALUES (?, ?, ?)', (number, 'open', now))
        ticket = db.execute('SELECT * FROM tickets WHERE id = ?', (cursor.lastrowid,)).fetchone()
    return jsonify(ticket_dict(ticket)), 201


@app.post('/api/desks/<int:desk>/call-next')
def call_next(desk):
    if desk not in TABLES:
        return error('La mesa debe estar entre 1 y 4.')
    now = datetime.now(timezone.utc).isoformat()
    with connect() as db:
        db.execute('BEGIN IMMEDIATE')
        occupied = db.execute("SELECT number FROM tickets WHERE desk = ? AND status = 'attending'", (desk,)).fetchone()
        if occupied:
            return error(f'La Mesa {desk} ya está atendiendo el turno {occupied["number"]}. Libérala antes de llamar otro turno.', 409)
        row = db.execute("SELECT id FROM tickets WHERE status = 'open' ORDER BY number ASC LIMIT 1").fetchone()
        if not row:
            return error('No hay turnos en espera.', 404)
        db.execute("UPDATE tickets SET status = 'attending', desk = ?, called_at = ? WHERE id = ? AND status = 'open'", (desk, now, row['id']))
        ticket = db.execute('SELECT * FROM tickets WHERE id = ?', (row['id'],)).fetchone()
    return jsonify(ticket_dict(ticket))


@app.post('/api/tickets/<int:ticket_id>/complete')
def complete_ticket(ticket_id):
    now = datetime.now(timezone.utc).isoformat()
    with connect() as db:
        cursor = db.execute("UPDATE tickets SET status = 'completed', completed_at = ? WHERE id = ? AND status = 'attending'", (now, ticket_id))
        if cursor.rowcount == 0:
            return error('El turno no existe o no está siendo atendido.', 404)
        ticket = db.execute('SELECT * FROM tickets WHERE id = ?', (ticket_id,)).fetchone()
    return jsonify(ticket_dict(ticket))


@app.get('/api/desks')
def list_desks():
    with connect() as db:
        rows = db.execute("SELECT * FROM tickets WHERE status = 'attending' ORDER BY desk").fetchall()
        active = {row['desk']: ticket_dict(row) for row in rows}
    return jsonify([{'desk': desk, 'ticket': active.get(desk)} for desk in TABLES])


@app.get('/api/stats')
@app.get('/api/statistics')
def stats():
    with connect() as db:
        waiting = db.execute("SELECT COUNT(*) FROM tickets WHERE status = 'open'").fetchone()[0]
        attending = db.execute("SELECT COUNT(*) FROM tickets WHERE status = 'attending'").fetchone()[0]
        completed = db.execute("SELECT COUNT(*) FROM tickets WHERE status = 'completed'").fetchone()[0]
        current = db.execute("SELECT number, desk FROM tickets WHERE status = 'attending' ORDER BY called_at DESC LIMIT 1").fetchone()
    return jsonify({'waiting': waiting, 'waiting_count': waiting, 'attending': attending, 'completed': completed,
                    'current': dict(current) if current else None})


@app.errorhandler(404)
def not_found(_error):
    return jsonify({'error': 'Recurso no encontrado.'}), 404


@app.get('/')
def frontend_index():
    if not (FRONTEND_DIST / 'index.html').is_file():
        return error('La aplicación web no está construida.', 404)
    return send_from_directory(FRONTEND_DIST, 'index.html')


@app.get('/<path:asset_path>')
def frontend_assets(asset_path):
    if asset_path.startswith('api/'):
        return error('Recurso no encontrado.', 404)
    if not (FRONTEND_DIST / 'index.html').is_file():
        return error('La aplicación web no está construida.', 404)
    if (FRONTEND_DIST / asset_path).is_file():
        return send_from_directory(FRONTEND_DIST, asset_path)
    return send_from_directory(FRONTEND_DIST, 'index.html')


initialize_database()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)


