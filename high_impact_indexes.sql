-- High Impact, Write-Safe Database Indexes
-- These indexes target the slowest dashboard queries while avoiding write performance issues

-- 1. USER ROLE LOOKUPS (safest - role never changes after user creation)
-- Speeds up: Growth team vs consultant filtering, dashboard routing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role ON users(role);

-- 2. USER STATUS LOOKUPS (low write frequency - status changes rarely)
-- Speeds up: Pending approval counts on dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_status ON users(status);

-- 3. TIMELINE DATE QUERIES (read-heavy, writes are bulk weekly operations)
-- Speeds up: Resource timeline loading (biggest performance bottleneck)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_weekly_allocations_consultant_date
  ON weekly_allocations(consultant_id, week_start_date);

-- 4. FOREIGN KEY LOOKUPS (write-once, read-many pattern)
-- Speeds up: Project-phase joins, consultant-project relationships
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phases_project_id ON phases(project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_consultants_on_projects_user_id ON consultants_on_projects(user_id);

-- Note: Using CONCURRENTLY means indexes build without locking tables
-- Note: Skipping created_at index to avoid affecting project creation performance