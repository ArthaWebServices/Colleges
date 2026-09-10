# Deployment Guide

This project is a full-stack announcement portal with:
- a React + Vite frontend
- an Express + MongoDB backend
- Clerk authentication for HOD users
- Cloudinary signed uploads for attachments

## Recommended deployment architecture

- Frontend: Vercel or Netlify
- Backend: Render or Railway
- Database: MongoDB Atlas
- File uploads: Cloudinary
- Auth: Clerk

## 1) Prepare external services

### MongoDB Atlas
Create a cluster and get the connection string.

Example:
```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/gsc_announcements?retryWrites=true&w=majority
```

### Clerk
Create a Clerk app and copy:
- publishable key
- secret key

In Clerk Dashboard, configure:
- Allowed redirect URLs for your deployed admin routes
- Allowed origin URLs for your frontend domain

Typical values:
```text
https://your-frontend-domain.com/admin
https://your-frontend-domain.com/admin/dashboard
https://your-frontend-domain.com/admin/login
https://your-frontend-domain.com/admin/sign-up
```

### UploadThing
Create an UploadThing account and copy:
- UPLOADTHING_TOKEN

## 2) Backend deployment (Render)

### Create a web service
- Service type: Web Service
- Runtime: Node
- Root directory: backend
- Build command:
```bash
npm install
```
- Start command:
```bash
npm start
```

### Environment variables
Set these in Render:
```env
PORT=10000
NODE_ENV=production
MONGODB_URI=your_mongodb_atlas_uri
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
UPLOADTHING_TOKEN=your_uploadthing_token
ADMIN_SECRET=any_strong_secret_value
```

### Health check
Render should be able to reach:
```text
https://your-backend-url/api/health
```

## 3) Frontend deployment (Vercel)

### Create a Vercel project
- Framework preset: Vite
- Root directory: frontend
- Build command:
```bash
npm run build
```
- Output directory:
```text
dist
```

### Environment variables
Set these in Vercel:
```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_API_BASE_URL=https://your-backend-url/api
```

### Important note
The frontend uses the backend URL from `VITE_API_BASE_URL`. In production, do not leave it as `http://localhost:5000/api`.

## 4) Seed courses after deployment
Once the backend is live, run:
```bash
cd backend
npm run seed
```

If you prefer, you can also run this from a one-off shell in your hosting platform.

## 5) Approve the first HOD account
After signup, approve the user through the admin route or CLI.

Example endpoint:
```bash
curl -X POST https://your-backend-url/api/admin/approve-hod \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: your_admin_secret" \
  -d '{"userId":"clerk_user_id","isApproved":true}'
```

## 6) Post-deployment checklist
- Public feed loads at `/`
- Admin login works at `/admin/login`
- Admin dashboard loads at `/admin/dashboard`
- Announcements can be created and edited
- File upload works through Cloudinary signed upload
- Backend health endpoint returns `200 OK`

## 7) Common production issues

### Frontend shows API errors
- Make sure `VITE_API_BASE_URL` points to the deployed backend URL
- Make sure the backend URL does not include a trailing slash mismatch

### Clerk redirects fail
- Add the deployed admin URLs in the Clerk dashboard
- Use the correct publishable key in the frontend

### MongoDB connection fails
- Confirm the Atlas network access allows your deployment host
- Confirm the connection string is correct

### Uploads fail
- Verify Cloudinary credentials are set on the backend
- Ensure the backend has the correct secret values
