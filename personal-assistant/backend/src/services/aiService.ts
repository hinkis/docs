import OpenAI from 'openai';
import { AIResponse, InvoiceData, Message } from '../types/index.js';
import { parseDateTime, formatHebrewDate } from '../utils/dateParser.js';

// יצירת לקוח OpenAI רק אם יש מפתח
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const isDemoMode = !openai;

const SYSTEM_PROMPT = `אתה מזכיר אישי חכם ואדיב בשם "אלי". אתה מדבר עברית טבעית וברורה.
תפקידך לעזור למשתמש בניהול המשימות, התזכורות והיומן שלו.

היכולות שלך:
1. יצירת משימות ותזכורות
2. הוספת אירועים ליומן Google
3. פענוח תמונות של חשבוניות ומסמכים
4. הבנת תאריכים וזמנים בעברית טבעית
5. ניהול שיחה טבעית ונעימה`;

interface AIProcessResult {
  response: AIResponse;
  shouldCreateEvent: boolean;
  eventDetails?: {
    title: string;
    date: Date;
    description?: string;
  };
}

// תגובות דמו כשאין מפתח OpenAI
function getDemoResponse(content: string): AIProcessResult {
  const lowerContent = content.toLowerCase();
  let message = '';
  let intent: AIResponse['intent'] = 'general_chat';
  let shouldCreateEvent = false;
  let eventDetails: AIProcessResult['eventDetails'];

  const parsedDate = parseDateTime(content);

  // זיהוי כוונה ותגובה מתאימה
  if (lowerContent.includes('שלום') || lowerContent.includes('היי') || lowerContent.includes('בוקר')) {
    message = 'שלום! 👋 אני אלי, המזכיר האישי שלך. במה אוכל לעזור היום?';
  } else if (lowerContent.includes('תזכיר') || lowerContent.includes('תזכורת')) {
    intent = 'create_reminder';
    if (parsedDate) {
      message = `✅ נרשם! אזכיר לך ב-${formatHebrewDate(parsedDate)}.\n\nהאם לשמור זאת ביומן Google?`;
      shouldCreateEvent = true;
      eventDetails = {
        title: extractTaskTitle(content),
        date: parsedDate,
        description: content,
      };
    } else {
      message = 'בשמחה! מתי לתזכר לך? (לדוגמה: "מחר ב-10 בבוקר")';
    }
  } else if (lowerContent.includes('משימה') || lowerContent.includes('צריך ל') || lowerContent.includes('לעשות')) {
    intent = 'create_task';
    if (parsedDate) {
      message = `📝 הוספתי משימה: "${extractTaskTitle(content)}"\n📅 לתאריך: ${formatHebrewDate(parsedDate)}`;
      shouldCreateEvent = true;
      eventDetails = {
        title: extractTaskTitle(content),
        date: parsedDate,
        description: content,
      };
    } else {
      message = `📝 הוספתי משימה: "${extractTaskTitle(content)}"\n\nרוצה לקבוע תאריך יעד?`;
    }
  } else if (lowerContent.includes('יומן') || lowerContent.includes('מה יש לי')) {
    intent = 'view_calendar';
    message = '📅 הנה מה שמתוכנן להיום:\n\n• אין אירועים מתוכננים\n\nרוצה להוסיף אירוע חדש?';
  } else if (lowerContent.includes('תודה') || lowerContent.includes('מעולה')) {
    message = 'בשמחה! אני כאן בשבילך 😊';
  } else if (/^[\p{Emoji}\s]+$/u.test(content.trim())) {
    // תגובה לאימוג'י
    const emojiResponses: Record<string, string> = {
      '👍': 'מעולה! ממשיכים!',
      '❤️': 'שמח שאהבת! 😊',
      '👎': 'הבנתי, נבטל את זה.',
      '✅': 'סימנתי כהושלם!',
      '⏰': 'רוצה שאקבע תזכורת? ספר לי מתי.',
      '📅': 'מציג את היומן שלך...',
    };
    message = emojiResponses[content.trim()] || `קיבלתי: ${content}`;
  } else {
    message = `הבנתי! "${content}"\n\nאיך אוכל לעזור עם זה? אני יכול:\n• ליצור תזכורת\n• להוסיף משימה\n• לשמור ביומן`;
  }

  return {
    response: {
      message,
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

function extractTaskTitle(text: string): string {
  const cleanText = text
    .replace(/^(תזכיר לי|צריך ל|אני צריך|עלי ל|יש לי|להזכיר|תוסיף|הוסף)\s*/i, '')
    .replace(/(מחר|היום|בשעה|ב-?\d+|בבוקר|בערב|בצהריים)/gi, '')
    .trim();
  return cleanText.substring(0, 50) || 'משימה חדשה';
}

export async function processMessage(
  content: string,
  conversationHistory: Message[]
): Promise<AIProcessResult> {
  // מצב דמו - תגובות מקומיות
  if (isDemoMode) {
    console.log('🎭 מצב דמו - משתמש בתגובות מקומיות');
    return getDemoResponse(content);
  }

  // מצב מלא עם OpenAI
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory.slice(-10).map((msg) => ({
      role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.content,
    })),
    { role: 'user', content },
  ];

  const completion = await openai!.chat.completions.create({
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
    ],
    function_call: 'auto',
    temperature: 0.7,
  });

  const choice = completion.choices[0];
  const responseMessage = choice.message;

  let shouldCreateEvent = false;
  let eventDetails: AIProcessResult['eventDetails'];

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

  let intent: AIResponse['intent'] = 'general_chat';
  const lowerContent = content.toLowerCase();

  if (lowerContent.includes('תזכיר') || lowerContent.includes('תזכורת')) {
    intent = 'create_reminder';
  } else if (lowerContent.includes('משימה') || lowerContent.includes('צריך ל')) {
    intent = 'create_task';
  } else if (lowerContent.includes('יומן') || lowerContent.includes('פגישה')) {
    intent = 'view_calendar';
  }

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
  // מצב דמו
  if (isDemoMode) {
    return {
      description: '🎭 מצב דמו: ניתוח תמונות דורש מפתח OpenAI.\n\nאני יכול לזהות חשבוניות, מסמכים ותאריכים כשמוגדר OPENAI_API_KEY.',
      invoiceData: undefined,
      suggestedDate: undefined,
    };
  }

  const prompt = userPrompt || 'נתח את התמונה. אם זו חשבונית, חלץ: ספק, סכום, מטבע, תאריך יעד, תיאור.';

  const response = await openai!.chat.completions.create({
    model: 'gpt-4-vision-preview',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        ],
      },
    ],
    max_tokens: 1000,
  });

  const analysisText = response.choices[0].message.content || '';

  let invoiceData: InvoiceData | undefined;
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

  let suggestedDate: Date | undefined;
  if (invoiceData?.dueDate) {
    suggestedDate = parseDateTime(invoiceData.dueDate) || undefined;
  }

  return { description: analysisText, invoiceData, suggestedDate };
}

export async function processEmojiReaction(emoji: string, contextMessage: Message): Promise<string> {
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

export function isInDemoMode(): boolean {
  return isDemoMode;
}
