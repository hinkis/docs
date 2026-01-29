import React, { useEffect, useRef, useState } from 'react';
import { useChat } from './hooks/useChat';
import { Header } from './components/Header';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { Sidebar } from './components/Sidebar';
import { QuickActions } from './components/QuickActions';
import './styles/App.css';

function App() {
  const {
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
  } = useChat();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle URL params (auth callback)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get('auth');

    if (authStatus === 'success') {
      // Show success message
      window.history.replaceState({}, '', window.location.pathname);
    } else if (authStatus === 'error') {
      console.error('Google authentication failed');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleQuickAction = (message: string) => {
    sendMessage(message);
  };

  if (isLoading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        <div>מתחבר למזכיר האישי...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        isConnected={isConnected}
        onMenuClick={() => setIsSidebarOpen(true)}
      />

      <div className="chat-container" ref={chatContainerRef}>
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {isSending && (
          <div className="typing-indicator">
            <div className="typing-dot" />
            <div className="typing-dot" />
            <div className="typing-dot" />
          </div>
        )}
      </div>

      <QuickActions onAction={handleQuickAction} />

      <ChatInput onSendMessage={sendMessage} isSending={isSending} />

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        tasks={tasks}
        reminders={reminders}
        onCompleteTask={completeTask}
        onDeleteTask={removeTask}
        onDeleteReminder={removeReminder}
      />

      {error && (
        <div className="connection-status disconnected">
          {error}
        </div>
      )}
    </div>
  );
}

export default App;
