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
    allow_origins=["http://localhost:5173"],
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
                max_games_per_player INTEGER DEFAULT 3,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS players (
                id INTEGER PRIMARY KEY,
                tournament_id INTEGER REFERENCES tournaments(id),
                name TEXT NOT NULL,
                draft_done BOOLEAN DEFAULT 0,
                kicked BOOLEAN DEFAULT 0
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
                team_b TEXT,
                two_player_mode TEXT DEFAULT 'koth',
                active_player_ids TEXT
            );
            CREATE TABLE IF NOT EXISTS round_results (
                id INTEGER PRIMARY KEY,
                round_id INTEGER REFERENCES rounds(id),
                player_id INTEGER REFERENCES players(id),
                placement INTEGER,
                points INTEGER
            );
        """)
        # Migrations for existing DBs
        migrations = [
            "ALTER TABLE players ADD COLUMN kicked BOOLEAN DEFAULT 0",
            "ALTER TABLE rounds ADD COLUMN two_player_mode TEXT DEFAULT 'koth'",
            "ALTER TABLE rounds ADD COLUMN active_player_ids TEXT",
            "ALTER TABLE rounds ADD COLUMN koth_wins_needed INTEGER DEFAULT 3",
        ]
        for sql in migrations:
            try:
                db.execute(sql)
            except sqlite3.OperationalError:
                pass
        db.commit()

init_db()

# ── Utility ────────────────────────────────────────────────────

def make_join_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

def placement_to_points(placement: int, num_players: int) -> int:
    return num_players - placement

def get_bench_order(db, tournament_id: int, game_id: int) -> list[dict]:
    """
    Returns all active players sorted by bench priority:
    1. Players who drafted this game (they opted in)
    2. Players with fewest games played overall
    Ties broken alphabetically.
    """
    players = db.execute("""
        SELECT p.id, p.name FROM players p
        WHERE p.tournament_id = ? AND p.kicked = 0
    """, (tournament_id,)).fetchall()

    drafters = set(row["player_id"] for row in db.execute("""
        SELECT d.player_id FROM drafts d
        JOIN players p ON p.id = d.player_id
        WHERE p.tournament_id = ? AND d.game_id = ?
    """, (tournament_id, game_id)).fetchall())

    play_counts = {}
    for row in db.execute("""
        SELECT rr.player_id, COUNT(*) as cnt
        FROM round_results rr
        JOIN rounds r ON r.id = rr.round_id
        WHERE r.tournament_id = ?
        GROUP BY rr.player_id
    """, (tournament_id,)).fetchall():
        play_counts[row["player_id"]] = row["cnt"]

    result = []
    for p in players:
        result.append({
            "id": p["id"],
            "name": p["name"],
            "drafted_this_game": p["id"] in drafters,
            "games_played": play_counts.get(p["id"], 0),
        })

    result.sort(key=lambda x: (
        0 if x["drafted_this_game"] else 1,
        x["games_played"],
        x["name"]
    ))
    return result

# ── Pydantic models ────────────────────────────────────────────

class TournamentCreate(BaseModel):
    wins_needed: int = 3

class PlayerJoin(BaseModel):
    name: str

class DraftSubmit(BaseModel):
    game_ids: list[int]

class RoundResultSubmit(BaseModel):
    placements: dict[int, int]

class TournamentSettings(BaseModel):
    max_games_per_player: Optional[int] = None
    wins_needed: Optional[int] = None
    status: Optional[str] = None

class BenchOverride(BaseModel):
    active_player_ids: list[int]
    two_player_mode: Optional[str] = None        # 'koth' or 'heats'
    koth_wins_needed: Optional[int] = None

class ReorderRounds(BaseModel):
    # List of round IDs in desired new order (only pending rounds)
    round_ids: list[int]

# ── Tournaments ────────────────────────────────────────────────

@app.post("/tournaments")
@limiter.limit("20/minute")
def create_tournament(request: Request, body: TournamentCreate):
    code = make_join_code()
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO tournaments (join_code, wins_needed) VALUES (?, ?)",
            (code, body.wins_needed)
        )
    return {"tournament_id": cur.lastrowid, "join_code": code}

@app.get("/tournaments/{join_code}")
@limiter.limit("60/minute")
def get_tournament(request: Request, join_code: str):
    with get_db() as db:
        t = db.execute(
            "SELECT * FROM tournaments WHERE join_code = ?", (join_code,)
        ).fetchone()
        if not t:
            raise HTTPException(404, "Tournament not found")
        players = db.execute(
            "SELECT * FROM players WHERE tournament_id = ? AND kicked = 0", (t["id"],)
        ).fetchall()
    return {"tournament": dict(t), "players": [dict(p) for p in players]}

@app.post("/tournaments/{join_code}/start")
@limiter.limit("20/minute")
def start_tournament(request: Request, join_code: str):
    with get_db() as db:
        t = db.execute(
            "SELECT * FROM tournaments WHERE join_code = ?", (join_code,)
        ).fetchone()
        if not t:
            raise HTTPException(404)
        if t["status"] != "drafting":
            raise HTTPException(400, "Tournament already started")

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

@app.post("/players/{player_id}/kick")
@limiter.limit("20/minute")
def kick_player(request: Request, player_id: int):
    """
    Soft-kick: marks player as kicked. Removes them from pending rounds.
    Their historical results are preserved for standings accuracy.
    """
    with get_db() as db:
        player = db.execute("SELECT * FROM players WHERE id = ?", (player_id,)).fetchone()
        if not player:
            raise HTTPException(404, "Player not found")

        db.execute("UPDATE players SET kicked = 1 WHERE id = ?", (player_id,))

        # Remove from any active_player_ids in current/pending rounds
        rounds = db.execute("""
            SELECT id, active_player_ids FROM rounds
            WHERE tournament_id = (SELECT tournament_id FROM players WHERE id = ?)
            AND status IN ('active', 'pending')
            AND active_player_ids IS NOT NULL
        """, (player_id,)).fetchall()

        for r in rounds:
            if r["active_player_ids"]:
                ids = json.loads(r["active_player_ids"])
                ids = [i for i in ids if i != player_id]
                db.execute(
                    "UPDATE rounds SET active_player_ids = ? WHERE id = ?",
                    (json.dumps(ids), r["id"])
                )

    return {"status": "kicked", "player_id": player_id}

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
@limiter.limit("50/minute")
def draft_status(request: Request, join_code: str):
    with get_db() as db:
        t = db.execute("SELECT id FROM tournaments WHERE join_code = ?", (join_code,)).fetchone()

        players_data = []
        players = db.execute(
            "SELECT id, name, draft_done FROM players WHERE tournament_id = ? AND kicked = 0", (t["id"],)
        ).fetchall()

        for p in players:
            drafts = db.execute("SELECT game_id FROM drafts WHERE player_id = ?", (p["id"],)).fetchall()
            players_data.append({
                "name": p["name"],
                "draft_done": p["draft_done"],
                "game_ids": [d["game_id"] for d in drafts]
            })

    all_done = all(p["draft_done"] for p in players_data)
    return {"all_done": all_done, "players": players_data}

# ── Bench ──────────────────────────────────────────────────────

@app.get("/tournaments/{join_code}/bench")
@limiter.limit("60/minute")
def get_bench(request: Request, join_code: str):
    """
    Returns the bench order for the current active round.
    Also returns who is currently set as active players.
    """
    with get_db() as db:
        t = db.execute(
            "SELECT * FROM tournaments WHERE join_code = ?", (join_code,)
        ).fetchone()
        if not t:
            raise HTTPException(404)

        round_ = db.execute("""
            SELECT r.*, g.min_players, g.max_players, g.name as game_name
            FROM rounds r JOIN games g ON g.id = r.game_id
            WHERE r.tournament_id = ? AND r.status = 'active'
        """, (t["id"],)).fetchone()

        if not round_:
            return {"bench": [], "active_players": [], "round": None}

        bench = get_bench_order(db, t["id"], round_["game_id"])

        # Determine active players
        if round_["active_player_ids"]:
            active_ids = set(json.loads(round_["active_player_ids"]))
        else:
            # Auto-assign: top N from bench where N = max_players
            max_p = round_["max_players"]
            active_ids = set(p["id"] for p in bench[:max_p])

        for p in bench:
            p["is_active"] = p["id"] in active_ids

        return {
            "bench": bench,
            "active_players": [p for p in bench if p["is_active"]],
            "benched_players": [p for p in bench if not p["is_active"]],
            "round": {
                "id": round_["id"],
                "game_name": round_["game_name"],
                "min_players": round_["min_players"],
                "max_players": round_["max_players"],
                "two_player_mode": round_["two_player_mode"] or "koth",
                "koth_wins_needed": round_["koth_wins_needed"] or 3,
            }
        }

@app.post("/tournaments/{join_code}/bench")
@limiter.limit("20/minute")
def set_bench(request: Request, join_code: str, body: BenchOverride):
    """Host manually sets who plays this round."""
    with get_db() as db:
        t = db.execute(
            "SELECT * FROM tournaments WHERE join_code = ?", (join_code,)
        ).fetchone()
        if not t:
            raise HTTPException(404)

        round_ = db.execute("""
            SELECT * FROM rounds WHERE tournament_id = ? AND status = 'active'
        """, (t["id"],)).fetchone()

        if not round_:
            raise HTTPException(400, "No active round")

        updates = {"active_player_ids": json.dumps(body.active_player_ids)}
        if body.two_player_mode:
            updates["two_player_mode"] = body.two_player_mode
        if body.koth_wins_needed is not None:
            updates["koth_wins_needed"] = body.koth_wins_needed

        set_clause = ", ".join(f"{k} = ?" for k in updates)
        db.execute(
            f"UPDATE rounds SET {set_clause} WHERE id = ?",
            list(updates.values()) + [round_["id"]]
        )

    return {"status": "bench updated"}

# ── Round management ───────────────────────────────────────────

@app.get("/tournaments/{join_code}/current_round")
@limiter.limit("60/minute")
def current_round(request: Request, join_code: str):
    with get_db() as db:
        t = db.execute(
            "SELECT * FROM tournaments WHERE join_code = ?", (join_code,)
        ).fetchone()

        round_ = db.execute("""
            SELECT r.*, g.name as game_name, g.console, g.eval_mode,
                   g.image_path, g.notes, g.min_players, g.max_players
            FROM rounds r JOIN games g ON g.id = r.game_id
            WHERE r.tournament_id = ? AND r.status = 'active'
        """, (t["id"],)).fetchone()

        count_row = db.execute(
            "SELECT COUNT(*) as total FROM rounds WHERE tournament_id = ?",
            (t["id"],)
        ).fetchone()

        if round_:
            response_data = dict(round_)
            # Attach active players
            if round_["active_player_ids"]:
                active_ids = json.loads(round_["active_player_ids"])
            else:
                bench = get_bench_order(db, t["id"], round_["game_id"])
                active_ids = [p["id"] for p in bench[:round_["max_players"]]]

            active_players = db.execute(
                f"SELECT id, name FROM players WHERE id IN ({','.join('?' for _ in active_ids)})",
                active_ids
            ).fetchall() if active_ids else []

            response_data["active_player_ids"] = active_ids
            response_data["active_players"] = [dict(p) for p in active_players]
        else:
            response_data = {"status": "no active round"}

        response_data["round_count"] = count_row["total"]
    return response_data

@app.post("/rounds/{round_id}/skip")
@limiter.limit("20/minute")
def skip_round(request: Request, round_id: int):
    """Skip the current active round and activate the next one."""
    with get_db() as db:
        round_ = db.execute(
            "SELECT * FROM rounds WHERE id = ?", (round_id,)
        ).fetchone()
        if not round_ or round_["status"] != "active":
            raise HTTPException(400, "Round is not active")

        db.execute("UPDATE rounds SET status = 'skipped' WHERE id = ?", (round_id,))

        next_round = db.execute("""
            SELECT id FROM rounds
            WHERE tournament_id = ? AND order_index > ? AND status = 'pending'
            ORDER BY order_index ASC LIMIT 1
        """, (round_["tournament_id"], round_["order_index"])).fetchone()

        if next_round:
            db.execute("UPDATE rounds SET status = 'active' WHERE id = ?", (next_round["id"],))
            return {"status": "skipped", "next_round_id": next_round["id"]}
        else:
            db.execute(
                "UPDATE tournaments SET status = 'finished' WHERE id = ?",
                (round_["tournament_id"],)
            )
            return {"status": "skipped", "tournament_finished": True}

@app.patch("/tournaments/{join_code}/rounds/reorder")
@limiter.limit("20/minute")
def reorder_rounds(request: Request, join_code: str, body: ReorderRounds):
    """
    Reorder pending rounds. Accepts a list of round IDs in the desired order.
    Only pending rounds can be reordered.
    """
    with get_db() as db:
        t = db.execute(
            "SELECT * FROM tournaments WHERE join_code = ?", (join_code,)
        ).fetchone()
        if not t:
            raise HTTPException(404)

        # Get the current highest order_index among done/active/skipped rounds
        max_done = db.execute("""
            SELECT MAX(order_index) as m FROM rounds
            WHERE tournament_id = ? AND status != 'pending'
        """, (t["id"],)).fetchone()
        start_index = (max_done["m"] or -1) + 1

        # Verify all provided IDs are pending rounds in this tournament
        for i, rid in enumerate(body.round_ids):
            r = db.execute(
                "SELECT * FROM rounds WHERE id = ? AND tournament_id = ? AND status = 'pending'",
                (rid, t["id"])
            ).fetchone()
            if not r:
                raise HTTPException(400, f"Round {rid} is not a pending round in this tournament")
            db.execute(
                "UPDATE rounds SET order_index = ? WHERE id = ?",
                (start_index + i, rid)
            )

    return {"status": "reordered"}

@app.get("/tournaments/{join_code}/rounds")
@limiter.limit("30/minute")
def list_rounds(request: Request, join_code: str):
    """List all rounds with their status and game info."""
    with get_db() as db:
        t = db.execute(
            "SELECT * FROM tournaments WHERE join_code = ?", (join_code,)
        ).fetchone()
        if not t:
            raise HTTPException(404)

        rounds = db.execute("""
            SELECT r.id, r.order_index, r.status, r.two_player_mode,
                   g.name as game_name, g.console, g.image_path,
                   g.min_players, g.max_players
            FROM rounds r JOIN games g ON g.id = r.game_id
            WHERE r.tournament_id = ?
            ORDER BY r.order_index ASC
        """, (t["id"],)).fetchall()

    return {"rounds": [dict(r) for r in rounds]}

# ── Rounds & scoring ───────────────────────────────────────────

@app.post("/rounds/{round_id}/result")
@limiter.limit("20/minute")
def submit_result(request: Request, round_id: int, body: RoundResultSubmit):
    with get_db() as db:
        round_ = db.execute("""
            SELECT r.*, t.wins_needed, t.status as t_status
            FROM rounds r
            JOIN tournaments t ON t.id = r.tournament_id
            WHERE r.id = ?
        """, (round_id,)).fetchone()

        if not round_ or round_["t_status"] == "finished":
            raise HTTPException(400, "Tournament already finished or round not found")

        num_players = len(body.placements)
        for player_id, placement in body.placements.items():
            points = placement_to_points(placement, num_players)
            db.execute("""
                INSERT INTO round_results (round_id, player_id, placement, points)
                VALUES (?, ?, ?, ?)
            """, (round_id, int(player_id), placement, points))

        db.execute("UPDATE rounds SET status = 'done' WHERE id = ?", (round_id,))

        top_winner = db.execute("""
            SELECT COUNT(CASE WHEN placement = 1 THEN 1 END) as total_wins
            FROM round_results rr
            JOIN rounds r ON r.id = rr.round_id
            WHERE r.tournament_id = ?
            GROUP BY rr.player_id
            ORDER BY total_wins DESC LIMIT 1
        """, (round_["tournament_id"],)).fetchone()

        next_round = db.execute("""
            SELECT id FROM rounds
            WHERE tournament_id = ? AND status = 'pending'
            ORDER BY order_index ASC LIMIT 1
        """, (round_["tournament_id"],)).fetchone()

        if (top_winner and top_winner["total_wins"] >= round_["wins_needed"]) or not next_round:
            db.execute(
                "UPDATE tournaments SET status = 'finished' WHERE id = ?",
                (round_["tournament_id"],)
            )
            return {"status": "tournament_finished"}
        else:
            db.execute("UPDATE rounds SET status = 'active' WHERE id = ?", (next_round["id"],))
            return {"status": "next_round_activated"}

@app.get("/tournaments/{join_code}/standings")
@limiter.limit("60/minute")
def standings(request: Request, join_code: str):
    with get_db() as db:
        t = db.execute(
            "SELECT * FROM tournaments WHERE join_code = ?", (join_code,)
        ).fetchone()
        rows = db.execute("""
            SELECT p.id, p.name, COALESCE(SUM(rr.points), 0) as total_points,
                   COUNT(CASE WHEN rr.placement = 1 THEN 1 END) as wins,
                   COUNT(rr.id) as games_played
            FROM players p
            LEFT JOIN round_results rr ON rr.player_id = p.id
            WHERE p.tournament_id = ? AND p.kicked = 0
            GROUP BY p.id
            ORDER BY total_points DESC
        """, (t["id"],)).fetchall()
    return {"standings": [dict(r) for r in rows]}

# ── Games ──────────────────────────────────────────────────────

@app.get("/games")
@limiter.limit("20/minute")
def list_games(request: Request):
    with get_db() as db:
        games = db.execute("SELECT * FROM games ORDER BY console, name").fetchall()
    return {"games": [dict(g) for g in games]}

# ── Settings ──────────────────────────────────────────────────────

@app.patch("/tournaments/{join_code}/settings")
@limiter.limit("20/minute")
def update_settings(request: Request, join_code: str, body: TournamentSettings):
    with get_db() as db:
        t = db.execute(
            "SELECT * FROM tournaments WHERE join_code = ?", (join_code,)
        ).fetchone()
        if not t:
            raise HTTPException(404, "Tournament not found")
        if t["status"] == "finished":
            raise HTTPException(400, "Cannot edit a finished tournament")

        updates = body.model_dump(exclude_none=True)

        if "status" in updates and updates["status"] not in ["active", "finished"]:
            raise HTTPException(400, "Invalid status transition")

        if not updates:
            return {"status": "nothing to update"}

        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [join_code]

        db.execute(
            f"UPDATE tournaments SET {set_clause} WHERE join_code = ?",
            values
        )
    return {"status": "updated", "changes": updates}