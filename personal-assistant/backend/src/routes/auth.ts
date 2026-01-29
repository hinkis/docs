import { Router, Request, Response } from 'express';
import * as calendarService from '../services/googleCalendar.js';

const router = Router();

// קבלת כתובת התחברות ל-Google
router.get('/google', (_req: Request, res: Response) => {
  try {
    const authUrl = calendarService.getAuthUrl();
    res.json({
      success: true,
      authUrl,
    });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ success: false, error: 'שגיאה ביצירת קישור התחברות' });
  }
});

// טיפול בקולבק מ-Google
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      res.status(400).json({ success: false, error: 'קוד אימות חסר' });
      return;
    }

    await calendarService.handleAuthCallback(code);

    // הפניה לדף הבית עם הודעת הצלחה
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}?auth=success`);
  } catch (error) {
    console.error('Error handling Google callback:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}?auth=error`);
  }
});

// בדיקת סטטוס התחברות
router.get('/status', (_req: Request, res: Response) => {
  try {
    const isAuthenticated = calendarService.isAuthenticated();
    res.json({
      success: true,
      isAuthenticated,
    });
  } catch (error) {
    console.error('Error checking auth status:', error);
    res.status(500).json({ success: false, error: 'שגיאה בבדיקת סטטוס' });
  }
});

export default router;
