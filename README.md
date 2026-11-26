# MIET Jammu – Seating Arrangement System

A full-stack web application for managing and looking up exam seating arrangements at **Model Institute of Engineering & Technology (MIET), Jammu**.

---

## Features

### 🎓 Student Portal (`/`)
- **Exam Selection**: Dropdown list of all currently active exams.
- **Seat Lookup**: Enter roll number (case-insensitive) to retrieve:
  - **Room / Hall No**, **Floor Level**, **Row**, **Desk / Seat No**, and **Building Block**
  - Student Name, Branch, Semester, Exam Name, and Date.
- **Printable Seat Slip**: One-click official examination seat slip formatted for A4 printing (`window.print()` with `@media print` clean paper styling).
- **Shareable Seating Link**: Copy direct URL (`?roll=...&exam_id=...`) to share via WhatsApp, email, or bookmarks.
- **Recent Searches**: Stores the last 5 searched roll numbers locally for 1-click re-query.
- **Exam Day Guidelines**: Integrated guidelines for reporting time, admitted materials, and college ID requirements.
- **Mobile Responsive**: Optimized for smartphones, tablets, and desktops.

### 🛡️ Admin Portal (`/admin`)
- **Secure Authentication**: JWT-based authentication with bcrypt-hashed passwords.
- **Seating Uploads**:
  - Drag & drop or file browse for Excel (`.xlsx`) or CSV.
  - Automatic, flexible column name detection (case-insensitive headers).
  - High-performance SQLite batch insertion in transactions.
- **Room Seating Charts & Door Notices**:
  - Room-by-room breakdown with student count, branch distribution, and roll ranges.
  - **Door Notice**: Printable notice ready to be posted outside the examination hall door.
  - **Invigilation Attendance Sheet**: Printable roll sheet with student signatures and answer book number columns for invigilators.
- **Exam Management**:
  - Activate / Deactivate exams.
  - Full-text search across roll numbers and candidate names with pagination.
  - **Manual Seat Adjustment**: Add, edit, or delete individual seats on the fly without re-uploading entire files.
  - **Export to CSV**: 1-click export of exam seating records.
- **Dashboard Stats**: Real-time counter of total exams, active exams, and total students allotted.
- **Settings**: Change admin credentials.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js, Express.js |
| **Database** | SQLite (via `better-sqlite3` with WAL mode & indexes) |
| **Parsing** | `read-excel-file` (`.xlsx`) and `csv-parse` (CSV) |
| **Auth & Security** | JWT (`jsonwebtoken`), `bcryptjs`, `express-rate-limit` |
| **Frontend** | Modern Vanilla HTML5, CSS3 (CSS Variables, Flexbox/Grid, Print Styles), ES6+ JavaScript |

---

## Quick Start (Windows)

### Option 1: Configure credentials, then run `start.bat`
In PowerShell, first set the required credentials using the setup instructions below. From that same PowerShell window, run `.\start.bat`. The script will:
1. Detect Node.js (including local installations).
2. Install dependencies automatically if not present.
3. Start the server on `http://127.0.0.1:3000`.
4. Open the Student Portal in your default web browser.

---

### Option 2: Command Line Setup

#### 1. Configure startup credentials
Set `JWT_SECRET`, `ADMIN_USERNAME`, and `ADMIN_INITIAL_PASSWORD` in the same shell used to start the app. Follow the secure setup instructions below.

#### 2. Install Dependencies
```bash
cd backend
npm install
```

#### 3. Start the Server
```bash
npm start
```

Open:
- **Student Portal**: [http://127.0.0.1:3000](http://127.0.0.1:3000)
- **Admin Portal**: [http://127.0.0.1:3000/admin](http://127.0.0.1:3000/admin)

#### Secure first-time setup (PowerShell)
Set a private signing key and initial administrator credentials before starting the server. Use a unique password of at least 12 characters and keep these values out of source control:
```powershell
$env:JWT_SECRET = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
$env:ADMIN_USERNAME = "admin"
$securePassword = Read-Host "Choose an initial admin password" -AsSecureString
$env:ADMIN_INITIAL_PASSWORD = [System.Net.NetworkCredential]::new("", $securePassword).Password
# From the project root, run .\start.bat; from backend, run npm start.
```
The initial admin is created only when the database has no admin accounts. If the existing database still has the old `admin / admin123` account, startup rotates it to the password configured above. The initial password is not stored in the project. Admin sessions use an HttpOnly, same-site cookie, expire after one hour, and are revoked when the password changes. The server binds to `127.0.0.1` by default. For production, put it behind an HTTPS reverse proxy, keep the app bound to loopback, and set `NODE_ENV=production` so the cookie is marked Secure and HTTPS response policies are enabled. Do not expose the Express process directly to the internet.

Public student seat lookup is disabled by default. It returns the matching student name and seat details to anyone who knows a roll number, so enable it only after the Exam Cell approves this publication model. Set `PUBLIC_SEAT_LOOKUP_ENABLED=true` in the server environment to enable it.

---

## CSV Template
No student records are included. Use **Download Blank CSV Template** in the Admin portal to get the required column headers, then fill it with your seating data.

---

## File Format Specifications

Uploaded `.xlsx` or CSV files must contain at minimum. Legacy `.xls` files are not accepted:

| Column | Required | Example Values |
|---|---|---|
| **Roll No** | ✅ Yes | Your institution's roll number |
| **Room No** | ✅ Yes | `101`, `Hall-A`, `Audi-1` |
| **Floor** | Optional | `Ground`, `1st Floor`, `Second` |
| **Row** | Optional | `A`, `B`, `1`, `2` |
| **Desk** | Optional | `1`, `2`, `14` |
| **Name** | Optional | Student name |
| **Branch** | Optional | `CSE`, `ECE`, `ME`, `Civil` |
| **Semester**| Optional | `5`, `7` |
| **Block** | Optional | `Main Block`, `Tech Wing` |

---

## API Documentation

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/login` | No (same-origin only; rate limited) | Authenticate admin |
| `POST` | `/api/auth/change-password` | Admin session cookie | Update password |
| `GET` | `/api/seating/exams` | No | List active exams for dropdown |
| `GET` | `/api/seating/lookup?roll=&exam_id=` | No (Rate limited) | Student seat query |
| `POST` | `/api/upload` | Admin session cookie | Upload Excel/CSV seating file |
| `GET` | `/api/admin/exams` | Admin session cookie | List all exams with counts |
| `GET` | `/api/admin/exams/:id/seats` | Admin session cookie | Paginated seat list with search |
| `POST` | `/api/admin/exams/:id/seats` | Admin session cookie | Add an individual seat |
| `PUT` | `/api/admin/seats/:seatId` | Admin session cookie | Update an individual seat |
| `DELETE` | `/api/admin/seats/:seatId` | Admin session cookie | Delete an individual seat |
| `GET` | `/api/admin/exams/:id/rooms` | Admin session cookie | Room summary & student count |
| `GET` | `/api/admin/exams/:id/rooms/:room_no` | Admin session cookie | Students assigned to specific room |
| `GET` | `/api/admin/exams/:id/export` | Admin session cookie | Export exam seats as CSV |
| `PATCH` | `/api/admin/exams/:id/toggle` | Admin session cookie | Toggle active / inactive status |
| `DELETE` | `/api/admin/exams/:id` | Admin session cookie | Delete exam & cascade delete seats |
| `GET` | `/api/admin/stats` | Admin session cookie | Dashboard statistics |
