# Agility TEST CASES

Department of Information Systems
University of Cape Town

In partial fulfillment of the requirements for the
Systems Development Group Project 2025
(INF3003W)

by

**Name of Group**
- Ciaran Formby
- Naledi Tshapi
- Ashe-Shaana Andzenge
- Luyanda Ndlovu

27 October 2025

---

## TABLE OF CONTENTS

1. TC-001 - Project Creation and Setup (Growth Team)
2. TC-002 - Phase Creation with Sprint Assignment (Product Manager)
3. TC-003 - Phase Allocation Creation (Product Manager)
4. TC-004 - Weekly Allocation Distribution (Consultant)
5. TC-005 - Hour Change Request Submission and Approval
6. TC-006 - Portfolio Timeline Viewing and Drill-Down (Growth Team)
7. TC-007 - User Authentication and Role-Based Access

---

## 1. TC-001

**Test Case ID:** TC-001

### 1.1 Function Area
Project Creation and Setup (Growth Team)

#### TEST CASE HEADER

| CATEGORY | DESCRIPTION |
|----------|-------------|
| **Date** | 27 October 2025 |
| **Tester** | Ciaran Formby |
| **Requirement number or description** | Project Creation & Setup: Growth Team creates a new project, assigns Product Manager and Consultants |
| **Requirement Document** | CLAUDE.md - Section 3: Core Workflow, Step 1 |
| **Interfaces** | Dashboard, Create Project Modal, User Selection Dropdowns |
| **Test Case Dependencies** | Valid authenticated Growth Team user must exist in database |
| **Environment** | Next.js 15, React 19, PostgreSQL with Prisma, Chrome browser, localhost:3000 |
| **Test results** | Accepted ☐ Not Accepted ☐ |
| **Results review by** | Product Owner |

#### TEST CASE BODY

| Step # | Steps to Perform / User action | Data | Expected Results | Comments | Pass | Fail |
|--------|--------------------------------|------|------------------|----------|------|------|
| 1 | Navigate to login page | URL: /login | Login page displays with Google OAuth and credentials options | | | |
| 2 | Login as Growth Team user | Email: growthteam@example.com, Password: valid password | Successful login, redirect to dashboard | | | |
| 3 | Verify Growth Team dashboard loads | | Dashboard displays with "Create New Project" button visible | | | |
| 4 | Click "Create New Project" button | | Create Project modal opens with empty form | | | |
| 5 | Enter project title | Title: "E-Commerce Platform Redesign" | Title field accepts input and displays entered text | | | |
| 6 | Set project start date | Start Date: 2025-11-01 | Date picker allows date selection | | | |
| 7 | Set project end date | End Date: 2026-02-28 | Date picker allows date selection, validates end > start | | | |
| 8 | Enter total budgeted hours | Budget: 500 hours | Number input accepts positive integer | | | |
| 9 | Select Product Manager | PM: John Smith (Consultant) | Dropdown shows all consultants, allows single selection | | | |
| 10 | Select team consultants | Consultants: Jane Doe, Mike Johnson, Sarah Lee | Multi-select dropdown allows multiple selections | Minimum 1 consultant required | | |
| 11 | Click "Create Project" button | | Form validates all required fields are filled | | | |
| 12 | Verify project creation | | Success message appears, modal closes | | | |
| 13 | Verify project in project list | | New project appears in projects list with correct details | | | |
| 14 | Click on newly created project | | Project detail page loads showing phases section (empty) | | | |
| 15 | Verify sprints auto-generation | | System automatically generates 2-week sprints from start to end date | Sprints should start on Monday | | |
| 16 | Verify Product Manager assignment | | John Smith appears as Product Manager for the project | | | |
| 17 | Verify consultant assignments | | All selected consultants appear in team members list | | | |
| 18 | Verify budget tracking initialization | | Budget shows 500 hours total, 0 hours allocated | | | |

---

## 2. TC-002

**Test Case ID:** TC-002

### 2.1 Function Area
Phase Creation with Sprint Assignment (Product Manager)

#### TEST CASE HEADER

