export const MIGRATIONS: string[] = [
  // v1 — schéma initial
  `
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS exercises (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    name                 TEXT    NOT NULL,
    type                 TEXT    NOT NULL CHECK(type IN ('musculation', 'etirement', 'cardio')),
    muscle_groups        TEXT    NOT NULL DEFAULT '[]',
    technical_notes      TEXT,
    is_custom            INTEGER NOT NULL DEFAULT 0,
    progression_step     REAL    NOT NULL DEFAULT 2.0,
    progression_threshold INTEGER NOT NULL DEFAULT 1,
    created_at           TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS programs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    description TEXT,
    is_active   INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS workouts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    program_id  INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    name        TEXT    NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS workout_exercises (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id         INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id        INTEGER NOT NULL REFERENCES exercises(id),
    order_index        INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS blocks (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_exercise_id   INTEGER NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
    name                  TEXT    NOT NULL,
    order_index           INTEGER NOT NULL DEFAULT 0,
    is_work_block         INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS sets (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    block_id      INTEGER NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    reps_min      INTEGER NOT NULL,
    reps_max      INTEGER NOT NULL,
    weight        REAL,
    weight_type   TEXT    NOT NULL DEFAULT 'fixed' CHECK(weight_type IN ('fixed', 'bodyweight', 'bar')),
    rest_duration INTEGER NOT NULL DEFAULT 120,
    order_index   INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS session_logs (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id       INTEGER NOT NULL REFERENCES workouts(id),
    started_at       TEXT    NOT NULL,
    ended_at         TEXT,
    checkin_energy   INTEGER CHECK(checkin_energy   BETWEEN 1 AND 3),
    checkin_fatigue  INTEGER CHECK(checkin_fatigue  BETWEEN 1 AND 3),
    checkin_sleep    INTEGER CHECK(checkin_sleep    BETWEEN 1 AND 3),
    notes            TEXT
  );

  CREATE TABLE IF NOT EXISTS set_logs (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    session_log_id   INTEGER NOT NULL REFERENCES session_logs(id) ON DELETE CASCADE,
    set_id           INTEGER NOT NULL REFERENCES sets(id),
    exercise_id      INTEGER NOT NULL REFERENCES exercises(id),
    reps_done        INTEGER NOT NULL,
    weight_done      REAL    NOT NULL,
    rpe              INTEGER CHECK(rpe BETWEEN 1 AND 10),
    completed_at     TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS personal_records (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_id     INTEGER NOT NULL REFERENCES exercises(id),
    weight          REAL    NOT NULL,
    reps            INTEGER NOT NULL,
    estimated_1rm   REAL    NOT NULL,
    achieved_at     TEXT    NOT NULL,
    session_log_id  INTEGER REFERENCES session_logs(id)
  );
  `,

  // v2 — fix missing ON DELETE CASCADE sur session_logs, set_logs, personal_records
  `
  CREATE TABLE session_logs_new (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id       INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    started_at       TEXT    NOT NULL,
    ended_at         TEXT,
    checkin_energy   INTEGER CHECK(checkin_energy   BETWEEN 1 AND 3),
    checkin_fatigue  INTEGER CHECK(checkin_fatigue  BETWEEN 1 AND 3),
    checkin_sleep    INTEGER CHECK(checkin_sleep    BETWEEN 1 AND 3),
    notes            TEXT
  );
  INSERT INTO session_logs_new SELECT * FROM session_logs;

  CREATE TABLE set_logs_new (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    session_log_id   INTEGER NOT NULL REFERENCES session_logs(id) ON DELETE CASCADE,
    set_id           INTEGER NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
    exercise_id      INTEGER NOT NULL REFERENCES exercises(id),
    reps_done        INTEGER NOT NULL,
    weight_done      REAL    NOT NULL,
    rpe              INTEGER CHECK(rpe BETWEEN 1 AND 10),
    completed_at     TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  INSERT INTO set_logs_new SELECT * FROM set_logs;

  CREATE TABLE personal_records_new (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_id     INTEGER NOT NULL REFERENCES exercises(id),
    weight          REAL    NOT NULL,
    reps            INTEGER NOT NULL,
    estimated_1rm   REAL    NOT NULL,
    achieved_at     TEXT    NOT NULL,
    session_log_id  INTEGER REFERENCES session_logs(id) ON DELETE SET NULL
  );
  INSERT INTO personal_records_new SELECT * FROM personal_records;

  DROP TABLE personal_records;
  DROP TABLE set_logs;
  DROP TABLE session_logs;

  ALTER TABLE session_logs_new RENAME TO session_logs;
  ALTER TABLE set_logs_new RENAME TO set_logs;
  ALTER TABLE personal_records_new RENAME TO personal_records;
  `,

  // v3 — support durée sur les séries (étirements/mobilité)
  `ALTER TABLE sets ADD COLUMN duration_seconds INTEGER;`,

  // v4 — cardio logging : durée et distance sur set_logs
  `ALTER TABLE set_logs ADD COLUMN duration_seconds INTEGER;`,
  `ALTER TABLE set_logs ADD COLUMN distance_meters REAL;`,

  // v5 — descriptions exercices
  `ALTER TABLE exercises ADD COLUMN description TEXT;`,

  // v6 — weight_ratio pour blocs Back-off
  `ALTER TABLE sets ADD COLUMN weight_ratio REAL;`,

  // v7 — template_id pour traçabilité des programmes importés
  `ALTER TABLE programs ADD COLUMN template_id TEXT;`,

  // v8 — pause séance : position persistée + statut cycle de vie
  `
  ALTER TABLE session_logs ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('active', 'paused', 'completed', 'abandoned'));
  ALTER TABLE session_logs ADD COLUMN paused_position TEXT;
  `,

  // v9 — suppression reps_max : cibles fixes uniquement (reps_min = cible canonique)
  `
  CREATE TABLE sets_new (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    block_id         INTEGER NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    reps_min         INTEGER NOT NULL,
    weight           REAL,
    weight_type      TEXT NOT NULL DEFAULT 'fixed' CHECK(weight_type IN ('fixed', 'bodyweight', 'bar')),
    rest_duration    INTEGER NOT NULL DEFAULT 120,
    order_index      INTEGER NOT NULL DEFAULT 0,
    duration_seconds INTEGER,
    weight_ratio     REAL
  );
  INSERT INTO sets_new
    SELECT id, block_id, reps_min, weight, weight_type, rest_duration, order_index, duration_seconds, weight_ratio
    FROM sets;
  DROP TABLE sets;
  ALTER TABLE sets_new RENAME TO sets;
  `,
];
