# Agility User Guide
## Consultant Resource & Progress Insight System

**Version:** 1.0.0
**Date:** October 25, 2025

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
   - [Registration & Login](#registration--login)
   - [Email Verification](#email-verification)
   - [Pending Approval](#pending-approval)
3. [User Roles](#user-roles)
4. [Growth Team Features](#growth-team-features)
   - [Dashboard Overview](#growth-team-dashboard-overview)
   - [Resource Timeline](#resource-timeline)
   - [Project Management](#project-management)
   - [Hour Change Approvals](#hour-change-approvals)
   - [User Management](#user-management)
5. [Product Manager Features](#product-manager-features)
   - [Dashboard Overview](#product-manager-dashboard-overview)
   - [Project Overview](#project-overview)
   - [Phase Management](#phase-management)
   - [Consultant Allocation](#consultant-allocation)
   - [Team Allocations View](#team-allocations-view)
6. [Consultant Features](#consultant-features)
   - [Dashboard Overview](#consultant-dashboard-overview)
   - [Weekly Planner](#weekly-planner)
   - [Hour Change Requests](#hour-change-requests)
7. [Notifications](#notifications)
8. [Budget Tracking](#budget-tracking)
9. [Profile Management](#profile-management)

---

## Introduction

Agility is a specialized web-based resource planning and progress tracking system designed to bridge the gap between task management and high-level resource allocation. The system serves three primary user roles: **Growth Team**, **Product Managers**, and **Consultants**, each with distinct responsibilities and views.

### Key Concepts

- **Projects**: High-level initiatives managed by Product Managers
- **Sprints**: Fixed 2-week time-boxes (starting on Mondays) auto-generated for project duration
- **Phases**: Strategic project stages linked to specific sprints
- **Phase Allocations**: Budgeted hours assigned to consultants for specific phases
- **Weekly Allocations**: Consultant-created breakdown of phase hours across specific weeks

---

## Getting Started

### Registration & Login

**Screenshot Needed:** Login screen showing email and password fields

Upon accessing the application, users are presented with the login screen.

**Login Process:**
1. Enter your email address
2. Enter your password
3. Click "Sign In"
4. If credentials are valid, you'll be redirected to your role-specific dashboard

**Screenshot Needed:** Registration form with email, password, name fields

**Registration Process:**
1. Click "Create Account" or "Register" from the login screen
2. Fill in the following information:
   - Full Name
   - Email Address (must be a valid email)
   - Password (minimum 6 characters)
   - Confirm Password
3. Select your role (if applicable)
4. Click "Create Account"
5. A verification email will be sent to your email address

### Email Verification

**Screenshot Needed:** Email verification pending screen

After registration, you must verify your email address:

1. Check your email inbox for a verification email from Agility
2. Click the verification link in the email
3. You'll be redirected to the login page
4. Log in with your credentials

**Note:** You cannot access the full system until your email is verified.

### Pending Approval

**Screenshot Needed:** Pending approval screen for new users

If you're registering as a **Growth Team** member or **Consultant**, your account requires approval:

1. After email verification, you'll see a "Pending Approval" message
2. An administrator will review your request
3. You'll receive an email notification once approved
4. Log back in to access the full system

---

## User Roles

Agility supports three distinct user roles, each with specific permissions and views:

### 1. Growth Team
**Responsibilities:**
- High-level resource management across all consultants
- Project creation and consultant assignment
- Approval of hour change requests
- Budget oversight

### 2. Product Manager
**Responsibilities:**
- Project phase planning
- Sprint assignment to phases
- Consultant hour allocation at the phase level
- Team resource oversight

### 3. Consultant
**Responsibilities:**
- Weekly hour planning based on phase allocations
- Submitting hour change requests
- Tracking personal workload and availability

---

## Growth Team Features

### Growth Team Dashboard Overview

**Screenshot Needed:** Growth Team dashboard showing key metrics

The Growth Team dashboard provides a high-level overview of:

- **Active Projects**: Number of ongoing projects
- **Total Consultants**: Available workforce
- **Pending Approvals**: Hour change requests awaiting review
- **Budget Status**: Overall budget vs. allocated hours across all projects

**Navigation:**
- Use the sidebar to access different sections
- Click on project cards to view detailed project information
- Access notifications via the bell icon in the header

### Resource Timeline

**Screenshot Needed:** Resource Timeline view showing consultant allocations by week

The Resource Timeline is the primary tool for visualizing consultant availability and workload.

**Key Features:**
- **Horizontal Timeline**: Weeks displayed across the top
- **Vertical Axis**: All consultants listed on the left
- **Weekly Blocks**: Each consultant's total allocated hours per week
- **Color Coding**: Visual indicators for workload intensity
  - Green: Under 40 hours
  - Yellow: 40 hours (full capacity)
  - Red: Over 40 hours (overallocated)

**How to Use:**
1. Navigate to "Resource Timeline" from the sidebar
2. Scroll horizontally to view different weeks
3. Click on a consultant's weekly block to see detailed breakdown:
   - Projects they're working on
   - Phases within those projects
   - Specific hours allocated
4. Use filters to view specific date ranges or consultants

### Project Management

**Screenshot Needed:** Create Project modal with all fields

**Creating a New Project:**

1. Click "Create Project" button on the dashboard
2. Fill in project details:
   - **Project Name**
   - **Description**
   - **Start Date**
   - **End Date**
   - **Total Budgeted Hours**
3. **Assign Product Manager**: Select from dropdown of available consultants
4. **Assign Consultants**: Select team members who will work on this project
5. Click "Create Project"

**Screenshot Needed:** Project details view showing phases, consultants, and budget

**Managing Existing Projects:**

- View all projects from the "All Projects" page
- Click on a project to see:
  - Phase breakdown
  - Consultant assignments
  - Budget tracking (budgeted vs. allocated hours)
  - Sprint timeline
- Edit project details via the "Edit" button
- Add/remove consultants from the project

### Hour Change Approvals

**Screenshot Needed:** Hour change approval dashboard showing pending requests

Growth Team members are responsible for approving or rejecting hour change requests submitted by Product Managers.

**Approval Process:**

1. Navigate to "Hour Approvals" from the sidebar
2. View pending requests with details:
   - **Requester**: Who submitted the request
   - **Project & Phase**: Where the change applies
   - **Type**: Increase, Decrease, or Transfer
   - **Amount**: Hours being changed
   - **Reason**: Justification provided
   - **Impact**: Budget and allocation implications
3. Review the request details
4. Choose action:
   - **Approve**: Accept the change (updates allocations automatically)
   - **Reject**: Deny the request with optional feedback
5. Request is processed and requester receives notification

**Screenshot Needed:** Approval modal showing request details and approve/reject buttons

**Request Types:**

- **Hour Increase**: Adding more hours to a consultant's phase allocation
- **Hour Decrease**: Reducing hours from a phase allocation
- **Hour Transfer**: Moving hours from one consultant to another
- **Consultant Removal**: Removing a consultant from a phase (deletion pending status)

### User Management

**Screenshot Needed:** User management screen showing pending and approved users

Growth Team members can manage user accounts:

**Pending User Approvals:**

1. Navigate to "Admin" → "User Approvals"
2. View pending registration requests
3. Review user information:
   - Name
   - Email
   - Requested role
4. Approve or reject the registration
5. User receives email notification of decision

**Managing Active Users:**

- View all active consultants and their roles
- Update user information if needed
- Deactivate user accounts (with caution)

---

## Product Manager Features

### Product Manager Dashboard Overview

**Screenshot Needed:** Product Manager dashboard showing their projects

Product Managers see a focused view of projects they manage:

- **My Projects**: List of projects you're managing
- **Active Phases**: Current phases requiring attention
- **Team Workload**: Overview of consultant allocations
- **Pending Requests**: Your submitted hour change requests

### Project Overview

**Screenshot Needed:** Project detail page showing phases, consultants, and sprints

When viewing a project you manage:

- **Project Information**: Name, dates, budget status
- **Phases Section**: All phases with their status
- **Consultants Section**: Team members and their total allocations
- **Sprints Timeline**: Visual representation of sprint schedule
- **Budget Tracker**: Real-time budget vs. allocated hours

### Phase Management

**Screenshot Needed:** Create Phase modal with sprint selection

Phases are strategic stages of your project linked to specific sprints.

**Creating a Phase:**

1. Navigate to your project
2. Click "Add Phase" button
3. Fill in phase details:
   - **Phase Name** (e.g., "Design Phase", "Development Sprint 1")
   - **Description** (optional)
4. **Select Sprints**: Choose one or more consecutive sprints
   - Sprints are pre-generated 2-week periods
   - Phase dates are automatically set based on selected sprints
   - Example: Selecting Sprint 1 & Sprint 2 creates a 4-week phase
5. Click "Create Phase"

**Screenshot Needed:** Phase card showing status, dates, and allocated hours

**Phase Status Indicators:**

- **Not Started**: Phase hasn't begun yet (gray)
- **In Progress**: Currently active phase (purple)
- **Completed**: Phase end date has passed (green)
- **At Risk**: Over-allocated or behind schedule (red)

### Consultant Allocation

**Screenshot Needed:** Phase allocation form showing consultant selection and hours input

After creating a phase, allocate hours to consultants:

**Creating Phase Allocations:**

1. Click "Allocate Hours" on a phase card
2. Select a consultant from the dropdown (only project team members shown)
3. Enter total hours for this consultant on this phase
4. Review allocation summary:
   - Phase duration (start and end dates)
   - Selected consultant's current workload
   - Budget impact
5. Click "Allocate"

**Screenshot Needed:** Phase allocation cards showing consultant, hours, and status badges

**Allocation Status:**

- **Pending**: Awaiting Growth Team approval (yellow badge)
- **Approved**: Active allocation, consultant can plan hours (green badge)
- **Rejected**: Allocation was denied (red badge)
- **Deletion Pending**: Removal request awaiting approval (red diagonal stripes)

**Modifying Allocations:**

If you need to adjust hours or remove a consultant:

1. Click "Edit" on the phase allocation card
2. Choose modification type:
   - **Increase Hours**: Add hours to existing allocation
   - **Decrease Hours**: Reduce hours (prevented if consultant has already planned hours)
   - **Remove Consultant**: Request complete removal
3. Provide a reason for the change
4. Submit hour change request
5. Wait for Growth Team approval

**Screenshot Needed:** Warning dialog when trying to reduce hours below planned hours

**Important Notes:**

- You cannot reduce hours below what a consultant has already planned in weekly allocations
- Removing a consultant with planned hours creates a "Deletion Pending" status
- All allocation changes require Growth Team approval

### Team Allocations View

**Screenshot Needed:** Team allocations page showing all consultants' weekly breakdown

View your project team's weekly allocation breakdown:

1. Navigate to "Team Allocations" from project page
2. See each consultant's weekly planned hours
3. Filter by specific weeks or consultants
4. Identify gaps or over-allocations in real-time

---

## Consultant Features

### Consultant Dashboard Overview

**Screenshot Needed:** Consultant dashboard showing phase allocations and availability

The Consultant dashboard provides a personalized view of your work:

**Key Sections:**

1. **My Phase Allocations**: All phases you're assigned to
   - Displays phase name, project, total allocated hours
   - Status badges: In Progress, Starts in X days/weeks
   - Progress bars showing hours planned vs. allocated
2. **Weekly Availability**: Calendar view of upcoming weeks
3. **Recent Notifications**: Hour changes, approvals, assignments

**Phase Allocation Cards:**

**Screenshot Needed:** Close-up of phase allocation card with status badge and progress bar

Each card shows:
- Project and phase name
- Total allocated hours
- Hours you've planned so far
- Progress indicator
- Status badge (color-coded by urgency):
  - **Purple**: In progress (most important)
  - **Green**: Starts today
  - **Blue**: Starts in 1-7 days
  - **Gray**: Starts in 8+ days

### Weekly Planner

**Screenshot Needed:** Weekly planner view showing multiple phases and hour input fields

The Weekly Planner is your primary tool for distributing phase hours across specific weeks.

**How It Works:**

1. Navigate to "Weekly Planner" from the sidebar
2. Select a week using the week picker
3. View all phase allocations that fall within that week
4. Plan your hours for each phase

**Screenshot Needed:** Week picker and phase allocation section with hours input

**Planning Hours for a Phase:**

1. Each phase allocation shows:
   - Phase details (name, project, dates)
   - Total allocated hours
   - Hours already planned in other weeks
   - Remaining hours to distribute
2. Enter hours for the current week in the input field
3. Hours are automatically saved
4. Visual progress bar updates in real-time

**Screenshot Needed:** Phase allocation with diagonal red stripes and "Pending Deletion" badge

**Allocation Status Indicators:**

- **Approved** (Green background): Normal allocation, you can plan hours
- **Pending** (Yellow background): Awaiting approval, cannot plan hours yet
- **Deletion Pending** (Red diagonal stripes):
  - Product Manager has requested your removal
  - Hour planning is disabled
  - You'll see an explanation of next steps:
    - If approved: Allocation and all weekly plans deleted
    - If rejected: Returns to approved status, you can continue planning

**Screenshot Needed:** Blocking message for deletion pending allocation

**Weekly Planner Features:**

- **Total Hours for Week**: Summary of all planned hours for selected week
- **Availability Indicator**: Shows if you're under/at/over 40 hours
- **Quick Navigation**: Jump to different weeks easily
- **Auto-Save**: Changes are saved automatically
- **Validation**: Prevents over-planning beyond allocated hours

### Hour Change Requests

**Screenshot Needed:** Hour change request form

If your workload changes and you need to adjust your allocation:

**When to Use:**

- You need more hours than allocated for a phase
- You need fewer hours (if you haven't planned them yet)
- You want to transfer some of your hours to another consultant

**How to Submit:**

1. From your dashboard or weekly planner, find the phase allocation
2. Click "Request Change" button
3. Select change type:
   - **Increase Hours**
   - **Decrease Hours** (only if hours not already planned)
   - **Transfer Hours** (move to another consultant)
4. Enter amount and select recipient (if transferring)
5. Provide detailed reason/justification
6. Submit request

**Screenshot Needed:** Hour change request status in notifications

**Tracking Your Request:**

- View status in "Notifications" section
- Receive email notification when approved/rejected
- If approved: Allocation automatically updates
- If rejected: Original allocation remains unchanged

---

## Notifications

**Screenshot Needed:** Notification dropdown showing multiple notification types

The notification system keeps you informed of important updates.

**Accessing Notifications:**

1. Click the bell icon in the header
2. View recent notifications in the dropdown
3. Click "View All Notifications" for full history

**Screenshot Needed:** Different notification types with their icons

**Notification Types:**

| Icon | Type | Description |
|------|------|-------------|
| 👥 | Project Assignment | You've been added to a project |
| 📝 | Phase Allocation | New phase allocation created for you |
| ⏰ | Hour Change Request | Hour change request status update |
| ✅ | Approved | Your request was approved |
| ❌ | Rejected | Your request was rejected |
| ⚠️ | Phase Deadline Warning | Upcoming phase deadline |
| 🚨 | Overdue Approval | Approval action needed |

**Notification Features:**

- **Unread Badge**: Red counter showing unread notifications
- **Mark as Read**: Click checkmark on individual notifications
- **Mark All as Read**: Clear all unread at once
- **Action Links**: Click notification to navigate to relevant page
- **Real-time Updates**: Notifications appear instantly

---

## Budget Tracking

**Screenshot Needed:** Budget overview page showing projects and their budget status

Agility provides real-time budget tracking across projects.

**Budget Metrics:**

- **Budgeted Hours**: Total hours allocated to project at creation
- **Allocated Hours**: Sum of all phase allocations
- **Remaining Budget**: Budgeted - Allocated
- **Utilization Percentage**: (Allocated / Budgeted) × 100

**Visual Indicators:**

- **Green**: Under budget (< 90% utilized)
- **Yellow**: Near budget (90-100% utilized)
- **Red**: Over budget (> 100% utilized)

**Screenshot Needed:** Project budget card with progress bar and metrics

**Accessing Budget Information:**

- **Growth Team**: View all projects' budgets from Budget Overview page
- **Product Managers**: See budget status on project detail page
- **Consultants**: Limited budget visibility (see allocation amounts only)

---

## Profile Management

**Screenshot Needed:** Profile page showing user information and edit options

Manage your account settings and information.

**Accessing Your Profile:**

1. Click on your avatar/name in the sidebar
2. Select "Profile" from the dropdown

**Profile Information:**

- Name
- Email address
- Role
- Profile picture (if applicable)

**Updating Profile:**

1. Click "Edit Profile" button
2. Modify editable fields
3. Upload new profile picture (if desired)
4. Click "Save Changes"

**Password Management:**

1. Navigate to "Change Password" section
2. Enter current password
3. Enter new password
4. Confirm new password
5. Click "Update Password"

**Logout:**

- Click "Sign Out" button in sidebar
- You'll be returned to the login screen

---

## Screenshot Requirements Summary

Here's a complete list of screenshots needed for the user guide:

### Getting Started (4 screenshots)
1. Login screen showing email and password fields
2. Registration form with email, password, name fields
3. Email verification pending screen
4. Pending approval screen for new users

### Growth Team (9 screenshots)
5. Growth Team dashboard showing key metrics
6. Resource Timeline view showing consultant allocations by week
7. Create Project modal with all fields
8. Project details view showing phases, consultants, and budget
9. Hour change approval dashboard showing pending requests
10. Approval modal showing request details and approve/reject buttons
11. User management screen showing pending and approved users
12. Resource Timeline expanded view (clicking on consultant's week block)
13. Budget overview page showing multiple projects

### Product Manager (8 screenshots)
14. Product Manager dashboard showing their projects
15. Project detail page showing phases, consultants, and sprints
16. Create Phase modal with sprint selection
17. Phase card showing status, dates, and allocated hours
18. Phase allocation form showing consultant selection and hours input
19. Phase allocation cards showing consultant, hours, and status badges
20. Warning dialog when trying to reduce hours below planned hours
21. Team allocations page showing all consultants' weekly breakdown

### Consultant (7 screenshots)
22. Consultant dashboard showing phase allocations and availability
23. Close-up of phase allocation card with status badge and progress bar
24. Weekly planner view showing multiple phases and hour input fields
25. Week picker and phase allocation section with hours input
26. Phase allocation with diagonal red stripes and "Pending Deletion" badge
27. Blocking message for deletion pending allocation
28. Hour change request form
29. Hour change request status in notifications

### Notifications (2 screenshots)
30. Notification dropdown showing multiple notification types
31. Different notification types with their icons (can be montage)

### Budget & Profile (2 screenshots)
32. Project budget card with progress bar and metrics
33. Profile page showing user information and edit options

**Total Screenshots Needed: 33**

---

## Tips for Best Experience

1. **Check Notifications Regularly**: Stay updated on approvals and changes
2. **Plan Hours Weekly**: Don't wait until the last minute to distribute your phase hours
3. **Provide Clear Reasons**: When submitting hour change requests, detailed justifications help approvals go faster
4. **Monitor Your Availability**: Keep track of your total weekly hours to avoid over-commitment
5. **Communicate with Your PM**: If you foresee issues with your allocation, reach out proactively

---

## Support

For technical support or questions about using Agility:

- Contact your system administrator
- Email: support@agility.example.com
- Check the FAQ section in the application

---

**Document Version:** 1.0.0
**Last Updated:** October 25, 2025
**System:** Agility - Consultant Resource & Progress Insight System
