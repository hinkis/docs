import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import chatRouter from './routes/chat.js';
import authRouter from './routes/auth.js';
import calendarRouter from './routes/calendar.js';
import { startReminderChecker } from './services/reminderService.js';

// טעינת משתני סביבה
config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/chat', chatRouter);
app.use('/api/auth', authRouter);
app.use('/api/calendar', calendarRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'מזכיר אישי פעיל ומוכן לשירותך! 🚀',
    timestamp: new Date().toISOString(),
  });
});

// Error handling
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'שגיאת שרת פנימית',
    message: err.message,
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'הנתיב לא נמצא'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   🤖 מזכיר אישי חכם - Personal Assistant               ║
║                                                        ║
║   שרת פעיל בכתובת: http://localhost:${PORT}             ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
  `);

  // הפעלת בודק התזכורות
  startReminderChecker();
  console.log('✅ מערכת התזכורות פעילה');
});

export default app;
