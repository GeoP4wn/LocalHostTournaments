# main.py
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
import sqlite3, random, string, json
from datetime import datetime
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.middleware.cors import CORSMiddleware

limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.mount("/static", StaticFiles(directory="../frontend/static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # Your React dev server URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB = "tournament.db"

# ── DB helper ──────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as db:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS games (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                console TEXT NOT NULL,
                year INTEGER,
                eval_mode TEXT NOT NULL,
                min_players INTEGER DEFAULT 2,
                max_players INTEGER DEFAULT 4,
                team_game BOOLEAN DEFAULT 0,
                image_path TEXT,
                notes TEXT
            );
            CREATE TABLE IF NOT EXISTS tournaments (
                id INTEGER PRIMARY KEY,
                join_code TEXT UNIQUE NOT NULL,
                status TEXT DEFAULT 'drafting',
                wins_needed INTEGER DEFAULT 3,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS players (
                id INTEGER PRIMARY KEY,
                tournament_id INTEGER REFERENCES tournaments(id),
                name TEXT NOT NULL,
                draft_done BOOLEAN DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS drafts (
                id INTEGER PRIMARY KEY,
                player_id INTEGER REFERENCES players(id),
                game_id INTEGER REFERENCES games(id)
            );
            CREATE TABLE IF NOT EXISTS rounds (
                id INTEGER PRIMARY KEY,
                tournament_id INTEGER REFERENCES tournaments(id),
                game_id INTEGER REFERENCES games(id),
                order_index INTEGER,
                status TEXT DEFAULT 'pending',
                team_a TEXT,
                team_b TEXT
            );
            CREATE TABLE IF NOT EXISTS round_results (
                id INTEGER PRIMARY KEY,
                round_id INTEGER REFERENCES rounds(id),
                player_id INTEGER REFERENCES players(id),
                placement INTEGER,
                points INTEGER
            );
        """)

init_db()

# ── Utility ────────────────────────────────────────────────────

def make_join_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

def placement_to_points(placement: int, num_players: int) -> int:
    # 1st gets n-1 points, last gets 0
    return num_players - placement

# ── Pydantic models ────────────────────────────────────────────

class TournamentCreate(BaseModel):
    wins_needed: int = 3

class PlayerJoin(BaseModel):
    name: str

class DraftSubmit(BaseModel):
    game_ids: list[int]

class RoundResultSubmit(BaseModel):
    # { player_id: placement } e.g. {1: 1, 2: 3, 3: 2, 4: 4}
    placements: dict[int, int]

# ── Tournaments ────────────────────────────────────────────────

@app.post("/tournaments")
@limiter.limit("5/minute")
def create_tournament(request: Request, body: TournamentCreate):
    code = make_join_code()
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO tournaments (join_code, wins_needed) VALUES (?, ?)",
            (code, body.wins_needed)
        )
    return {"tournament_id": cur.lastrowid, "join_code": code}

@app.get("/tournaments/{join_code}")
@limiter.limit("20/minute")
def get_tournament(request: Request, join_code: str):
    with get_db() as db:
        t = db.execute(
            "SELECT * FROM tournaments WHERE join_code = ?", (join_code,)
        ).fetchone()
        if not t:
            raise HTTPException(404, "Tournament not found")
        players = db.execute(
            "SELECT * FROM players WHERE tournament_id = ?", (t["id"],)
        ).fetchall()
    return {"tournament": dict(t), "players": [dict(p) for p in players]}

@app.post("/tournaments/{join_code}/start")
@limiter.limit("5/minute")
def start_tournament(request: Request, join_code: str):
    """
    Called from display node once all players have drafted.
    Merges all drafts, shuffles into round order, creates rounds.
    """
    with get_db() as db:
        t = db.execute(
            "SELECT * FROM tournaments WHERE join_code = ?", (join_code,)
        ).fetchone()
        if not t:
            raise HTTPException(404)
        if t["status"] != "drafting":
            raise HTTPException(400, "Tournament already started")

        # collect all drafted game_ids (duplicates kept)
        drafts = db.execute("""
            SELECT d.game_id FROM drafts d
            JOIN players p ON p.id = d.player_id
            WHERE p.tournament_id = ?
        """, (t["id"],)).fetchall()

        game_ids = [d["game_id"] for d in drafts]
        random.shuffle(game_ids)

        for i, game_id in enumerate(game_ids):
            db.execute(
                "INSERT INTO rounds (tournament_id, game_id, order_index) VALUES (?,?,?)",
                (t["id"], game_id, i)
            )

        # mark first round as active
        db.execute("""
            UPDATE rounds SET status = 'active'
            WHERE tournament_id = ? AND order_index = 0
        """, (t["id"],))

        db.execute(
            "UPDATE tournaments SET status = 'active' WHERE id = ?", (t["id"],)
        )
    return {"status": "started", "round_count": len(game_ids)}

# ── Players ────────────────────────────────────────────────────

@app.post("/tournaments/{join_code}/join")
@limiter.limit("20/minute")
def join_tournament(request: Request, join_code: str, body: PlayerJoin):
    with get_db() as db:
        t = db.execute(
            "SELECT * FROM tournaments WHERE join_code = ?", (join_code,)
        ).fetchone()
        if not t:
            raise HTTPException(404)
        if t["status"] != "drafting":
            raise HTTPException(400, "Tournament already started")
        cur = db.execute(
            "INSERT INTO players (tournament_id, name) VALUES (?, ?)",
            (t["id"], body.name)
        )
    return {"player_id": cur.lastrowid}

# ── Draft ──────────────────────────────────────────────────────

@app.post("/players/{player_id}/draft")
@limiter.limit("20/minute")
def submit_draft(request: Request, player_id: int, body: DraftSubmit):
    with get_db() as db:
        player = db.execute(
            "SELECT * FROM players WHERE id = ?", (player_id,)
        ).fetchone()
        if not player:
            raise HTTPException(404)
        if player["draft_done"]:
            raise HTTPException(400, "Already drafted")

        for game_id in body.game_ids:
            db.execute(
                "INSERT INTO drafts (player_id, game_id) VALUES (?, ?)",
                (player_id, game_id)
            )
        db.execute(
            "UPDATE players SET draft_done = 1 WHERE id = ?", (player_id,)
        )
    return {"status": "draft submitted"}

@app.get("/tournaments/{join_code}/draft_status")
@limiter.limit("20/minute")
def draft_status(request: Request, join_code: str):
    """Display node polls this to know when everyone has drafted."""
    with get_db() as db:
        t = db.execute(
            "SELECT * FROM tournaments WHERE join_code = ?", (join_code,)
        ).fetchone()
        players = db.execute(
            "SELECT name, draft_done FROM players WHERE tournament_id = ?",
            (t["id"],)
        ).fetchall()
    all_done = all(p["draft_done"] for p in players)
    return {"all_done": all_done, "players": [dict(p) for p in players]}

# ── Rounds & scoring ───────────────────────────────────────────

@app.get("/tournaments/{join_code}/current_round")
@limiter.limit("20/minute")
def current_round(request: Request, join_code: str):
    with get_db() as db:
        t = db.execute(
            "SELECT * FROM tournaments WHERE join_code = ?", (join_code,)
        ).fetchone()
        round_ = db.execute("""
            SELECT r.*, g.name as game_name, g.console, g.eval_mode,
                   g.image_path, g.notes
            FROM rounds r JOIN games g ON g.id = r.game_id
            WHERE r.tournament_id = ? AND r.status = 'active'
        """, (t["id"],)).fetchone()
    return dict(round_) if round_ else {"status": "no active round"}

@app.post("/rounds/{round_id}/result")
@limiter.limit("20/minute")
def submit_result(request: Request, round_id: int, body: RoundResultSubmit):
    """
    placements: {player_id: placement}  e.g. {"1": 1, "2": 3, "3": 2}
    """
    with get_db() as db:
        round_ = db.execute(
            "SELECT * FROM rounds WHERE id = ?", (round_id,)
        ).fetchone()
        if not round_ or round_["status"] != "active":
            raise HTTPException(400, "Round not active")

        num_players = len(body.placements)
        for player_id, placement in body.placements.items():
            points = placement_to_points(placement, num_players)
            db.execute("""
                INSERT INTO round_results (round_id, player_id, placement, points)
                VALUES (?, ?, ?, ?)
            """, (round_id, int(player_id), placement, points))

        db.execute("UPDATE rounds SET status = 'done' WHERE id = ?", (round_id,))

        # activate next round
        db.execute("""
            UPDATE rounds SET status = 'active'
            WHERE tournament_id = ? AND order_index = (
                SELECT order_index + 1 FROM rounds WHERE id = ?
            )
        """, (round_["tournament_id"], round_id))

    return {"status": "result saved"}

@app.get("/tournaments/{join_code}/standings")
@limiter.limit("20/minute")
def standings(request: Request, join_code: str):
    with get_db() as db:
        t = db.execute(
            "SELECT * FROM tournaments WHERE join_code = ?", (join_code,)
        ).fetchone()
        rows = db.execute("""
            SELECT p.name, COALESCE(SUM(rr.points), 0) as total_points,
                   COUNT(CASE WHEN rr.placement = 1 THEN 1 END) as wins
            FROM players p
            LEFT JOIN round_results rr ON rr.player_id = p.id
            WHERE p.tournament_id = ?
            GROUP BY p.id
            ORDER BY total_points DESC
        """, (t["id"],)).fetchall()
    return {"standings": [dict(r) for r in rows]}

# ── Games ──────────────────────────────────────────────────────

@app.get("/games")
@limiter.limit("5/minute")
def list_games(request: Request):
    with get_db() as db:
        games = db.execute("SELECT * FROM games ORDER BY console, name").fetchall()
    return {"games": [dict(g) for g in games]}