| CATEGORY | DESCRIPTION |
|----------|-------------|
| **Date** | 27 October 2025 |
| **Tester** | Naledi Tshapi |
| **Requirement number or description** | Phase & Sprint Management: Product Manager creates phases and assigns sprints to define phase duration |
| **Requirement Document** | CLAUDE.md - Section 3: Core Workflow, Step 2 |
| **Interfaces** | Project Detail Page, Create Phase Modal, Sprint Selection Component |
| **Test Case Dependencies** | TC-001 (Project must exist), User must be assigned as Product Manager |
| **Environment** | Next.js 15, React 19, PostgreSQL with Prisma, Chrome browser, localhost:3000 |
| **Test results** | Accepted ☐ Not Accepted ☐ |
| **Results review by** | Product Owner |

#### TEST CASE BODY

| Step # | Steps to Perform / User action | Data | Expected Results | Comments | Pass | Fail |
|--------|--------------------------------|------|------------------|----------|------|------|
| 1 | Login as Product Manager | Email: johnsmith@example.com | Successful login to PM account | Must be PM of existing project | | |
| 2 | Navigate to Projects page | | Projects list displays showing projects where user is PM | | | |
| 3 | Click on "E-Commerce Platform Redesign" project | | Project detail page loads with tabs for Phases, Team, Budget | | | |
| 4 | Click "Phases" tab | | Phases tab displays with "Create Phase" button | Initially empty if no phases | | |
| 5 | Click "Create Phase" button | | Create Phase modal opens | | | |
| 6 | Enter phase name | Name: "Discovery & Research" | Phase name input accepts text | | | |
| 7 | Enter phase description | Description: "User research, competitive analysis, requirements gathering" | Description textarea accepts text | | | |
| 8 | View available sprints | | Modal displays list of all project sprints with checkboxes | Sprints show start/end dates | | |
| 9 | Select Sprint 1 | Sprint 1: Nov 4-15, 2025 | Checkbox becomes checked | Must select consecutive sprints | | |
| 10 | Select Sprint 2 | Sprint 2: Nov 18-29, 2025 | Checkbox becomes checked | | | |
| 11 | Attempt to select non-consecutive Sprint 4 | Sprint 4 (skipping Sprint 3) | System prevents selection or shows warning | Validation: only consecutive sprints | | |
| 12 | Verify phase dates auto-calculation | | Phase start shows Nov 4, end shows Nov 29 | Dates derived from selected sprints | | |
| 13 | Click "Create Phase" button | | Form validates required fields | | | |
| 14 | Verify phase creation success | | Success message, modal closes, phase appears in list | | | |
| 15 | Create second phase | Name: "Design & Prototyping", Sprints: 3-5 | Phase creation follows same process | | | |
| 16 | Verify phase appears in timeline | | Phase shows correct start/end dates based on sprints | | | |
| 17 | Verify sprint assignment is visible | | Phase detail shows which sprints are included | | | |
| 18 | Attempt to create overlapping phase | Select sprints already assigned | System prevents sprint reuse or shows warning | Business rule: sprints can't overlap | | |
| 19 | Edit existing phase | Update description, add Sprint 6 | Phase updates successfully, dates recalculate | | | |
| 20 | Verify phase list ordering | | Phases display in chronological order by start date | | | |

---

## 3. TC-003

**Test Case ID:** TC-003

### 3.1 Function Area
Phase Allocation Creation (Product Manager assigns hours to consultants)

#### TEST CASE HEADER

| CATEGORY | DESCRIPTION |
|----------|-------------|
| **Date** | 27 October 2025 |
| **Tester** | Ashe-Shaana Andzenge |
| **Requirement number or description** | Phase Allocation: PM assigns specific hours to each consultant for a phase, creating the resource plan |
| **Requirement Document** | CLAUDE.md - Section 3: Core Workflow, Step 2 (Hour Planning) |
| **Interfaces** | Phase Detail Page, Create Phase Allocation Modal, Consultant Selection |
| **Test Case Dependencies** | TC-002 (Phase must exist), Consultants must be assigned to project |
| **Environment** | Next.js 15, React 19, PostgreSQL with Prisma, Chrome browser, localhost:3000 |
| **Test results** | Accepted ☐ Not Accepted ☐ |
| **Results review by** | Product Owner |

