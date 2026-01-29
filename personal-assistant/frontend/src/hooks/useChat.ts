import { useState, useEffect, useCallback, useRef } from 'react';
import { Message, Task, Reminder } from '../types';
import * as api from '../services/api';

export function useChat() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize session
  useEffect(() => {
    const initSession = async () => {
      setIsLoading(true);
      try {
        // Check if we have a stored session
        const storedSessionId = localStorage.getItem('chatSessionId');

        if (storedSessionId) {
          try {
            const existingMessages = await api.getMessages(storedSessionId);
            setSessionId(storedSessionId);
            setMessages(existingMessages);
            setIsConnected(true);
          } catch {
            // Session expired, create new one
            const { sessionId: newSessionId, messages: newMessages } = await api.createSession();
            localStorage.setItem('chatSessionId', newSessionId);
            setSessionId(newSessionId);
            setMessages(newMessages);
            setIsConnected(true);
          }
        } else {
          const { sessionId: newSessionId, messages: newMessages } = await api.createSession();
          localStorage.setItem('chatSessionId', newSessionId);
          setSessionId(newSessionId);
          setMessages(newMessages);
          setIsConnected(true);
        }

        // Load tasks and reminders
        const [tasksData, remindersData] = await Promise.all([
          api.getTasks(),
          api.getReminders(),
        ]);
        setTasks(tasksData);
        setReminders(remindersData);

      } catch (err) {
        console.error('Failed to initialize session:', err);
        setError('לא ניתן להתחבר לשרת');
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    initSession();

    // Cleanup
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Poll for new messages (for reminders)
  useEffect(() => {
    if (!sessionId) return;

    pollingRef.current = setInterval(async () => {
      try {
        const newMessages = await api.getMessages(sessionId);
        if (newMessages.length > messages.length) {
          setMessages(newMessages);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 30000); // Poll every 30 seconds

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [sessionId, messages.length]);

  const sendMessage = useCallback(async (content: string, imageFile?: File) => {
    if (!sessionId || (!content.trim() && !imageFile)) return;

    setIsSending(true);
    setError(null);

    // Add user message optimistically
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      content,
      type: imageFile ? 'image' : 'text',
      sender: 'user',
      timestamp: new Date(),
      imageUrl: imageFile ? URL.createObjectURL(imageFile) : undefined,
    };

    setMessages(prev => [...prev, tempUserMessage]);

    try {
      let response: Message;

      if (imageFile) {
        response = await api.sendMessageWithImage(sessionId, content, imageFile);
      } else {
        response = await api.sendMessage(sessionId, content);
      }

      // Replace temp message and add response
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== tempUserMessage.id);
        // Get the actual user message from the server (it's the second to last)
        return [...filtered, { ...tempUserMessage, id: `user-${Date.now()}` }, response];
      });

      // Refresh tasks and reminders
      const [tasksData, remindersData] = await Promise.all([
        api.getTasks(),
        api.getReminders(),
      ]);
      setTasks(tasksData);
      setReminders(remindersData);

    } catch (err) {
      console.error('Failed to send message:', err);
      setError('שגיאה בשליחת ההודעה');
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));
    } finally {
      setIsSending(false);
    }
  }, [sessionId]);

  const completeTask = useCallback(async (taskId: string) => {
    try {
      await api.completeTask(taskId);
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, completed: true } : t
      ));
    } catch (err) {
      console.error('Failed to complete task:', err);
      setError('שגיאה בסימון המשימה');
    }
  }, []);

  const removeTask = useCallback(async (taskId: string) => {
    try {
      await api.deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
      setError('שגיאה במחיקת המשימה');
    }
  }, []);

  const removeReminder = useCallback(async (reminderId: string) => {
    try {
      await api.deleteReminder(reminderId);
      setReminders(prev => prev.filter(r => r.id !== reminderId));
    } catch (err) {
      console.error('Failed to delete reminder:', err);
      setError('שגיאה במחיקת התזכורת');
    }
  }, []);

  const getDailySummary = useCallback(async () => {
    if (!sessionId) return;

    try {
      const summary = await api.getDailySummary(sessionId);
      // The summary will be added as a new message
      await sendMessage('סיכום יומי');
    } catch (err) {
      console.error('Failed to get summary:', err);
    }
  }, [sessionId, sendMessage]);

  return {
    sessionId,
    messages,
    tasks,
    reminders,
    isLoading,
    isSending,
    error,
    isConnected,
    sendMessage,
    completeTask,
    removeTask,
    removeReminder,
    getDailySummary,
  };
}
