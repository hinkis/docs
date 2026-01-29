import { Router, Request, Response } from 'express';
import * as calendarService from '../services/googleCalendar.js';
import { CalendarEvent } from '../types/index.js';

const router = Router();

// בדיקת התחברות ל-Google
function requireAuth(req: Request, res: Response, next: () => void) {
  if (!calendarService.isAuthenticated()) {
    res.status(401).json({
      success: false,
      error: 'לא מחובר ליומן Google',
      needsAuth: true,
    });
    return;
  }
  next();
}

// קבלת אירועים קרובים
router.get('/events', requireAuth, async (_req: Request, res: Response) => {
  try {
    const events = await calendarService.getUpcomingEvents(20);
    res.json({
      success: true,
      events,
    });
  } catch (error) {
    console.error('Error getting events:', error);
    res.status(500).json({ success: false, error: 'שגיאה בקבלת אירועים' });
  }
});

// קבלת אירועי היום
router.get('/events/today', requireAuth, async (_req: Request, res: Response) => {
  try {
    const events = await calendarService.getTodayEvents();
    res.json({
      success: true,
      events,
    });
  } catch (error) {
    console.error('Error getting today events:', error);
    res.status(500).json({ success: false, error: 'שגיאה בקבלת אירועי היום' });
  }
});

// חיפוש אירועים
router.get('/events/search', requireAuth, async (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      res.status(400).json({ success: false, error: 'מילת חיפוש חסרה' });
      return;
    }

    const events = await calendarService.searchEvents(q);
    res.json({
      success: true,
      events,
    });
  } catch (error) {
    console.error('Error searching events:', error);
    res.status(500).json({ success: false, error: 'שגיאה בחיפוש אירועים' });
  }
});

// יצירת אירוע חדש
router.post('/events', requireAuth, async (req: Request, res: Response) => {
  try {
    const { summary, description, start, end, reminders } = req.body;

    if (!summary || !start) {
      res.status(400).json({ success: false, error: 'כותרת ותאריך התחלה נדרשים' });
      return;
    }

    const event: CalendarEvent = {
      summary,
      description,
      start: new Date(start),
      end: end ? new Date(end) : new Date(new Date(start).getTime() + 60 * 60 * 1000),
      reminders,
    };

    const eventId = await calendarService.createCalendarEvent(event);
    res.json({
      success: true,
      eventId,
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ success: false, error: 'שגיאה ביצירת אירוע' });
  }
});

// עדכון אירוע
router.put('/events/:eventId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { summary, description, start, end } = req.body;

    const updates: Partial<CalendarEvent> = {};
    if (summary) updates.summary = summary;
    if (description) updates.description = description;
    if (start) updates.start = new Date(start);
    if (end) updates.end = new Date(end);

    await calendarService.updateCalendarEvent(eventId, updates);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ success: false, error: 'שגיאה בעדכון אירוע' });
  }
});

// מחיקת אירוע
router.delete('/events/:eventId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    await calendarService.deleteCalendarEvent(eventId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ success: false, error: 'שגיאה במחיקת אירוע' });
  }
});

export default router;