#### TEST CASE BODY

| Step # | Steps to Perform / User action | Data | Expected Results | Comments | Pass | Fail |
|--------|--------------------------------|------|------------------|----------|------|------|
| 1 | Login as Product Manager | Email: johnsmith@example.com | Dashboard loads for PM user | | | |
| 2 | Navigate to project detail page | Project: "E-Commerce Platform Redesign" | Project page displays with phases | | | |
| 3 | Click on "Discovery & Research" phase | | Phase detail view opens showing sprint assignments | | | |
| 4 | Click "Add Allocation" or "Allocate Hours" button | | Phase Allocation modal opens | | | |
| 5 | View available consultants | | Dropdown shows only consultants assigned to this project | Should not show unassigned users | | |
| 6 | Select first consultant | Consultant: Jane Doe | Consultant selected from dropdown | | | |
| 7 | Enter allocated hours for phase | Hours: 60 | Number input accepts positive integer | | | |
| 8 | Click "Create Allocation" button | | Allocation saves successfully | | | |
| 9 | Verify allocation appears in phase | | Jane Doe shows 60 hours allocated for this phase | | | |
| 10 | Create second allocation | Consultant: Mike Johnson, Hours: 40 | Second allocation created | | | |
| 11 | Create third allocation | Consultant: Sarah Lee, Hours: 20 | Third allocation created | | | |
| 12 | Verify total phase allocation | | Phase summary shows total: 120 hours (60+40+20) | | | |
| 13 | Navigate to project budget view | | Budget page shows allocated vs budgeted hours | | | |
| 14 | Verify budget tracking updates | | Allocated hours increment from 0 to 120 out of 500 | | | |
| 15 | Attempt to create duplicate allocation | Consultant: Jane Doe (already allocated) | System prevents duplicate or shows error | One allocation per consultant per phase | | |
| 16 | Edit existing allocation | Change Jane Doe hours from 60 to 80 | Update successful, totals recalculate | | | |
| 17 | Verify budget update after edit | | Allocated hours now shows 140 (80+40+20) | | | |
| 18 | Delete an allocation | Remove Sarah Lee allocation | Allocation removed, totals update to 120 | | | |
| 19 | Verify consultant notification | | Sarah Lee removed, Jane & Mike receive allocation notifications | Email/system notifications sent | | |
| 20 | View allocation from consultant perspective | Login as Jane Doe | Jane sees 80 hour allocation for Discovery phase | Next test case covers this | | |

---

## 4. TC-004

**Test Case ID:** TC-004

### 4.1 Function Area
Weekly Allocation Distribution (Consultant distributes phase hours across weeks)

#### TEST CASE HEADER

| CATEGORY | DESCRIPTION |
|----------|-------------|
| **Date** | 27 October 2025 |
| **Tester** | Luyanda Ndlovu |
| **Requirement number or description** | Weekly Allocation: Consultant takes phase allocation and distributes hours across specific weeks within phase sprints |
| **Requirement Document** | CLAUDE.md - Section 3: Core Workflow, Step 3 |
| **Interfaces** | Weekly Planner View, Allocation Distribution Form, Week Calendar |
| **Test Case Dependencies** | TC-003 (Phase Allocation must exist for consultant) |
| **Environment** | Next.js 15, React 19, PostgreSQL with Prisma, Chrome browser, localhost:3000 |
| **Test results** | Accepted ☐ Not Accepted ☐ |
| **Results review by** | Product Owner |

#### TEST CASE BODY

