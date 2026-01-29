import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { Reminder, Task } from '../types/index.js';
import { formatHebrewDate } from '../utils/dateParser.js';
import * as calendarService from './googleCalendar.js';

// מאגר תזכורות (בפרודקשן - מסד נתונים)
const reminders: Map<string, Reminder> = new Map();
const tasks: Map<string, Task> = new Map();

// קולבק להודעות צ'אט
let chatNotificationCallback: ((message: string, taskId?: string) => void) | null = null;

export function setNotificationCallback(
  callback: (message: string, taskId?: string) => void
): void {
  chatNotificationCallback = callback;
}

export function createReminder(
  title: string,
  message: string,
  scheduledFor: Date,
  type: 'chat' | 'calendar' | 'both' = 'both',
  taskId?: string
): Reminder {
  const reminder: Reminder = {
    id: uuidv4(),
    taskId,
    title,
    message,
    scheduledFor,
    sent: false,
    type,
  };

  reminders.set(reminder.id, reminder);
  return reminder;
}

export function createTask(
  title: string,
  description?: string,
  dueDate?: Date,
  reminderDate?: Date,
  attachedImage?: string
): Task {
  const task: Task = {
    id: uuidv4(),
    title,
    description,
    dueDate,
    reminderDate,
    completed: false,
    attachedImage,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  tasks.set(task.id, task);

  // יצירת תזכורת אוטומטית אם יש תאריך
  if (reminderDate || dueDate) {
    const reminderTime = reminderDate || dueDate!;
    createReminder(
      `תזכורת: ${title}`,
      description || title,
      reminderTime,
      'both',
      task.id
    );
  }

  return task;
}

export function getTask(taskId: string): Task | undefined {
  return tasks.get(taskId);
}

export function getAllTasks(includeCompleted = false): Task[] {
  const allTasks = Array.from(tasks.values());
  if (includeCompleted) {
    return allTasks;
  }
  return allTasks.filter((task) => !task.completed);
}

export function completeTask(taskId: string): Task | undefined {
  const task = tasks.get(taskId);
  if (task) {
    task.completed = true;
    task.updatedAt = new Date();
    tasks.set(taskId, task);
  }
  return task;
}

export function deleteTask(taskId: string): boolean {
  return tasks.delete(taskId);
}

export function getReminder(reminderId: string): Reminder | undefined {
  return reminders.get(reminderId);
}

export function getAllReminders(includeSent = false): Reminder[] {
  const allReminders = Array.from(reminders.values());
  if (includeSent) {
    return allReminders;
  }
  return allReminders.filter((reminder) => !reminder.sent);
}

export function deleteReminder(reminderId: string): boolean {
  return reminders.delete(reminderId);
}

async function sendReminder(reminder: Reminder): Promise<void> {
  // שליחת תזכורת בצ'אט
  if ((reminder.type === 'chat' || reminder.type === 'both') && chatNotificationCallback) {
    const formattedDate = formatHebrewDate(reminder.scheduledFor);
    const chatMessage = `⏰ תזכורת: ${reminder.title}\n${reminder.message}\n📅 ${formattedDate}`;
    chatNotificationCallback(chatMessage, reminder.taskId);
  }

  // סימון כנשלח
  reminder.sent = true;
  reminder.sentAt = new Date();
  reminders.set(reminder.id, reminder);

  console.log(`[Reminder] Sent: ${reminder.title} at ${new Date().toISOString()}`);
}

// בדיקת תזכורות כל דקה
export function startReminderChecker(): void {
  cron.schedule('* * * * *', () => {
    const now = new Date();

    for (const reminder of reminders.values()) {
      if (!reminder.sent && reminder.scheduledFor <= now) {
        sendReminder(reminder).catch((err) => {
          console.error(`[Reminder] Error sending reminder ${reminder.id}:`, err);
        });
      }
    }
  });

  console.log('[Reminder] Reminder checker started');
}

export function getTasksForToday(): Task[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return Array.from(tasks.values()).filter((task) => {
    if (task.completed) return false;
    if (!task.dueDate) return false;
    return task.dueDate >= today && task.dueDate < tomorrow;
  });
}

export function getUpcomingReminders(hours = 24): Reminder[] {
  const now = new Date();
  const future = new Date(now.getTime() + hours * 60 * 60 * 1000);

  return Array.from(reminders.values()).filter((reminder) => {
    if (reminder.sent) return false;
    return reminder.scheduledFor >= now && reminder.scheduledFor <= future;
  });
}

export function formatTaskList(taskList: Task[]): string {
  if (taskList.length === 0) {
    return 'אין משימות פתוחות 🎉';
  }

  return taskList
    .map((task, index) => {
      const status = task.completed ? '✅' : '⬜';
      const dueStr = task.dueDate ? ` (עד ${formatHebrewDate(task.dueDate)})` : '';
      return `${index + 1}. ${status} ${task.title}${dueStr}`;
    })
    .join('\n');
}

export function formatReminderList(reminderList: Reminder[]): string {
  if (reminderList.length === 0) {
    return 'אין תזכורות מתוכננות';
  }

  return reminderList
    .map((reminder, index) => {
      const timeStr = formatHebrewDate(reminder.scheduledFor);
      return `${index + 1}. ⏰ ${reminder.title} - ${timeStr}`;
    })
    .join('\n');
}
