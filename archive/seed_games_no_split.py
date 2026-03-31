"""
seed_games.py
Run this once to:
  1. Add the new rating columns to the games table (safe to re-run)
  2. Insert all tournament games with stats and metacritic scores

Usage:
  python seed_games.py
  python seed_games.py --reset   # wipe and re-seed games table
"""

import sqlite3
import sys

DB = "tournament.db"

# ── Schema migration ───────────────────────────────────────────
# Adds new columns if they don't exist yet. Safe to run multiple times.

MIGRATIONS = [
    "ALTER TABLE games ADD COLUMN chaos INTEGER DEFAULT 0",
    "ALTER TABLE games ADD COLUMN skill_ceiling INTEGER DEFAULT 0",
    "ALTER TABLE games ADD COLUMN duration INTEGER DEFAULT 0",
    "ALTER TABLE games ADD COLUMN pace INTEGER DEFAULT 0",
    "ALTER TABLE games ADD COLUMN salt_level INTEGER DEFAULT 0",
    "ALTER TABLE games ADD COLUMN metascore INTEGER",
]

def migrate(db):
    for sql in MIGRATIONS:
        try:
            db.execute(sql)
            print(f"  ✓ {sql}")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e):
                pass  # already exists, skip silently
            else:
                raise

# ── Game data ──────────────────────────────────────────────────
# Ratings are 1–5 (5 = highest)
#
# chaos        — how random/unpredictable the outcome is
# skill_ceiling — how much practice/skill separates players
# duration     — how long a single round takes (1=5min, 5=45min+)
# pace         — how fast-paced and action-heavy it feels moment to moment
# salt_level   — how likely someone is to rage (blue shells, RNG, etc.)
#
# eval_mode: "placement" | "elimination" | "score" | "coop"
# team_game: 1 if best played as 2v2