| Step # | Steps to Perform / User action | Data | Expected Results | Comments | Pass | Fail |
|--------|--------------------------------|------|------------------|----------|------|------|
| 1 | Login as Consultant | Email: janedoe@example.com | Successful login to consultant account | | | |
| 2 | Navigate to Weekly Planner | Menu: "Weekly Planner" | Weekly planner view loads showing current week | | | |
| 3 | View current week allocations | Week of Nov 4-8, 2025 | Page shows all phase allocations for this week | | | |
| 4 | Identify unplanned phase allocation | Phase: "Discovery & Research", Total: 80 hours | Allocation shows 80 hours total, 0 distributed | Status: Unplanned | | |
| 5 | Click on phase allocation card | | Allocation detail modal or form opens | | | |
| 6 | View phase duration | | System shows phase spans 4 weeks (Sprint 1 & 2) | Nov 4-29, 2025 | | |
| 7 | View week breakdown | | Form displays 4 week rows with input fields | Week 1, Week 2, Week 3, Week 4 | | |
| 8 | Enter hours for Week 1 | Week of Nov 4-8: 25 hours | Input accepts number | | | |
| 9 | Enter hours for Week 2 | Week of Nov 11-15: 25 hours | Input accepts number | | | |
| 10 | Enter hours for Week 3 | Week of Nov 18-22: 20 hours | Input accepts number | | | |
| 11 | Enter hours for Week 4 | Week of Nov 25-29: 10 hours | Input accepts number | | | |
| 12 | Verify total hours calculation | | System shows total: 80 hours (25+25+20+10) | Real-time validation | | |
| 13 | Attempt to exceed allocation | Change Week 1 to 50 hours (total 105) | System shows error: exceeds 80 hour allocation | Validation prevents over-allocation | | |
| 14 | Correct to valid distribution | Week 1: 25 hours again | Error clears, total matches allocation | | | |
| 15 | Save weekly allocations | | Allocations save successfully | | | |
| 16 | Verify allocation status update | | Phase allocation status changes to "Planned" | | | |
| 17 | Navigate to different week | Select week of Nov 11-15 | Calendar shows 25 hours allocated for Discovery | | | |
| 18 | View all allocations for week | | Week view shows breakdown by project/phase | Shows total hours for week | | |
| 19 | Edit existing weekly allocation | Change Week 3 from 20 to 15, Week 4 from 10 to 15 | Update successful, maintains 80 total | | | |
| 20 | Verify changes reflected in timeline | | Growth Team timeline updates with new distribution | Cross-check with TC-006 | | |
| 21 | Attempt partial allocation | Allocate only 60 of 80 hours | System allows partial, shows 20 hours unallocated | Warning but not error | | |

---

## 5. TC-005

**Test Case ID:** TC-005

### 5.1 Function Area
Hour Change Request Submission and Approval Workflow

#### TEST CASE HEADER

| CATEGORY | DESCRIPTION |
|----------|-------------|
| **Date** | 27 October 2025 |
| **Tester** | Ciaran Formby |
| **Requirement number or description** | Hour Change Request: Consultant requests allocation changes (increase/decrease/transfer), Growth Team approves/rejects |
| **Requirement Document** | CLAUDE.md - Section 3: Core Workflow, Step 4 (Handling Changes) |
| **Interfaces** | Hour Change Request Modal, Approval Dashboard, Notification System |
| **Test Case Dependencies** | TC-004 (Weekly allocations must exist) |
| **Environment** | Next.js 15, React 19, PostgreSQL with Prisma, Chrome browser, localhost:3000, Email system |
| **Test results** | Accepted ☐ Not Accepted ☐ |
| **Results review by** | Product Owner |

#### TEST CASE BODY

