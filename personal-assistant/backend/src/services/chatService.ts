import { v4 as uuidv4 } from 'uuid';
import { Message, ChatSession, Task, Reminder, CalendarEvent } from '../types/index.js';
import * as aiService from './aiService.js';
import * as calendarService from './googleCalendar.js';
import * as reminderService from './reminderService.js';
import { formatHebrewDate, parseDateTime } from '../utils/dateParser.js';

// שמירת סשנים (בפרודקשן - מסד נתונים)
const sessions: Map<string, ChatSession> = new Map();

// קולבקים לאירועי צ'אט
type MessageCallback = (message: Message) => void;
const messageCallbacks: Map<string, MessageCallback[]> = new Map();

export function createSession(): ChatSession {
  const session: ChatSession = {
    id: uuidv4(),
    messages: [],
    tasks: [],
    reminders: [],
    createdAt: new Date(),
    lastActivity: new Date(),
  };

  sessions.set(session.id, session);

  // הודעת פתיחה
  const welcomeMessage: Message = {
    id: uuidv4(),
    content: 'שלום! 👋 אני אלי, המזכיר האישי שלך.\n\nאני יכול לעזור לך עם:\n• ניהול משימות ותזכורות\n• הוספת אירועים ליומן\n• פענוח חשבוניות ותמונות\n• וכל מה שצריך!\n\nספר לי במה אוכל לעזור?',
    type: 'system',
    sender: 'assistant',
    timestamp: new Date(),
  };

  session.messages.push(welcomeMessage);
  return session;
}

export function getSession(sessionId: string): ChatSession | undefined {
  return sessions.get(sessionId);
}

export function addMessageCallback(sessionId: string, callback: MessageCallback): void {
  if (!messageCallbacks.has(sessionId)) {
    messageCallbacks.set(sessionId, []);
  }
  messageCallbacks.get(sessionId)!.push(callback);
}

export function removeMessageCallback(sessionId: string, callback: MessageCallback): void {
  const callbacks = messageCallbacks.get(sessionId);
  if (callbacks) {
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }
}

function notifyCallbacks(sessionId: string, message: Message): void {
  const callbacks = messageCallbacks.get(sessionId);
  if (callbacks) {
    callbacks.forEach((callback) => callback(message));
  }
}

function addMessageToSession(session: ChatSession, message: Message): void {
  session.messages.push(message);
  session.lastActivity = new Date();
  sessions.set(session.id, session);
  notifyCallbacks(session.id, message);
}

export async function processUserMessage(
  sessionId: string,
  content: string,
  imageBase64?: string
): Promise<Message> {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error('סשן לא נמצא');
  }

  // יצירת הודעת המשתמש
  const userMessage: Message = {
    id: uuidv4(),
    content,
    type: imageBase64 ? 'image' : 'text',
    sender: 'user',
    timestamp: new Date(),
    imageUrl: imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : undefined,
  };

  addMessageToSession(session, userMessage);

  // עיבוד התמונה אם יש
  let imageAnalysis: Awaited<ReturnType<typeof aiService.processImage>> | null = null;
  if (imageBase64) {
    imageAnalysis = await aiService.processImage(imageBase64, content || undefined);
  }

  // בדיקת אימוג'י
  const isEmojiOnly = /^[\p{Emoji}\s]+$/u.test(content.trim());
  if (isEmojiOnly && session.messages.length > 1) {
    const lastAssistantMessage = [...session.messages]
      .reverse()
      .find((m) => m.sender === 'assistant');

    if (lastAssistantMessage) {
      const emojiResponse = await aiService.processEmojiReaction(
        content.trim(),
        lastAssistantMessage
      );

      const responseMessage: Message = {
        id: uuidv4(),
        content: emojiResponse,
        type: 'text',
        sender: 'assistant',
        timestamp: new Date(),
      };

      addMessageToSession(session, responseMessage);
      return responseMessage;
    }
  }

  // עיבוד ההודעה עם AI
  const fullContent = imageAnalysis
    ? `${content}\n\n[ניתוח תמונה: ${imageAnalysis.description}]`
    : content;

  const aiResult = await aiService.processMessage(fullContent, session.messages);

  // טיפול ביצירת אירוע ביומן
  let calendarEventId: string | undefined;
  if (aiResult.shouldCreateEvent && aiResult.eventDetails) {
    try {
      const endDate = new Date(aiResult.eventDetails.date);
      endDate.setHours(endDate.getHours() + 1);

      const event: CalendarEvent = {
        summary: aiResult.eventDetails.title,
        description: aiResult.eventDetails.description,
        start: aiResult.eventDetails.date,
        end: endDate,
      };

      if (calendarService.isAuthenticated()) {
        calendarEventId = await calendarService.createCalendarEvent(event);
      }
    } catch (error) {
      console.error('Error creating calendar event:', error);
    }
  }

  // יצירת משימה אם זוהתה כוונה
  let taskCreated: Task | null = null;
  if (
    aiResult.response.intent === 'create_task' ||
    aiResult.response.intent === 'create_reminder'
  ) {
    const extractedDate = aiResult.response.extractedData?.date
      ? new Date(aiResult.response.extractedData.date)
      : parseDateTime(content);

    if (extractedDate) {
      // חילוץ כותרת משימה (ניסיון פשוט)
      const taskTitle = extractTaskTitle(content);

      taskCreated = reminderService.createTask(
        taskTitle,
        content,
        extractedDate,
        extractedDate,
        imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : undefined
      );

      if (calendarEventId) {
        taskCreated.calendarEventId = calendarEventId;
      }
    }
  }

  // יצירת תגובת המזכיר
  let responseContent = aiResult.response.message;

  // הוספת מידע על חשבונית אם זוהתה
  if (imageAnalysis?.invoiceData) {
    const inv = imageAnalysis.invoiceData;
    responseContent += `\n\n📄 זיהיתי חשבונית:`;
    if (inv.vendor) responseContent += `\n• ספק: ${inv.vendor}`;
    if (inv.amount) responseContent += `\n• סכום: ${inv.currency || '₪'}${inv.amount}`;
    if (inv.dueDate) responseContent += `\n• תאריך יעד: ${inv.dueDate}`;

    if (imageAnalysis.suggestedDate) {
      responseContent += `\n\nרוצה שאוסיף תזכורת ליומן ל-${formatHebrewDate(imageAnalysis.suggestedDate)}?`;
    }
  }

  // הוספת אישור יצירת משימה
  if (taskCreated) {
    const dateStr = taskCreated.dueDate ? formatHebrewDate(taskCreated.dueDate) : '';
    responseContent += `\n\n✅ יצרתי משימה: "${taskCreated.title}"`;
    if (dateStr) {
      responseContent += `\n📅 מתוכנן ל: ${dateStr}`;
    }
    if (calendarEventId) {
      responseContent += `\n🗓️ נוסף ליומן Google`;
    }
  }

  const responseMessage: Message = {
    id: uuidv4(),
    content: responseContent,
    type: 'text',
    sender: 'assistant',
    timestamp: new Date(),
    metadata: {
      extractedDate: aiResult.response.extractedData?.date,
      extractedTask: taskCreated?.title,
      calendarEventId,
      invoiceData: imageAnalysis?.invoiceData,
    },
  };

  addMessageToSession(session, responseMessage);
  return responseMessage;
}