GAMES = [
    # ── PC ────────────────────────────────────────────────────
    {
        "name": "Keep Talking and Nobody Explodes",
        "console": "pc",
        "year": 2015,
        "eval_mode": "coop",
        "min_players": 2,
        "max_players": 6,
        "team_game": 1,
        "image_path": "/static/images/keep-talking.jpg",
        "notes": "Asymmetric co-op. One player defuses, others read manual. Best as a team round.",
        "chaos": 3,
        "skill_ceiling": 4,
        "duration": 1,
        "pace": 5,
        "salt_level": 3,
        "metascore": 88,
    },
    {
        "name": "What the Rock",
        "console": "pc",
        "year": 2023,
        "eval_mode": "elimination",
        "min_players": 2,
        "max_players": 8,
        "team_game": 0,
        "image_path": "/static/images/what-the-rock.jpg",
        "notes": "Rock-paper-scissors party game with creative items.",
        "chaos": 5,
        "skill_ceiling": 1,
        "duration": 1,
        "pace": 4,
        "salt_level": 4,
        "metascore": None,
    },
    {
        "name": "GeoGuessr",
        "console": "pc",
        "year": 2013,
        "eval_mode": "score",
        "min_players": 2,
        "max_players": 4,
        "team_game": 0,
        "image_path": "/static/images/geoguessr.jpg",
        "notes": "Use Battle Royale Countries mode for tournament play. 2min time limit recommended.",
        "chaos": 2,
        "skill_ceiling": 5,
        "duration": 1,
        "pace": 2,
        "salt_level": 1,
        "metascore": None,
    },
    # ── GameCube ───────────────────────────────────────────────
    {
        "name": "Super Smash Bros. Melee",
        "console": "gamecube",
        "year": 2001,
        "eval_mode": "elimination",
        "min_players": 2,
        "max_players": 4,
        "team_game": 0,
        "image_path": "/static/images/ssb-melee.jpg",
        "notes": "3 stock, 8 min, items off. Runs on Wii via homebrew.",
        "chaos": 2,
        "skill_ceiling": 5,
        "duration": 2,
        "pace": 5,
        "salt_level": 3,
        "metascore": 92,
    },
    {
        "name": "Mario Kart: Double Dash",
        "console": "gamecube",
        "year": 2003,
        "eval_mode": "placement",
        "min_players": 2,
        "max_players": 4,
        "team_game": 1,
        "image_path": "/static/images/mkdd.jpg",
        "notes": "2 players per kart — natural 2v2. 150cc, 3 races.",
        "chaos": 4,
        "skill_ceiling": 3,
        "duration": 2,
        "pace": 4,
        "salt_level": 4,
        "metascore": 87,
    },
    # ── Wii ───────────────────────────────────────────────────
    {
        "name": "Super Smash Bros. Brawl",
        "console": "wii",
        "year": 2008,
        "eval_mode": "elimination",
        "min_players": 2,
        "max_players": 4,
        "team_game": 0,
        "image_path": "/static/images/ssb-brawl.jpg",
        "notes": "3 stock, 8 min, items off. Random tripping can cause salt.",
        "chaos": 3,
        "skill_ceiling": 4,
        "duration": 2,
        "pace": 5,
        "salt_level": 4,
        "metascore": 93,
    },
    {
        "name": "Wii Sports",
        "console": "wii",
        "year": 2006,
        "eval_mode": "score",
        "min_players": 2,
        "max_players": 4,
        "team_game": 0,
        "image_path": "/static/images/wii-sports.jpg",
        "notes": "Pick one sport per round (Tennis, Golf, Bowling, Boxing). Bowling recommended for fairness.",
        "chaos": 3,
        "skill_ceiling": 2,
        "duration": 1,
        "pace": 3,
        "salt_level": 2,
        "metascore": 76,
    },
    {
        "name": "Wii Sports Resort",
        "console": "wii",
        "year": 2009,
        "eval_mode": "score",
        "min_players": 2,
        "max_players": 4,
        "team_game": 0,
        "image_path": "/static/images/wii-sports-resort.jpg",
        "notes": "Swordplay Duel or Basketball recommended for tournaments.",
        "chaos": 3,
        "skill_ceiling": 3,
        "duration": 1,
        "pace": 4,
        "salt_level": 2,
        "metascore": 83,
    },
    {
        "name": "Mario Kart Wii",
        "console": "wii",
        "year": 2008,
        "eval_mode": "placement",
        "min_players": 2,
        "max_players": 4,
        "team_game": 0,
        "image_path": "/static/images/mkwii.jpg",
        "notes": "150cc, 4 races, normal items. Blue shells will cause suffering.",
        "chaos": 5,
        "skill_ceiling": 3,
        "duration": 2,
        "pace": 4,
        "salt_level": 5,
        "metascore": 82,
    },
    {
        "name": "New Super Mario Bros. Wii",
        "console": "wii",
        "year": 2009,
        "eval_mode": "score",
        "min_players": 2,
        "max_players": 4,
        "team_game": 0,
        "image_path": "/static/images/nsmb-wii.jpg",
        "notes": "Coin Battle mode for competitive play. Cooperation is optional and unwise.",
        "chaos": 4,
        "skill_ceiling": 3,
        "duration": 2,
        "pace": 4,
        "salt_level": 5,
        "metascore": 87,
    },
    {
        "name": "Mario Party 8",
        "console": "wii",
        "year": 2007,
        "eval_mode": "placement",
        "min_players": 2,
        "max_players": 4,
        "team_game": 0,
        "image_path": "/static/images/mario-party-8.jpg",
        "notes": "Long session game. Use Mini-Game Mode for quick tournament rounds.",
        "chaos": 5,
        "skill_ceiling": 1,
        "duration": 5,
        "pace": 2,
        "salt_level": 5,
        "metascore": 62,
    },
    {
        "name": "Mario & Sonic at the Olympic Games",
        "console": "wii",
        "year": 2007,
        "eval_mode": "placement",
        "min_players": 2,
        "max_players": 4,
        "team_game": 0,
        "image_path": "/static/images/mario-sonic-olympic.jpg",
        "notes": "Pick 2-3 events per round. 100m Sprint always causes chaos.",
        "chaos": 3,
        "skill_ceiling": 2,
        "duration": 1,
        "pace": 4,
        "salt_level": 2,
        "metascore": 66,
    },
    {
        "name": "Mario & Sonic at the Olympic Winter Games",
        "console": "wii",
        "year": 2009,
        "eval_mode": "placement",
        "min_players": 2,
        "max_players": 4,
        "team_game": 0,
        "image_path": "/static/images/mario-sonic-winter.jpg",
        "notes": "Skiing and snowboard events recommended. Dream events are wilder.",
        "chaos": 3,
        "skill_ceiling": 2,
        "duration": 1,
        "pace": 4,
        "salt_level": 2,
        "metascore": 73,
    },
    {
        "name": "Mario Strikers Charged Football",
        "console": "wii",
        "year": 2007,
        "eval_mode": "score",
        "min_players": 2,
        "max_players": 4,
        "team_game": 1,
        "image_path": "/static/images/mario-strikers.jpg",
        "notes": "2v2 works great with Double Dash-style team assignment. 3 min matches.",
        "chaos": 3,
        "skill_ceiling": 4,
        "duration": 1,
        "pace": 5,
        "salt_level": 4,
        "metascore": 79,
    },
    {
        "name": "Just Dance 3",
        "console": "wii",
        "year": 2011,
        "eval_mode": "score",
        "min_players": 1,
        "max_players": 4,
        "team_game": 0,
        "image_path": "/static/images/just-dance-3.jpg",
        "notes": "High energy dance-off. Score-based competition.",
        "chaos": 2,          # Fixed moves, but motion tracking variance
        "skill_ceiling": 3,  # Learning the choreography
        "duration": 1,       # One song is ~4 mins
        "pace": 4,           # Physically active
        "salt_level": 2,     # Fun-focused; low salt
        "metascore": 74,     #
    },
    # ── Switch ─────────────────────────────────────────────────
    {
        "name": "Mario Kart 8 Deluxe",
        "console": "switch",
        "year": 2017,
        "eval_mode": "placement",
        "min_players": 2,
        "max_players": 4,
        "team_game": 0,
        "image_path": "/static/images/mk8d.jpg",
        "notes": "150cc, 4 races. The definitive version. Still has blue shells.",
        "chaos": 4,
        "skill_ceiling": 3,
        "duration": 2,
        "pace": 4,
        "salt_level": 4,
        "metascore": 92,
    },
    # ── PS4 ───────────────────────────────────────────────────
    {
        "name": "Overcooked",
        "console": "ps4",
        "year": 2016,
        "eval_mode": "score",
        "min_players": 2,
        "max_players": 4,
        "team_game": 1,
        "image_path": "/static/images/overcooked.jpg",
        "notes": "2v2 team round. Score the restaurant rating after each level.",
        "chaos": 3,
        "skill_ceiling": 3,
        "duration": 2,
        "pace": 5,
        "salt_level": 4,
        "metascore": 83,
    },
    {
        "name": "TowerFall Ascension",
        "console": "ps4",
        "year": 2014,
        "eval_mode": "elimination",
        "min_players": 2,
        "max_players": 4,
        "team_game": 0,
        "image_path": "/static/images/towerfall.jpg",
        "notes": "First to 10 kills. One of the best couch multiplayer games ever made.",
        "chaos": 2,
        "skill_ceiling": 4,
        "duration": 1,
        "pace": 5,
        "salt_level": 3,
        "metascore": 90,
    },
    {
        "name": "Ultimate Chicken Horse",
        "console": "ps4",
        "year": 2016,
        "eval_mode": "score",
        "min_players": 2,
        "max_players": 4,
        "team_game": 0,
        "image_path": "/static/images/uch.jpg",
        "notes": "Points per round. Trap placement adds creative chaos. 5 rounds recommended.",
        "chaos": 4,
        "skill_ceiling": 3,
        "duration": 2,
        "pace": 4,
        "salt_level": 3,
        "metascore": 80,
    },
    {
        "name": "Gang Beasts",
        "console": "ps4",
        "year": 2017,
        "eval_mode": "elimination",
        "min_players": 2,
        "max_players": 4,
        "team_game": 0,
        "image_path": "/static/images/gang-beasts.jpg",
        "notes": "Last player standing wins the round. Pure chaos, physics-based.",
        "chaos": 5,
        "skill_ceiling": 2,
        "duration": 1,
        "pace": 4,
        "salt_level": 3,
        "metascore": 67,
    },
    {
        "name": "Golf With Your Friends",
        "console": "ps4",
        "year": 2020,
        "eval_mode": "score",
        "min_players": 2,
        "max_players": 4,
        "team_game": 0,
        "image_path": "/static/images/golf-with-friends.jpg",
        "notes": "Fewest strokes wins. Forest or Totem course recommended. 9 holes.",
        "chaos": 3,
        "skill_ceiling": 3,
        "duration": 3,
        "pace": 2,
        "salt_level": 2,
        "metascore": 74,
    },
    {
        "name": "Unrailed!",
        "console": "ps4",
        "year": 2020,
        "eval_mode": "coop",
        "min_players": 2,
        "max_players": 4,
        "team_game": 1,
        "image_path": "/static/images/unrailed.jpg",
        "notes": "2v2 team round. Score = distance reached before crash.",
        "chaos": 4,
        "skill_ceiling": 3,
        "duration": 2,
        "pace": 5,
        "salt_level": 4,
        "metascore": 80,
    },
    {
        "name": "Shellshock Live",
        "console": "ps4",
        "year": 2020,
        "eval_mode": "elimination",
        "min_players": 2,
        "max_players": 4,
        "team_game": 0,
        "image_path": "/static/images/shellshock.jpg",
        "notes": "Last tank surviving wins. Upgrade choices add strategic depth.",
        "chaos": 4,
        "skill_ceiling": 3,
        "duration": 2,
        "pace": 3,
        "salt_level": 3,
        "metascore": None,
    },
    {
        "name": "Move or Die",
        "console": "ps4",
        "year": 2016,
        "eval_mode": "elimination",
        "min_players": 2,
        "max_players": 4,
        "team_game": 0,
        "image_path": "/static/images/move-or-die.jpg",
        "notes": "Random minigames each round. Fastest pace on the list.",
        "chaos": 5,
        "skill_ceiling": 2,
        "duration": 1,
        "pace": 5,
        "salt_level": 3,
        "metascore": 78,
    },
    {
        "name": "Human: Fall Flat",
        "console": "ps4",
        "year": 2016,
        "eval_mode": "coop",
        "min_players": 2,
        "max_players": 4,
        "team_game": 1,
        "image_path": "/static/images/human-fall-flat.jpg",
        "notes": "2v2 race through levels. First team to finish wins the round.",
        "chaos": 5,
        "skill_ceiling": 1,
        "duration": 3,
        "pace": 2,
        "salt_level": 3,
        "metascore": 72,
    },
    {
        "name": "Moving Out",
        "console": "ps4",
        "year": 2020,
        "eval_mode": "score",
        "min_players": 2,
        "max_players": 4,
        "team_game": 1,
        "image_path": "/static/images/moving-out.jpg",
        "notes": "2v2 team. Score = items moved in time limit. Chaos ensues.",
        "chaos": 4,
        "skill_ceiling": 2,
        "duration": 1,
        "pace": 4,
        "salt_level": 2,
        "metascore": 80,
    },
    {
        "name": "Gran Turismo 7",
        "console": "ps4",
        "year": 2022,
        "eval_mode": "placement",
        "min_players": 2,
        "max_players": 4,
        "team_game": 0,
        "image_path": "/static/images/gt7.jpg",
        "notes": "Split-screen only. Pick same car class. 3 laps on a classic circuit.",
        "chaos": 1,
        "skill_ceiling": 5,
        "duration": 2,
        "pace": 3,
        "salt_level": 2,
        "metascore": 87,
    },
    {
        'name': 'Tricky Towers',
        'console': 'ps4',
        'year': 2016,
        'eval_mode': 'placement',
        'min_players': 1,
        'max_players': 4,
        'team_game': False,
        'image_path': 'img/games/tricky_towers.png',
        'notes': 'Tetris with physics; incredibly frustrating when the tower collapses.',
        'chaos': 4,          # Physics-based randomness
        'skill_ceiling': 3,  # Balance and piece management
        'duration': 1,       # Quick 5-minute rounds
        'pace': 3,           # Steady building until panic sets in
        'salt_level': 4,     # High frustration when physics fail you
        'metascore': 80      #
    },
    {
        'name': 'Celeste',
        'console': 'ps4',
        'year': 2018,
        'eval_mode': 'placement',
        'min_players': 1,
        'max_players': 1,
        'team_game': False,
        'image_path': 'img/games/celeste.png',
        'notes': 'Precision platformer often used for speedrun races.',
        'chaos': 1,          # Purely deterministic movement
        'skill_ceiling': 5,  # Extremely high precision required
        'duration': 2,       # Individual chapters vary in length
        'pace': 4,           # Fast-paced dashing and movement
        'salt_level': 3,     # Hard but fair; "honest" deaths
        'metascore': 91      #
    },
    {
        'name': 'SpeedRunners',
        'console': 'ps4',
        'year': 2017,
        'eval_mode': 'elimination',
        'min_players': 1,
        'max_players': 4,
        'team_game': False,
        'image_path': 'img/games/speedrunners.png',
        'notes': 'Competitive 2D racing where falling off the screen eliminates you.',
        'chaos': 3,          # Power-ups and weapons add variance
        'skill_ceiling': 4,  # Map memorization and grappling hooks
        'duration': 1,       # Rounds are extremely fast
        'pace': 5,           # Very high speed and adrenaline
        'salt_level': 4,     # High salt when getting grappled at the finish
        'metascore': 71      #
    },
]

