CREATE TABLE IF NOT EXISTS finger_config (
  finger INTEGER PRIMARY KEY CHECK (finger BETWEEN 1 AND 5),
  base_message TEXT NOT NULL,
  en TEXT NOT NULL,
  ta TEXT NOT NULL,
  te TEXT NOT NULL,
  ml TEXT NOT NULL,
  hi TEXT NOT NULL,
  is_emergency INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  finger INTEGER NOT NULL,
  base_message TEXT NOT NULL,
  en TEXT NOT NULL,
  ta TEXT NOT NULL,
  te TEXT NOT NULL,
  ml TEXT NOT NULL,
  hi TEXT NOT NULL,
  is_emergency INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_id ON events(id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

INSERT OR IGNORE INTO finger_config
(finger, base_message, en, ta, te, ml, hi, is_emergency)
VALUES (
  1,
  'I need food',
  'I need food',
  CAST(X'e0ae8ee0aea9e0ae95e0af8de0ae95e0af8120e0ae89e0aea3e0aeb5e0af8120e0aeb5e0af87e0aea3e0af8de0ae9fe0af81e0aeaee0af8d' AS TEXT),
  CAST(X'e0b0a8e0b0bee0b095e0b18120e0b086e0b0b9e0b0bee0b0b0e0b08220e0b095e0b0bee0b0b5e0b0bee0b0b2e0b0bf' AS TEXT),
  CAST(X'e0b48ee0b4a8e0b4bfe0b495e0b58de0b495e0b58d20e0b4ade0b495e0b58de0b4b7e0b4a3e0b48220e0b4b5e0b587e0b4a3e0b482' AS TEXT),
  CAST(X'e0a4aee0a581e0a49de0a58720e0a496e0a4bee0a4a8e0a4be20e0a49ae0a4bee0a4b9e0a4bfe0a48f' AS TEXT),
  0
);

INSERT OR IGNORE INTO finger_config
(finger, base_message, en, ta, te, ml, hi, is_emergency)
VALUES (
  2,
  'I need water',
  'I need water',
  CAST(X'e0ae8ee0aea9e0ae95e0af8de0ae95e0af8120e0aea4e0aea3e0af8de0aea3e0af80e0aeb0e0af8d20e0aeb5e0af87e0aea3e0af8de0ae9fe0af81e0aeaee0af8d' AS TEXT),
  CAST(X'e0b0a8e0b0bee0b095e0b18120e0b0a8e0b180e0b0b0e0b18120e0b095e0b0bee0b0b5e0b0bee0b0b2e0b0bf' AS TEXT),
  CAST(X'e0b48ee0b4a8e0b4bfe0b495e0b58de0b495e0b58d20e0b4b5e0b586e0b4b3e0b58de0b4b3e0b48220e0b4b5e0b587e0b4a3e0b482' AS TEXT),
  CAST(X'e0a4aee0a581e0a49de0a58720e0a4aae0a4bee0a4a8e0a58020e0a49ae0a4bee0a4b9e0a4bfe0a48f' AS TEXT),
  0
);

INSERT OR IGNORE INTO finger_config
(finger, base_message, en, ta, te, ml, hi, is_emergency)
VALUES (
  3,
  'I need medicine',
  'I need medicine',
  CAST(X'e0ae8ee0aea9e0ae95e0af8de0ae95e0af8120e0aeaee0aeb0e0af81e0aea8e0af8de0aea4e0af8120e0aeb5e0af87e0aea3e0af8de0ae9fe0af81e0aeaee0af8d' AS TEXT),
  CAST(X'e0b0a8e0b0bee0b095e0b18120e0b0aee0b082e0b0a6e0b18120e0b095e0b0bee0b0b5e0b0bee0b0b2e0b0bf' AS TEXT),
  CAST(X'e0b48ee0b4a8e0b4bfe0b495e0b58de0b495e0b58d20e0b4aee0b4b0e0b581e0b4a8e0b58de0b4a8e0b58d20e0b4b5e0b587e0b4a3e0b482' AS TEXT),
  CAST(X'e0a4aee0a581e0a49de0a58720e0a4a6e0a4b5e0a4be20e0a49ae0a4bee0a4b9e0a4bfe0a48f' AS TEXT),
  0
);

INSERT OR IGNORE INTO finger_config
(finger, base_message, en, ta, te, ml, hi, is_emergency)
VALUES (
  4,
  'I need help',
  'I need help',
  CAST(X'e0ae8ee0aea9e0ae95e0af8de0ae95e0af8120e0ae89e0aea4e0aeb5e0aebf20e0aeb5e0af87e0aea3e0af8de0ae9fe0af81e0aeaee0af8d' AS TEXT),
  CAST(X'e0b0a8e0b0bee0b095e0b18120e0b0b8e0b0b9e0b0bee0b0afe0b08220e0b095e0b0bee0b0b5e0b0bee0b0b2e0b0bf' AS TEXT),
  CAST(X'e0b48ee0b4a8e0b4bfe0b495e0b58de0b495e0b58d20e0b4b8e0b4b9e0b4bee0b4afe0b48220e0b4b5e0b587e0b4a3e0b482' AS TEXT),
  CAST(X'e0a4aee0a581e0a49de0a58720e0a4aee0a4a6e0a4a620e0a49ae0a4bee0a4b9e0a4bfe0a48f' AS TEXT),
  0
);

INSERT OR IGNORE INTO finger_config
(finger, base_message, en, ta, te, ml, hi, is_emergency)
VALUES (
  5,
  'Emergency',
  'Emergency',
  CAST(X'e0ae85e0aeb5e0ae9ae0aeb020e0aea8e0aebfe0aeb2e0af88' AS TEXT),
  CAST(X'e0b085e0b0a4e0b18de0b0afe0b0b5e0b0b8e0b0b020e0b0aae0b0b0e0b0bfe0b0b8e0b18de0b0a5e0b0bfe0b0a4e0b0bf' AS TEXT),
  CAST(X'e0b485e0b49fe0b4bfe0b4afe0b4a8e0b58de0b4a4e0b4b0e0b4bee0b4b5e0b4b8e0b58de0b4a5' AS TEXT),
  CAST(X'e0a486e0a4aae0a4bee0a4a4e0a495e0a4bee0a4b2' AS TEXT),
  1
);