function extractTaskTitle(text: string): string {
  // הסרת מילות קישור נפוצות
  const cleanText = text
    .replace(/^(תזכיר לי|צריך ל|אני צריך|עלי ל|יש לי|להזכיר|תוסיף|הוסף)\s*/i, '')
    .replace(/(מחר|היום|בשעה|ב-?\d+|בבוקר|בערב|בצהריים)/gi, '')
    .trim();

  // לקיחת 50 התווים הראשונים
  return cleanText.substring(0, 50) || 'משימה חדשה';
}

export function getSessionMessages(sessionId: string): Message[] {
  const session = sessions.get(sessionId);
  return session ? session.messages : [];
}

export function getSessionTasks(sessionId: string): Task[] {
  return reminderService.getAllTasks(false);
}

export function getSessionReminders(sessionId: string): Reminder[] {
  return reminderService.getAllReminders(false);
}

// פונקציה להוספת תזכורות לצ'אט
export function initializeChatNotifications(sessionId: string): void {
  reminderService.setNotificationCallback((message, taskId) => {
    const session = sessions.get(sessionId);
    if (session) {
      const reminderMessage: Message = {
        id: uuidv4(),
        content: message,
        type: 'system',
        sender: 'assistant',
        timestamp: new Date(),
        metadata: taskId ? { extractedTask: taskId } : undefined,
      };

      addMessageToSession(session, reminderMessage);
    }
  });
}

export async function getDailySummary(sessionId: string): Promise<string> {
  const todayTasks = reminderService.getTasksForToday();
  const upcomingReminders = reminderService.getUpcomingReminders(24);

  let summary = '📋 סיכום יומי:\n\n';

  if (todayTasks.length > 0) {
    summary += '**משימות להיום:**\n';
    summary += reminderService.formatTaskList(todayTasks);
    summary += '\n\n';
  } else {
    summary += 'אין משימות מתוכננות להיום 🎉\n\n';
  }

  if (upcomingReminders.length > 0) {
    summary += '**תזכורות קרובות:**\n';
    summary += reminderService.formatReminderList(upcomingReminders);
  }

  // הוספת אירועי יומן אם מחובר
  if (calendarService.isAuthenticated()) {
    try {
      const todayEvents = await calendarService.getTodayEvents();
      if (todayEvents.length > 0) {
        summary += '\n\n**אירועים ביומן:**\n';
        todayEvents.forEach((event, index) => {
          const timeStr = event.start.toLocaleTimeString('he-IL', {
            hour: '2-digit',
            minute: '2-digit',
          });
          summary += `${index + 1}. 📅 ${event.summary} - ${timeStr}\n`;
        });
      }
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    }
  }

  return summary;
}
