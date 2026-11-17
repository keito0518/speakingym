-- Apply ONLY to an isolated staging D1 database for the Monsters semantic grader.
-- Never run against speakingym-plans (production) or speakingym-plans-staging (billing tests).
CREATE TABLE IF NOT EXISTS monsters_grader_usage (
  uid TEXT NOT NULL,
  day TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0 CHECK (used >= 0),
  PRIMARY KEY (uid, day)
);
CREATE INDEX IF NOT EXISTS idx_monsters_grader_usage_day ON monsters_grader_usage(day);
