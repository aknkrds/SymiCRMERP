import React, { useState, useMemo, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { X, Plus, MessageCircle, Send, ChevronLeft, AlertTriangle } from 'lucide-react';
import { useMessages } from '../../hooks/useMessages';
import { useUsers } from '../../hooks/useUsers';
import { useOrders } from '../../hooks/useOrders';
import { useAuth } from '../../context/AuthContext';
import { format, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';

// Safe date formatter helper
const safeFormatDate = (dateString: string | Date | undefined, formatStr: string): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (!isValid(date)) return 'Tarih hatası';
    return format(date, formatStr, { locale: tr });
  } catch (err) {
    console.error('Date formatting error:', err);
    return 'Tarih hatası';
  }
};

// Error Boundary Component
class MessagingErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Messaging component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center text-slate-500">
          <AlertTriangle className="w-12 h-12 text-amber-500 mb-2" />
          <h3 className="font-medium text-slate-800 mb-1">Bir hata oluştu</h3>
          <p className="text-sm">Mesajlar yüklenirken bir sorun oluştu. Lütfen sayfayı yenileyin.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export const Messaging: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, sendMessage, markAsRead, refresh } = useMessages();
  const userOptions = useMemo(() => ({ includeAdmins: true }), []);
  const { users } = useUsers(userOptions);
  const { orders } = useOrders();
  const { user } = useAuth();
  
  const [view, setView] = useState<'inbox' | 'compose' | 'detail'>('inbox');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  
  // Compose state
  const [recipientId, setRecipientId] = useState('');
  const [subject, setSubject] = useState('');
  const [relatedOrderId, setRelatedOrderId] = useState('');
  const [content, setContent] = useState('');

  // Calculate unread count
  const unreadCount = useMemo(() => {
    // Count unread messages where I am the recipient
    return messages.filter(m => !m.isRead && m.recipientId === user?.id).length;
  }, [messages, user]);

  // Group messages by thread
  const threads = useMemo(() => {
    if (!Array.isArray(messages) || !user) return [];
    
    try {
      const threadMap = new Map();
      
      messages.forEach(msg => {
        if (!msg || !msg.threadId) return;
        if (!threadMap.has(msg.threadId)) {
          threadMap.set(msg.threadId, []);
        }
        threadMap.get(msg.threadId).push(msg);
      });
      
      // Convert to array and sort by latest message date
      return Array.from(threadMap.values()).map(msgs => {
        if (!msgs.length) return null;
        // Sort messages in thread by date (oldest to newest)
        msgs.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return (isNaN(dateA) ? 0 : dateA) - (isNaN(dateB) ? 0 : dateB);
        });
        
        const latestMsg = msgs[msgs.length - 1];
        
        return {
          threadId: msgs[0].threadId,
          messages: msgs,
          latestMessage: latestMsg,
          hasUnread: msgs.some(m => !m.isRead && m.recipientId === user?.id)
        };
      })
      .filter(Boolean) // Remove nulls
      .sort((a, b) => {
        if (!a || !b) return 0;
        const dateA = new Date(b.latestMessage.createdAt).getTime();
        const dateB = new Date(a.latestMessage.createdAt).getTime();
        return (isNaN(dateA) ? 0 : dateA) - (isNaN(dateB) ? 0 : dateB);
      });
    } catch (err) {
      console.error('Error grouping messages:', err);
      return [];
    }
  }, [messages, user]);

  const handleSend = async () => {
    if (!content.trim()) return;
    
    const recipient = users.find(u => u.id === recipientId);
    
    try {
      await sendMessage({
        threadId: view === 'detail' ? selectedThreadId! : undefined,
        senderId: user?.id,
        senderName: user?.fullName || user?.username,
        recipientId: view === 'detail' 
          ? (selectedThread?.latestMessage.senderId === user?.id 
              ? selectedThread.latestMessage.recipientId 
              : selectedThread?.latestMessage.senderId)
          : recipientId,
        recipientName: view === 'detail'
          ? (selectedThread?.latestMessage.senderId === user?.id 
              ? selectedThread.latestMessage.recipientName 
              : selectedThread?.latestMessage.senderName)
          : recipient?.fullName || recipient?.username,
        subject: view === 'detail' ? selectedThread?.latestMessage.subject : subject,
        content,
        relatedOrderId: view === 'detail' ? selectedThread?.latestMessage.relatedOrderId : relatedOrderId
      });
      
      setContent('');
      if (view === 'compose') {
        setView('inbox');
        setRecipientId('');
        setSubject('');
        setRelatedOrderId('');
      } else {
        refresh(); // Refresh thread view
      }
    } catch (error) {
      console.error(error);
    }
  };

  const selectedThread = useMemo(() => 
    threads.find(t => t.threadId === selectedThreadId), 
  [threads, selectedThreadId]);

  const openThread = (threadId: string) => {
    setSelectedThreadId(threadId);
    setView('detail');
    // Mark unread messages in this thread as read
    const thread = threads.find(t => t.threadId === threadId);
    if (thread) {
      thread.messages.forEach(m => {
        if (!m.isRead && m.recipientId === user?.id) {
          markAsRead(m.id);
        }
      });
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button 
        onClick={() => {
          setIsOpen(true);
          refresh();
          setView('inbox');
        }}
        className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors outline-none flex items-center gap-2 group"
        title="Mesajlar"
      >
        <div className="relative">
          <MessageCircle size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border border-white">
              {unreadCount}
            </span>
          )}
        </div>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <MessageCircle className="text-indigo-600" />
                Mesajlar
              </h2>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors" title="Kapat">
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <MessagingErrorBoundary>
                {view === 'inbox' && (
                  <div className="flex-1 overflow-y-auto p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-slate-700">Gelen Kutusu</h3>
                    <button 
                      onClick={() => setView('compose')}
                      className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-700 transition-colors flex items-center gap-1"
                    >
                      <Plus size={16} /> Yeni Mesaj
                    </button>
                  </div>
                  
                  {threads.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageCircle size={32} />
                      </div>
                      <p className="text-slate-500 mb-4">Henüz hiç mesajınız yok.</p>
                      <button 
                        onClick={() => setView('compose')}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
                      >
                        <Plus size={18} />
                        Yeni Mesaj Oluştur
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {threads.map(thread => {
                        const otherParty = thread.latestMessage.senderId === user?.id 
                          ? thread.latestMessage.recipientName 
                          : thread.latestMessage.senderName;
                        
                        return (
                          <div 
                            key={thread.threadId}
                            onClick={() => openThread(thread.threadId)}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-slate-50 ${
                              thread.hasUnread ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className={`font-medium ${thread.hasUnread ? 'text-indigo-700' : 'text-slate-900'}`}>
                                {otherParty}
                              </span>
                              <span className="text-xs text-slate-500">
                                {safeFormatDate(thread.latestMessage.createdAt, 'dd MMM HH:mm')}
                              </span>
                            </div>
                            <div className="text-sm font-medium text-slate-800 mb-1">
                              {thread.latestMessage.subject || '(Konusuz)'}
                            </div>
                            <div className="text-sm text-slate-500 line-clamp-1">
                              {thread.latestMessage.senderId === user?.id ? 'Siz: ' : ''}
                              {thread.latestMessage.content}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {view === 'compose' && (
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <button onClick={() => setView('inbox')} className="p-1 hover:bg-slate-100 rounded" title="Geri">
                      <ChevronLeft size={20} />
                    </button>
                    <h3 className="font-medium text-slate-700">Yeni Mesaj</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Kime</label>
                      <select 
                        value={recipientId}
                        onChange={(e) => setRecipientId(e.target.value)}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        title="Alıcı Seçin"
                      >
                        <option value="">Seçiniz...</option>
                        {users.filter(u => u.id !== user?.id).map(u => (
                          <option key={u.id} value={u.id}>{u.fullName || u.username} ({u.roleName})</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Konu</label>
                      <input 
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="Mesaj konusu"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Sipariş (İsteğe Bağlı)</label>
                      <select 
                        value={relatedOrderId}
                        onChange={(e) => setRelatedOrderId(e.target.value)}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        title="İlgili Sipariş Seçin"
                      >
                        <option value="">İlgili sipariş seçiniz...</option>
                        {orders.map(o => (
                          <option key={o.id} value={o.id}>
                            {o.customerName} - {o.items.map(i => i.productName).join(', ')}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Not</label>
                      <textarea 
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 h-32 resize-none"
                        placeholder="Mesajınızı yazın..."
                      />
                    </div>
                    
                    <div className="flex justify-end pt-2">
                      <button 
                        onClick={handleSend}
                        disabled={!recipientId || !subject || !content}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <Send size={18} />
                        Gönder
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {view === 'detail' && selectedThread && (
                <div className="flex-1 flex flex-col h-full">
                  <div className="p-3 border-b flex items-center gap-2 bg-slate-50">
                    <button onClick={() => setView('inbox')} className="p-1 hover:bg-slate-200 rounded" title="Geri">
                      <ChevronLeft size={20} />
                    </button>
                    <div className="flex-1">
                      <h3 className="font-medium text-slate-900">{selectedThread.latestMessage.subject}</h3>
                      <div className="text-xs text-slate-500">
                        {selectedThread.messages.length} mesaj
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                    {selectedThread.messages.map(msg => {
                      const isMe = msg.senderId === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-lg p-3 ${
                            isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-slate-200 rounded-bl-none shadow-sm'
                          }`}>
                            <div className="flex justify-between items-center gap-4 mb-1">
                              <span className={`text-xs font-medium ${isMe ? 'text-indigo-100' : 'text-slate-600'}`}>
                                {msg.senderName}
                              </span>
                              <span className={`text-xs ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                                {safeFormatDate(msg.createdAt, 'dd MMM HH:mm')}
                              </span>
                            </div>
                            <p className={`text-sm whitespace-pre-wrap ${isMe ? 'text-white' : 'text-slate-800'}`}>
                              {msg.content}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="p-3 border-t bg-white">
                    <div className="flex gap-2">
                      <textarea 
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none h-12" // Compact height for reply
                        placeholder="Cevap yazın..."
                      />
                      <button 
                        onClick={handleSend}
                        disabled={!content.trim()}
                        className="bg-indigo-600 text-white px-4 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                        title="Gönder"
                      >
                        <Send size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
              </MessagingErrorBoundary>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
