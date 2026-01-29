// טיפוסים לאפליקציית המזכיר האישי

export interface Message {
  id: string;
  content: string;
  type: 'text' | 'image' | 'voice' | 'system';
  sender: 'user' | 'assistant';
  timestamp: Date;
  imageUrl?: string;
  reactions?: string[];
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  extractedDate?: string;
  extractedTask?: string;
  calendarEventId?: string;
  invoiceData?: InvoiceData;
}

export interface InvoiceData {
  vendor?: string;
  amount?: number;
  currency?: string;
  dueDate?: string;
  description?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  reminderDate?: Date;
  completed: boolean;
  calendarEventId?: string;
  attachedImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Reminder {
  id: string;
  taskId?: string;
  title: string;
  message: string;
  scheduledFor: Date;
  sent: boolean;
  sentAt?: Date;
  type: 'chat' | 'calendar' | 'both';
}

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  reminders?: {
    useDefault: boolean;
    overrides?: { method: string; minutes: number }[];
  };
  attachments?: { fileUrl: string; title: string }[];
}

export interface ChatSession {
  id: string;
  messages: Message[];
  tasks: Task[];
  reminders: Reminder[];
  createdAt: Date;
  lastActivity: Date;
}

export interface AIResponse {
  message: string;
  intent?: 'create_task' | 'create_reminder' | 'view_calendar' | 'process_invoice' | 'general_chat';
  extractedData?: {
    date?: string;
    time?: string;
    title?: string;
    description?: string;
    invoiceData?: InvoiceData;
  };
  action?: {
    type: 'create_calendar_event' | 'set_reminder' | 'show_tasks' | 'none';
    data?: Record<string, unknown>;
  };
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}
