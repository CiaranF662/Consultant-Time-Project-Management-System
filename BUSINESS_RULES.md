# Agility System Business Rules
## Consultant Resource & Progress Insight System

**Version:** 1.0.0
**Date:** October 25, 2025

---

## Table of Contents

1. [User Management & Authentication](#user-management--authentication)
2. [Role-Based Access Control](#role-based-access-control)
3. [Project Management](#project-management)
4. [Sprint Management](#sprint-management)
5. [Phase Management](#phase-management)
6. [Allocation Management](#allocation-management)
7. [Hour Planning & Weekly Allocations](#hour-planning--weekly-allocations)
8. [Hour Change Request Workflow](#hour-change-request-workflow)
9. [Budget Management](#budget-management)
10. [Notification Rules](#notification-rules)
11. [Data Integrity & Validation](#data-integrity--validation)
12. [Temporal Rules](#temporal-rules)

---

## User Management & Authentication

### BR-AUTH-001: User Registration
- **Rule:** All users must register with a valid email address
- **Validation:** Email format must be valid (contains @ and domain)
- **Action:** System sends verification email upon registration

### BR-AUTH-002: Email Verification
- **Rule:** Users cannot access the system until email is verified
- **Exception:** Users can only access the email verification pending page
- **Timeout:** Verification links expire after 24 hours

### BR-AUTH-003: Account Approval
- **Rule:** New accounts require Growth Team approval before full system access
- **Exception:** The first user in the system is auto-approved as Growth Team
- **Notification:** Users receive email notification when approved/rejected

### BR-AUTH-004: Password Requirements
- **Rule:** Passwords must be minimum 6 characters
- **Recommendation:** Encourage strong passwords with mix of characters
- **Security:** Passwords are hashed using bcrypt before storage

### BR-AUTH-005: Session Management
- **Rule:** User sessions expire after 4 hours of inactivity
- **Rule:** Sessions expire 15 minutes after last interaction
- **Action:** Users must re-authenticate after session expiration

### BR-AUTH-006: Single Email Per Account
- **Rule:** Each email address can only be associated with one account
- **Validation:** System checks for duplicate emails during registration
- **Action:** Registration fails if email already exists

---

## Role-Based Access Control

### BR-RBAC-001: User Roles
- **Rule:** System supports three primary roles: GROWTH_TEAM, CONSULTANT, and implied Product Manager
- **Assignment:** Roles are assigned during account approval
- **Immutability:** Only Growth Team can change user roles

### BR-RBAC-002: Product Manager Detection
- **Rule:** A user is a Product Manager if they are assigned as PM on any project
- **Dynamic:** PM status is determined by project assignments, not a separate role
- **Multiple Roles:** A user can be both a Consultant and a Product Manager

### BR-RBAC-003: Growth Team Permissions
Growth Team members can:
- Create, edit, and delete projects
- Assign Product Managers to projects
- Assign consultants to projects
- Approve/reject hour change requests
- Approve/reject user registrations
- View all projects, consultants, and allocations
- Access resource timeline for all consultants

### BR-RBAC-004: Product Manager Permissions
Product Managers can:
- View and edit their assigned projects only
- Create, edit, and delete phases for their projects
- Assign consultants to phases (phase allocations)
- Submit hour change requests for their projects
- View team allocations for their project consultants
- Cannot approve their own hour change requests

### BR-RBAC-005: Consultant Permissions
Consultants can:
- View their own dashboard and allocations
- Create weekly allocations for approved phase allocations
- Submit hour change requests for their allocations
- View projects they are assigned to
- Cannot view other consultants' allocations
- Cannot modify phase allocations directly

### BR-RBAC-006: Navigation Restrictions
- **Rule:** Users only see navigation items relevant to their role
- **Dashboard:** Each role has a distinct dashboard view
- **Sidebar:** Menu items are filtered based on user permissions

---

## Project Management

### BR-PROJ-001: Project Creation
- **Rule:** Only Growth Team can create projects
- **Required Fields:** Project name, start date, end date, budgeted hours, Product Manager, at least one consultant
- **Validation:** End date must be after start date
- **Validation:** Budgeted hours must be positive number

### BR-PROJ-002: Product Manager Assignment
- **Rule:** Each project must have exactly one Product Manager
- **Selection:** PM must be selected from existing consultants in the system
- **Effect:** Assigned user gains Product Manager permissions for that project
- **Reassignment:** Growth Team can change the PM at any time

### BR-PROJ-003: Consultant Assignment
- **Rule:** Projects must have at least one consultant assigned
- **Multiple:** Projects can have multiple consultants
- **Addition:** Growth Team can add consultants at any time
- **Removal:** Removing a consultant requires handling their allocations first

### BR-PROJ-004: Project Dates
- **Rule:** Projects have defined start and end dates
- **Sprint Generation:** Sprints are auto-generated based on project duration
- **Modification:** Changing dates regenerates sprints (if no phases exist)
- **Warning:** System warns if date changes affect existing phases

### BR-PROJ-005: Project Deletion
- **Rule:** Projects can only be deleted if no approved allocations exist
- **Cascade:** Deleting a project deletes all phases, sprints, and pending allocations
- **Confirmation:** Requires explicit confirmation from Growth Team

### BR-PROJ-006: Consultant Availability
- **Rule:** System indicates consultant availability when assigning to projects
- **Indicator:** Shows consultants already assigned vs. available
- **Warning:** Warns if consultant is heavily allocated on other projects

---

## Sprint Management

### BR-SPRINT-001: Sprint Auto-Generation
- **Rule:** Sprints are automatically generated when a project is created
- **Duration:** Each sprint is exactly 14 days (2 weeks)
- **Start Day:** All sprints start on Monday
- **Coverage:** Sprints span the entire project duration

### BR-SPRINT-002: Sprint Naming
- **Rule:** Sprints are named sequentially: "Sprint 1", "Sprint 2", etc.
- **Uniqueness:** Sprint numbers are unique within a project
- **Display:** Sprint names show start and end dates

### BR-SPRINT-003: Sprint Dates
- **Rule:** Sprint dates are calculated based on project start date
- **Alignment:** Start dates are adjusted to the nearest Monday if needed
- **Immutability:** Sprint dates cannot be manually changed

### BR-SPRINT-004: Sprint Assignment to Phases
- **Rule:** Sprints can be assigned to multiple phases
- **Rule:** A sprint can belong to only one phase per project
- **Consecutive:** Phases should use consecutive sprints (recommended, not enforced)

### BR-SPRINT-005: Sprint Deletion
- **Rule:** Sprints cannot be manually deleted
- **Lifecycle:** Sprints are deleted only when parent project is deleted
- **Reassignment:** Sprints can be reassigned between phases if no allocations exist

---

## Phase Management

### BR-PHASE-001: Phase Creation
- **Rule:** Only Product Managers can create phases for their projects
- **Rule:** Growth Team can create phases for any project
- **Required Fields:** Phase name, at least one sprint assignment
- **Optional:** Phase description

### BR-PHASE-002: Phase Duration
- **Rule:** Phase start date = start date of earliest assigned sprint
- **Rule:** Phase end date = end date of latest assigned sprint
- **Calculation:** Dates are automatically calculated, not manually entered
- **Updates:** Phase dates update automatically if sprints are added/removed

### BR-PHASE-003: Phase Sprint Assignment
- **Rule:** Phases must have at least one sprint assigned
- **Selection:** Can select multiple consecutive or non-consecutive sprints
- **Availability:** Only unassigned sprints within the project can be selected
- **Modification:** Sprint assignments can be changed if no approved allocations exist

### BR-PHASE-004: Phase Status
Phase status is automatically determined:
- **NOT_STARTED:** Current date < phase start date
- **IN_PROGRESS:** Current date >= start date AND <= end date
- **COMPLETED:** Current date > phase end date
- **AT_RISK:** Over-allocated or other risk factors

### BR-PHASE-005: Phase Deletion
- **Rule:** Phases can be deleted only if no approved allocations exist
- **Pending:** Phases with pending allocations can be deleted (cascades deletion)
- **Cascade:** Deleting a phase deletes all associated allocations
- **Confirmation:** Requires explicit confirmation

### BR-PHASE-006: Phase Naming
- **Rule:** Phase names must be unique within a project
- **Validation:** System prevents duplicate phase names
- **Suggestion:** Naming convention: "Phase 1 - Design", "Development Sprint 1"

---

## Allocation Management

### BR-ALLOC-001: Phase Allocation Creation
- **Rule:** Only Product Managers can create phase allocations for their projects
- **Rule:** Growth Team can create allocations for any project
- **Required:** Consultant, phase, total hours
- **Restriction:** Consultant must be assigned to the project
- **Validation:** Hours must be positive number

### BR-ALLOC-002: Allocation Status Workflow
Phase allocations follow this status workflow:
1. **PENDING:** Initial state, awaiting Growth Team approval
2. **APPROVED:** Approved by Growth Team, consultant can plan hours
3. **REJECTED:** Denied by Growth Team, allocation is inactive
4. **DELETION_PENDING:** PM requested removal, awaiting Growth Team approval
5. **EXPIRED:** Phase end date has passed (system-managed)
6. **FORFEITED:** Consultant removed from allocation (system-managed)

### BR-ALLOC-003: Allocation Approval
- **Rule:** New phase allocations start in PENDING status
- **Approver:** Only Growth Team can approve/reject allocations
- **Effect:** Approval changes status to APPROVED, enabling weekly planning
- **Notification:** PM and Consultant receive notification of approval/rejection

### BR-ALLOC-004: Multiple Allocations
- **Rule:** A consultant can have multiple phase allocations across projects
- **Rule:** A consultant can have only ONE allocation per phase
- **Validation:** System prevents duplicate consultant-phase pairs
- **Warning:** System warns if total allocations exceed reasonable limits

### BR-ALLOC-005: Allocation Hours
- **Rule:** Allocated hours must be positive
- **Recommendation:** Consider phase duration and consultant availability
- **Warning:** System warns if allocated hours seem unrealistic for phase duration
- **Budget Impact:** Allocation hours count toward project budget

### BR-ALLOC-006: Allocation Modification
- **Rule:** Approved allocations can only be modified via Hour Change Request
- **Rule:** Pending allocations can be edited directly by PM
- **Rule:** Rejected allocations can be resubmitted with changes
- **Protection:** Cannot directly modify allocation that has weekly plans

### BR-ALLOC-007: Allocation Deletion
- **Rule:** Allocations without weekly plans can be deleted directly
- **Rule:** Allocations with weekly plans require DELETION_PENDING workflow
- **Process:** PM requests deletion → Growth Team approves → Allocation deleted
- **Cascade:** Deleting allocation deletes all associated weekly allocations

### BR-ALLOC-008: Consultant Removal from Phase
When PM attempts to remove consultant with planned hours:
1. **Status Change:** Allocation status changes to DELETION_PENDING
2. **Planning Blocked:** Consultant cannot plan additional hours
3. **Notification:** Consultant and Growth Team notified
4. **Approval Required:** Growth Team must approve deletion
5. **Cascade:** If approved, all weekly allocations deleted
6. **Reversion:** If rejected, status returns to APPROVED

---

## Hour Planning & Weekly Allocations

### BR-WEEKLY-001: Weekly Allocation Creation
- **Rule:** Only consultants can create weekly allocations for their phase allocations
- **Prerequisite:** Phase allocation must be in APPROVED status
- **Restriction:** Cannot plan hours for PENDING, REJECTED, or DELETION_PENDING allocations

### BR-WEEKLY-002: Planning Constraints
- **Rule:** Total weekly allocations cannot exceed phase allocation total
- **Validation:** System prevents over-allocation per phase
- **Formula:** SUM(weekly allocations) <= phase allocation hours
- **Real-time:** Validation occurs on every save

### BR-WEEKLY-003: Week Boundaries
- **Rule:** Weekly allocations align with sprint weeks (Monday - Sunday)
- **Rule:** Can only plan hours for weeks within phase duration
- **Display:** Week picker shows only relevant weeks for each phase
- **Past Weeks:** Can edit past weeks (for corrections)

### BR-WEEKLY-004: Hours Per Week Limit
- **Recommendation:** Consultants should not exceed 40 hours per week total
- **Warning:** System warns if weekly total across all phases > 40 hours
- **Color Coding:**
  - Green: < 40 hours (under capacity)
  - Yellow: = 40 hours (at capacity)
  - Red: > 40 hours (over capacity)
- **Enforcement:** Warning only, not hard restriction

### BR-WEEKLY-005: Auto-Save
- **Rule:** Weekly allocation changes are automatically saved
- **Debounce:** Saves after 500ms of inactivity
- **Feedback:** Visual confirmation of save status
- **Failure:** Unsaved changes are preserved in browser session

### BR-WEEKLY-006: Weekly Allocation Modification
- **Rule:** Consultants can modify their weekly allocations at any time
- **Constraint:** Must stay within phase allocation total
- **History:** System tracks modification history (for audit)

### BR-WEEKLY-007: Weekly Allocation Deletion
- **Rule:** Consultants can delete (set to 0) weekly allocations
- **Effect:** Frees up hours to be redistributed
- **Cascade:** No cascade effects, isolated to that week

### BR-WEEKLY-008: Blocking Hour Planning
Weekly hour planning is blocked when:
- Phase allocation status is PENDING (not yet approved)
- Phase allocation status is DELETION_PENDING (removal requested)
- Phase allocation status is REJECTED (denied)
- Phase has ended (phase status = COMPLETED)
- Consultant is removed from project (rare edge case)

---

## Hour Change Request Workflow

### BR-HCR-001: Request Creation
Who can create hour change requests:
- **Product Managers:** For their project phase allocations
- **Consultants:** For their own allocations (future feature)
- **Growth Team:** Direct approval authority, no request needed

### BR-HCR-002: Request Types
System supports four types of hour change requests:

#### Type 1: Hour Increase
- **Purpose:** Add hours to existing phase allocation
- **Validation:** New total must be positive
- **Impact:** Increases project allocated hours
- **Budget Check:** Warns if exceeds project budget

#### Type 2: Hour Decrease
- **Purpose:** Reduce hours from phase allocation
- **Validation:** Cannot reduce below hours already planned in weekly allocations
- **Formula:** New total >= SUM(weekly allocations)
- **Protection:** System prevents if it would invalidate weekly plans

#### Type 3: Hour Transfer
- **Purpose:** Move hours from one consultant to another
- **Validation:** Both consultants must be on the project
- **Validation:** Cannot transfer more than available
- **Effect:** Reduces source allocation, increases target allocation

#### Type 4: Consultant Removal
- **Purpose:** Remove consultant entirely from phase
- **Trigger:** When PM tries to delete allocation with weekly plans
- **Status:** Sets allocation to DELETION_PENDING
- **Approval:** Requires Growth Team approval
- **Cascade:** If approved, deletes allocation and all weekly plans

### BR-HCR-003: Required Information
All hour change requests must include:
- **Type:** Which type of change
- **Affected Allocation:** Which phase allocation
- **Amount:** Hours being changed (if applicable)
- **Target:** Recipient consultant (for transfers)
- **Reason:** Detailed justification (required field)
- **Impact Summary:** Auto-generated budget and allocation impact

### BR-HCR-004: Request Status Workflow
1. **PENDING:** Initial state, awaiting Growth Team review
2. **APPROVED:** Growth Team approved, changes applied
3. **REJECTED:** Growth Team denied, no changes made

### BR-HCR-005: Approval Process
- **Approver:** Only Growth Team members
- **Self-Approval:** Growth Team cannot approve their own requests (if they were PM)
- **Review:** Can view full request details, impact analysis
- **Decision:** Approve or Reject with optional feedback
- **Atomicity:** Approval applies all changes in single transaction

### BR-HCR-006: Automatic Changes on Approval
When hour change request is approved:
- **Hour Increase:** Phase allocation total updated
- **Hour Decrease:** Phase allocation total reduced
- **Hour Transfer:** Source reduced, target increased
- **Consultant Removal:** Allocation and weekly plans deleted
- **Notification:** All affected parties notified
- **Audit Log:** Change recorded in system history

### BR-HCR-007: Request Rejection
- **Effect:** No changes applied to allocations
- **Feedback:** Growth Team can provide reason for rejection
- **Notification:** Requester notified with feedback
- **Resubmission:** PM can submit new request with modifications

### BR-HCR-008: Request Cancellation
- **Rule:** PMs can cancel their pending requests
- **Timing:** Only while status is PENDING
- **Effect:** Request deleted, no changes applied
- **Notification:** Growth Team notified of cancellation

### BR-HCR-009: Validation Rules
Hour change requests are validated:
- **Decrease:** New hours >= planned weekly hours
- **Transfer:** Recipient is on the project
- **Transfer:** Source has sufficient hours
- **Budget:** Warns if increase exceeds project budget
- **Reasonableness:** Flags unusually large changes for review

---

## Budget Management

### BR-BUDGET-001: Project Budget
- **Rule:** Each project has a total budgeted hours defined at creation
- **Purpose:** Represents client contract or project scope
- **Modification:** Only Growth Team can change project budget
- **Display:** Shown alongside allocated hours for comparison

### BR-BUDGET-002: Budget Calculation
Budget metrics are calculated as:
- **Budgeted Hours:** Fixed value set at project creation
- **Allocated Hours:** SUM(all approved phase allocation hours)
- **Remaining Budget:** Budgeted Hours - Allocated Hours
- **Utilization %:** (Allocated Hours / Budgeted Hours) × 100

### BR-BUDGET-003: Budget Status Indicators
- **Under Budget:** Utilization < 90% (Green indicator)
- **Near Budget:** Utilization 90-100% (Yellow indicator)
- **Over Budget:** Utilization > 100% (Red indicator)
- **Display:** Color-coded progress bars and percentage

### BR-BUDGET-004: Budget Warnings
System warns when:
- Creating allocation that would exceed budget
- Approving hour increase that exceeds budget
- Project utilization reaches 90%
- Project goes over budget (>100%)

### BR-BUDGET-005: Over-Budget Allowance
- **Rule:** System allows allocations exceeding budget with warning
- **Rationale:** Real projects may need scope changes
- **Approval:** Growth Team can approve over-budget allocations
- **Visibility:** Over-budget status clearly displayed

### BR-BUDGET-006: Budget Adjustment
- **Rule:** Only Growth Team can adjust project budget
- **Process:** Edit project → Update budgeted hours
- **Effect:** Recalculates utilization percentage
- **Audit:** Budget changes are logged

### BR-BUDGET-007: Budget Tracking Scope
Budget tracking includes:
- **Approved Allocations:** Count toward budget
- **Pending Allocations:** Do not count (until approved)
- **Rejected Allocations:** Do not count
- **Weekly Plans:** Do not affect budget (subset of allocations)

---

## Notification Rules

### BR-NOTIF-001: Notification Creation
Notifications are automatically created for:
- Project assignment (consultant added to project)
- Phase allocation created (consultant allocated to phase)
- Phase allocation approved (allocation moves to approved)
- Phase allocation rejected (allocation denied)
- Hour change request submitted (Growth Team notified)
- Hour change request approved (requester notified)
- Hour change request rejected (requester notified)
- Phase deadline approaching (7 days before end)
- User registration approved (new user notified)
- Allocation deletion pending (consultant notified)

### BR-NOTIF-002: Notification Recipients
- **Project Assignment:** Assigned consultant + PM
- **Allocation Created:** Consultant + Growth Team
- **Allocation Approved:** Consultant + requesting PM
- **Allocation Rejected:** Consultant + requesting PM
- **Hour Change Submitted:** All Growth Team members
- **Hour Change Approved:** Requesting PM + affected consultants
- **Hour Change Rejected:** Requesting PM
- **Phase Deadline:** All consultants on that phase
- **User Approved:** New user only
- **Deletion Pending:** Affected consultant + Growth Team

### BR-NOTIF-003: Notification Content
Each notification includes:
- **Title:** Brief summary of event
- **Message:** Detailed description
- **Type:** Category of notification (with icon)
- **Action URL:** Deep link to relevant page (if applicable)
- **Timestamp:** When notification was created
- **Read Status:** Unread/Read flag

### BR-NOTIF-004: Email Notifications
In addition to in-app notifications, emails are sent for:
- User registration approval/rejection
- Email verification
- Hour change request decisions (approved/rejected)
- Critical deadlines (phase ending soon)
- Account-related actions

### BR-NOTIF-005: Notification Read Status
- **Rule:** Notifications start as unread (isRead = false)
- **Action:** Users can mark individual notifications as read
- **Batch:** Users can mark all notifications as read
- **Auto-Mark:** Clicking notification marks it as read automatically

### BR-NOTIF-006: Notification Persistence
- **Rule:** Notifications are stored permanently in database
- **Display:** Last 100 notifications shown in dropdown
- **Full List:** All notifications viewable on dedicated page
- **Deletion:** Users cannot delete notifications (admin can)

### BR-NOTIF-007: Notification Priority
Notifications are displayed with priority indicators:
- **High Priority:** Hour change requests, approvals needed (red)
- **Medium Priority:** Allocations, assignments (yellow)
- **Low Priority:** Information only (blue/gray)

### BR-NOTIF-008: Real-Time Updates
- **Rule:** Notifications appear instantly in UI
- **Mechanism:** Page refresh checks for new notifications
- **Polling:** Every 30 seconds when user is active
- **Badge:** Unread count updates in real-time

---

## Data Integrity & Validation

### BR-DATA-001: Cascade Delete Rules
When parent entities are deleted:
- **Project Deleted:** Deletes all phases, sprints, allocations, notifications
- **Phase Deleted:** Deletes all phase allocations, weekly allocations
- **Phase Allocation Deleted:** Deletes all weekly allocations
- **User Deleted:** Sets their allocations to FORFEITED status (soft delete)

### BR-DATA-002: Soft Delete for Users
- **Rule:** User accounts are not hard-deleted
- **Status:** User account set to inactive
- **Allocations:** Existing allocations remain for historical record
- **Access:** User cannot log in but data preserved

### BR-DATA-003: Required Fields Validation
All database entries must have:
- **Projects:** name, startDate, endDate, budgetedHours, productManagerId
- **Phases:** name, projectId, at least one sprint
- **Phase Allocations:** consultantId, phaseId, allocatedHours
- **Weekly Allocations:** phaseAllocationId, weekStart, hours
- **Users:** email, name, hashedPassword, role

### BR-DATA-004: Referential Integrity
- **Foreign Keys:** All relationships enforced at database level
- **Orphans:** No orphaned records (e.g., allocation without phase)
- **Cascades:** Proper cascade rules defined in schema
- **Validation:** Application validates before database

### BR-DATA-005: Unique Constraints
- **User Email:** Must be unique across all users
- **Consultant-Phase Pair:** One allocation per consultant per phase
- **Sprint Assignment:** Sprint can be in only one phase per project
- **Phase Name:** Unique within a project

### BR-DATA-006: Date Validation
- **Rule:** All dates are validated for logical consistency
- **Project:** endDate > startDate
- **Phase:** Automatically calculated from sprints
- **Weekly:** weekStart must be a Monday
- **Timezone:** All dates stored in UTC, displayed in user timezone

### BR-DATA-007: Numeric Validation
- **Hours:** Must be non-negative numbers
- **Budgets:** Must be positive numbers
- **Precision:** Hours stored with 2 decimal precision
- **Range:** Hours per week should not exceed 168 (7 days × 24 hours)

### BR-DATA-008: Data Audit Trail
System maintains audit logs for:
- User account changes (approval, role changes)
- Budget modifications
- Hour change request approvals/rejections
- Project deletions
- Critical configuration changes

---

## Temporal Rules

### BR-TIME-001: Sprint Timing
- **Duration:** Exactly 14 days (2 weeks)
- **Start Day:** Always Monday
- **End Day:** Always Sunday (end of 2nd week)
- **Calculation:** Programmatically calculated, not manual entry

### BR-TIME-002: Phase Timing
- **Start:** Start date of earliest assigned sprint
- **End:** End date of latest assigned sprint
- **Dynamic:** Recalculates when sprints added/removed
- **Overlap:** Phases can overlap (not restricted)

### BR-TIME-003: Allocation Expiry
- **Rule:** Phase allocations automatically expire when phase ends
- **Status:** Status changes to EXPIRED after phase end date
- **Planning:** No new weekly allocations can be created
- **Existing:** Existing weekly allocations remain for record

### BR-TIME-004: Historical Data
- **Rule:** Past data is preserved and immutable
- **Weekly Plans:** Past week plans can be edited (for corrections)
- **Audit:** Changes to historical data are logged
- **Reporting:** Historical data used for analytics

### BR-TIME-005: Deadline Warnings
System generates warnings:
- **7 Days Before Phase End:** Notification to consultants
- **3 Days Before:** Reminder notification
- **Phase End Date:** Final notification
- **Overdue:** Flags phases that are past end date but incomplete

### BR-TIME-006: Session Timeout
- **Inactive Timeout:** 4 hours of no activity
- **Active Timeout:** 15 minutes after last interaction
- **Warning:** 2 minutes before timeout, warn user
- **Action:** Redirect to login page after timeout

### BR-TIME-007: Week Start
- **Rule:** All weeks start on Monday at 00:00:00
- **Global:** Consistent across entire system
- **Display:** Week pickers always show Monday as start
- **Calculations:** Week boundaries strictly enforced

---

## Summary Matrix

### Critical Business Rules by Priority

| Priority | Rule ID | Description | Impact if Violated |
|----------|---------|-------------|-------------------|
| **P0** | BR-ALLOC-002 | Allocation status workflow | Data corruption, workflow breaks |
| **P0** | BR-WEEKLY-002 | Cannot exceed phase allocation | Over-planning, budget errors |
| **P0** | BR-AUTH-002 | Email verification required | Security vulnerability |
| **P0** | BR-DATA-004 | Referential integrity | Database corruption |
| **P1** | BR-HCR-002 | Hour decrease validation | Invalidates weekly plans |
| **P1** | BR-BUDGET-002 | Budget calculation accuracy | Financial misreporting |
| **P1** | BR-RBAC-003-005 | Role-based permissions | Unauthorized access |
| **P1** | BR-PROJ-002 | One PM per project | Ownership confusion |
| **P2** | BR-WEEKLY-004 | 40-hour week warning | Consultant burnout |
| **P2** | BR-NOTIF-001 | Notification creation | Communication gaps |
| **P2** | BR-PHASE-004 | Auto phase status | Status inaccuracy |

---

**Document Version:** 1.0.0
**Last Updated:** October 25, 2025
**System:** Agility - Consultant Resource & Progress Insight System
