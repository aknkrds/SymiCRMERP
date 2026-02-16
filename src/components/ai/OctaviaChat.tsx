import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, User, Minimize2, Maximize2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useAI } from '../../context/AIContext';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
    actions?: {
        label: string;
        onClick: () => void;
    }[];
}

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const OctaviaChat: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { userHistory, getSuggestions } = useAI();
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const hasInitialized = useRef(false);

    // Initial greeting
    useEffect(() => {
        if (!hasInitialized.current && user) {
            const greetingName = user.fullName ? user.fullName.split(' ')[0] : 'Kullanıcı';
            setMessages([
                {
                    id: '1',
                    text: `Merhaba ${greetingName}! Ben Octavia, senin kişisel asistanınım. Bugün sana nasıl yardımcı olabilirim?`,
                    sender: 'bot',
                    timestamp: new Date()
                }
            ]);
            hasInitialized.current = true;
        }
    }, [user]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isTyping, isOpen]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && !isMinimized && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen, isMinimized]);

    const handleSend = async () => {
        if (!inputValue.trim()) return;
        
        await processMessage(inputValue);
        setInputValue('');
    };

    const handleSendAutomatic = (text: string) => {
        processMessage(text);
    };

    const processMessage = async (text: string) => {
        const userMessage: Message = {
            id: generateId(),
            text: text,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setIsTyping(true);

        // Simulate AI processing
        setTimeout(() => {
            const botResponse = generateResponse(userMessage.text);
            setMessages(prev => [...prev, botResponse]);
            setIsTyping(false);
        }, 1500);
    };

    const generateResponse = (text: string): Message => {
        const lowerText = text.toLowerCase();
        // Get user's first name for personal touch
        const userName = user?.fullName ? user.fullName.split(' ')[0] : 'dostum';
        
        let responseText = "Anladım. Şu an öğrenme aşamasındayım, ancak yakında bu konuda size daha fazla yardımcı olabileceğim.";
        let actions: Message['actions'] = [];

        // Basic Conversation & Small Talk
        if (lowerText.includes('merhaba') || lowerText.includes('selam') || lowerText.includes('günaydın') || lowerText.includes('iyi akşamlar')) {
            const hour = new Date().getHours();
            let timeGreeting = "Merhaba";
            if (hour < 12) timeGreeting = "Günaydın";
            else if (hour > 17) timeGreeting = "İyi akşamlar";
            
            responseText = `${timeGreeting} ${userName}! Seni tekrar görmek güzel. Bugün işler nasıl gidiyor?`;
        } 
        else if (lowerText.includes('nasılsın') || lowerText.includes('naber') || lowerText.includes('ne haber')) {
            responseText = `Teşekkür ederim ${userName}, ben bir yapay zeka olduğum için her zaman %100 performansla çalışıyorum! 🚀 Sen nasılsın, her şey yolunda mı?`;
        }
        else if (lowerText.includes('iyiyim') || lowerText.includes('süper') || lowerText.includes('harika')) {
            responseText = "Bunu duyduğuma çok sevindim! Enerjin harika. 🎉 Bugün hangi görevleri tamamlamayı planlıyoruz?";
        }
        else if (lowerText.includes('kötü') || lowerText.includes('fena değil') || lowerText.includes('yorgun')) {
            responseText = `Anlıyorum ${userName}. Bazen işler yoğun olabiliyor. Belki bir kahve molası iyi gelebilir? ☕️ Ben buradayım, yardım edebileceğim bir şey varsa söylemen yeterli.`;
        }
        else if (lowerText.includes('kimsin') || lowerText.includes('adın ne') || lowerText.includes('nedirsin')) {
            responseText = "Benim adım Octavia. Symi CRM sistemi için geliştirilmiş, iş akışını hızlandırmak ve sana yardımcı olmak için tasarlanmış akıllı asistanım.";
        }
        else if (lowerText.includes('teşekkür') || lowerText.includes('sağol') || lowerText.includes('mersi')) {
            responseText = `Rica ederim ${userName}! Her zaman yardımcı olmaya hazırım. 😊`;
        }
        else if (lowerText.includes('saat kaç') || lowerText.includes('bugün günlerden ne')) {
            const now = new Date();
            responseText = `Şu an saat ${now.toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})} ve bugün ${now.toLocaleDateString('tr-TR', {weekday: 'long', day: 'numeric', month: 'long'})}.`;
        }
        
        // AI Learning & Suggestions
        else if (lowerText.includes('ne yapmalıyım') || lowerText.includes('öneri') || lowerText.includes('tavsiye')) {
            const suggestions = getSuggestions();
            if (suggestions.length > 0) {
                responseText = `Kullanım alışkanlıklarınıza dayanarak şunları önerebilirim:\n\n${suggestions.map(s => `• ${s}`).join('\n')}`;
            } else {
                responseText = "Henüz yeterli veri toplayamadım, ancak uygulamayı kullandıkça size özel öneriler sunabileceğim.";
            }
        }
        else if (lowerText.includes('neler yaptım') || lowerText.includes('geçmiş')) {
            const uniqueHistory = Array.from(new Set(userHistory)).slice(0, 5);
            if (uniqueHistory.length > 0) {
                responseText = `Son ziyaret ettiğiniz sayfalar:\n${uniqueHistory.map(h => `• ${h}`).join('\n')}`;
            } else {
                responseText = "Henüz bir işlem geçmişiniz bulunmuyor.";
            }
        }

        // Help & How-to Guides
        else if (lowerText.includes('nasıl kullanılır') || lowerText.includes('ne yapabilirim') || lowerText.includes('yardım')) {
            responseText = `Symi CRM'i kullanmanıza yardımcı olabilirim. Özellikle şu konularda detaylı bilgi verebilirim:
• Müşteri oluşturma ve yönetimi
• Sipariş oluşturma ve onay süreci
• Ürün ekleme ve yönetimi

Hangi konuda bilgi almak istersiniz?`;
            actions = [
                { label: "Müşteri Nasıl Oluşturulur?", onClick: () => handleSendAutomatic("Müşteri nasıl oluşturulur?") },
                { label: "Sipariş Nasıl Oluşturulur?", onClick: () => handleSendAutomatic("Sipariş nasıl oluşturulur?") }
            ];
        }
        else if (lowerText.includes('müşteri') && (lowerText.includes('nasıl') || lowerText.includes('oluştur') || lowerText.includes('ekle'))) {
            responseText = `**Müşteri Oluşturma Adımları:**

1. Sol menüden **Müşteriler** sayfasına gidin.
2. Sağ üstteki **"Yeni Müşteri"** butonuna tıklayın.
3. Açılan formda şu bilgileri eksiksiz doldurun:
   • Firma Bilgileri
   • Yetkili Kişi
   • Adres ve Telefon
   • Vergi Dairesi ve Numarası
4. **Kaydet** butonuna basarak işlemi tamamlayın.`;
            actions = [{
                label: "Müşterilere Git",
                onClick: () => {
                    navigate('/customers');
                    setIsOpen(false);
                }
            }];
        }
        else if (lowerText.includes('sipariş') && (lowerText.includes('nasıl') || lowerText.includes('süreç') || lowerText.includes('adımları'))) {
            responseText = `**Sipariş Oluşturma ve İş Akışı:**

1. **Başlangıç:** Siparişler sayfasında **"Yeni Sipariş"** butonuna basın.
2. **Müşteri Seçimi:** Listeden mevcut bir müşteri seçin veya o an yeni bir müşteri oluşturun.
3. **Detaylar:** Termin tarihi, para birimi ve vade bilgisini girin.
4. **Ürün Ekleme:** 
   • "Ürün Ekle" ile müşterinin eski ürünlerinden seçin.
   • "Yeni Ürün Ekle" ile sıfırdan ürün tanımlayıp ekleyin.
   • Adet ve birim fiyatları girin.
5. **Onay:** Siparişi oluşturduğunuzda **Genel Müdür Onayı**na düşer ve kilitlenir.
6. **Teklif:** Onay sonrası **Teklif Formu** oluşturulup müşteriye iletilir.
7. **İş Akışı:** Müşteri onaylarsa sipariş **Tasarım** ve **Tedarik** departmanlarına otomatik iletilir.`;
            actions = [{
                label: "Sipariş Oluşturmaya Başla",
                onClick: () => {
                    navigate('/orders');
                    setIsOpen(false);
                }
            }];
        }

        // Navigation Commands
        else if (lowerText.includes('sipariş') && (lowerText.includes('yeni') || lowerText.includes('oluştur'))) {
            responseText = `Yeni bir sipariş oluşturmak için doğru yerdesin ${userName}. Seni hemen ilgili ekrana alabilirim.`;
            actions = [{
                label: "Sipariş Oluştur",
                onClick: () => {
                    navigate('/orders');
                    setIsOpen(false);
                }
            }];
        } else if (lowerText.includes('ürün') && (lowerText.includes('yeni') || lowerText.includes('ekle'))) {
            responseText = "Yeni ürün eklemek için 'Ürünler' sayfasına gidebilirsiniz.";
            actions = [{
                label: "Ürünlere Git",
                onClick: () => {
                    navigate('/products');
                    setIsOpen(false);
                }
            }];
        } else if (lowerText.includes('plan') || lowerText.includes('üretim')) {
            responseText = "Üretim planlaması için 'Planlama' ekranına yönlendiriyorum.";
            actions = [{
                label: "Planlamaya Git",
                onClick: () => {
                    navigate('/planning');
                    setIsOpen(false);
                }
            }];
        }

        return {
            id: generateId(),
            text: responseText,
            sender: 'bot',
            timestamp: new Date(),
            actions
        };
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-300 hover:scale-105 group"
                aria-label="Octavia AI Asistanı"
            >
                <div className="relative">
                    <Bot size={28} />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-200 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-400"></span>
                    </span>
                </div>
                <span className="font-medium pr-1 max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out whitespace-nowrap">
                    Octavia
                </span>
            </button>
        );
    }

    return (
        <div className={cn(
            "fixed z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col transition-all duration-300 overflow-hidden font-sans",
            isMinimized 
                ? "bottom-6 right-6 w-72 h-14" 
                : "bottom-6 right-6 w-[380px] h-[600px] max-h-[80vh]"
        )}>
            {/* Header */}
            <div 
                className="bg-indigo-600 text-white p-4 flex items-center justify-between cursor-pointer"
                onClick={() => isMinimized && setIsMinimized(false)}
            >
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
                        <Bot size={20} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm">Octavia AI</h3>
                        <p className="text-[10px] text-indigo-100 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                            Çevrimiçi
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        aria-label={isMinimized ? "Büyüt" : "Küçült"}
                    >
                        {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        aria-label="Kapat"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            {!isMinimized && (
                <>
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
                        <div className="text-center text-xs text-slate-400 my-4">
                            Octavia v1.0 • Yapay Zeka Asistanı
                        </div>
                        
                        {messages.map((msg) => (
                            <div 
                                key={msg.id} 
                                className={cn(
                                    "flex gap-3 max-w-[85%]",
                                    msg.sender === 'user' ? "ml-auto flex-row-reverse" : ""
                                )}
                            >
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs",
                                    msg.sender === 'user' ? "bg-slate-700" : "bg-indigo-600"
                                )}>
                                    {msg.sender === 'user' ? <User size={14} /> : <Sparkles size={14} />}
                                </div>
                                <div className={cn(
                                        "p-3 rounded-2xl text-sm shadow-sm whitespace-pre-wrap",
                                        msg.sender === 'user' 
                                            ? "bg-indigo-600 text-white rounded-tr-none" 
                                            : "bg-white text-slate-700 border border-slate-100 rounded-tl-none"
                                    )}>
                                    {msg.text}
                                    {msg.actions && msg.actions.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {msg.actions.map((action, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={action.onClick}
                                                    className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 transition-colors"
                                                >
                                                    {action.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <div className={cn(
                                        "text-[10px] mt-1 text-right opacity-70",
                                        msg.sender === 'user' ? "text-indigo-100" : "text-slate-400"
                                    )}>
                                        {msg.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex gap-3 max-w-[85%]">
                                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 text-white">
                                    <Sparkles size={14} />
                                </div>
                                <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex gap-1">
                                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-slate-100">
                        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Bir şeyler yazın..."
                                className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-400 px-2"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!inputValue.trim() || isTyping}
                                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                aria-label="Gönder"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
