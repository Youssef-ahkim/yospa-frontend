# Yospa Frontend Deployment Guide

This document describes the environment configuration, build process, server requirements, and known architectural constraints for deploying the Yospa frontend application (Next.js App Router).

---

## 1. Environment Configuration

The frontend requires a single environment variable pointing to the REST API backend:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Base URL for backend API requests | `https://api.yospa.example.com/api` |

> [!IMPORTANT]
> `NEXT_PUBLIC_API_URL` **must be set at build time** (`npm run build`). In Next.js, variables prefixed with `NEXT_PUBLIC_` are baked statically into client-side JavaScript bundles during compilation. Modifying this variable at runtime on an already built container or static bundle has no effect.

A template is committed in [.env.example](file:///d:/projects/yospa/frontend/.env.example). Local environment files (`.env`, `.env.local`, `.env.production`) are excluded by [.gitignore](file:///d:/projects/yospa/frontend/.gitignore).

---

## 2. Build & Runtime Commands

### Prerequisites
- Node.js `18.18+` or `20.x+` (recommended: Node.js 20 LTS)
- npm `9+` (or pnpm/yarn matching project lockfile)

### Standard Deployment Workflow
```bash
# 1. Install production dependencies
npm ci

# 2. Compile optimized production build (ensure NEXT_PUBLIC_API_URL is set)
NEXT_PUBLIC_API_URL="https://api.yospa.example.com/api" npm run build

# 3. Start production HTTP server (default port 3000)
npm run start
```

To bind to a custom host or port:
```bash
PORT=8080 HOSTNAME="0.0.0.0" npm run start
```

---

## 3. Backend & Network Assumptions

1. **HTTPS Protocol**: In staging and production environments, the backend API must be served over secure HTTPS.
2. **CORS Configuration**: The backend API must permit the frontend domain origin and allow standard headers (`Authorization`, `Content-Type`, `Accept`) and HTTP verbs (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`).
3. **Session Revocation Contract**:
   - `401 Unauthorized` responses (except on `POST /api/login`) trigger immediate local session eviction and redirect to `/login?next=<path>&expired=1`.
   - `403 Forbidden` with the exact message `"Your account has been deactivated."` clears session tokens and redirects to `/login?deactivated=1`. Other `403` responses preserve the session and display an authorization toast.

---

## 4. Known Architectural Limitations

1. **UI Role Enforcement is Cosmetic**: Role-based visual toggles (`usePermissions`) improve user experience by hiding inaccessible controls, but security is enforced authoritatively by backend middleware.
2. **Staff Price Visibility in API Responses**: Revenue stat cards and charts are hidden from staff users in the dashboard UI; however, backend API responses for `/reservations` and `/services` still include raw price fields.
3. **No Server-Side Pagination**: Client, reservation, therapist, and staff listings fetch full collections (`GET /clients`, `GET /reservations`, etc.) and paginate or filter in client memory. Very large datasets will require server-side pagination in future versions.
4. **No Offline Support**: The application requires an active internet connection. Network failures display offline/retry banners or toast messages.
5. **Client-Side Token Storage**: Authentication tokens are stored in browser `localStorage` (`yospa_token`).
