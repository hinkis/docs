import React, { useState, useRef, useCallback } from 'react';
import {
  Smile, Paperclip, Send, Mic, X,
  Camera, Image as ImageIcon
} from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (content: string, imageFile?: File) => void;
  isSending: boolean;
}

const QUICK_EMOJIS = ['👍', '❤️', '✅', '⏰', '📅', '🔥', '⭐', '👎', '😊', '🙏', '💪', '📝'];

export function ChatInput({ onSendMessage, isSending }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    if (isSending) return;
    if (!message.trim() && !selectedImage) return;

    onSendMessage(message, selectedImage || undefined);
    setMessage('');
    setSelectedImage(null);
    setImagePreview(null);
    setShowEmojiPicker(false);

    // Focus back on input
    inputRef.current?.focus();
  }, [message, selectedImage, isSending, onSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('הקובץ גדול מדי. הגודל המקסימלי הוא 10MB');
        return;
      }
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  return (
    <div className="input-area-container">
      {/* Image Preview */}
      {imagePreview && (
        <div className="image-preview">
          <img src={imagePreview} alt="תצוגה מקדימה" />
          <button className="remove-image" onClick={removeImage}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="emoji-picker">
          {QUICK_EMOJIS.map(emoji => (
            <button key={emoji} onClick={() => addEmoji(emoji)}>
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="input-area">
        <button
          className="emoji-button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          title="אימוג'י"
        >
          <Smile size={24} />
        </button>

        <button
          className="attach-button"
          onClick={() => fileInputRef.current?.click()}
          title="העלאת תמונה"
        >
          <Paperclip size={24} />
        </button>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleImageSelect}
          style={{ display: 'none' }}
        />

        <div className="input-container">
          <textarea
            ref={inputRef}
            className="message-input"
            placeholder="הקלד הודעה..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isSending}
          />
        </div>

        {message.trim() || selectedImage ? (
          <button
            className="send-button"
            onClick={handleSubmit}
            disabled={isSending}
            title="שלח"
          >
            <Send size={20} />
          </button>
        ) : (
          <button className="mic-button" title="הקלטה קולית (בקרוב)">
            <Mic size={24} />
          </button>
        )}
      </div>
    </div>
  );
}
