-- ChainCanvas / ChainReaction Database Schema (PostgreSQL / Neon)
-- Run in the Neon SQL editor. This script is idempotent where practical.
-- If re-running, drop statements for types/tables may be needed; remove those cautiously
-- Extensions -----------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS citext;

-- Enum Types ------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'game_status') THEN
    CREATE TYPE game_status AS ENUM ('active','auction','settled','cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'turn_state') THEN
    CREATE TYPE turn_state AS ENUM ('pending','finalized','skipped','stolen');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'auction_status') THEN
    CREATE TYPE auction_status AS ENUM ('initialized','open','settling','settled','failed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'funding_action') THEN
    CREATE TYPE funding_action AS ENUM ('api_credit_purchase','swap','bridge','withdrawal','deposit');
  END IF;
END $$;

-- Users (Farcaster identities cached) ----------------------------------------

CREATE TABLE IF NOT EXISTS users (
  fid                BIGINT PRIMARY KEY,
  username           CITEXT UNIQUE,
  display_name       TEXT,
  pfp_url            TEXT,
  bio                TEXT,
  profile_last_refreshed_at TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users (last_seen_at);

-- Games (one per day or per session) -----------------------------------------

CREATE TABLE IF NOT EXISTS games (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_date           DATE UNIQUE,              -- Optional: daily game uniqueness
  creator_fid        BIGINT REFERENCES users(fid) ON UPDATE CASCADE ON DELETE SET NULL,
  seed_image_url     TEXT NOT NULL,
  seed_ipfs_cid      TEXT,                     -- Filled after pinning
  seed_prompt        TEXT,
  status             game_status NOT NULL DEFAULT 'active',
  current_turn       SMALLINT NOT NULL DEFAULT 1,
  max_turns          SMALLINT NOT NULL DEFAULT 10 CHECK (max_turns > 0),
  expiry_timestamp   TIMESTAMPTZ,              -- Active turn expiry
  auction_id         UUID UNIQUE,              -- Will reference auctions.id once created
  treasury_address   TEXT,                     -- Destination for funds
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT games_expiry_required CHECK (
    (status <> 'active') OR (expiry_timestamp IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_games_status ON games (status);
CREATE INDEX IF NOT EXISTS idx_games_expiry ON games (expiry_timestamp);
CREATE INDEX IF NOT EXISTS idx_games_current_turn ON games (current_turn);

-- Turns (image evolution chain) ----------------------------------------------

CREATE TABLE IF NOT EXISTS turns (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id             UUID NOT NULL REFERENCES games(id) ON UPDATE CASCADE ON DELETE CASCADE,
  turn_number         SMALLINT NOT NULL CHECK (turn_number >= 1),
  editor_fid          BIGINT REFERENCES users(fid) ON UPDATE CASCADE ON DELETE SET NULL,
  passed_to_fid       BIGINT REFERENCES users(fid) ON UPDATE CASCADE ON DELETE SET NULL,
  prompt_text         TEXT NOT NULL,
  image_url           TEXT,            -- Data URL or temp URL before pinning
  image_content_type  TEXT,
  image_size_bytes    INTEGER,
  ipfs_cid            TEXT,            -- Filled after pin
  venice_request_json JSONB,
  venice_response_json JSONB,
  state               turn_state NOT NULL DEFAULT 'pending',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalized_at        TIMESTAMPTZ,
  UNIQUE (game_id, turn_number),
  CONSTRAINT turns_finalization_rule CHECK (
    (state <> 'finalized') OR (finalized_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_turns_game_turn ON turns (game_id, turn_number);
CREATE INDEX IF NOT EXISTS idx_turns_editor ON turns (editor_fid);
CREATE INDEX IF NOT EXISTS idx_turns_state ON turns (state);
CREATE INDEX IF NOT EXISTS idx_turns_ipfs ON turns (ipfs_cid);

-- Images (optional normalization if you want separate asset tracking) --------

CREATE TABLE IF NOT EXISTS image_assets (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  turn_id          UUID REFERENCES turns(id) ON UPDATE CASCADE ON DELETE CASCADE,
  original_source  TEXT,            -- 'venice', 'manual', etc.
  original_url     TEXT,
  data_url_sha256  BYTEA,           -- SHA256 hash of base64 payload (for dedupe)
  ipfs_cid         TEXT,
  content_type     TEXT,
  size_bytes       INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pinned_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_image_assets_turn ON image_assets (turn_id);
CREATE INDEX IF NOT EXISTS idx_image_assets_ipfs ON image_assets (ipfs_cid);

-- Auctions (Zora or other protocol integration) ------------------------------

CREATE TABLE IF NOT EXISTS auctions (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id                UUID UNIQUE NOT NULL REFERENCES games(id) ON UPDATE CASCADE ON DELETE CASCADE,
  status                 auction_status NOT NULL DEFAULT 'initialized',
  chain_id               INTEGER NOT NULL DEFAULT 8453, -- Base mainnet
  contract_address       TEXT,
  token_id               NUMERIC,
  edition_count          INTEGER DEFAULT 1,
  metadata_ipfs_cid      TEXT,
  tx_create_hash         TEXT,
  tx_settle_hash         TEXT,
  started_at             TIMESTAMPTZ,
  ends_at                TIMESTAMPTZ,
  settled_at             TIMESTAMPTZ,
  highest_bid_amount_wei NUMERIC(78,0),
  highest_bidder_address TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT auction_time_order CHECK (
    (started_at IS NULL AND ends_at IS NULL) OR (started_at <= ends_at)
  )
);

CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions (status);
CREATE INDEX IF NOT EXISTS idx_auctions_chain ON auctions (chain_id);

-- Treasury & Funding Tracking -------------------------------------------------

CREATE TABLE IF NOT EXISTS treasury_wallets (
  address      TEXT PRIMARY KEY,
  label        TEXT,
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS funding_transactions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  treasury_address    TEXT REFERENCES treasury_wallets(address) ON UPDATE CASCADE ON DELETE SET NULL,
  chain_id            INTEGER NOT NULL DEFAULT 8453,
  tx_hash             TEXT,
  action              funding_action NOT NULL,
  amount_wei          NUMERIC(78,0),
  amount_usd_estimate NUMERIC(20,2),
  source_auction_id   UUID REFERENCES auctions(id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes               TEXT,
  status              TEXT, -- e.g., 'pending','confirmed','failed'
  UNIQUE (tx_hash)
);

CREATE INDEX IF NOT EXISTS idx_funding_treasury ON funding_transactions (treasury_address);
CREATE INDEX IF NOT EXISTS idx_funding_action ON funding_transactions (action);
CREATE INDEX IF NOT EXISTS idx_funding_created ON funding_transactions (created_at);

-- Invitations (user chosen for next edit) ------------------------------------

CREATE TABLE IF NOT EXISTS edit_invitations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id          UUID NOT NULL REFERENCES games(id) ON UPDATE CASCADE ON DELETE CASCADE,
  turn_number      SMALLINT NOT NULL,
  inviter_fid      BIGINT REFERENCES users(fid) ON UPDATE CASCADE ON DELETE SET NULL,
  invitee_fid      BIGINT REFERENCES users(fid) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at      TIMESTAMPTZ,
  declined_at      TIMESTAMPTZ,
  expiry_timestamp TIMESTAMPTZ,
  CONSTRAINT invitation_turn_fk FOREIGN KEY (game_id, turn_number)
     REFERENCES turns(game_id, turn_number) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_edit_inv_game_turn ON edit_invitations (game_id, turn_number);
CREATE INDEX IF NOT EXISTS idx_edit_inv_invitee ON edit_invitations (invitee_fid);
CREATE INDEX IF NOT EXISTS idx_edit_inv_expiry ON edit_invitations (expiry_timestamp);

-- Notifications Queue (casting, tagging, reminders) --------------------------

CREATE TABLE IF NOT EXISTS notifications_queue (
  id              BIGSERIAL PRIMARY KEY,
  type            TEXT NOT NULL,  -- 'turn_tag','game_start','auction_open','auction_settled', etc.
  game_id         UUID REFERENCES games(id) ON UPDATE CASCADE ON DELETE CASCADE,
  turn_id         UUID REFERENCES turns(id) ON UPDATE CASCADE ON DELETE CASCADE,
  target_fid      BIGINT REFERENCES users(fid) ON UPDATE CASCADE ON DELETE SET NULL,
  payload         JSONB,
  scheduled_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at         TIMESTAMPTZ,
  attempts        INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending', -- 'pending','sent','failed','cancelled'
  last_error      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications_queue (status);
CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications_queue (target_fid);
CREATE INDEX IF NOT EXISTS idx_notifications_sched ON notifications_queue (scheduled_at);

-- System Settings / Feature Flags --------------------------------------------

CREATE TABLE IF NOT EXISTS system_settings (
  key        TEXT PRIMARY KEY,
  value_json JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helpful Views --------------------------------------------------------------

CREATE OR REPLACE VIEW game_turns_summary AS
SELECT
  g.id            AS game_id,
  g.day_date,
  g.status        AS game_status,
  t.turn_number,
  t.editor_fid,
  t.passed_to_fid,
  t.prompt_text,
  t.ipfs_cid,
  t.state         AS turn_state,
  t.created_at    AS turn_created_at
FROM games g
JOIN turns t ON t.game_id = g.id
ORDER BY g.created_at DESC, t.turn_number ASC;

-- Materialized view (optional) for quickly listing active games with progress
-- DROP MATERIALIZED VIEW IF EXISTS active_games_progress;
CREATE MATERIALIZED VIEW IF NOT EXISTS active_games_progress AS
SELECT
  g.id,
  g.day_date,
  g.current_turn,
  g.max_turns,
  g.expiry_timestamp,
  g.status,
  COUNT(t.id) AS turns_recorded
FROM games g
LEFT JOIN turns t ON t.game_id = g.id
GROUP BY g.id;

CREATE INDEX IF NOT EXISTS idx_active_games_progress_status ON active_games_progress (status);

-- Trigger: update games.updated_at on row change -----------------------------

CREATE OR REPLACE FUNCTION touch_games_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_touch_games ON games;
CREATE TRIGGER trg_touch_games
BEFORE UPDATE ON games
FOR EACH ROW
EXECUTE FUNCTION touch_games_updated_at();

-- Trigger: auto-finalize turn when state becomes finalized -------------------

CREATE OR REPLACE FUNCTION finalize_turns_set_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.state = 'finalized' AND NEW.finalized_at IS NULL THEN
    NEW.finalized_at := NOW();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_finalize_turns ON turns;
CREATE TRIGGER trg_finalize_turns
BEFORE UPDATE ON turns
FOR EACH ROW
EXECUTE FUNCTION finalize_turns_set_timestamp();

-- (Optional) Row Level Security scaffolding (disabled by default) ------------

/*
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- Example RLS policies can be added later when an auth model exists.
*/

-- Suggested Future Indices (placeholders, uncomment if needed) ---------------
-- CREATE INDEX idx_turns_created_at ON turns (created_at);
-- CREATE INDEX idx_auctions_created_at ON auctions (created_at);
-- CREATE INDEX idx_funding_chain_action ON funding_transactions (chain_id, action);

-- Sanity Checks --------------------------------------------------------------

-- Ensure turn_number does not exceed game's max_turns
CREATE OR REPLACE FUNCTION check_turn_within_bounds()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  m SMALLINT;
BEGIN
  SELECT max_turns INTO m FROM games WHERE id = NEW.game_id;
  IF m IS NOT NULL AND NEW.turn_number > m THEN
    RAISE EXCEPTION 'Turn number % exceeds max_turns % for game %', NEW.turn_number, m, NEW.game_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_turn_bounds ON turns;
CREATE TRIGGER trg_turn_bounds
BEFORE INSERT ON turns
FOR EACH ROW
EXECUTE FUNCTION check_turn_within_bounds();

-- Ensure auction is only created when game completed (current_turn > max_turns)
CREATE OR REPLACE FUNCTION check_game_complete_before_auction()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  cur SMALLINT;
  mx  SMALLINT;
BEGIN
  SELECT current_turn, max_turns INTO cur, mx FROM games WHERE id = NEW.game_id;
  IF cur <= mx THEN
    RAISE EXCEPTION 'Cannot create auction before game completion (current_turn %, max_turns %)', cur, mx;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_auction_game_complete ON auctions;
CREATE TRIGGER trg_auction_game_complete
BEFORE INSERT ON auctions
FOR EACH ROW
EXECUTE FUNCTION check_game_complete_before_auction();

-- Done -----------------------------------------------------------------------