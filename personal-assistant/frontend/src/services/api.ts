import axios from 'axios';
import { Message, Task, Reminder, CalendarEvent } from '../types';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Chat API
export async function createSession(): Promise<{ sessionId: string; messages: Message[] }> {
  const response = await api.post('/chat/session');
  return response.data;
}

export async function getMessages(sessionId: string): Promise<Message[]> {
  const response = await api.get(`/chat/session/${sessionId}/messages`);
  return response.data.messages;
}

export async function sendMessage(sessionId: string, content: string): Promise<Message> {
  const response = await api.post(`/chat/session/${sessionId}/message`, { content });
  return response.data.message;
}

export async function sendMessageWithImage(
  sessionId: string,
  content: string,
  imageFile: File
): Promise<Message> {
  const formData = new FormData();
  formData.append('content', content);
  formData.append('image', imageFile);

  const response = await api.post(`/chat/session/${sessionId}/message/image`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.message;
}

export async function getDailySummary(sessionId: string): Promise<string> {
  const response = await api.get(`/chat/session/${sessionId}/summary`);
  return response.data.summary;
}

// Tasks API
export async function getTasks(): Promise<Task[]> {
  const response = await api.get('/chat/tasks');
  return response.data.tasks;
}

export async function completeTask(taskId: string): Promise<Task> {
  const response = await api.put(`/chat/tasks/${taskId}/complete`);
  return response.data.task;
}

export async function deleteTask(taskId: string): Promise<void> {
  await api.delete(`/chat/tasks/${taskId}`);
}

// Reminders API
export async function getReminders(): Promise<Reminder[]> {
  const response = await api.get('/chat/reminders');
  return response.data.reminders;
}

export async function deleteReminder(reminderId: string): Promise<void> {
  await api.delete(`/chat/reminders/${reminderId}`);
}

// Auth API
export async function getAuthStatus(): Promise<{ isAuthenticated: boolean }> {
  const response = await api.get('/auth/status');
  return response.data;
}

export async function getGoogleAuthUrl(): Promise<string> {
  const response = await api.get('/auth/google');
  return response.data.authUrl;
}

// Calendar API
export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  const response = await api.get('/calendar/events');
  return response.data.events;
}

export async function getTodayEvents(): Promise<CalendarEvent[]> {
  const response = await api.get('/calendar/events/today');
  return response.data.events;
}

export async function createCalendarEvent(event: Partial<CalendarEvent>): Promise<string> {
  const response = await api.post('/calendar/events', event);
  return response.data.eventId;
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  await api.delete(`/calendar/events/${eventId}`);
}

// Health check
export async function checkHealth(): Promise<{ status: string; message: string }> {
  const response = await api.get('/health');
  return response.data;
}
