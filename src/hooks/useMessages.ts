import { useState, useEffect, useCallback } from 'react';
import type { Message } from '../types';
import { useAuth } from '../context/AuthContext';

export const useMessages = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch(`/api/messages?userId=${user.id}`);
      if (!response.ok) throw new Error('Mesajlar yüklenemedi');
      const data = await response.json();
      setMessages(prev => {
        // Deep comparison to prevent unnecessary re-renders
        if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
        return data;
      });
    } catch (err) {
      console.error(err);
      // Don't set error state on polling to avoid UI flicker
    }
  }, [user]);

  // Initial fetch and polling
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const sendMessage = async (data: Partial<Message>) => {
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Mesaj gönderilemedi');
      await fetchMessages(); // Refresh messages
      return await response.json();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/messages/${id}/read`, { method: 'PUT' });
      // Optimistic update
      setMessages(prev => prev.map(m => m.id === id ? { ...m, isRead: true } : m));
    } catch (err) {
      console.error(err);
    }
  };
  
  // Admin functions
  const fetchAllMessages = async () => {
    try {
      const response = await fetch('/api/admin/messages');
      if (!response.ok) throw new Error('Mesajlar yüklenemedi');
      return await response.json();
    } catch (err: any) {
      throw err;
    }
  };

  const deleteMessage = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/messages/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Mesaj silinemedi');
    } catch (err: any) {
      throw err;
    }
  };

  return {
    messages,
    loading,
    error,
    refresh: fetchMessages,
    sendMessage,
    markAsRead,
    fetchAllMessages,
    deleteMessage
  };
};
