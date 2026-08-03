-- FIBA Oyunları — Online Satranç & Tavla turnuva şeması

CREATE TABLE IF NOT EXISTS participants (
  id           SERIAL PRIMARY KEY,
  full_name    TEXT NOT NULL,
  email        TEXT NOT NULL,
  company      TEXT,                          -- iştirak/şirket
  game         TEXT NOT NULL CHECK (game IN ('chess', 'tavla')),
  bracket_size INT  NOT NULL CHECK (bracket_size IN (8, 16, 32, 64)),
  token        TEXT NOT NULL UNIQUE,          -- iç kullanım (join yönlendirmesi imzası)
  password     TEXT,                          -- admin'in dağıttığı giriş parolası (otomatik üretilir)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (email, game)                        -- aynı kişi aynı oyuna bir kez; satranç+tavla ikisine ayrı kayıt
);

CREATE TABLE IF NOT EXISTS tournaments (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  game         TEXT NOT NULL CHECK (game IN ('chess', 'tavla')),
  bracket_size INT  NOT NULL CHECK (bracket_size IN (8, 16, 32, 64)),
  status       TEXT NOT NULL DEFAULT 'draft'  -- draft | drawn | running | finished
               CHECK (status IN ('draft', 'drawn', 'running', 'finished')),
  starts_at    TIMESTAMPTZ,                   -- 1. turun başlangıç saati
  round_interval_hours INT NOT NULL DEFAULT 24, -- her tur bir öncekinden kaç saat sonra
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS matches (
  id            SERIAL PRIMARY KEY,
  tournament_id INT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round         INT NOT NULL,                 -- 1 = ilk tur
  slot          INT NOT NULL,                 -- tur içindeki sıra (0'dan başlar); kazanan round+1, slot/2'ye gider
  p1_id         INT REFERENCES participants(id),
  p2_id         INT REFERENCES participants(id),
  status        TEXT NOT NULL DEFAULT 'pending'
                -- pending: rakip(ler) belli değil ya da randevu bekliyor
                -- scheduled: saat verildi, link üretilmedi
                -- live: link üretildi / oyun oynanıyor
                -- done: sonuç işlendi
                CHECK (status IN ('pending', 'scheduled', 'live', 'done')),
  scheduled_at  TIMESTAMPTZ,                  -- randevu saati (1 saatlik pencere buradan başlar)
  game_id       TEXT,                         -- Lichess oyun id'si / bgammon maç kimliği
  game_url      TEXT,                         -- izleyici linki
  p1_url        TEXT,                         -- oyuncu 1'e gönderilen link (satrançta beyaz)
  p2_url        TEXT,
  p1_joined_at  TIMESTAMPTZ,                  -- "Maça katıl" tıklaması (no-show tespiti için)
  p2_joined_at  TIMESTAMPTZ,
  rematch_count INT NOT NULL DEFAULT 0,       -- beraberlik sonrası otomatik rövanş sayacı
  room_password TEXT,                         -- tavla: bgammon özel oda parolası
  winner_id     INT REFERENCES participants(id),
  result_via    TEXT CHECK (result_via IN ('auto', 'admin', 'forfeit')),
  result_detail TEXT,                         -- mate, resign, outoftime, hükmen nedeni...
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, round, slot)
);

CREATE TABLE IF NOT EXISTS admins (
  id         SERIAL PRIMARY KEY,
  full_name  TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  password   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- İlk yönetici (girişten sonra panelden yenilerini ekleyip bunu silebilirsiniz)
INSERT INTO admins (full_name, email, password) VALUES ('Deniz', 'admin@fiba.com', 'fiba2026')
ON CONFLICT (email) DO NOTHING;

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT INTO settings (key, value) VALUES
  ('chess_clock_limit', '600'),
  ('chess_clock_increment', '5'),
  ('tavla_points', '3')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS audit_log (
  id         SERIAL PRIMARY KEY,
  actor      TEXT NOT NULL,                   -- şimdilik 'admin'; çoklu admin gelirse kullanıcı adı
  action     TEXT NOT NULL,
  detail     JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id, round);
CREATE INDEX IF NOT EXISTS idx_matches_live ON matches(status) WHERE status = 'live';
