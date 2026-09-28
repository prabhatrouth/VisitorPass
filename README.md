# VisitorPass - Employee Visitor Registration System

A full-stack digital visitor management web application for reception staff with visitor check-in, real-time tracking, badge printing, analytics dashboard, search & filter, and CSV export.

---

## 🚀 How to Run on Your Local System

### Prerequisites
Make sure you have installed on your computer:
- **Node.js**: version `18.x` or higher ([Download Node.js](https://nodejs.org/))
- **npm** (comes bundled with Node.js) or **yarn** / **pnpm**

---

### Step 1: Clone or Download the Project
If cloning via Git:
```bash
git clone <your-repository-url>
cd visitor-registration-system
```
Or simply unzip the downloaded folder and open a terminal in that directory.

---

### Step 2: Install Dependencies
Run the following command in your terminal:
```bash
npm install
```

---

### Step 3: Start the Development Server
Run:
```bash
npm run dev
```

The Express backend and Vite React frontend will start concurrently on a single port:
```
[VisitorPass Server] listening on http://0.0.0.0:3000
```

Open your browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

### Step 4: (Optional) Build for Production
To test a production build:
```bash
# 1. Build optimized frontend bundle
npm run build

# 2. Run the production server
npm start
```
The app will be served at `http://localhost:3000`.

---

## 📁 Project Architecture & Diff (Frontend vs Backend)

```
├── server.ts                 # Full-stack server entry point (Express + Vite middleware)
├── server/
│   ├── routes.ts             # Express REST API endpoints (/api/visitors, /api/hosts, etc.)
│   ├── db.ts                 # Data persistence layer (JSON document store with auto-seeding)
│   ├── hostsData.ts          # Employee hosts directory
│   └── types.ts              # Backend TypeScript types & models
├── data/
│   └── visitors.json         # Local persistent document storage (created automatically)
├── src/                      # Frontend React SPA
│   ├── components/
│   │   ├── Navbar.tsx            # Header, live digital clock, tab navigation & actions
│   │   ├── StatsOverview.tsx     # Real-time KPI tiles (Today, Active, In Meeting, Checked Out)
│   │   ├── VisitorFilterBar.tsx  # Search by Name/Phone, status pills, date & purpose filters
│   │   ├── VisitorTable.tsx      # High-density receptionist data table with quick actions
│   │   ├── VisitorCardGrid.tsx   # Visual visitor badge card grid view
│   │   ├── VisitorFormModal.tsx  # Add / Edit visitor modal with input validation
│   │   ├── VisitorBadgeModal.tsx # Printable official visitor pass with QR/barcode
│   │   ├── KioskMode.tsx         # Guest self check-in tablet kiosk interface
│   │   ├── AnalyticsView.tsx     # Charts for peak hours, visit purposes, and 7-day flow
│   │   └── DeleteConfirmModal.tsx# Safety confirmation prompt for deleting records
│   ├── services/
│   │   └── api.ts            # Client-side API service calling Express backend
│   ├── utils/
│   │   └── formatters.ts     # Date/time, duration, and badge color utilities
│   ├── types/
│   │   └── index.ts          # Shared TypeScript models
│   ├── App.tsx               # Main application controller & state management
│   ├── main.tsx              # React DOM entry point
│   └── index.css             # Tailwind CSS styles
├── package.json
└── vite.config.ts
```

---

## 🔌 REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/visitors` | List all visitors (supports `?search=`, `?status=`, `?date=`, `?purpose=`) |
| `GET` | `/api/visitors/:id` | Get details for a single visitor |
| `POST` | `/api/visitors` | Register new visitor (auto-assigns check-in timestamp & badge ID) |
| `PUT` | `/api/visitors/:id` | Update visitor record |
| `PATCH` | `/api/visitors/:id/checkout` | One-click check out (records departure time & duration) |
| `PATCH` | `/api/visitors/:id/status` | Update status (`checked_in`, `in_meeting`, `checked_out`) |
| `DELETE` | `/api/visitors/:id` | Delete visitor record |
| `GET` | `/api/visitors/stats/summary`| Aggregated metrics (today total, active on-site, hourly peaks) |
| `GET` | `/api/visitors/export/csv` | Download visitor records as a formatted `.csv` file |
| `GET` | `/api/hosts` | List internal employee hosts |
| `POST` | `/api/visitors/seed` | Reset database to sample records |

---

---

## 🍃 MongoDB Connection Guide

The backend includes full native **Mongoose** integration. You can connect either to a **Local MongoDB** installation or a **MongoDB Atlas Cloud Cluster**.

### Option 1: Connect to Local MongoDB
1. Ensure your MongoDB server is running on your machine (default port `27017`):
   ```bash
   # On macOS (Homebrew):
   brew services start mongodb/brew/mongodb-community

   # On Linux (systemd):
   sudo systemctl start mongod

   # On Windows:
   net start MongoDB
   ```
2. Create a `.env` file in the project root (or copy from `.env.example`):
   ```env
   MONGODB_URI="mongodb://localhost:27017/visitor_db"
   ```
3. Run `npm run dev`. The server will log:
   ```text
   ✅ Connected to MongoDB successfully (mongodb://localhost:27017/visitor_db)
   ```

---

### Option 2: Connect to MongoDB Atlas (Free Cloud Cluster)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free Shared Cluster (M0).
2. Under **Security > Database Access**, add a user with password (e.g. username `dbUser`, password `myPassword123`).
3. Under **Security > Network Access**, add IP Address `0.0.0.0/0` (Allow Access from Anywhere) or your specific IP.
4. Click **Clusters > Connect > Drivers** and copy your connection string.
5. In your `.env` file, paste your URI:
   ```env
   MONGODB_URI="mongodb+srv://dbUser:myPassword123@cluster0.abcde.mongodb.net/visitor_db?retryWrites=true&w=majority"
   ```
6. Start the server with `npm run dev`.

*Note: If `MONGODB_URI` is omitted, the app will automatically run on the zero-setup persistent JSON document store (`data/visitors.json`), ensuring the app always functions reliably.*
