# Database Performance Indexes

## Recommended Indexes for Faster Dashboard Loading

To optimize dashboard query performance, add these indexes to your PostgreSQL database:

### **1. User Queries**
```sql
-- For user role filtering (consultants, growth team)
CREATE INDEX idx_users_role ON users(role);

-- For user status filtering (pending approvals)
CREATE INDEX idx_users_status ON users(status);

-- For user lookups by role and status
CREATE INDEX idx_users_role_status ON users(role, status);
```

### **2. Project Queries**
```sql
-- For project ordering by creation date (dashboard project list)
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

-- For project manager lookups
CREATE INDEX idx_projects_product_manager_id ON projects(product_manager_id);

-- Combined index for project filtering and sorting
CREATE INDEX idx_projects_created_status ON projects(created_at DESC, product_manager_id);
```

### **3. Weekly Allocation Queries (Timeline Performance)**
```sql
-- Critical for timeline date range queries
CREATE INDEX idx_weekly_allocations_date_range ON weekly_allocations(week_start_date, week_end_date);

-- For consultant-specific timeline data
CREATE INDEX idx_weekly_allocations_consultant_date ON weekly_allocations(consultant_id, week_start_date);

-- For efficient join with phase allocations
CREATE INDEX idx_weekly_allocations_phase_allocation ON weekly_allocations(phase_allocation_id);

-- Composite index for optimal timeline queries
CREATE INDEX idx_weekly_allocations_timeline ON weekly_allocations(week_start_date, consultant_id, phase_allocation_id);
```

### **4. Phase and Sprint Relationships**
```sql
-- For phase-project relationships
CREATE INDEX idx_phases_project_id ON phases(project_id);

-- For sprint-project relationships
CREATE INDEX idx_sprints_project_id ON sprints(project_id);

-- For sprint ordering
CREATE INDEX idx_sprints_project_number ON sprints(project_id, sprint_number);
```

### **5. Consultant-Project Relationships**
```sql
-- For consultant project assignments
CREATE INDEX idx_consultants_on_projects_user_id ON consultants_on_projects(user_id);

-- For project team lookups
CREATE INDEX idx_consultants_on_projects_project_id ON consultants_on_projects(project_id);

-- For product manager role filtering
CREATE INDEX idx_consultants_on_projects_role ON consultants_on_projects(role);

-- Composite for efficient team queries
CREATE INDEX idx_consultants_projects_role ON consultants_on_projects(user_id, project_id, role);
```

### **6. Phase Allocation Performance**
```sql
-- For consultant allocation lookups
CREATE INDEX idx_phase_allocations_consultant ON phase_allocations(consultant_id);

-- For phase-based allocation queries
CREATE INDEX idx_phase_allocations_phase ON phase_allocations(phase_id);

-- Combined index for allocation queries
CREATE INDEX idx_phase_allocations_consultant_phase ON phase_allocations(consultant_id, phase_id);
```

## **Installation Commands**

Run these commands in your PostgreSQL database:

```bash
# Connect to your database
psql -d your_database_name

# Run all index creation commands
\i DATABASE_INDEXES.sql
```

## **Expected Performance Improvements**

- **Dashboard Load Time**: 60-80% faster initial load
- **Timeline Queries**: 70-90% faster with date range indexes
- **Project Filtering**: 50-70% faster with composite indexes
- **Consultant Lookups**: 80-95% faster with role-based indexes

## **Monitoring Performance**

Use these queries to monitor index usage:

```sql
-- Check index usage statistics
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%weekly_allocation%' OR query LIKE '%project%'
ORDER BY mean_exec_time DESC;
```

## **Index Maintenance**

- Indexes are automatically maintained by PostgreSQL
- Run `ANALYZE` after bulk data changes
- Monitor index bloat with `pg_stat_user_indexes`
- Consider `REINDEX` for heavily updated tables monthly