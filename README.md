# ⚡ UniPress — Production Ready

Full-stack UniPress built with **Node.js · Express.js · MongoDB · Vanilla HTML/CSS/JS**

## 🗂️ Project Structure
```
unipress/
├── backend/                    # Express.js REST API
│   ├── config/database.js      # MongoDB connection with pooling
│   ├── controllers/            # authController, contentTypeController,
│   │                           # entryController, mediaController, apiKeyController
│   ├── middleware/             # auth.js (JWT+APIKey), errorHandler.js, validate.js (Joi)
│   ├── models/                 # User, ContentType (dynamic fields), Entry, Media, ApiKey
│   ├── routes/index.js         # All API routes
│   ├── utils/                  # logger.js (Winston), apiResponse.js, seed.js
│   ├── uploads/                # Uploaded media files
│   ├── .env.example
│   └── server.js               # Entry point with graceful shutdown
│
└── frontend/                   # Admin Panel (zero framework, pure JS)
    ├── assets/css/style.css    # Full dark-theme design system
    ├── assets/js/core.js       # API client, auth, toast, modal, utils
    ├── assets/js/layout.js     # Sidebar + topbar renderer
    └── pages/
        ├── login.html          # JWT login
        ├── dashboard.html      # Stats + overview
        ├── content-types.html  # Dynamic type builder (like Strapi)
        ├── entries.html        # CRUD entries with field-aware form
        ├── media.html          # Upload, browse, manage files
        ├── users.html          # Team management with RBAC
        └── api-keys.html       # API key generator + docs
```

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- MongoDB running locally or Atlas URI

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env     # Edit MONGODB_URI, JWT_SECRET etc.
npm run seed             # Creates superadmin + sample content types
npm run dev              # Dev server with nodemon
# OR
npm start                # Production
```
API runs at → **http://localhost:5000**

### 2. Frontend
Serve the `frontend/` folder with any static server:
```bash
# VS Code Live Server — open frontend/pages/login.html

# npx serve
cd frontend && npx serve -s . -l 3000

# Python
cd frontend && python -m http.server 3000
```
Open → **http://localhost:3000/pages/login.html**

**Default credentials:** `admin@cms.com` / `Admin@123456`

## 🌐 API Endpoints

### Admin (JWT)
| | Endpoint |
|---|---|
| POST | /api/auth/login |
| GET | /api/content-types |
| POST | /api/content-types |
| PATCH | /api/content-types/:id |
| GET | /api/content-types/:ctId/entries |
| POST | /api/content-types/:ctId/entries |
| PATCH | /api/entries/:id |
| DELETE | /api/entries/:id |
| POST | /api/media/upload |
| GET | /api/users |
| POST | /api/api-keys |

### Public (API Key via `X-API-Key` header)
| | Endpoint |
|---|---|
| GET | /api/v1/content/:slug |
| GET | /api/v1/content/:slug/:id |

## 🔐 Roles
| Role | Can do |
|------|--------|
| viewer | Read admin panel only |
| editor | Create & edit entries |
| admin | Manage types, entries, media, users |
| superadmin | Full access + delete users |

## ✅ Production Checklist
- [ ] Set strong `JWT_SECRET` (32+ chars)  
- [ ] Set `NODE_ENV=production`  
- [ ] Use MongoDB Atlas  
- [ ] Set `ALLOWED_ORIGINS` to your domain  
- [ ] Run behind NGINX + HTTPS  
- [ ] Use PM2: `pm2 start server.js --name cms`  
- [ ] Enable MongoDB backups
