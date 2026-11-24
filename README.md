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
  - Drag & drop or file browse for Excel (`.xlsx`, `.xls`) or CSV.
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
| **Parsing** | `xlsx` library (supports Excel `.xlsx`, `.xls` and CSV) |
| **Auth & Security** | JWT (`jsonwebtoken`), `bcryptjs`, `express-rate-limit` |
| **Frontend** | Modern Vanilla HTML5, CSS3 (CSS Variables, Flexbox/Grid, Print Styles), ES6+ JavaScript |

---

## Quick Start (Windows)

### Option 1: Double-click `start.bat`
Simply double-click the **`start.bat`** script in the project root folder. It will:
1. Detect Node.js (including local installations).
2. Install dependencies automatically if not present.
3. Start the server on `http://localhost:3000`.
4. Open the Student Portal in your default web browser.

---

### Option 2: Command Line Setup

#### 1. Install Dependencies
```bash
cd backend
npm install
```

#### 2. Start the Server
```bash
npm start
```

Open:
- **Student Portal**: [http://localhost:3000](http://localhost:3000)
- **Admin Portal**: [http://localhost:3000/admin](http://localhost:3000/admin)

#### Default Admin Credentials
- **Username**: `admin`
- **Password**: `admin123`
- Change the default password after your first sign-in. Set `JWT_SECRET` in the server environment to keep sessions valid across restarts.

---

## CSV Template
No student records are included. Use **Download Blank CSV Template** in the Admin portal to get the required column headers, then fill it with your seating data.

---

## File Format Specifications

Uploaded Excel or CSV files must contain at minimum:

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
| `POST` | `/api/auth/login` | No | Authenticate admin |
| `POST` | `/api/auth/change-password` | Bearer Token | Update password |
| `GET` | `/api/seating/exams` | No | List active exams for dropdown |
| `GET` | `/api/seating/lookup?roll=&exam_id=` | No (Rate limited) | Student seat query |
| `POST` | `/api/upload` | Bearer Token | Upload Excel/CSV seating file |
| `GET` | `/api/admin/exams` | Bearer Token | List all exams with counts |
| `GET` | `/api/admin/exams/:id/seats` | Bearer Token | Paginated seat list with search |
| `POST` | `/api/admin/exams/:id/seats` | Bearer Token | Add an individual seat |
| `PUT` | `/api/admin/seats/:seatId` | Bearer Token | Update an individual seat |
| `DELETE` | `/api/admin/seats/:seatId` | Bearer Token | Delete an individual seat |
| `GET` | `/api/admin/exams/:id/rooms` | Bearer Token | Room summary & student count |
| `GET` | `/api/admin/exams/:id/rooms/:room_no` | Bearer Token | Students assigned to specific room |
| `GET` | `/api/admin/exams/:id/export` | Bearer Token | Export exam seats as CSV |
| `PATCH` | `/api/admin/exams/:id/toggle` | Bearer Token | Toggle active / inactive status |
| `DELETE` | `/api/admin/exams/:id` | Bearer Token | Delete exam & cascade delete seats |
| `GET` | `/api/admin/stats` | Bearer Token | Dashboard statistics |
