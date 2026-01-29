# 🤖 אלי - מזכיר אישי חכם

אפליקציית מזכיר אישי חכם עם ממשק צ'אט בסגנון WhatsApp, אינטגרציה ליומן Google ויכולות AI מתקדמות.

## ✨ יכולות

- 💬 **ממשק צ'אט** - ממשק נוח בסגנון WhatsApp עם תמיכה מלאה בעברית (RTL)
- 📅 **ניהול יומן** - חיבור ליומן Google ליצירת אירועים ותזכורות
- 🤖 **AI חכם** - שיחה טבעית בעברית, הבנת הקשר ופעולות אוטומטיות
- 📸 **עיבוד תמונות** - פענוח חשבוניות, מסמכים וחילוץ מידע
- ⏰ **מערכת תזכורות** - תזכורות בצ'אט וביומן Google
- 📝 **ניהול משימות** - יצירה, מעקב והשלמת משימות
- 😀 **הבנת אימוג'ים** - תגובות מהירות עם אימוג'ים

## 🚀 התקנה

### דרישות מקדימות

- Node.js 18+
- חשבון Google Cloud (עבור Calendar API)
- מפתח OpenAI API

### 1. הגדרת Google Cloud

1. צור פרויקט חדש ב-[Google Cloud Console](https://console.cloud.google.com/)
2. הפעל את Google Calendar API
3. צור OAuth 2.0 credentials
4. הוסף את הכתובת `http://localhost:3001/api/auth/google/callback` כ-Redirect URI

### 2. התקנת הפרויקט

```bash
# שכפול הפרויקט
cd personal-assistant

# התקנת dependencies - Backend
cd backend
npm install
cp .env.example .env
# ערוך את .env עם המפתחות שלך

# התקנת dependencies - Frontend
cd ../frontend
npm install
```

### 3. הגדרת משתני סביבה

ערוך את הקובץ `backend/.env`:

```env
OPENAI_API_KEY=your_openai_api_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback
PORT=3001
FRONTEND_URL=http://localhost:5173
```

### 4. הפעלה

```bash
# טרמינל 1 - Backend
cd backend
npm run dev

# טרמינל 2 - Frontend
cd frontend
npm run dev
```

פתח את הדפדפן בכתובת: `http://localhost:5173`

## 📖 שימוש

### שיחה טבעית

פשוט כתוב לאלי בשפה טבעית:
- "תזכיר לי מחר בשעה 10 לשלוח את הדו"ח"
- "מה בתוכנית להיום?"
- "צריך להוסיף משימה: לחדש ביטוח רכב עד סוף החודש"

### העלאת תמונות

- העלה תמונה של חשבונית - אלי יזהה את הפרטים ויציע ליצור תזכורת
- העלה תמונה של מסמך - אלי יחלץ את המידע הרלוונטי

### אימוג'ים

- 👍 - אישור/הסכמה
- ❤️ - אהבתי
- ✅ - סיום משימה
- ⏰ - בקשת תזכורת
- 📅 - צפייה ביומן

## 🏗️ ארכיטקטורה

```
personal-assistant/
├── backend/                 # Node.js + Express Backend
│   ├── src/
│   │   ├── routes/         # API Routes
│   │   ├── services/       # Business Logic
│   │   ├── types/          # TypeScript Types
│   │   └── utils/          # Utilities
│   └── package.json
│
├── frontend/               # React + Vite Frontend
│   ├── src/
│   │   ├── components/     # React Components
│   │   ├── hooks/          # Custom Hooks
│   │   ├── services/       # API Client
│   │   ├── styles/         # CSS Styles
│   │   └── types/          # TypeScript Types
│   └── package.json
│
└── README.md
```

## 🔌 API Endpoints

### Chat
- `POST /api/chat/session` - יצירת סשן חדש
- `GET /api/chat/session/:id/messages` - קבלת הודעות
- `POST /api/chat/session/:id/message` - שליחת הודעה
- `POST /api/chat/session/:id/message/image` - שליחת הודעה עם תמונה

### Tasks & Reminders
- `GET /api/chat/tasks` - קבלת משימות
- `PUT /api/chat/tasks/:id/complete` - סימון משימה כהושלמה
- `DELETE /api/chat/tasks/:id` - מחיקת משימה
- `GET /api/chat/reminders` - קבלת תזכורות

### Calendar
- `GET /api/calendar/events` - אירועים קרובים
- `GET /api/calendar/events/today` - אירועי היום
- `POST /api/calendar/events` - יצירת אירוע

### Auth
- `GET /api/auth/google` - התחלת התחברות Google
- `GET /api/auth/status` - בדיקת סטטוס התחברות

## 📝 רישיון

MIT License

---

נבנה עם ❤️ בישראל
