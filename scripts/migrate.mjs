/**
 * Standalone migration script — no drizzle-kit required.
 * Creates all tables (idempotent: safe to run on every deploy).
 * Usage: node scripts/migrate.mjs
 */
import pg from "pg";

const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is required.");
  process.exit(1);
}

const client = new Client({ connectionString: DATABASE_URL });

const SQL = `
-- leagues must exist before matches (FK dependency)
CREATE TABLE IF NOT EXISTS leagues (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  country      TEXT NOT NULL,
  country_flag TEXT,
  logo         TEXT
);

CREATE TABLE IF NOT EXISTS matches (
  id                         TEXT PRIMARY KEY,
  home_team                  TEXT NOT NULL,
  away_team                  TEXT NOT NULL,
  home_team_logo             TEXT,
  away_team_logo             TEXT,
  league_id                  TEXT NOT NULL REFERENCES leagues(id),
  league                     TEXT NOT NULL,
  country                    TEXT NOT NULL,
  country_flag               TEXT,
  match_date                 TEXT NOT NULL,
  match_time                 TEXT NOT NULL,
  status                     TEXT NOT NULL DEFAULT 'upcoming',
  home_score                 INTEGER,
  away_score                 INTEGER,
  home_win_odds              REAL NOT NULL,
  draw_odds                  REAL NOT NULL,
  away_win_odds              REAL NOT NULL,
  confidence_score           REAL NOT NULL,
  prediction                 TEXT NOT NULL,
  prediction_label           TEXT NOT NULL,
  value_rating               REAL NOT NULL,
  is_hot                     BOOLEAN NOT NULL DEFAULT FALSE,
  home_team_form             TEXT,
  away_team_form             TEXT,
  home_recent_goals_scored   REAL,
  home_recent_goals_conceded REAL,
  away_recent_goals_scored   REAL,
  away_recent_goals_conceded REAL,
  home_win_probability       REAL,
  draw_probability           REAL,
  away_win_probability       REAL,
  btts_prob                  REAL,
  over25_prob                REAL,
  expected_home_goals        REAL,
  expected_away_goals        REAL,
  head_to_head               JSONB,
  analysis_notes             JSONB,
  home_away_record           TEXT,
  away_home_record           TEXT,
  created_at                 TIMESTAMP DEFAULT NOW(),
  updated_at                 TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bet_of_the_day (
  id                  TEXT PRIMARY KEY,
  generated_at        TIMESTAMP DEFAULT NOW(),
  total_odds          REAL NOT NULL,
  average_confidence  REAL NOT NULL,
  selections          JSONB NOT NULL,
  analysis_note       TEXT NOT NULL,
  date                TEXT NOT NULL
);
`;

async function run() {
  console.log("Running database migrations…");
  await client.connect();
  try {
    await client.query(SQL);
    console.log("Migrations complete — all tables are ready.");
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
