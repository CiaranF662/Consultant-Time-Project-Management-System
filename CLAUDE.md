# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Project Brief: Consultant Resource & Progress Insight System
Generated on: 2025-08-28
1. Project Vision & Core Concept
To create a specialized, web-based insight tool that serves as a strategic layer on top of Jira. The system's primary goal is to automate and enhance the Growth Team's resource planning and progress tracking, replacing their manual Airtable process.
This application is not a project management system; it is a resource and progress visibility tool. It bridges the critical gap between the granular task management in Jira and the high-level weekly resource allocation that the Growth Team needs to monitor.
2. System Hierarchy & Data Flow
The application's structure is designed to support a top-down planning and allocation workflow.
•	Project: The highest-level entity, mirroring a project in Jira.
•	Sprint: Fixed, two-week time-boxes (starting on a Monday) that are automatically generated for the project's duration. Sprints act as the foundational "calendar" for all planning.
•	Phase: Strategic stages of a project. A phase's duration is now dynamically determined by the start date of the earliest sprint assigned to it and the end date of the latest sprint assigned to it.
•	Phase Allocation: This is a new concept. It represents the "budget" of hours a specific Consultant is planned to work on a specific Phase, as determined by the Product Manager.
•	Weekly Allocation: This is the breakdown of a Phase Allocation. The consultant distributes their total allocated hours for a phase across the specific weeks of the sprints that make up that phase.
3. User Roles & Key Views
3.1. The Growth Team: The Resource Timeline View
The Growth Team's dashboard is a powerful, interactive timeline designed for high-level resource management.
•	Layout: It features a horizontal, scrolling timeline divided by weeks. On the vertical axis, every consultant in the company is listed.
•	Weekly Blocks: For each consultant, each week is represented by a block that shows their total allocated hoursfor that week across all their projects.
•	Interactive Drill-Down: When a Growth Team member clicks on a consultant's weekly block, it expands to show a detailed breakdown of that consultant's allocation for the week, listing each project, phase, and the hours assigned.
•	Hour Change Approvals: They have the crucial function of approving or rejecting all HourChangeRequests.
3.2. The Product Manager
The Product Manager is responsible for the strategic resource planning within each project.
•	Project View: A view where they can manage the project's phases.
•	Phase Creation: When creating a Phase, the Product Manager selects one or more consecutive Sprints from a list. The phase's start and end dates are automatically set based on this selection.
•	Hour Planning: For each phase, the Product Manager creates Phase Allocations, assigning a specific number of hours to each consultant who will work on that phase. This is the official plan for billing and resource management.
3.3. The Consultant
The Consultant's role is to take the high-level plan from the Product Manager and create a detailed weekly execution plan.
•	Primary View: A weekly allocation planner. When a consultant views a week, they see all the Phase Allocations they have been assigned that fall within that week.
•	Weekly Allocation: Their primary task is to take the total hours from a Phase Allocation and distribute them across the weeks of the sprints that make up that phase.
•	Hour Change Requests: If their planned work changes, they can initiate an HourChangeRequest.
 
3. The Core Workflow: From Creation to Allocation
This workflow outlines the end-to-end process, from a project's inception to a consultant's weekly plan.
1.	Project Creation & Setup (Growth Team):
o	A member of the Growth Team initiates the creation of a new Project.
o	During this setup, they are responsible for:
1.	Setting the high-level details (title, timeline, total budgetedHours).
2.	Assigning a Product Manager for the project from the list of available consultants.
3.	Assigning all the Consultants who will be team members on the project.
2.	Phase & Hour Planning (Product Manager):
o	The designated Product Manager for the project creates the Phases and links them to the relevant Sprints.
o	For each phase, the PM creates Phase Allocations, assigning a specific number of hours to each consultant who will be working on that specific phase.
o	A PM creates "Phase 1" and links it to Sprint 1 and Sprint 2.
o	The PM then creates two Phase Allocations for Phase 1:
1.	Consultant A is allocated 60 hours.
2.	Consultant B is allocated 20 hours.
3.	Weekly Allocation (Consultant):
o	Each consultant logs in to see their assigned Phase Allocations.
o	Their primary task is to distribute the total hours for a phase across the specific weeks of the sprints that make up that phase, creating a detailed weekly plan.
o	Consultant A sees they have 60 hours to allocate for Phase 1 across four weeks. They distribute them as: Week 1: 20h, Week 2: 20h, Week 3: 15h, Week 4: 5h.
o	Consultant B does the same for their 20 hours.
4.	Handling Changes (Hour Change Request):
o	The HourChangeRequest system is flexible and supports two distinct scenarios:
	Adjusting Hours: A consultant can request to increase or decrease their own total hours for a phase. For example: "Increase my allocation for Phase 1 by 10 hours."
	Shifting Hours: A consultant can request to transfer a portion of their hours for a phase to another consultant on the project. For example: "Transfer 10 hours from my allocation for Phase 1 to Consultant B."
