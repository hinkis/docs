import React from 'react';
import { Menu, Calendar, ListTodo, MoreVertical } from 'lucide-react';

interface HeaderProps {
  isConnected: boolean;
  onMenuClick: () => void;
}

export function Header({ isConnected, onMenuClick }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-avatar">
        🤖
      </div>

      <div className="header-info">
        <div className="header-name">אלי - מזכיר אישי</div>
        <div className="header-status">
          {isConnected ? 'מחובר' : 'מתחבר...'}
        </div>
      </div>

      <div className="header-actions">
        <button className="header-action" title="יומן">
          <Calendar size={20} />
        </button>
        <button className="header-action" onClick={onMenuClick} title="משימות">
          <ListTodo size={20} />
        </button>
        <button className="header-action" title="עוד">
          <MoreVertical size={20} />
        </button>
      </div>
    </header>
  );
}
