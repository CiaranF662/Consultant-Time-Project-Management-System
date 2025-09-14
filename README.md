# Consultant-Time-Project-Management-System

File structure
src/
├─ app/ # Next.js app directory (routing)
│ ├─ layout.tsx
│ ├─ page.tsx
│ └─ api/ # API routes (Next.js serverless)
│
├─ features/ # 💡 Main feature-based folder
│ ├─ auth/
│ │ ├─ components/ # Auth-specific UI (LoginForm, SignupForm)
│ │ ├─ hooks/ # Auth-related hooks (useAuth, useSessionRefresh)
│ │ ├─ services/ # API calls (loginUser, registerUser)
│ │ ├─ types/ # TS types/interfaces for auth
│ │ └─ index.ts # Barrel file exporting public API of this feature
│ │
│ ├─ projects/
│ │ ├─ components/ # ProjectCard, ProjectList, ProjectForm
│ │ ├─ hooks/ # useProjects, useCreateProject
│ │ ├─ services/ # API: getProjects, createProject
│ │ ├─ types/ # Project, ProjectStatus enums
│ │ └─ index.ts
│ │
│ ├─ tasks/
│ │ ├─ components/ # TaskCard, TaskBoard, TaskForm
│ │ ├─ hooks/ # useTasks, useTaskUpdates
│ │ ├─ services/ # API: getTasks, updateTaskStatus
│ │ ├─ types/ # Task, Priority, Status
│ │ └─ index.ts
│ │
│ ├─ dashboard/
│ │ ├─ components/ # Dashboard widgets (DeadlinesWidget, WeatherWidget)
│ │ └─ hooks/ # useDashboardData
│ │
│ ├─ notifications/
│ │ ├─ components/ # NotificationList, NotificationBell
│ │ ├─ hooks/ # useNotifications, useMarkRead
│ │ ├─ services/ # API: fetchNotifications
│ │ └─ types/ # Notification type
│ │
│ └─ settings/
│ ├─ components/ # ThemeSwitcher, ProfileSettingsForm
│ ├─ services/ # API: updateProfile, changePassword
│ └─ types/ # UserSettings
│
├─ components/ # 🔁 Shared/reusable UI across features
│ ├─ ui/ # Design system (Button, Input, Modal, Card)
│ └─ layout/ # Navbar, Sidebar, Footer
│
├─ lib/ # Reusable logic (helpers, config, utils)
│ ├─ api.ts # Axios or fetch wrapper
│ ├─ auth.ts # Auth/session helpers
│ └─ date.ts # Date utilities
│
├─ hooks/ # Global hooks (useMediaQuery, useTheme)
│
├─ types/ # Global types (User, Role, ApiResponse)
│
├─ styles/ # Global styles (tailwind.css, variables)
│
└─ config/ # App-wide configs (routes, constants, env parsing)
