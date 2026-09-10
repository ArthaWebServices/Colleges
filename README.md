# Ghanshyamdas Saraf College - Announcement Portal

An official full-stack announcement portal for **Ghanshyamdas Saraf College of Arts & Commerce** (affiliated with University of Mumbai, Malad West, Mumbai).

Students can view, search, and filter announcements by course with **zero authentication**. Head of Departments (HODs) log in via Clerk to manage announcements for their departments.

---

## 🚀 Features

- **Public Student Feed (`/`)**:
  - Filter notices by course: `BCOM`, `BAF`, `BBI`, `BFM`, `BMS`, `BSCIT`, `BMM`, `BA`, `BSC`.
  - Real-time keyword search across notice titles and content.
  - Automatic expiration filtering (hides expired notices).
  - Pinned announcements float to the top.
  - Attachment preview and download.
- **HOD Portal (`/admin/dashboard`)**:
  - Authenticated HOD access via Clerk.
  - **Super-Admin Approval Security**: HOD accounts default to `isApproved: false`. Login and write actions are blocked server-side until approved by a super-admin.
  - Form to create/edit announcements with multi-select course tags, pin toggle, expiration date picker, and file attachment.
  - **UploadThing File Uploads**: Files upload directly through UploadThing backend service (`POST /api/upload`).
  - **Server-Side Ownership Validation**: Strict assertion (`postedBy === req.auth.userId`) on every write route.
  - **XSS Protection**: HTML content sanitized via `sanitize-html` before storing or rendering.

---

## 🛠️ Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, Lucide Icons, `@clerk/clerk-react`
- **Backend**: Node.js, Express, Mongoose (MongoDB), `@clerk/express`, `uploadthing`, `sanitize-html`, `express-rate-limit`
- **Testing**: Vitest & Supertest for backend unit/integration tests

---

## 💻 Project Structure

```
Colleges/
├── backend/
│   ├── config/db.js                 # MongoDB connection
│   ├── middleware/
│   │   ├── auth.js                  # Clerk auth & HOD approval check
│   │   └── rateLimiter.js           # Express rate limiting
│   ├── models/
│   │   ├── Course.js                # Course schema (code, name, stream)
│   │   └── Announcement.js          # Announcement schema (validation & index)
│   ├── routes/
│   │   ├── courseRoutes.js          # GET /api/courses
│   │   ├── announcementRoutes.js    # Public & Protected announcement endpoints
│   │   ├── uploadRoutes.js          # UploadThing upload endpoint
│   │   └── adminRoutes.js           # Super-admin HOD approval route
│   ├── scripts/
│   │   ├── seedCourses.js           # Seed standard college courses
│   │   └── approveHodCli.js         # CLI tool to approve HOD accounts
│   ├── tests/
│   │   └── announcementOwnership.test.js # Security & ownership unit tests
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/              # Navbar, Footer, AnnouncementCard, Modal, etc.
│   │   ├── pages/                   # PublicFeed, AdminLogin, AdminSignUp, AdminDashboard
│   │   ├── services/                # API & upload helpers
│   │   ├── App.jsx
│   │   ├── index.css                # Tailwind styling
│   │   └── main.jsx
│   ├── .env.example
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── .env.example
└── README.md
```

---

## ⚙️ Setup & Local Running Instructions

### 1. Prerequisites
- Node.js (v18+)
- MongoDB server running locally (`mongodb://localhost:27017`) or a MongoDB Atlas URI.
- Clerk Account (Publishable Key & Secret Key)
- UploadThing Account (UploadThing Token)

---

### 2. Backend Environment Configuration

Navigate to `backend/` and copy `.env.example` to `.env`:

```bash
cd backend
cp .env.example .env
```

Update `.env` with your actual keys:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/gsc_announcements
NODE_ENV=development

# Clerk Auth Keys
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# UploadThing Credentials
UPLOADTHING_TOKEN=your_uploadthing_token

# Super Admin Approval Secret
ADMIN_SECRET=super_secret_admin_approval_key_123
```

---

### 3. Frontend Environment Configuration

Navigate to `frontend/` and copy `.env.example` to `.env`:

```bash
cd ../frontend
cp .env.example .env
```

Update `.env` with your Clerk publishable key:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_BASE_URL=http://localhost:5000/api
```

---

### 4. Install Dependencies

```bash
# Install backend dependencies
cd ../backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

### 5. Seed the Course Collection

Populate the initial 9 standard college course tags (`BCOM`, `BAF`, `BBI`, `BFM`, `BMS`, `BSCIT`, `BMM`, `BA`, `BSC`):

```bash
cd backend
npm run seed
```

---

### 6. Run the Application

Start the backend and frontend servers:

```bash
# Terminal 1: Backend Server (Port 5000)
cd backend
npm run dev

# Terminal 2: Frontend Server (Port 3000)
cd frontend
npm run dev
```

Visit **`http://localhost:3000`** in your browser to access the Public Student Announcement Portal.

---

## 🔒 HOD Account Approval (Super-Admin)

When an HOD signs up at `/admin/sign-up`, their Clerk user `publicMetadata.isApproved` defaults to `false`.

To grant approval, a super-admin can run either:

### Method A: CLI Approval Script
```bash
cd backend
node scripts/approveHodCli.js <CLERK_USER_ID> approve
```

### Method B: HTTP Endpoint (Protected by `ADMIN_SECRET`)
```bash
curl -X POST http://localhost:5000/api/admin/approve-hod \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: super_secret_admin_approval_key_123" \
  -d '{"userId": "user_2N...", "isApproved": true}'
```

---

## 🧪 Running Automated Tests

Run the Vitest security and ownership test suite:

```bash
cd backend
npm test
```

This verifies:
1. Public course and announcement endpoints.
2. Invalidation of unauthorized course codes.
3. Server-side HTTP `403 Forbidden` enforcement when HOD A attempts to edit or delete HOD B's announcement.