o	All requests require a reason and are sent to the Growth Team for formal approval.


## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build production version
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npx prisma db push` - Push database schema changes
- `npx prisma db seed` - Seed database with initial data
- `npx prisma studio` - Open Prisma Studio for database management

## Architecture

### Tech Stack
- **Frontend**: Next.js 15 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Authentication**: NextAuth.js with JWT strategy (15-minute sessions)
- **Database**: PostgreSQL with Prisma ORM
- **State Management**: Zustand for client-side state

### Database Schema
The application uses a sophisticated schema centered around:
- **Users**: Role-based (GROWTH_TEAM, CONSULTANT) with approval status
- **Projects**: Managed by Product Managers with consultant assignments
- **Phases**: Project phases with resource allocation
- **Sprints**: 2-week sprint cycles assignable to phases
- **Allocations**: Weekly resource planning (PhaseAllocation → WeeklyAllocation)
- **Hour Change Requests**: System for requesting allocation adjustments

### Application Structure

```
src/
├── app/
│   ├── (dashboard)/dashboard/    # Protected dashboard routes
│   │   ├── projects/            # Project management
│   │   ├── allocations/         # Resource allocation
│   │   ├── hour-requests/       # Hour change management
│   │   └── create-project/      # Project creation
│   ├── api/                     # API routes
│   ├── components/
│   │   ├── dashboards/          # Role-specific dashboards
│   │   └── ui/                  # shadcn/ui components
│   ├── login/ & register/       # Authentication pages
│   └── pending-approval/        # Approval workflow
├── lib/
│   └── auth.ts                  # NextAuth configuration
├── types/                       # TypeScript definitions
└── middleware.ts                # Route protection
```

### Authentication & Authorization

- **NextAuth.js** with Google OAuth and credentials providers
- **Role-based access**: Growth Team vs Consultant permissions
- **Product Manager detection**: Based on project role assignments
- **Middleware protection**: Auto-redirects for auth routes
- **Session management**: JWT with 15-minute expiration

### Key Features

1. **Dashboard System**: Role-specific views (GrowthTeamDashboard vs ConsultantDashboard)
2. **Resource Allocation**: Weekly planning with phase-based budgeting
3. **Sprint Management**: 2-week cycles with phase assignment
4. **Hour Change Requests**: Approval workflow for allocation adjustments
5. **Project Management**: Full CRUD with consultant assignment

### Database Connections

Always use `PrismaClient` for database operations. The application includes pre-seeded data via `prisma/seed.ts`. Key relationships:
- Users ↔ Projects (many-to-many via ConsultantsOnProjects)
- Projects → Phases → PhaseAllocations → WeeklyAllocations
- Phases ↔ Sprints (many-to-many assignment)

### Component Patterns

- **Server Components**: Used for data fetching in pages
- **Client Components**: Interactive UI with "use client" directive  
- **shadcn/ui**: Consistent component library in `components/ui/`
- **Modals**: Separate modal components for complex interactions
- **Layout System**: DashboardLayout wrapper for protected routes

### Important Implementation Details

- **Path Aliases**: `@/*` maps to `./src/*`
- **Route Groups**: `(dashboard)` for layout organization
- **Middleware**: Protects `/dashboard/*` routes and handles auth redirects
- **Environment**: Requires `DATABASE_URL`, `NEXTAUTH_SECRET`, and Google OAuth credentials
- **TypeScript**: Strict mode enabled with Next.js-specific configurations

### Common Development Patterns

- Server-side data fetching in page components
- Client-side state management with Zustand for complex interactions
- Error handling with try/catch in API routes
- Form submissions using native form actions or API routes
- Database queries using Prisma with comprehensive `include` statements for related data