| Step # | Steps to Perform / User action | Data | Expected Results | Comments | Pass | Fail |
|--------|--------------------------------|------|------------------|----------|------|------|
| 1 | Login as Consultant | Email: janedoe@example.com | Dashboard loads for consultant | | | |
| 2 | Navigate to Weekly Planner | | Planner shows current allocations | | | |
| 3 | Select phase allocation to modify | Phase: "Discovery & Research" | Phase detail shows current 80 hour allocation | | | |
| 4 | Click "Request Hour Change" button | | Hour Change Request modal opens | | | |
| 5 | Select change type | Type: "Increase Hours" | Radio button selected | Options: Increase, Decrease, Transfer | | |
| 6 | Enter requested hour change | Change: +10 hours (80 to 90) | Number input accepts value | | | |
| 7 | Enter reason for change | Reason: "Additional research scope identified, need more time for competitive analysis" | Textarea accepts detailed explanation | Required field | | |
| 8 | Submit hour change request | | Request submits successfully | | | |
| 9 | Verify request status | | Request shows status: "Pending" | | | |
| 10 | Verify notification to Growth Team | | Growth Team receives notification of new request | Email + in-app notification | | |
| 11 | Logout consultant, login as Growth Team | Email: growthteam@example.com | Growth Team dashboard loads | | | |
| 12 | Navigate to Hour Approvals page | Menu: "Hour Approvals" | Approval dashboard shows pending requests | | | |
| 13 | View pending request details | | Request shows: Jane Doe, Discovery phase, +10 hours, reason | | | |
| 14 | Click "View Details" | | Modal shows full request context and history | | | |
| 15 | Approve request | Click "Approve" button | Confirmation dialog appears | | | |
| 16 | Confirm approval | | Request status updates to "Approved" | | | |
| 17 | Verify allocation update | | Jane's allocation increases from 80 to 90 hours | Automatic update | | |
| 18 | Verify project budget update | | Project budget shows allocated hours increased | Real-time budget tracking | | |
| 19 | Verify consultant notification | | Jane receives approval notification | Email + in-app | | |
| 20 | Logout, login as Jane | | Jane can now distribute 90 hours in weekly planner | Allocation updated | | |
| 21 | Create hour transfer request | Phase: Discovery, Transfer 10 hours to Mike Johnson | Transfer request type selected | | | |
| 22 | Enter transfer reason | Reason: "Mike has more capacity, shifting analysis work" | Detailed reason provided | | | |
| 23 | Submit transfer request | | Request created, status: Pending | | | |
| 24 | Login as Growth Team, reject request | Rejection reason: "Keep allocation as is, Discovery phase ending soon" | Request status: Rejected | | | |
| 25 | Verify consultant notification of rejection | | Jane receives rejection notification with reason | | | |
| 26 | Verify allocation unchanged after rejection | | Jane still has 90 hours, Mike unchanged | No automatic changes on rejection | | |

---

## 6. TC-006

**Test Case ID:** TC-006

### 6.1 Function Area
Portfolio Timeline Viewing and Interactive Drill-Down (Growth Team Resource Management)

#### TEST CASE HEADER

| CATEGORY | DESCRIPTION |
|----------|-------------|
| **Date** | 27 October 2025 |
| **Tester** | Naledi Tshapi |
| **Requirement number or description** | Resource Timeline View: Growth Team views portfolio Gantt chart with all consultants' weekly allocations, interactive drill-down |
| **Requirement Document** | CLAUDE.md - Section 3.1: The Growth Team Resource Timeline View |
| **Interfaces** | Gantt Chart / Portfolio Timeline, Week Block Drill-Down Modal |
| **Test Case Dependencies** | TC-004 (Weekly allocations must exist for multiple consultants/projects) |
| **Environment** | Next.js 15, React 19, PostgreSQL with Prisma, Chrome browser, localhost:3000, Wide screen recommended |
| **Test results** | Accepted ☐ Not Accepted ☐ |
| **Results review by** | Product Owner |

#### TEST CASE BODY

