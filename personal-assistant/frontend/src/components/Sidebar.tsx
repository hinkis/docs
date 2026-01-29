import React from 'react';
import { X, Check, Trash2, Clock } from 'lucide-react';
import { Task, Reminder } from '../types';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  reminders: Reminder[];
  onCompleteTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onDeleteReminder: (reminderId: string) => void;
}

export function Sidebar({
  isOpen,
  onClose,
  tasks,
  reminders,
  onCompleteTask,
  onDeleteTask,
  onDeleteReminder,
}: SidebarProps) {
  const formatDate = (date: Date | string) => {
    return format(new Date(date), 'dd/MM בשעה HH:mm', { locale: he });
  };

  return (
    <>
      <div
        className={`overlay ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
      />

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <button className="sidebar-close" onClick={onClose}>
            <X size={24} />
          </button>
          <h2>משימות ותזכורות</h2>
        </div>

        <div className="sidebar-content">
          {/* Tasks Section */}
          <div className="sidebar-section">
            <h3>📋 משימות ({tasks.filter(t => !t.completed).length})</h3>

            {tasks.length === 0 ? (
              <p style={{ color: '#667781', fontSize: '14px' }}>
                אין משימות עדיין. שלח לי הודעה ליצירת משימה!
              </p>
            ) : (
              tasks.map(task => (
                <div key={task.id} className="task-item">
                  <div
                    className={`task-checkbox ${task.completed ? 'completed' : ''}`}
                    onClick={() => !task.completed && onCompleteTask(task.id)}
                  >
                    {task.completed && <Check size={14} />}
                  </div>

                  <div className="task-info">
                    <div
                      className="task-title"
                      style={{
                        textDecoration: task.completed ? 'line-through' : 'none',
                        opacity: task.completed ? 0.6 : 1
                      }}
                    >
                      {task.title}
                    </div>
                    {task.dueDate && (
                      <div className="task-date">
                        <Clock size={12} style={{ marginLeft: '4px' }} />
                        {formatDate(task.dueDate)}
                      </div>
                    )}
                  </div>

                  <button
                    className="task-delete"
                    onClick={() => onDeleteTask(task.id)}
                    title="מחק משימה"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Reminders Section */}
          <div className="sidebar-section">
            <h3>⏰ תזכורות ({reminders.length})</h3>

            {reminders.length === 0 ? (
              <p style={{ color: '#667781', fontSize: '14px' }}>
                אין תזכורות מתוכננות.
              </p>
            ) : (
              reminders.map(reminder => (
                <div key={reminder.id} className="task-item">
                  <div className="task-info">
                    <div className="task-title">{reminder.title}</div>
                    <div className="task-date">
                      <Clock size={12} style={{ marginLeft: '4px' }} />
                      {formatDate(reminder.scheduledFor)}
                    </div>
                  </div>

                  <button
                    className="task-delete"
                    onClick={() => onDeleteReminder(reminder.id)}
                    title="מחק תזכורת"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Quick Actions */}
          <div className="sidebar-section">
            <h3>⚡ פעולות מהירות</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                className="quick-action"
                style={{ justifyContent: 'center', width: '100%' }}
              >
                📅 הצג את יומן היום
              </button>
              <button
                className="quick-action"
                style={{ justifyContent: 'center', width: '100%' }}
              >
                📋 סיכום יומי
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
