# Agility - Consultant Resource & Progress Insight System

A specialized web-based platform for managing consultant hours, projects, phases, and weekly hour allocations. Built as a strategic layer on top of Jira to automate the Growth Team's resource planning and progress tracking.

![Next.js](https://img.shields.io/badge/Next.js-15.4.7-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.1.1-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-6.13.0-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?logo=postgresql)

---

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [System Architecture](#system-architecture)
4. [Tech Stack](#tech-stack)
5. [Installation Guide](#installation-guide)
6. [Development Setup](#development-setup)
7. [User Roles & Permissions](#user-roles--permissions)
8. [Core Workflows](#core-workflows)
9. [Database Schema](#database-schema)
10. [API Routes](#api-routes)
11. [Component Structure](#component-structure)
12. [Common Development Tasks](#common-development-tasks)
13. [Troubleshooting](#troubleshooting)
14. [Contributing](#contributing)

---

## Overview

**Agility** is not a project management system—it's a **resource and progress visibility tool** that bridges the gap between Jira's granular task management and high-level weekly resource allocation needs.

### Purpose

The Growth Team needs to:
- Allocate consultants to project phases based on sprint cycles
- Track weekly hour distributions across multiple projects
- Monitor budget utilization and consultant availability
- Approve resource allocation changes through a formal workflow

### Vision

Replace manual Airtable spreadsheets with an automated system that provides:
- **Real-time visibility** into consultant allocations
- **Automated sprint generation** based on project timelines
- **Approval workflows** for hour changes and allocations
- **Timeline views** showing resource distribution across weeks

---

## Key Features

### 🎯 Resource Management
- **Consultant Allocation**: Assign consultants to project phases with hour budgets
- **Weekly Planning**: Consultants distribute phase hours across sprint weeks
- **Over-Allocation Warnings**: Real-time validation prevents over-commitment
- **Availability Indicators**: Visual cues for consultant capacity

### 📊 Budget Tracking
- **Project-Level Budgets**: Track allocated vs. budgeted hours
- **Phase-Level Planning**: Monitor hour distribution across phases
- **Visual Indicators**: Color-coded progress bars (under/near/over budget)
- **Real-Time Calculations**: Automatic budget utilization updates

### 🔄 Approval Workflows
- **Hour Change Requests**: Formal process for allocation adjustments
- **Allocation Approvals**: Growth Team approval for phase allocations
- **Deletion Workflows**: Structured process for removing allocations
- **Notification System**: Email and in-app notifications for all workflow steps

### 📅 Sprint & Phase Management
- **Auto-Generated Sprints**: 2-week sprint cycles created automatically
- **Phase-Sprint Assignment**: Link phases to one or more sprints
- **Dynamic Phase Dates**: Start/end dates calculated from assigned sprints
- **Timeline Visualization**: Gantt-style view of project phases

### 👥 Role-Based Access
- **Growth Team**: Project creation, allocation approval, resource timeline
- **Product Managers**: Phase management, consultant allocation, team overview
- **Consultants**: Weekly planning, hour change requests, personal dashboard

### 🔔 Notifications & Communication
- **In-App Notifications**: Real-time updates for allocations, approvals, deadlines
- **Email Notifications**: Critical updates sent via email
- **Deep Linking**: Notifications link directly to relevant pages
- **Notification Center**: Centralized view of all notifications

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Next.js 15 App Router                │
│                     (Server + Client Components)            │
├─────────────────────────────────────────────────────────────┤
│  Auth Layer          │  API Routes         │  UI Components │
│  (NextAuth.js)       │  (/api/*)           │  (React 19)    │
├─────────────────────────────────────────────────────────────┤
│              Prisma ORM (Database Abstraction)              │
├─────────────────────────────────────────────────────────────┤
│                    PostgreSQL Database                       │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Hierarchy

```
Project (Highest Level)
  ├── Sprints (Auto-generated 2-week cycles)
  ├── Phases (Strategic project stages)
  │     ├── Sprint Assignment (Phases are composed of sprints)
  │     └── Phase Allocations (Consultant hour budgets)
  │           └── Weekly Allocations (Hour distribution across weeks)
  └── Consultants (Team members assigned to project)
```

### Key Design Principles

1. **Top-Down Planning**: Growth Team → Product Manager → Consultant
2. **Two-Tier Allocation**: Phase Allocation (total) → Weekly Allocation (distribution)
3. **Approval Gates**: All major changes require Growth Team approval
4. **Immutable Sprints**: Sprint dates auto-calculated, not manually set
5. **Dynamic Phase Dates**: Phase duration derived from assigned sprints

---

## Tech Stack

### Frontend
- **Framework**: Next.js 15.4.7 (App Router)
- **UI Library**: React 19.1.1
- **Language**: TypeScript 5.9.2
- **Styling**: Tailwind CSS 3.4.17
- **Components**: shadcn/ui (Radix UI primitives)
- **Icons**: React Icons 5.5.0
- **State Management**: Zustand 5.0.8 (for complex UI state)
- **Forms**: React Hook Form 7.63.0 + Zod 4.1.11

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Next.js API Routes
- **Authentication**: NextAuth.js 4.24.11 (JWT + credentials)
- **ORM**: Prisma 6.13.0
- **Database**: PostgreSQL
- **Email**: Nodemailer 7.0.6 + React Email 0.5.2

### Development Tools
- **Linting**: ESLint 8
- **Formatting**: Prettier (via Next.js config)
- **Database GUI**: Prisma Studio
- **Version Control**: Git

---

## Installation Guide

### Prerequisites

Before starting, ensure you have:
- **Node.js**: v20.0.0 or higher ([Download](https://nodejs.org/))
- **PostgreSQL**: v14 or higher ([Download](https://www.postgresql.org/download/))
- **Git**: Latest version ([Download](https://git-scm.com/))
- **npm**: v9.0.0 or higher (comes with Node.js)

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-org/Consultant-Time-Project-Management-System.git
cd Consultant-Time-Project-Management-System
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs all dependencies defined in `package.json`.

### Step 3: Set Up PostgreSQL Database

1. **Create a new PostgreSQL database**:

```bash
# Access PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE agility_dev;

# Create user (optional, recommended)
CREATE USER agility_user WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE agility_dev TO agility_user;

# Exit psql
\q
```

2. **Get your database connection string**:

```
postgresql://agility_user:your_secure_password@localhost:5432/agility_dev
```

### Step 4: Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database Connection
DATABASE_URL="postgresql://agility_user:your_secure_password@localhost:5432/agility_dev"

# NextAuth Configuration
NEXTAUTH_SECRET="your-super-secret-key-min-32-characters"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (Optional - for Google Sign-In)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Email Configuration (for notifications)
RESEND_API_KEY="Your-resend-api-key"
FROM_EMAIL="email-address-you-want-emails-sent-from"

CRON_SECRET="your-cron-secret"

```

**Generate NEXTAUTH_SECRET**:
```bash
openssl rand -base64 32
```

### Step 5: Initialize the Database

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database (creates tables)
npx prisma db push

# Seed database with initial data (optional)
npx prisma db seed
```

### Step 6: Start Development Server

```bash
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:3000/api/*

### Step 7: Access Prisma Studio (Optional)

View and edit your database data:

```bash
npx prisma studio
```

Opens at http://localhost:5555

### Step 8: Create First Admin User

1. Navigate to http://localhost:3000
2. Click "Register" and create an account
3. The **first registered user** is automatically approved as Growth Team
4. All subsequent users require Growth Team approval

---

## Development Setup

### Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (dashboard)/              # Protected dashboard routes
│   │   └── dashboard/
│   │       ├── projects/         # Project management
│   │       ├── weekly-planner/   # Consultant weekly planning
│   │       ├── hour-requests/    # Hour change requests
│   │       ├── hour-approvals/   # Growth Team approvals
│   │       ├── gantt/            # Portfolio timeline
│   │       ├── notifications/    # Notification center
│   │       └── admin/            # Admin functions
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── projects/             # Project CRUD
│   │   ├── phases/               # Phase management
│   │   ├── requests/             # Hour change requests
│   │   └── notifications/        # Notification system
│   ├── auth/                     # Auth pages (login, register)
│   └── pending-approval/         # User approval workflow
├── components/                   # React components
│   ├── consultant/               # Consultant-specific UI
│   │   ├── dashboard/            # Weekly planner, timeline
│   │   └── requests/             # Hour change request forms
│   ├── growth-team/              # Growth Team UI
│   ├── product-manager/          # Product Manager UI
│   ├── projects/                 # Project components
│   │   ├── allocations/          # Allocation management
│   │   ├── budget/               # Budget tracking
│   │   ├── gantt/                # Timeline visualization
│   │   └── phases/               # Phase cards, status
│   ├── notifications/            # Notification components
│   └── ui/                       # shadcn/ui components
├── lib/                          # Utility functions
│   ├── auth.ts                   # NextAuth configuration
│   ├── prisma.ts                 # Prisma client singleton
│   ├── dates.ts                  # Date utilities
│   ├── validation.ts             # Validation functions
│   └── colors.ts                 # Color generation
├── emails/                       # React Email templates
├── types/                        # TypeScript type definitions
└── middleware.ts                 # Route protection middleware

prisma/
├── schema.prisma                 # Database schema
└── seed.ts                       # Seed data script

public/                           # Static assets
```

### Environment Files

- `.env` - Local development (gitignored)
- `.env.example` - Template for required variables
- `.env.production` - Production overrides (optional)

### npm Scripts

```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build           # Build production bundle
npm run start           # Start production server
npm run lint            # Run ESLint

# Database
npx prisma generate     # Generate Prisma Client
npx prisma db push      # Push schema changes to DB
npx prisma db seed      # Seed database
npx prisma studio       # Open database GUI
npx prisma migrate dev  # Create new migration

# Deployment
npm run vercel-build    # Build for Vercel (auto db push)
```

### Code Style Guidelines

1. **Components**: Use functional components with TypeScript
2. **Server vs Client**: Mark client components with `'use client'`
3. **Naming**:
   - Components: `PascalCase` (e.g., `PhaseStatusCard.tsx`)
   - Files: `kebab-case` for routes, `PascalCase` for components
   - Variables: `camelCase`
4. **Imports**: Absolute imports using `@/*` alias
5. **Types**: Define interfaces at component level or in `types/`
6. **Styling**: Use Tailwind utility classes, dark mode support

---

## User Roles & Permissions

### Growth Team
**Who**: Resource managers, project leads, administrators

**Can Do**:
- ✅ Create, edit, and delete projects
- ✅ Assign Product Managers and consultants to projects
- ✅ Approve/reject phase allocations
- ✅ Approve/reject hour change requests
- ✅ View resource timeline for all consultants
- ✅ Approve new growth team registrations
- ✅ Access all projects and data

**Cannot Do**:
- ❌ Create weekly allocations for consultants (consultant task)

### Product Manager
**Who**: Consultants assigned as PM on specific projects

**Can Do**:
- ✅ Create, edit, and delete phases for their projects
- ✅ Assign consultants to phases (create phase allocations)
- ✅ Submit hour change requests for their projects
- ✅ View team allocations for their project
- ✅ Access weekly planner for their own allocations

**Cannot Do**:
- ❌ Approve their own hour change requests (requires Growth Team)
- ❌ Directly modify approved allocations (requires hour change request)
- ❌ Access other projects where they're not assigned

### Consultant
**Who**: Team members allocated to projects

**Can Do**:
- ✅ View their dashboard and allocations
- ✅ Create weekly allocations for approved phase allocations
- ✅ Submit hour change requests for their allocations
- ✅ View projects they're assigned to
- ✅ Plan hours across weeks

**Cannot Do**:
- ❌ View other consultants' allocations (privacy)
- ❌ Modify phase allocations directly (requires hour change request)
- ❌ Approve hour changes
- ❌ Create or edit phases

---

## Core Workflows

### 1. Project Creation → Consultant Allocation

```mermaid
graph TD
    A[Growth Team Creates Project] --> B[Auto-Generate Sprints]
    B --> C[Assign Product Manager]
    C --> D[Assign Consultants to Project]
    D --> E[PM Creates Phases]
    E --> F[PM Links Sprints to Phases]
    F --> G[PM Allocates Hours to Consultants]
    G --> H[Growth Team Approves Allocations]
    H --> I[Consultant Plans Weekly Hours]
```

### 2. Hour Change Request Workflow

```mermaid
graph TD
    A[Consultant/PM Needs Hour Change] --> B[Submit Hour Change Request]
    B --> C[Growth Team Receives Notification]
    C --> D{Growth Team Reviews}
    D -->|Approve| E[Hours Updated Automatically]
    D -->|Reject| F[Request Denied, No Changes]
    E --> G[All Parties Notified]
    F --> G
```

### 3. Weekly Hour Planning

```
Consultant Dashboard
  └─> View Phase Allocations
       └─> Click "Plan Hours" for a Phase
            └─> Weekly Planner Opens
                 └─> Distribute Hours Across Weeks
                      └─> Real-Time Validation
                           ├─> Over-Allocated? → Warning (can type, cannot submit)
                           ├─> Need More Hours? → "Request Hour Change" Button
                           └─> Valid? → Auto-Save
```

---

## Database Schema

### Core Entities

#### User
```prisma
model User {
  id              String   @id @default(uuid())
  name            String
  email           String   @unique
  hashedPassword  String
  role            UserRole @default(CONSULTANT)
  isApproved      Boolean  @default(false)
  isEmailVerified Boolean  @default(false)
  createdAt       DateTime @default(now())
}

enum UserRole {
  GROWTH_TEAM
  CONSULTANT
}
```

#### Project
```prisma
model Project {
  id                String   @id @default(uuid())
  title             String
  description       String?
  startDate         DateTime
  endDate           DateTime
  budgetedHours     Float
  productManagerId  String
  productManager    User     @relation("ProductManager", fields: [productManagerId], references: [id])
  consultants       ConsultantsOnProjects[]
  phases            Phase[]
  sprints           Sprint[]
  createdAt         DateTime @default(now())
}
```

#### Sprint
```prisma
model Sprint {
  id           String   @id @default(uuid())
  sprintNumber Int
  startDate    DateTime
  endDate      DateTime
  projectId    String
  project      Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  phases       Phase[]  @relation("PhaseToSprint")
}
```

#### Phase
```prisma
model Phase {
  id                String            @id @default(uuid())
  name              String
  description       String?
  startDate         DateTime          // Calculated from earliest sprint
  endDate           DateTime          // Calculated from latest sprint
  projectId         String
  project           Project           @relation(fields: [projectId], references: [id], onDelete: Cascade)
  sprints           Sprint[]          @relation("PhaseToSprint")
  phaseAllocations  PhaseAllocation[]
}
```

#### PhaseAllocation
```prisma
model PhaseAllocation {
  id                     String                 @id @default(uuid())
  totalHours             Float
  approvalStatus         ApprovalStatus         @default(PENDING)
  rejectionReason        String?
  consultantId           String
  consultant             User                   @relation(fields: [consultantId], references: [id])
  phaseId                String
  phase                  Phase                  @relation(fields: [phaseId], references: [id], onDelete: Cascade)
  weeklyAllocations      WeeklyAllocation[]
  consultantDescription  String?                // Optional description from consultant
  createdAt              DateTime               @default(now())

  @@unique([consultantId, phaseId]) // One allocation per consultant per phase
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
  DELETION_PENDING
  EXPIRED
  FORFEITED
}
```

#### WeeklyAllocation
```prisma
model WeeklyAllocation {
  id                  String            @id @default(uuid())
  weekStartDate       DateTime
  weekEndDate         DateTime
  weekNumber          Int
  year                Int
  proposedHours       Float?
  approvedHours       Float?
  planningStatus      PlanningStatus    @default(PENDING)
  rejectionReason     String?
  phaseAllocationId   String
  phaseAllocation     PhaseAllocation   @relation(fields: [phaseAllocationId], references: [id], onDelete: Cascade)
}

enum PlanningStatus {
  PENDING
  APPROVED
  MODIFIED
  REJECTED
}
```

#### HourChangeRequest
```prisma
model HourChangeRequest {
  id                     String       @id @default(uuid())
  changeType             ChangeType
  originalHours          Float
  requestedHours         Float
  reason                 String
  status                 ChangeStatus @default(PENDING)
  consultantId           String       // Requester
  approverId             String?      // Growth Team member who approved/rejected
  phaseId                String
  phaseAllocationId      String?
  createdAt              DateTime     @default(now())
  updatedAt              DateTime     @updatedAt
}

enum ChangeType {
  ADJUSTMENT  // Increase or decrease hours
  SHIFT       // Transfer hours between consultants (deprecated in latest version)
}

enum ChangeStatus {
  PENDING
  APPROVED
  REJECTED
}
```

#### Notification
```prisma
model Notification {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type        String   // "ALLOCATION_APPROVED", "HOUR_REQUEST_SUBMITTED", etc.
  title       String
  message     String
  actionUrl   String?  // Deep link to relevant page
  isRead      Boolean  @default(false)
  createdAt   DateTime @default(now())
}
```

### Key Relationships

- **Project** has many **Sprints** (auto-generated)
- **Project** has many **Phases** (created by PM)
- **Phase** has many **Sprints** (many-to-many via PhaseToSprint)
- **Phase** has many **PhaseAllocations** (consultant hour budgets)
- **PhaseAllocation** has many **WeeklyAllocations** (hour distribution)
- **User** can be **ProductManager** on multiple Projects
- **User** (consultant) assigned to **Projects** via **ConsultantsOnProjects**

---

## API Routes

### Authentication

| Method | Route | Description | Auth Required |
|--------|-------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/[...nextauth]` | NextAuth endpoints | No |
| GET | `/api/current-user` | Get current user session | Yes |

### Projects

| Method | Route | Description | Auth Required | Permission |
|--------|-------|-------------|---------------|------------|
| GET | `/api/projects` | List all projects | Yes | All |
| GET | `/api/projects/:id` | Get project details | Yes | Assigned users |
| POST | `/api/projects` | Create project | Yes | Growth Team |
| PUT | `/api/projects/:id` | Update project | Yes | Growth Team |
| DELETE | `/api/projects/:id` | Delete project | Yes | Growth Team |

### Phases

| Method | Route | Description | Auth Required | Permission |
|--------|-------|-------------|---------------|------------|
| POST | `/api/phases` | Create phase | Yes | PM or Growth Team |
| PUT | `/api/phases/:id` | Update phase | Yes | PM or Growth Team |
| DELETE | `/api/phases/:id` | Delete phase | Yes | PM or Growth Team |

### Allocations

| Method | Route | Description | Auth Required | Permission |
|--------|-------|-------------|---------------|------------|
| POST | `/api/allocations` | Create phase allocation | Yes | PM or Growth Team |
| PUT | `/api/allocations/:id` | Update allocation | Yes | PM or Growth Team |
| DELETE | `/api/allocations/:id` | Delete allocation | Yes | PM or Growth Team |
| POST | `/api/allocations/weekly` | Create/update weekly allocation | Yes | Consultant (own) |

### Hour Change Requests

| Method | Route | Description | Auth Required | Permission |
|--------|-------|-------------|---------------|------------|
| GET | `/api/requests/hours` | List hour requests | Yes | Growth Team |
| POST | `/api/requests/hours` | Create hour request | Yes | Consultant/PM |
| PUT | `/api/requests/hours/:id/approve` | Approve request | Yes | Growth Team |
| PUT | `/api/requests/hours/:id/reject` | Reject request | Yes | Growth Team |

### Notifications

| Method | Route | Description | Auth Required | Permission |
|--------|-------|-------------|---------------|------------|
| GET | `/api/notifications` | Get user notifications | Yes | Own notifications |
| PUT | `/api/notifications/:id/read` | Mark as read | Yes | Own notifications |
| PUT | `/api/notifications/read-all` | Mark all as read | Yes | Own notifications |

---

## Component Structure

### Page Components (Server Components)

Located in `src/app/(dashboard)/dashboard/`

- **`projects/page.tsx`**: Projects list view
- **`projects/[projectId]/page.tsx`**: Project detail page
- **`weekly-planner/page.tsx`**: Consultant weekly planner
- **`hour-requests/page.tsx`**: Hour change requests list
- **`hour-approvals/page.tsx`**: Growth Team approval dashboard
- **`gantt/page.tsx`**: Portfolio timeline (Gantt chart)

### Reusable Components (Client Components)

#### Consultant Components (`src/components/consultant/`)

- **`WeeklyPlannerEnhanced.tsx`**: Main weekly planning interface
  - Allows hour distribution across weeks
  - Real-time over-allocation warnings
  - Integrated "Request Hour Change" button
- **`CreateHourRequestModal.tsx`**: Hour change request form
  - Predefined reasons dropdown
  - Searchable project/phase selection
  - Real-time validation for zero/negative allocations

#### Project Components (`src/components/projects/`)

- **`PhaseStatusCard.tsx`**: Displays phase details and allocations
- **`PhaseAllocationForm.tsx`**: PM form for allocating hours to consultants
- **`BudgetTracker.tsx`**: Visual budget utilization display
- **`ProjectGanttChart.tsx`**: Timeline visualization

#### Growth Team Components (`src/components/growth-team/`)

- **`ResourceTimeline.tsx`**: Weekly resource allocation timeline
- **`ApprovalDashboard.tsx`**: Pending approvals list
- **`CreateProjectModal.tsx`**: Project creation form

#### UI Components (`src/components/ui/`)

shadcn/ui components (button, dialog, dropdown, etc.)

---

## Common Development Tasks

### Adding a New API Route

1. Create file in `src/app/api/your-route/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  // 1. Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Authorization check
  if (session.user.role !== 'GROWTH_TEAM') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 3. Database query
  try {
    const data = await prisma.yourModel.findMany({
      where: { /* filters */ },
      include: { /* relations */ }
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
```

### Adding a Database Model

1. Edit `prisma/schema.prisma`:

```prisma
model YourModel {
  id        String   @id @default(uuid())
  name      String
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
}
```

2. Update the database:

```bash
npx prisma db push
npx prisma generate
```

### Creating a New Page

1. Create file in `src/app/(dashboard)/dashboard/your-page/page.tsx`:

```typescript
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import YourClientComponent from '@/components/YourClientComponent';

export default async function YourPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/auth/login');
  }

  // Fetch data server-side
  const data = await fetchData();

  return <YourClientComponent data={data} />;
}
```

2. Create client component in `src/components/YourClientComponent.tsx`:

```typescript
'use client';

interface YourClientComponentProps {
  data: any;
}

export default function YourClientComponent({ data }: YourClientComponentProps) {
  return (
    <div>
      {/* Your UI */}
    </div>
  );
}
```

### Sending Notifications

```typescript
import { prisma } from '@/lib/prisma';

await prisma.notification.create({
  data: {
    userId: consultantId,
    type: 'ALLOCATION_APPROVED',
    title: 'Phase Allocation Approved',
    message: `Your allocation for ${phaseName} has been approved.`,
    actionUrl: `/dashboard/weekly-planner?phase=${phaseId}`,
  }
});

// Optional: Send email
import { sendEmail } from '@/lib/email';
await sendEmail({
  to: user.email,
  subject: 'Phase Allocation Approved',
  html: emailTemplate
});
```

---

## Troubleshooting

### Common Issues

#### Database Connection Errors

**Problem**: `Error: P1001: Can't reach database server`

**Solutions**:
1. Check PostgreSQL is running: `pg_isready`
2. Verify `DATABASE_URL` in `.env`
3. Test connection: `psql $DATABASE_URL`
4. Check firewall/network settings

#### Prisma Client Not Generated

**Problem**: `Cannot find module '@prisma/client'`

**Solution**:
```bash
npx prisma generate
```

#### Session/Auth Issues

**Problem**: User logged out immediately or session not persisting

**Solutions**:
1. Verify `NEXTAUTH_SECRET` is set and ≥32 characters
2. Check `NEXTAUTH_URL` matches your domain
3. Clear browser cookies and retry
4. Check session timeout settings in `lib/auth.ts`

#### Build Errors

**Problem**: `Module not found` or TypeScript errors

**Solutions**:
```bash
# Clear cache and reinstall
rm -rf .next node_modules
npm install
npm run dev
```

#### Over-Allocation Not Showing Warning

**Problem**: User can submit over-allocated hours

**Solution**: Check `validateOverAllocation()` in `WeeklyPlannerEnhanced.tsx:278`

---

## Contributing

### Development Workflow

1. **Create a feature branch**:
```bash
git checkout -b feature/your-feature-name
```

2. **Make changes and test locally**:
```bash
npm run dev
# Test your changes thoroughly
```

3. **Check for linting errors**:
```bash
npm run lint
```

4. **Commit with descriptive message**:
```bash
git add .
git commit -m "feat: add weekly planner over-allocation warnings"
```

5. **Push and create PR**:
```bash
git push origin feature/your-feature-name
```

### Code Review Checklist

- [ ] Code follows TypeScript best practices
- [ ] All components have proper TypeScript types
- [ ] Server components don't use client-side hooks
- [ ] Client components marked with `'use client'`
- [ ] Database queries include proper error handling
- [ ] Authorization checks in API routes
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Dark mode support
- [ ] Accessibility (ARIA labels, keyboard navigation)
- [ ] Comments for complex logic

### Commit Message Convention

```
type(scope): description

Types: feat, fix, docs, style, refactor, test, chore
Scope: component/feature name (optional)

Examples:
feat(weekly-planner): add over-allocation warnings
fix(auth): resolve session timeout issue
docs(readme): add installation guide
```

---

## Additional Resources

- **Business Rules**: See `BUSINESS_RULES.md` for detailed system rules
- **API Documentation**: See `API.md` (if available)
- **User Guide**: See `AGILITY_USER_GUIDE.md`
- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **shadcn/ui**: https://ui.shadcn.com

---

## License

Proprietary - All Rights Reserved

---

## Support

For issues, questions, or contributions:
- **GitHub Issues**: [Create an issue](https://github.com/your-org/Consultant-Time-Project-Management-System/issues)
- **Email**: support@yourdomain.com
- **Slack**: #agility-dev (internal)

---

**Built with ❤️ by the Growth Team**

*Last Updated: October 26, 2025*
