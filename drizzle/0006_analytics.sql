CREATE TABLE analytics_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  revision TEXT NOT NULL DEFAULT 'initial'
);
INSERT INTO analytics_config (id, enabled) VALUES (1, 1);

CREATE TABLE analytics_counts (
  day TEXT NOT NULL,
  hour INTEGER NOT NULL CHECK (hour BETWEEN 0 AND 23),
  event TEXT NOT NULL,
  page TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT '',
  from_page TEXT NOT NULL DEFAULT '',
  device TEXT NOT NULL,
  source TEXT NOT NULL,
  total INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (day, hour, event, page, target, from_page, device, source)
) WITHOUT ROWID;
CREATE INDEX analytics_counts_day_event ON analytics_counts (event, day);
