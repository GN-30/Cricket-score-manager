-- ============================================================
-- Cricket Score Manager — Row Level Security (RLS) Policies
-- ============================================================
-- Run this in: Supabase Dashboard → SQL Editor → New query
--
-- SAFE TO RE-RUN: All policies are dropped before re-creation.
--
-- Architecture:
--   • Backend uses SERVICE ROLE KEY → bypasses RLS entirely ✅
--   • Frontend/public uses ANON KEY → RLS enforced ✅
--
-- Policy design:
--   • Tournament, Team, Player, Match, Inning, Ball → public SELECT (scoreboard)
--   • User → authenticated SELECT on own row only
--   • No client-side INSERT / UPDATE / DELETE on any table
-- ============================================================


-- ============================================================
-- 1. ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE "User"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tournament" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Team"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Player"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Match"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Inning"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Ball"       ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 2. DROP EXISTING POLICIES (idempotent — safe to re-run)
-- ============================================================

-- User
DROP POLICY IF EXISTS "Users can view own profile"           ON "User";
DROP POLICY IF EXISTS "Block public insert on User"          ON "User";
DROP POLICY IF EXISTS "Block public update on User"          ON "User";
DROP POLICY IF EXISTS "Block public delete on User"          ON "User";

-- Tournament
DROP POLICY IF EXISTS "Tournaments are publicly readable"    ON "Tournament";
DROP POLICY IF EXISTS "Block public insert on Tournament"    ON "Tournament";
DROP POLICY IF EXISTS "Block public update on Tournament"    ON "Tournament";
DROP POLICY IF EXISTS "Block public delete on Tournament"    ON "Tournament";

-- Team
DROP POLICY IF EXISTS "Teams are publicly readable"          ON "Team";
DROP POLICY IF EXISTS "Block public insert on Team"          ON "Team";
DROP POLICY IF EXISTS "Block public update on Team"          ON "Team";
DROP POLICY IF EXISTS "Block public delete on Team"          ON "Team";

-- Player
DROP POLICY IF EXISTS "Players are publicly readable"        ON "Player";
DROP POLICY IF EXISTS "Block public insert on Player"        ON "Player";
DROP POLICY IF EXISTS "Block public update on Player"        ON "Player";
DROP POLICY IF EXISTS "Block public delete on Player"        ON "Player";

-- Match
DROP POLICY IF EXISTS "Matches are publicly readable"        ON "Match";
DROP POLICY IF EXISTS "Block public insert on Match"         ON "Match";
DROP POLICY IF EXISTS "Block public update on Match"         ON "Match";
DROP POLICY IF EXISTS "Block public delete on Match"         ON "Match";

-- Inning
DROP POLICY IF EXISTS "Innings are publicly readable"        ON "Inning";
DROP POLICY IF EXISTS "Block public insert on Inning"        ON "Inning";
DROP POLICY IF EXISTS "Block public update on Inning"        ON "Inning";
DROP POLICY IF EXISTS "Block public delete on Inning"        ON "Inning";

-- Ball
DROP POLICY IF EXISTS "Balls are publicly readable"          ON "Ball";
DROP POLICY IF EXISTS "Block public insert on Ball"          ON "Ball";
DROP POLICY IF EXISTS "Block public update on Ball"          ON "Ball";
DROP POLICY IF EXISTS "Block public delete on Ball"          ON "Ball";


-- ============================================================
-- 3. USER TABLE — authenticated users can only read own row
-- ============================================================

-- SELECT: a logged-in user can only see their own profile row.
-- The "id" column in the User table stores the Supabase auth UID (cuid).
-- auth.uid() returns the UUID of the currently authenticated user.
CREATE POLICY "Users can view own profile"
  ON "User"
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id);

-- Block all client-side mutations (service role bypasses these)
CREATE POLICY "Block public insert on User"
  ON "User" FOR INSERT TO anon, authenticated WITH CHECK (false);

CREATE POLICY "Block public update on User"
  ON "User" FOR UPDATE TO anon, authenticated USING (false);

CREATE POLICY "Block public delete on User"
  ON "User" FOR DELETE TO anon, authenticated USING (false);


-- ============================================================
-- 4. TOURNAMENT TABLE — public read, no client-side writes
-- ============================================================

CREATE POLICY "Tournaments are publicly readable"
  ON "Tournament"
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Block public insert on Tournament"
  ON "Tournament" FOR INSERT TO anon, authenticated WITH CHECK (false);

CREATE POLICY "Block public update on Tournament"
  ON "Tournament" FOR UPDATE TO anon, authenticated USING (false);

CREATE POLICY "Block public delete on Tournament"
  ON "Tournament" FOR DELETE TO anon, authenticated USING (false);


-- ============================================================
-- 5. TEAM TABLE — public read, no client-side writes
-- ============================================================

CREATE POLICY "Teams are publicly readable"
  ON "Team"
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Block public insert on Team"
  ON "Team" FOR INSERT TO anon, authenticated WITH CHECK (false);

CREATE POLICY "Block public update on Team"
  ON "Team" FOR UPDATE TO anon, authenticated USING (false);

CREATE POLICY "Block public delete on Team"
  ON "Team" FOR DELETE TO anon, authenticated USING (false);


-- ============================================================
-- 6. PLAYER TABLE — public read, no client-side writes
-- ============================================================

CREATE POLICY "Players are publicly readable"
  ON "Player"
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Block public insert on Player"
  ON "Player" FOR INSERT TO anon, authenticated WITH CHECK (false);

CREATE POLICY "Block public update on Player"
  ON "Player" FOR UPDATE TO anon, authenticated USING (false);

CREATE POLICY "Block public delete on Player"
  ON "Player" FOR DELETE TO anon, authenticated USING (false);


-- ============================================================
-- 7. MATCH TABLE — public read, no client-side writes
-- ============================================================

CREATE POLICY "Matches are publicly readable"
  ON "Match"
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Block public insert on Match"
  ON "Match" FOR INSERT TO anon, authenticated WITH CHECK (false);

CREATE POLICY "Block public update on Match"
  ON "Match" FOR UPDATE TO anon, authenticated USING (false);

CREATE POLICY "Block public delete on Match"
  ON "Match" FOR DELETE TO anon, authenticated USING (false);


-- ============================================================
-- 8. INNING TABLE — public read, no client-side writes
-- ============================================================

CREATE POLICY "Innings are publicly readable"
  ON "Inning"
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Block public insert on Inning"
  ON "Inning" FOR INSERT TO anon, authenticated WITH CHECK (false);

CREATE POLICY "Block public update on Inning"
  ON "Inning" FOR UPDATE TO anon, authenticated USING (false);

CREATE POLICY "Block public delete on Inning"
  ON "Inning" FOR DELETE TO anon, authenticated USING (false);


-- ============================================================
-- 9. BALL TABLE — public read, no client-side writes
-- ============================================================

CREATE POLICY "Balls are publicly readable"
  ON "Ball"
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Block public insert on Ball"
  ON "Ball" FOR INSERT TO anon, authenticated WITH CHECK (false);

CREATE POLICY "Block public update on Ball"
  ON "Ball" FOR UPDATE TO anon, authenticated USING (false);

CREATE POLICY "Block public delete on Ball"
  ON "Ball" FOR DELETE TO anon, authenticated USING (false);


-- ============================================================
-- VERIFICATION QUERY
-- Run after applying to confirm RLS is enabled on all tables
-- ============================================================
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('User','Tournament','Team','Player','Match','Inning','Ball')
ORDER BY tablename;
