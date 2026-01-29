import { google, calendar_v3 } from 'googleapis';
import { CalendarEvent, GoogleTokens } from '../types/index.js';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// שמירת טוקנים במצב (בפרודקשן - מסד נתונים)
let storedTokens: GoogleTokens | null = null;

export function getAuthUrl(): string {
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
}

export async function handleAuthCallback(code: string): Promise<GoogleTokens> {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  storedTokens = tokens as GoogleTokens;
  return storedTokens;
}

export function setTokens(tokens: GoogleTokens): void {
  oauth2Client.setCredentials(tokens);
  storedTokens = tokens;
}

export function isAuthenticated(): boolean {
  return storedTokens !== null && storedTokens.access_token !== undefined;
}

function getCalendarClient(): calendar_v3.Calendar {
  if (!isAuthenticated()) {
    throw new Error('לא מחובר ליומן Google. אנא התחבר תחילה.');
  }
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export async function createCalendarEvent(event: CalendarEvent): Promise<string> {
  const calendar = getCalendarClient();

  const eventData: calendar_v3.Schema$Event = {
    summary: event.summary,
    description: event.description,
    start: {
      dateTime: event.start.toISOString(),
      timeZone: 'Asia/Jerusalem',
    },
    end: {
      dateTime: event.end.toISOString(),
      timeZone: 'Asia/Jerusalem',
    },
    reminders: event.reminders || {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
        { method: 'popup', minutes: 10 },
      ],
    },
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: eventData,
  });

  return response.data.id || '';
}

export async function updateCalendarEvent(
  eventId: string,
  updates: Partial<CalendarEvent>
): Promise<void> {
  const calendar = getCalendarClient();

  const updateData: calendar_v3.Schema$Event = {};

  if (updates.summary) updateData.summary = updates.summary;
  if (updates.description) updateData.description = updates.description;
  if (updates.start) {
    updateData.start = {
      dateTime: updates.start.toISOString(),
      timeZone: 'Asia/Jerusalem',
    };
  }
  if (updates.end) {
    updateData.end = {
      dateTime: updates.end.toISOString(),
      timeZone: 'Asia/Jerusalem',
    };
  }

  await calendar.events.update({
    calendarId: 'primary',
    eventId,
    requestBody: updateData,
  });
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const calendar = getCalendarClient();

  await calendar.events.delete({
    calendarId: 'primary',
    eventId,
  });
}

export async function getUpcomingEvents(maxResults = 10): Promise<CalendarEvent[]> {
  const calendar = getCalendarClient();

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = response.data.items || [];

  return events.map((event) => ({
    id: event.id || undefined,
    summary: event.summary || 'ללא כותרת',
    description: event.description || undefined,
    start: new Date(event.start?.dateTime || event.start?.date || ''),
    end: new Date(event.end?.dateTime || event.end?.date || ''),
  }));
}

export async function getTodayEvents(): Promise<CalendarEvent[]> {
  const calendar = getCalendarClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: today.toISOString(),
    timeMax: tomorrow.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = response.data.items || [];

  return events.map((event) => ({
    id: event.id || undefined,
    summary: event.summary || 'ללא כותרת',
    description: event.description || undefined,
    start: new Date(event.start?.dateTime || event.start?.date || ''),
    end: new Date(event.end?.dateTime || event.end?.date || ''),
  }));
}

export async function searchEvents(query: string): Promise<CalendarEvent[]> {
  const calendar = getCalendarClient();

  const response = await calendar.events.list({
    calendarId: 'primary',
    q: query,
    timeMin: new Date().toISOString(),
    maxResults: 20,
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = response.data.items || [];

  return events.map((event) => ({
    id: event.id || undefined,
    summary: event.summary || 'ללא כותרת',
    description: event.description || undefined,
    start: new Date(event.start?.dateTime || event.start?.date || ''),
    end: new Date(event.end?.dateTime || event.end?.date || ''),
  }));
}
