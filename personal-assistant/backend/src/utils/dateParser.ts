import { parse, addDays, addWeeks, addMonths, setHours, setMinutes, isValid } from 'date-fns';
import { he } from 'date-fns/locale';

// מילון לפענוח ביטויי זמן בעברית
const hebrewTimeExpressions: Record<string, () => Date> = {
  'היום': () => new Date(),
  'מחר': () => addDays(new Date(), 1),
  'מחרתיים': () => addDays(new Date(), 2),
  'בעוד שבוע': () => addWeeks(new Date(), 1),
  'בעוד חודש': () => addMonths(new Date(), 1),
  'השבוע': () => new Date(),
  'בסוף השבוע': () => {
    const today = new Date();
    const daysUntilFriday = (5 - today.getDay() + 7) % 7;
    return addDays(today, daysUntilFriday || 7);
  },
};

const hebrewDays: Record<string, number> = {
  'ראשון': 0,
  'שני': 1,
  'שלישי': 2,
  'רביעי': 3,
  'חמישי': 4,
  'שישי': 5,
  'שבת': 6,
  'יום ראשון': 0,
  'יום שני': 1,
  'יום שלישי': 2,
  'יום רביעי': 3,
  'יום חמישי': 4,
  'יום שישי': 5,
  'יום שבת': 6,
};

const hebrewMonths: Record<string, number> = {
  'ינואר': 0, 'פברואר': 1, 'מרץ': 2, 'אפריל': 3,
  'מאי': 4, 'יוני': 5, 'יולי': 6, 'אוגוסט': 7,
  'ספטמבר': 8, 'אוקטובר': 9, 'נובמבר': 10, 'דצמבר': 11,
};

export function parseHebrewDate(text: string): Date | null {
  const lowerText = text.toLowerCase().trim();

  // בדיקת ביטויים מוכנים
  for (const [expression, getDate] of Object.entries(hebrewTimeExpressions)) {
    if (lowerText.includes(expression)) {
      return getDate();
    }
  }

  // בדיקת ימים בשבוע ("ביום שני", "בשני")
  for (const [day, dayIndex] of Object.entries(hebrewDays)) {
    if (lowerText.includes(day)) {
      const today = new Date();
      const currentDay = today.getDay();
      let daysToAdd = dayIndex - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7;
      return addDays(today, daysToAdd);
    }
  }

  // בדיקת תאריך מספרי (1.2, 1/2, 1-2)
  const numericDateRegex = /(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?/;
  const numericMatch = lowerText.match(numericDateRegex);
  if (numericMatch) {
    const day = parseInt(numericMatch[1]);
    const month = parseInt(numericMatch[2]) - 1;
    const year = numericMatch[3]
      ? (numericMatch[3].length === 2 ? 2000 + parseInt(numericMatch[3]) : parseInt(numericMatch[3]))
      : new Date().getFullYear();

    const date = new Date(year, month, day);
    if (isValid(date)) return date;
  }

  // בדיקת תאריך עם חודש בעברית ("5 בינואר", "ב-5 לינואר")
  const hebrewDateRegex = /(?:ב-?)?(\d{1,2})\s*(?:ב|ל)?([א-ת]+)/;
  const hebrewMatch = lowerText.match(hebrewDateRegex);
  if (hebrewMatch) {
    const day = parseInt(hebrewMatch[1]);
    const monthName = hebrewMatch[2];
    const monthIndex = hebrewMonths[monthName];

    if (monthIndex !== undefined) {
      const year = new Date().getFullYear();
      const date = new Date(year, monthIndex, day);
      if (isValid(date)) return date;
    }
  }

  return null;
}

export function parseHebrewTime(text: string): { hours: number; minutes: number } | null {
  // בדיקת שעה מספרית (10:30, 10.30, בשעה 10:30)
  const timeRegex = /(?:בשעה\s*)?(\d{1,2})[:.h](\d{2})?/;
  const timeMatch = text.match(timeRegex);

  if (timeMatch) {
    const hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;

    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return { hours, minutes };
    }
  }

  // בדיקת ביטויים כמו "בבוקר", "בצהריים", "בערב"
  if (text.includes('בבוקר')) return { hours: 9, minutes: 0 };
  if (text.includes('בצהריים')) return { hours: 12, minutes: 0 };
  if (text.includes('אחה"צ') || text.includes('אחרי הצהריים')) return { hours: 14, minutes: 0 };
  if (text.includes('בערב')) return { hours: 19, minutes: 0 };
  if (text.includes('בלילה')) return { hours: 21, minutes: 0 };

  return null;
}

export function parseDateTime(text: string): Date | null {
  let date = parseHebrewDate(text);
  if (!date) return null;

  const time = parseHebrewTime(text);
  if (time) {
    date = setHours(date, time.hours);
    date = setMinutes(date, time.minutes);
  } else {
    // ברירת מחדל - 9 בבוקר
    date = setHours(date, 9);
    date = setMinutes(date, 0);
  }

  return date;
}

export function formatHebrewDate(date: Date): string {
  const day = date.getDate();
  const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
                       'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

  const month = monthNames[date.getMonth()];
  const dayName = dayNames[date.getDay()];
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `יום ${dayName}, ${day} ב${month} בשעה ${hours}:${minutes}`;
}
