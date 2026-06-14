# Habit Tracker

A full-stack habit tracking app built with React, Node.js, Express, and MongoDB.

---

## Tech Stack

- Frontend: React, TypeScript, Vite, React Router, Axios
- Backend: Node.js, Express, TypeScript
- Database: MongoDB (Atlas)
- Auth: JWT

---

## Prerequisites

- Node.js 18+
- npm
- A MongoDB Atlas account (or local MongoDB)

---

## Setup

### 1. Clone the repo

```
git clone <repo-url>
cd habit_tracker
```

### 2. Install dependencies

```
cd frontend && npm install
cd ../backend && npm install
```

### 3. Configure environment variables

Create a `.env` file inside the `backend/` folder:

To generate a JWT secret, run:

```
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Seed the database (optional)

Creates one test user and sample habits.

```
cd backend && npm run seed
```

Test account: `test@example.com` / `password123`

---

## Running the app

Open two terminals.

**Terminal 1 — Backend:**
```
cd backend && npm run dev
```

**Terminal 2 — Frontend:**
```
cd frontend && npm run dev
```

Frontend runs at `http://localhost:5173`.
Backend runs at `http://localhost:3000`.

---

## API Routes

All routes prefixed with `/api`. Protected routes require the header:
```
Authorization: Bearer <token>
```

### Auth

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /api/auth/register | No | Create account |
| POST | /api/auth/login | No | Login and receive token |
| GET | /api/auth/me | Yes | Get current user |

### Habits

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | /api/habits | Yes | Get all habits |
| POST | /api/habits | Yes | Create a habit |
| PUT | /api/habits/:id | Yes | Update a habit |
| DELETE | /api/habits/:id | Yes | Delete a habit |

### Register request body

```json
{ "name": "Alice", "email": "alice@example.com", "password": "password123" }
```

### Create habit request body

```json
{
  "name": "Morning Run",
  "category": "Health",
  "frequency": "Daily",
  "targetPerDay": 1,
  "priority": "High"
}
```

Valid values:
- category: Health, Study, Work, Mindfulness, Other
- frequency: Daily, Specific days
- priority: Low, Medium, High
- status (update only): Active, Paused, Archived

---

## Project Structure

```
habit_tracker/
├── backend/
│   └── src/
│       ├── config/       # Database connection
│       ├── middleware/   # JWT auth middleware
│       ├── models/       # Mongoose schemas (User, Habit, CheckIn, Goal)
│       ├── routes/       # Express route handlers
│       ├── scripts/      # One-off scripts (seed)
│       ├── types/        # Shared backend types
│       └── server.ts
└── frontend/
    └── src/
        ├── api/          # Axios API call wrappers
        ├── components/   # Reusable UI components
        ├── context/      # React context (Auth)
        ├── hooks/        # Custom React hooks
        ├── pages/        # Page components
        ├── types/        # Shared frontend types
        └── App.tsx
```
