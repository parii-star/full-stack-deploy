-- Monthly expenditure app schema

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  month TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  category TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expenses_month ON expenses(month);
