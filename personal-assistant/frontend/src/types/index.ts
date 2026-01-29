export interface Message {
  id: string;
  content: string;
  type: 'text' | 'image' | 'voice' | 'system';
  sender: 'user' | 'assistant';
  timestamp: Date | string;
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
  dueDate?: Date | string;
  reminderDate?: Date | string;
  completed: boolean;
  calendarEventId?: string;
  attachedImage?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Reminder {
  id: string;
  taskId?: string;
  title: string;
  message: string;
  scheduledFor: Date | string;
  sent: boolean;
  sentAt?: Date | string;
  type: 'chat' | 'calendar' | 'both';
}

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: Date | string;
  end: Date | string;
}

export interface ApiResponse<T> {
  success: boolean;
  error?: string;
  data?: T;
}