# ── Main ───────────────────────────────────────────────────────

def seed(reset=False):
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row

    print("Running migrations...")
    migrate(conn)
    conn.commit()

    if reset:
        print("Resetting games table...")
        conn.execute("DELETE FROM games")
        conn.commit()

    print(f"\nInserting {len(GAMES)} games...")
    inserted = 0
    skipped = 0

    for g in GAMES:
        existing = conn.execute(
            "SELECT id FROM games WHERE name = ? AND console = ?",
            (g["name"], g["console"])
        ).fetchone()

        if existing and not reset:
            print(f"  ~ skipped (already exists): {g['name']}")
            skipped += 1
            continue

        conn.execute("""
            INSERT INTO games (
                name, console, year, eval_mode,
                min_players, max_players, team_game,
                image_path, notes,
                chaos, skill_ceiling, duration, pace, salt_level,
                metascore
            ) VALUES (
                :name, :console, :year, :eval_mode,
                :min_players, :max_players, :team_game,
                :image_path, :notes,
                :chaos, :skill_ceiling, :duration, :pace, :salt_level,
                :metascore
            )
        """, g)
        print(f"  ✓ {g['console'].upper():10} {g['name']}")
        inserted += 1

    conn.commit()
    conn.close()

    print(f"\nDone. {inserted} inserted, {skipped} skipped.")
    print("\nMetacritic scores used:")
    print("  SSB Melee: 92 | SSB Brawl: 93 | MK: Double Dash: 87")
    print("  MK Wii: 82 | MK 8 Deluxe: 92 | Wii Sports: 76")
    print("  Wii Sports Resort: 83 | NSMB Wii: 87 | Mario Party 8: 62")
    print("  Mario Strikers Charged: 79 | M&S Olympics: 66 | M&S Winter: 73")
    print("  TowerFall: 90 | UCH: 80 | Overcooked: 83 | GT7: 87")
    print("  Heave Ho: 79 | Golf With Your Friends: 74 | Gang Beasts: 67")
    print("  Moving Out: 80 | Unrailed: 80 | Move or Die: 78 | Human: Fall Flat: 72")
    print("  Keep Talking: 88 | GeoGuessr/What the Rock/RV There Yet/Shellshock: N/A")

if __name__ == "__main__":
    reset = "--reset" in sys.argv
    seed(reset=reset)
