import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as chatService from '../services/chatService.js';
import * as reminderService from '../services/reminderService.js';

const router = Router();

// הגדרת multer לטיפול בהעלאת תמונות
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('רק קבצי תמונה מותרים'));
    }
  },
});

// יצירת סשן חדש
router.post('/session', (_req: Request, res: Response) => {
  try {
    const session = chatService.createSession();
    chatService.initializeChatNotifications(session.id);

    res.json({
      success: true,
      sessionId: session.id,
      messages: session.messages,
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ success: false, error: 'שגיאה ביצירת סשן' });
  }
});

// קבלת הודעות סשן
router.get('/session/:sessionId/messages', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const messages = chatService.getSessionMessages(sessionId);

    res.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ success: false, error: 'שגיאה בקבלת הודעות' });
  }
});

// שליחת הודעת טקסט
router.post('/session/:sessionId/message', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== 'string') {
      res.status(400).json({ success: false, error: 'תוכן הודעה חסר' });
      return;
    }

    const response = await chatService.processUserMessage(sessionId, content);

    res.json({
      success: true,
      message: response,
    });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ success: false, error: 'שגיאה בעיבוד הודעה' });
  }
});

// שליחת הודעה עם תמונה
router.post(
  '/session/:sessionId/message/image',
  upload.single('image'),
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { content } = req.body;
      const imageFile = req.file;

      let imageBase64: string | undefined;
      if (imageFile) {
        imageBase64 = imageFile.buffer.toString('base64');
      }

      const response = await chatService.processUserMessage(
        sessionId,
        content || '',
        imageBase64
      );

      res.json({
        success: true,
        message: response,
      });
    } catch (error) {
      console.error('Error processing image message:', error);
      res.status(500).json({ success: false, error: 'שגיאה בעיבוד הודעה עם תמונה' });
    }
  }
);

// קבלת סיכום יומי
router.get('/session/:sessionId/summary', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const summary = await chatService.getDailySummary(sessionId);

    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error('Error getting summary:', error);
    res.status(500).json({ success: false, error: 'שגיאה בקבלת סיכום' });
  }
});

// קבלת משימות
router.get('/tasks', (_req: Request, res: Response) => {
  try {
    const tasks = reminderService.getAllTasks(false);

    res.json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error('Error getting tasks:', error);
    res.status(500).json({ success: false, error: 'שגיאה בקבלת משימות' });
  }
});

// סימון משימה כהושלמה
router.put('/tasks/:taskId/complete', (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const task = reminderService.completeTask(taskId);

    if (!task) {
      res.status(404).json({ success: false, error: 'משימה לא נמצאה' });
      return;
    }

    res.json({
      success: true,
      task,
    });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ success: false, error: 'שגיאה בסימון משימה' });
  }
});

// מחיקת משימה
router.delete('/tasks/:taskId', (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const deleted = reminderService.deleteTask(taskId);

    if (!deleted) {
      res.status(404).json({ success: false, error: 'משימה לא נמצאה' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ success: false, error: 'שגיאה במחיקת משימה' });
  }
});

// קבלת תזכורות
router.get('/reminders', (_req: Request, res: Response) => {
  try {
    const reminders = reminderService.getAllReminders(false);

    res.json({
      success: true,
      reminders,
    });
  } catch (error) {
    console.error('Error getting reminders:', error);
    res.status(500).json({ success: false, error: 'שגיאה בקבלת תזכורות' });
  }
});

// מחיקת תזכורת
router.delete('/reminders/:reminderId', (req: Request, res: Response) => {
  try {
    const { reminderId } = req.params;
    const deleted = reminderService.deleteReminder(reminderId);

    if (!deleted) {
      res.status(404).json({ success: false, error: 'תזכורת לא נמצאה' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting reminder:', error);
    res.status(500).json({ success: false, error: 'שגיאה במחיקת תזכורת' });
  }
});

export default router;
