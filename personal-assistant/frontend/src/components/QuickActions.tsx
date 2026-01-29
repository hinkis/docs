import React from 'react';
import { Calendar, ListPlus, Bell, FileText, Sunrise } from 'lucide-react';

interface QuickActionsProps {
  onAction: (message: string) => void;
}

const QUICK_ACTIONS = [
  { icon: <Sunrise size={16} />, label: 'בוקר טוב', message: 'בוקר טוב! מה יש לי היום?' },
  { icon: <Calendar size={16} />, label: 'היום', message: 'מה בתוכנית להיום?' },
  { icon: <ListPlus size={16} />, label: 'משימה', message: 'צריך להוסיף משימה חדשה' },
  { icon: <Bell size={16} />, label: 'תזכורת', message: 'תזכיר לי ב...' },
  { icon: <FileText size={16} />, label: 'סיכום', message: 'תן לי סיכום של המשימות' },
];

export function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <div className="quick-actions">
      {QUICK_ACTIONS.map((action, index) => (
        <button
          key={index}
          className="quick-action"
          onClick={() => onAction(action.message)}
        >
          {action.icon}
          {action.label}
        </button>
      ))}
    </div>
  );
}
