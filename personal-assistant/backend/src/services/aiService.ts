import OpenAI from 'openai';
import { AIResponse, InvoiceData, Message } from '../types/index.js';
import { parseDateTime, formatHebrewDate } from '../utils/dateParser.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `אתה מזכיר אישי חכם ואדיב בשם "אלי". אתה מדבר עברית טבעית וברורה.
תפקידך לעזור למשתמש בניהול המשימות, התזכורות והיומן שלו.

היכולות שלך:
1. יצירת משימות ותזכורות
2. הוספת אירועים ליומן Google
3. פענוח תמונות של חשבוניות ומסמכים
4. הבנת תאריכים וזמנים בעברית טבעית
5. ניהול שיחה טבעית ונעימה

כשהמשתמש מבקש ליצור משימה או תזכורת:
- חלץ את התאריך והשעה מהבקשה
- חלץ את תיאור המשימה
- אשר למשתמש את הפרטים

כשהמשתמש מעלה תמונה:
- נתח אותה בקפידה
- אם זו חשבונית - חלץ: ספק, סכום, תאריך, תיאור
- אם יש תאריך יעד - הצע ליצור תזכורת

אימוג'ים ותגובות:
- 👍 או ❤️ = אישור/הסכמה
- 👎 = דחייה/ביטול
- ✅ = סיום משימה
- ⏰ = בקשת תזכורת
- 📅 = שאילתת יומן

תמיד היה:
- ידידותי ומקצועי
- תמציתי אך ברור
- יוזם בהצעות רלוונטיות
- רגיש להקשר השיחה`;

interface AIProcessResult {
  response: AIResponse;
  shouldCreateEvent: boolean;
  eventDetails?: {
    title: string;
    date: Date;
    description?: string;
  };
}

export async function processMessage(
  content: string,
  conversationHistory: Message[]
): Promise<AIProcessResult> {
  // המרת היסטוריית השיחה לפורמט OpenAI
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory.slice(-10).map((msg) => ({
      role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.content,
    })),
    { role: 'user', content },
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages,
    functions: [
      {
        name: 'create_calendar_event',
        description: 'יצירת אירוע ביומן Google',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'כותרת האירוע' },
            date: { type: 'string', description: 'תאריך ושעה בפורמט ISO' },
            description: { type: 'string', description: 'תיאור האירוע' },
          },
          required: ['title', 'date'],
        },
      },
      {
        name: 'set_reminder',
        description: 'יצירת תזכורת',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'כותרת התזכורת' },
            date: { type: 'string', description: 'תאריך ושעה לתזכורת' },
            message: { type: 'string', description: 'תוכן התזכורת' },
          },
          required: ['title', 'date'],
        },
      },
    ],
    function_call: 'auto',
    temperature: 0.7,
  });

  const choice = completion.choices[0];
  const responseMessage = choice.message;

  let shouldCreateEvent = false;
  let eventDetails: AIProcessResult['eventDetails'];

  // בדיקה אם יש קריאה לפונקציה
  if (responseMessage.function_call) {
    const functionName = responseMessage.function_call.name;
    const functionArgs = JSON.parse(responseMessage.function_call.arguments || '{}');

    if (functionName === 'create_calendar_event') {
      shouldCreateEvent = true;
      eventDetails = {
        title: functionArgs.title,
        date: new Date(functionArgs.date),
        description: functionArgs.description,
      };
    }
  }

  // ניתוח כוונה מהתוכן
  let intent: AIResponse['intent'] = 'general_chat';
  const lowerContent = content.toLowerCase();

  if (lowerContent.includes('תזכיר') || lowerContent.includes('תזכורת')) {
    intent = 'create_reminder';
  } else if (lowerContent.includes('משימה') || lowerContent.includes('צריך ל')) {
    intent = 'create_task';
  } else if (lowerContent.includes('יומן') || lowerContent.includes('פגישה') || lowerContent.includes('אירוע')) {
    intent = 'view_calendar';
  } else if (lowerContent.includes('חשבונית') || lowerContent.includes('קבלה')) {
    intent = 'process_invoice';
  }

  // חילוץ תאריך מהטקסט
  const parsedDate = parseDateTime(content);

  return {
    response: {
      message: responseMessage.content || 'מבין, אני כאן לעזור!',
      intent,
      extractedData: parsedDate
        ? {
            date: parsedDate.toISOString(),
            time: `${parsedDate.getHours()}:${parsedDate.getMinutes().toString().padStart(2, '0')}`,
          }
        : undefined,
    },
    shouldCreateEvent,
    eventDetails,
  };
}

export async function processImage(
  imageBase64: string,
  userPrompt?: string
): Promise<{
  description: string;
  invoiceData?: InvoiceData;
  suggestedDate?: Date;
}> {
  const prompt = userPrompt || 'נתח את התמונה. אם זו חשבונית, חלץ: ספק, סכום, מטבע, תאריך יעד, תיאור. אם יש תאריכים, ציין אותם.';

  const response = await openai.chat.completions.create({
    model: 'gpt-4-vision-preview',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
            },
          },
        ],
      },
    ],
    max_tokens: 1000,
  });

  const analysisText = response.choices[0].message.content || '';

  // ניסיון לחלץ מידע על חשבונית
  let invoiceData: InvoiceData | undefined;

  // חיפוש פטרנים של חשבונית
  const amountMatch = analysisText.match(/(?:סכום|סה"כ|total|amount)[:\s]*(?:₪|ILS|NIS)?\s*([\d,]+(?:\.\d{2})?)/i);
  const vendorMatch = analysisText.match(/(?:ספק|חברה|מ:|from)[:\s]*([^\n,]+)/i);
  const dateMatch = analysisText.match(/(?:תאריך|יעד|due|date)[:\s]*(\d{1,2}[./-]\d{1,2}[./-]?\d{0,4})/i);

  if (amountMatch || vendorMatch || dateMatch) {
    invoiceData = {
      amount: amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : undefined,
      vendor: vendorMatch ? vendorMatch[1].trim() : undefined,
      dueDate: dateMatch ? dateMatch[1] : undefined,
      currency: '₪',
    };
  }

  // ניסיון לחלץ תאריך מומלץ
  let suggestedDate: Date | undefined;
  if (invoiceData?.dueDate) {
    suggestedDate = parseDateTime(invoiceData.dueDate) || undefined;
  }

  return {
    description: analysisText,
    invoiceData,
    suggestedDate,
  };
}

export async function processEmojiReaction(
  emoji: string,
  contextMessage: Message
): Promise<string> {
  const emojiMeanings: Record<string, string> = {
    '👍': 'אישור',
    '❤️': 'אהבתי',
    '👎': 'ביטול',
    '✅': 'סיום',
    '⏰': 'תזכורת',
    '📅': 'יומן',
    '🔥': 'דחוף',
    '⭐': 'חשוב',
  };

  const meaning = emojiMeanings[emoji] || 'תגובה';

  // יצירת תגובה מותאמת
  const responses: Record<string, string> = {
    '👍': 'מעולה! אני ממשיך עם זה.',
    '❤️': 'שמח שאהבת! 😊',
    '👎': 'הבנתי, אבטל את זה.',
    '✅': 'סימנתי כהושלם!',
    '⏰': 'רוצה שאקבע תזכורת? ספר לי מתי.',
    '📅': 'מציג את היומן שלך...',
    '🔥': 'הבנתי שזה דחוף! אטפל בזה מיד.',
    '⭐': 'סימנתי כחשוב!',
  };

  return responses[emoji] || `קיבלתי את התגובה שלך: ${emoji}`;
}