| Step # | Steps to Perform / User action | Data | Expected Results | Comments | Pass | Fail |
|--------|--------------------------------|------|------------------|----------|------|------|
| 1 | Login as Growth Team member | Email: growthteam@example.com | Growth Team dashboard loads | | | |
| 2 | Navigate to Portfolio Timeline | Menu: "Gantt" or "Portfolio Timeline" | Timeline view loads with horizontal scrolling | | | |
| 3 | Verify timeline header | | Header shows weeks/months across top (horizontal axis) | Starting from current date | | |
| 4 | Verify consultant list (vertical axis) | | Left sidebar shows all consultants in company alphabetically | | | |
| 5 | View Jane Doe's timeline row | Consultant: Jane Doe | Row displays colored blocks for each week | | | |
| 6 | Verify week block display | Week of Nov 4-8 | Block shows total hours allocated (e.g., "25h") | Color indicates utilization | | |
| 7 | Verify color coding | | Different colors represent different utilization levels | Green: under 40h, Yellow: 40-45h, Red: over 45h | | |
| 8 | Click on Jane's week block | Week of Nov 11-15 | Drill-down modal/popover opens | | | |
| 9 | Verify drill-down content | | Modal shows breakdown of Jane's allocations for that week | | | |
| 10 | View allocation breakdown | | Shows: Project name, Phase name, Allocated hours | E.g., "E-Commerce: Discovery - 25h" | | |
| 11 | Verify multiple project display | If Jane has 2+ projects same week | Each project/phase listed separately with hours | | | |
| 12 | Verify total in drill-down | | Modal footer shows total hours for week | Matches block label | | |
| 13 | Close drill-down modal | Click outside or close button | Modal closes, returns to timeline view | | | |
| 14 | Scroll timeline horizontally | Scroll right 4 weeks | Timeline scrolls smoothly, shows future weeks | | | |
| 15 | View consultant with no allocations | Consultant with empty week | Week block is empty or shows "0h" | Greyed out or minimal styling | | |
| 16 | Filter by date range | Select Nov 2025 only | Timeline adjusts to show only November weeks | Date range selector | | |
| 17 | Search for specific consultant | Search: "Jane Doe" | Consultant list filters to show only Jane | Search/filter functionality | | |
| 18 | Clear search filter | | All consultants display again | | | |
| 19 | View multiple consultants on same project | E-Commerce project team | Jane, Mike, Sarah all show blocks for same weeks | Coordination view | | |
| 20 | Identify over-allocated week | Find consultant with >45 hours | Block appears in red/warning color | Visual indicator of overallocation | | |
| 21 | Export timeline view | Click "Export" button | Timeline exports as PDF or CSV | Optional feature | | |
| 22 | Verify responsive layout | Resize browser window | Timeline remains usable, may switch to condensed view | Mobile/tablet consideration | | |

---

## 7. TC-007

**Test Case ID:** TC-007

### 7.1 Function Area
User Authentication and Role-Based Access Control

#### TEST CASE HEADER

| CATEGORY | DESCRIPTION |
|----------|-------------|
| **Date** | 27 October 2025 |
| **Tester** | Ashe-Shaana Andzenge |
| **Requirement number or description** | Authentication & Authorization: Role-based access control for Growth Team, Product Manager, and Consultant roles with proper permissions |
| **Requirement Document** | CLAUDE.md - Architecture Section: Authentication & Authorization |
| **Interfaces** | Login Page, Registration, Dashboard (role-specific), Protected Routes |
| **Test Case Dependencies** | Database seeded with users of different roles |
| **Environment** | Next.js 15, NextAuth.js, PostgreSQL with Prisma, Chrome browser, localhost:3000 |
| **Test results** | Accepted ☐ Not Accepted ☐ |
| **Results review by** | Product Owner |

#### TEST CASE BODY

