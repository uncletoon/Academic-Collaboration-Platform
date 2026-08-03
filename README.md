# Academic Collaboration Platform

A full-stack academic collaboration portal for students, lecturers, institution administrators, and system administrators. It combines institution-scoped communities, private collaboration projects, events, news, real-time discussions, notifications, search, and administrative controls in one application.

## Features

- Account registration and JWT authentication
- Required numeric student IDs for student accounts (maximum 10 digits)
- Institution and department affiliations controlled by the system administrator after registration
- Academic communities with invitations, posts, likes, and comments
- Collaboration projects with join requests, roles, requirements, and protected file downloads
- Academic events with institution access rules and registration management
- News publishing with feature images and supporting documents
- Direct and group real-time chat using Socket.IO
- Real-time notifications and global search
- Institution-scoped and system-wide administration with audit logging
- User profiles with avatar uploads

## Technology

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite 5, Tailwind CSS, Lucide React |
| Backend | Node.js, Express, Socket.IO |
| Database | PostgreSQL |
| Authentication | JSON Web Tokens and bcrypt |
| Uploads | Multer with local file storage |

## Project structure

```text
.
├── backend/
│   ├── src/
│   │   ├── config/        # Database and Socket.IO setup
│   │   ├── controllers/   # API behavior
│   │   ├── middleware/    # Authentication and uploads
│   │   ├── models/        # PostgreSQL schema and seed data
│   │   ├── routes/        # Express API routes
│   │   └── services/      # Notifications and audit logging
│   └── uploads/           # Runtime user uploads (not committed)
├── frontend/
│   ├── public/            # Static public assets
│   └── src/
│       ├── components/    # Shared UI primitives
│       ├── context/       # Authentication, sockets, notifications
│       ├── layouts/       # Application navigation layouts
│       ├── pages/         # Active application screens
│       └── services/      # API client
└── design-system/         # Visual design reference
```

## Requirements

- Node.js 18 or newer
- npm
- PostgreSQL 14 or newer

## Local setup

### 1. Create the database

Create an empty PostgreSQL database named `collaboration_db`, or choose another name and update `DB_NAME` in the backend environment file.

```sql
CREATE DATABASE collaboration_db;
```

The backend applies `backend/src/models/schema.sql` automatically when it starts. The schema creates tables, updates existing installations, and seeds baseline roles, institutions, and departments.

### 2. Configure and start the backend

```powershell
cd backend
Copy-Item .env.example .env
npm install
npm run dev
```

Review `backend/.env` and set the PostgreSQL credentials and a strong `JWT_SECRET` before using the application outside local development.

The default API address is `http://127.0.0.1:5000/api`. If port 5000 is occupied, the backend tries the next available port; configure the frontend URL accordingly.

### 3. Configure and start the frontend

```powershell
cd frontend
npm install
npm run dev
```

The frontend defaults to `http://127.0.0.1:5000/api`. To use another API address, create `frontend/.env.local`:

```dotenv
VITE_API_URL=http://127.0.0.1:5000/api
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`.

## Default administrator

On an empty database, the backend creates one system administrator:

- Email: `admin@collaboration.edu`
- Password: `admin123`

Use this account only to complete local setup. Replace the seeded credentials before deploying the application.

## Available commands

Run commands from the relevant application directory.

| Directory | Command | Purpose |
| --- | --- | --- |
| `backend` | `npm run dev` | Start the API with Nodemon |
| `backend` | `npm start` | Start the API with Node.js |
| `frontend` | `npm run dev` | Start the Vite development server |
| `frontend` | `npm run build` | Create a production frontend build |
| `frontend` | `npm run preview` | Preview the production build locally |

## Roles and affiliation rules

- **Student:** must have a 1–10 digit student ID.
- **Lecturer:** can lead academic activity and create eligible content.
- **Institution administrator:** manages authorized users and content within one institution.
- **System administrator:** has system-wide management permissions, including changing user institutions and departments.

Users may select an affiliation when registering, but only a system administrator can change an existing user's institution or department.

## Uploads and source control

Runtime avatars, project files, news images, and news documents are stored under `backend/uploads/`. This directory is ignored by Git because it may contain private user data. Back it up separately when moving or deploying the application.

Environment files, dependencies, build output, logs, caches, and editor files are also excluded through the root `.gitignore`.

## Production notes

- Set a strong, unique `JWT_SECRET`.
- Use a managed PostgreSQL instance with backups.
- Serve the frontend and API over HTTPS.
- Restrict CORS to the deployed frontend origin.
- Store uploads in durable object storage for multi-instance deployments.
- Replace the default administrator credentials before allowing user access.