| Step # | Steps to Perform / User action | Data | Expected Results | Comments | Pass | Fail |
|--------|--------------------------------|------|------------------|----------|------|------|
| 1 | Navigate to application URL | URL: http://localhost:3000 | Redirects to login page if not authenticated | | | |
| 2 | Verify login options | | Page shows Google OAuth and Credentials login | | | |
| 3 | Attempt to access protected route directly | URL: /dashboard/projects | Redirects to login page with return URL | Middleware protection | | |
| 4 | Login with invalid credentials | Email: invalid@example.com, Password: wrong | Error message: "Invalid credentials" | | | |
| 5 | Register new user | Email: newuser@example.com, Name: New User, Password: ValidPass123! | Account created, status: "Pending Approval" | | | |
| 6 | Attempt login with pending user | Email: newuser@example.com | Redirects to /pending-approval page | Cannot access dashboard | | |
| 7 | Verify pending approval message | | Page shows: "Account pending Growth Team approval" | | | |
| 8 | Logout pending user | | Returns to login page | | | |
| 9 | Login as Growth Team admin | Email: growthteam@example.com, Password: valid | Dashboard loads successfully | | | |
| 10 | Navigate to Admin > User Management | Menu: Admin | User approval list displays | | | |
| 11 | Approve new user as CONSULTANT | User: newuser@example.com, Role: CONSULTANT | User approved with consultant role | | | |
| 12 | Logout, login as newly approved consultant | Email: newuser@example.com | Dashboard loads, shows consultant-specific views | | | |
| 13 | Verify consultant permissions | | Can access: Weekly Planner, Hour Requests | | | |
| 14 | Attempt to access Growth Team route | URL: /dashboard/hour-approvals | Access denied or redirects to dashboard | 403 or redirect | | |
| 15 | Attempt to create project as consultant | | "Create Project" button not visible/disabled | Only Growth Team can create | | |
| 16 | Logout, login as Product Manager | Email: johnsmith@example.com (PM of project) | Dashboard loads with PM-specific features | | | |
| 17 | Verify PM permissions on assigned project | Project: E-Commerce | Can create phases, allocate hours for this project | | | |
| 18 | Attempt to modify unassigned project | Navigate to project where not PM | Cannot see phase allocation controls | Read-only access or no access | | |
| 19 | Logout, login as Growth Team | Email: growthteam@example.com | Full dashboard access | | | |
| 20 | Verify Growth Team permissions | | Can access: All Projects, User Management, Hour Approvals, Budget, Portfolio Timeline | Highest permission level | | |
| 21 | Test session timeout | Wait 15 minutes of inactivity | Session expires, redirects to login on next action | 15-min inactivity timeout | | |
| 22 | Test Google OAuth login | Click "Sign in with Google" | OAuth flow initiates, redirects to Google | Requires Google dev account | | |
| 23 | Verify session persistence | Login, close browser, reopen | Session maintained within 4-hour window | 4-hour session expiry | | |
| 24 | Test password reset flow | Click "Forgot Password" | Password reset email sent, can reset password | Optional feature | | |

---

## Additional Test Cases

### TC-008 - Sprint Auto-Generation Logic
**Function Area:** Automated Sprint Creation Based on Project Dates
- Validates that 2-week sprints are created starting on Mondays
- Tests edge cases: mid-week start dates, partial final sprint
- Verifies sprint dates align with project timeline

### TC-009 - Budget Tracking and Over-Budget Warnings
**Function Area:** Real-Time Budget Monitoring
- Tests budget calculation: budgeted vs. allocated hours
- Validates visual indicators (green/yellow/red) based on utilization
- Tests over-budget warning when allocations exceed budget

### TC-010 - Notification System End-to-End
**Function Area:** Email and In-App Notifications
- Tests notification triggers: allocations, approvals, rejections
- Validates email sending via React Email
- Tests in-app notification center with read/unread states

### TC-011 - Phase Allocation Validation Rules
**Function Area:** Business Rule Enforcement
- Tests: Cannot allocate more hours than project budget
- Tests: Cannot allocate to consultants not on project
- Tests: One allocation per consultant per phase

### TC-012 - Weekly Planner Multi-Project View
**Function Area:** Consultant Weekly Planning Interface
- Tests viewing allocations across multiple projects in same week
- Validates total weekly hours calculation
- Tests capacity warnings (>40 hours/week)

---

## Notes

1. **Environment Setup:** Before running tests, ensure:
   - Database is seeded with test data (`npx prisma db seed`)
   - Development server is running (`npm run dev`)
   - Email system is configured (or use test mode)

2. **Test Data:** Tests assume existence of:
   - Growth Team user: growthteam@example.com
   - Consultants: Jane Doe, Mike Johnson, Sarah Lee, John Smith
   - Project: "E-Commerce Platform Redesign"

3. **Test Execution Order:**
   - TC-001 through TC-007 should be executed in sequence as they build upon each other
   - TC-008 onwards can be executed independently

4. **Browser Compatibility:**
   - Primary: Chrome (latest)
   - Secondary: Firefox, Safari, Edge (latest versions)

5. **Accessibility:** Future test cases should include:
   - Keyboard navigation testing
   - Screen reader compatibility
   - WCAG 2.1 AA compliance

6. **Performance:** Additional performance test cases needed for:
   - Timeline rendering with 50+ consultants
   - Large datasets (100+ projects)
   - Concurrent user sessions

---

**Document Version:** 1.0
**Last Updated:** 27 October 2025
**Status:** Draft - Pending Review
