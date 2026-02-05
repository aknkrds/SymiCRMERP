import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { 
    Calendar, DollarSign, Package, FileText, Filter, 
    BarChart2, PieChart, TrendingUp, AlertCircle, CheckCircle2,
    Trash2, Factory, MessageCircle, X
} from 'lucide-react';
import { useOrders } from '../hooks/useOrders';
import { useMessages } from '../hooks/useMessages';
import { useAuth } from '../context/AuthContext';
import { ORDER_STATUS_MAP } from '../constants/orderStatus';
import type { Shift, Order, Message } from '../types';

export default function Reports() {
    const { orders } = useOrders();
    const { fetchAllMessages, deleteMessage } = useMessages();
    const { user } = useAuth();
    
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [activeTab, setActiveTab] = useState<'monthly' | 'monthly-price' | 'detailed' | 'production' | 'messages'>('monthly');
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
    
    // States for filters
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [dateRange, setDateRange] = useState({
        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    });

    // Detailed Report Config
    const [showPrices, setShowPrices] = useState(true);
    const [showStatus, setShowStatus] = useState(true);
    const [showCustomer, setShowCustomer] = useState(true);
    const [showProduct, setShowProduct] = useState(true);

    // Group messages by thread (Moved to top level to follow Rules of Hooks)
    const messageThreads = useMemo(() => {
        const grouped: Record<string, Message[]> = {};
        messages.forEach(m => {
            if (!grouped[m.threadId]) {
                grouped[m.threadId] = [];
            }
            grouped[m.threadId].push(m);
        });
        // Sort by latest message
        return Object.entries(grouped).sort(([, a], [, b]) => {
            const lastA = new Date(a[0].createdAt).getTime();
            const lastB = new Date(b[0].createdAt).getTime();
            return lastB - lastA;
        });
    }, [messages]);

    useEffect(() => {
        fetch('/api/shifts')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setShifts(data);
            })
            .catch(console.error);
    }, []);

    // Fetch messages when tab is active
    useEffect(() => {
        if (activeTab === 'messages') {
            fetchAllMessages()
                .then(setMessages)
                .catch(console.error);
        }
    }, [activeTab]);

    // Filter Helpers
    const getOrdersInMonth = () => {
        const [year, month] = selectedMonth.split('-');
        return orders.filter(o => {
            const date = new Date(o.createdAt);
            return date.getFullYear() === parseInt(year) && date.getMonth() === parseInt(month) - 1;
        });
    };

    const getShiftsInMonth = () => {
        const [year, month] = selectedMonth.split('-');
        return shifts.filter(s => {
            const date = new Date(s.startTime || s.createdAt); // Use startTime or createdAt
            return date.getFullYear() === parseInt(year) && date.getMonth() === parseInt(month) - 1;
        });
    };

    const getOrdersInRange = () => {
        const start = startOfDay(new Date(dateRange.start));
        const end = endOfDay(new Date(dateRange.end));
        return orders.filter(o => {
            const date = new Date(o.createdAt);
            return isWithinInterval(date, { start, end });
        });
    };

    const getShiftsInRange = () => {
        const start = startOfDay(new Date(dateRange.start));
        const end = endOfDay(new Date(dateRange.end));
        return shifts.filter(s => {
            const date = new Date(s.startTime || s.createdAt);
            return isWithinInterval(date, { start, end });
        });
    };

    const renderMessagesReport = () => {
        const handleDelete = async (e: React.MouseEvent, id: string) => {
            e.stopPropagation();
            if (window.confirm('Bu mesajı silmek istediğinize emin misiniz?')) {
                try {
                    await deleteMessage(id);
                    setMessages(prev => prev.filter(m => m.id !== id));
                } catch (error) {
                    console.error('Failed to delete message:', error);
                    alert('Mesaj silinirken bir hata oluştu.');
                }
            }
        };

        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                        <h3 className="font-semibold text-slate-800">Tüm Mesajlaşmalar</h3>
                    </div>
                    <div className="divide-y divide-slate-200">
                        {messageThreads.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                Kayıtlı mesaj bulunamadı.
                            </div>
                        ) : (
                            messageThreads.map(([threadId, msgs]) => {
                                const lastMsg = msgs[0];
                                const participants = Array.from(new Set(msgs.flatMap(m => [m.senderName, m.recipientName]))).join(', ');
                                
                                return (
                                    <div 
                                        key={threadId}
                                        onClick={() => setSelectedThreadId(threadId)}
                                        className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="font-medium text-slate-900">{participants}</div>
                                            <div className="text-xs text-slate-500">
                                                {format(new Date(lastMsg.createdAt), 'dd MMM yyyy HH:mm', { locale: tr })}
                                            </div>
                                        </div>
                                        <div className="text-sm text-slate-600 font-medium mb-1">
                                            {lastMsg.subject || '(Konusuz)'}
                                        </div>
                                        <div className="text-sm text-slate-500 line-clamp-1">
                                            {lastMsg.content}
                                        </div>
                                        <div className="mt-2 text-xs text-slate-400">
                                            Toplam {msgs.length} mesaj
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Message Detail Popup */}
                {selectedThreadId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                <h3 className="font-bold text-slate-800">Mesaj Detayları</h3>
                                <button 
                                    onClick={() => setSelectedThreadId(null)}
                                    className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors"
                                    title="Kapat"
                                    aria-label="Kapat"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                                {messages
                                    .filter(m => m.threadId === selectedThreadId)
                                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                                    .map((msg) => (
                                        <div key={msg.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative group">
                                            <button
                                                onClick={(e) => handleDelete(e, msg.id)}
                                                className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all"
                                                title="Mesajı Sil"
                                                aria-label="Mesajı Sil"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            <div className="flex justify-between items-start mb-2 pr-8">
                                                <div>
                                                    <span className="font-semibold text-indigo-600">{msg.senderName}</span>
                                                    <span className="text-slate-400 mx-2">→</span>
                                                    <span className="font-semibold text-slate-700">{msg.recipientName}</span>
                                                </div>
                                                <span className="text-xs text-slate-400">
                                                    {format(new Date(msg.createdAt), 'dd MMM HH:mm', { locale: tr })}
                                                </span>
                                            </div>
                                            {msg.subject && <div className="font-medium text-sm text-slate-800 mb-2">{msg.subject}</div>}
                                            <div className="text-sm text-slate-600 whitespace-pre-wrap">{msg.content}</div>
                                            {msg.relatedOrderId && (
                                                <div className="mt-2 inline-block px-2 py-1 bg-slate-100 text-slate-500 text-xs rounded border border-slate-200">
                                                    Sipariş: #{msg.relatedOrderId.slice(0, 8)}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Render Functions
    const renderMonthlyReport = (withPrices: boolean) => {
        const monthOrders = getOrdersInMonth();
        const monthShifts = getShiftsInMonth();

        const totalOrders = monthOrders.length;
        const totalProduction = monthShifts.reduce((acc, s) => acc + (s.producedQuantity || 0), 0);
        const totalScrap = monthShifts.reduce((acc, s) => acc + (s.scrapQuantity || 0), 0);
        const totalSales = monthOrders.reduce((acc, o) => acc + o.grandTotal, 0);

        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <Calendar className="text-indigo-600" />
                    <span className="font-medium text-slate-700">Ay Seçimi:</span>
                    <input 
                        type="month" 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                        title="Ay Seçimi"
                        aria-label="Ay Seçimi"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                                <FileText size={24} />
                            </div>
                            <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded">Aylık</span>
                        </div>
                        <h3 className="text-3xl font-bold text-slate-800 mb-1">{totalOrders}</h3>
                        <p className="text-sm text-slate-500">Toplam Sipariş</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                                <Package size={24} />
                            </div>
                            <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded">Üretim</span>
                        </div>
                        <h3 className="text-3xl font-bold text-slate-800 mb-1">{totalProduction.toLocaleString()}</h3>
                        <p className="text-sm text-slate-500">Toplam Üretilen Adet</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                                <AlertCircle size={24} />
                            </div>
                            <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded">Fire</span>
                        </div>
                        <h3 className="text-3xl font-bold text-slate-800 mb-1">{totalScrap.toLocaleString()}</h3>
                        <p className="text-sm text-slate-500">Toplam Hurda Adet</p>
                    </div>

                    {withPrices && (
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                                    <DollarSign size={24} />
                                </div>
                                <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded">Ciro</span>
                            </div>
                            <h3 className="text-3xl font-bold text-slate-800 mb-1">
                                {totalSales.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                            </h3>
                            <p className="text-sm text-slate-500">Toplam Satış Tutarı</p>
                        </div>
                    )}
                </div>

                {/* Mobile View (Cards) for Monthly Report */}
                <div className="md:hidden space-y-4">
                    {monthOrders.length === 0 ? (
                        <div className="text-center text-slate-500 py-8 bg-white rounded-lg border border-slate-200">
                            Bu ay için kayıt bulunamadı.
                        </div>
                    ) : (
                        monthOrders.map(order => (
                            <div key={order.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-mono text-xs text-slate-500">#{order.id.slice(0, 8)}</div>
                                        <div className="font-medium text-slate-800">{order.customerName}</div>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        order.status === 'Tamamlandı' ? 'bg-green-100 text-green-700' : 
                                        order.status === 'İptal' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                        {order.status}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm text-slate-600">
                                    <span>{format(new Date(order.createdAt), 'dd MMM yyyy', { locale: tr })}</span>
                                    {withPrices && (
                                        <span className="font-medium text-slate-900">
                                            {order.grandTotal.toLocaleString('tr-TR', { style: 'currency', currency: order.currency })}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Desktop View (Table) for Monthly Report */}
                <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                        <h3 className="font-semibold text-slate-800">Ayın Sipariş Özeti</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-600 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Sipariş No</th>
                                    <th className="px-6 py-3">Müşteri</th>
                                    <th className="px-6 py-3">Tarih</th>
                                    <th className="px-6 py-3">Durum</th>
                                    {withPrices && <th className="px-6 py-3 text-right">Tutar</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {monthOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={withPrices ? 5 : 4} className="px-6 py-8 text-center text-slate-500">
                                            Bu ay için kayıt bulunamadı.
                                        </td>
                                    </tr>
                                ) : (
                                    monthOrders.map(order => (
                                        <tr key={order.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-3 font-mono">#{order.id.slice(0, 8)}</td>
                                            <td className="px-6 py-3">{order.customerName}</td>
                                            <td className="px-6 py-3">{format(new Date(order.createdAt), 'dd MMM yyyy', { locale: tr })}</td>
                                            <td className="px-6 py-3">
                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                                    {order.status}
                                                </span>
                                            </td>
                                            {withPrices && (
                                                <td className="px-6 py-3 text-right font-medium">
                                                    {order.grandTotal.toLocaleString('tr-TR', { style: 'currency', currency: order.currency })}
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderDetailedReport = () => {
        const filteredOrders = getOrdersInRange();

        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-6 items-end">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Başlangıç Tarihi</label>
                        <input 
                            type="date" 
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                            title="Başlangıç Tarihi"
                            aria-label="Başlangıç Tarihi"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Bitiş Tarihi</label>
                        <input 
                            type="date" 
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                            title="Bitiş Tarihi"
                            aria-label="Bitiş Tarihi"
                        />
                    </div>
                    
                    <div className="flex flex-wrap gap-4 w-full md:w-auto md:border-l md:border-slate-200 md:pl-6 md:ml-2 mt-4 md:mt-0 pt-4 md:pt-0 border-t border-slate-100 md:border-t-0">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={showCustomer} onChange={e => setShowCustomer(e.target.checked)} className="rounded text-indigo-600" />
                            <span className="text-sm text-slate-700">Müşteri</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={showProduct} onChange={e => setShowProduct(e.target.checked)} className="rounded text-indigo-600" />
                            <span className="text-sm text-slate-700">Ürünler</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={showPrices} onChange={e => setShowPrices(e.target.checked)} className="rounded text-indigo-600" />
                            <span className="text-sm text-slate-700">Fiyatlar</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={showStatus} onChange={e => setShowStatus(e.target.checked)} className="rounded text-indigo-600" />
                            <span className="text-sm text-slate-700">Durum</span>
                        </label>
                    </div>
                </div>

                {/* Mobile View (Cards) for Detailed Report */}
                <div className="md:hidden space-y-4">
                    {filteredOrders.length === 0 ? (
                        <div className="text-center text-slate-500 py-8 bg-white rounded-lg border border-slate-200">
                            Seçilen tarih aralığında kayıt bulunamadı.
                        </div>
                    ) : (
                        filteredOrders.map(order => (
                            <div key={order.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-mono text-xs text-slate-500">#{order.id.slice(0, 8)}</div>
                                        {showCustomer && <div className="font-medium text-slate-800">{order.customerName}</div>}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-slate-500">{format(new Date(order.createdAt), 'dd.MM.yyyy', { locale: tr })}</div>
                                        {showStatus && (
                                            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${ORDER_STATUS_MAP[order.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                                                {ORDER_STATUS_MAP[order.status]?.label || order.status}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                
                                {showProduct && (
                                    <div className="text-sm text-slate-600 bg-slate-50 p-2 rounded">
                                        <span className="text-xs text-slate-400 block">İlk Ürün:</span>
                                        {order.items[0]?.productName || '-'}
                                        {order.items.length > 1 && <span className="text-xs text-slate-400 ml-1">(+{order.items.length - 1} diğer)</span>}
                                    </div>
                                )}

                                {showPrices && (
                                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                                        <span className="text-sm text-slate-500">Tutar:</span>
                                        <span className="font-bold text-slate-900">
                                            {order.grandTotal.toLocaleString('tr-TR', { style: 'currency', currency: order.currency })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Desktop View (Table) for Detailed Report */}
                <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-600 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Tarih</th>
                                    <th className="px-6 py-3">Sipariş No</th>
                                    {showCustomer && <th className="px-6 py-3">Müşteri</th>}
                                    {showProduct && <th className="px-6 py-3">Ürün (İlk Kalem)</th>}
                                    {showStatus && <th className="px-6 py-3">Durum</th>}
                                    {showPrices && <th className="px-6 py-3 text-right">Tutar</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {filteredOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                            Seçilen tarih aralığında kayıt bulunamadı.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredOrders.map(order => (
                                        <tr key={order.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-3 whitespace-nowrap">
                                                {format(new Date(order.createdAt), 'dd.MM.yyyy', { locale: tr })}
                                            </td>
                                            <td className="px-6 py-3 font-mono">#{order.id.slice(0, 8)}</td>
                                            {showCustomer && <td className="px-6 py-3">{order.customerName}</td>}
                                            {showProduct && <td className="px-6 py-3 truncate max-w-xs">{order.items[0]?.productName || '-'}</td>}
                                            {showStatus && (
                                                <td className="px-6 py-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ORDER_STATUS_MAP[order.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                                                        {ORDER_STATUS_MAP[order.status]?.label || order.status}
                                                    </span>
                                                </td>
                                            )}
                                            {showPrices && (
                                                <td className="px-6 py-3 text-right font-medium">
                                                    {order.grandTotal.toLocaleString('tr-TR', { style: 'currency', currency: order.currency })}
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {showPrices && filteredOrders.length > 0 && (
                                <tfoot className="bg-slate-50 font-semibold text-slate-800">
                                    <tr>
                                        <td colSpan={2} className="px-6 py-3">TOPLAM</td>
                                        {showCustomer && <td></td>}
                                        {showProduct && <td></td>}
                                        {showStatus && <td></td>}
                                        <td className="px-6 py-3 text-right">
                                            {filteredOrders.reduce((acc, o) => acc + o.grandTotal, 0)
                                                .toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderProductionReport = () => {
        const filteredShifts = getShiftsInRange();
        const totalProduced = filteredShifts.reduce((acc, s) => acc + (s.producedQuantity || 0), 0);
        const totalScrap = filteredShifts.reduce((acc, s) => acc + (s.scrapQuantity || 0), 0);

        // Group by product (using orderId to find product name is tricky if we don't have order details in shift)
        // We will try to match with orders
        const productionByProduct: Record<string, { produced: number, scrap: number }> = {};
        
        filteredShifts.forEach(shift => {
            const order = orders.find(o => o.id === shift.orderId);
            const productName = order?.items[0]?.productName || 'Bilinmeyen Ürün';
            
            if (!productionByProduct[productName]) {
                productionByProduct[productName] = { produced: 0, scrap: 0 };
            }
            productionByProduct[productName].produced += (shift.producedQuantity || 0);
            productionByProduct[productName].scrap += (shift.scrapQuantity || 0);
        });

        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                 <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-6 items-end">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Başlangıç Tarihi</label>
                        <input 
                            type="date" 
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                            title="Başlangıç Tarihi"
                            aria-label="Başlangıç Tarihi"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Bitiş Tarihi</label>
                        <input 
                            type="date" 
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                            title="Bitiş Tarihi"
                            aria-label="Bitiş Tarihi"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                                <Factory size={24} />
                            </div>
                        </div>
                        <h3 className="text-4xl font-bold text-slate-800 mb-1">{totalProduced.toLocaleString()}</h3>
                        <p className="text-sm text-slate-500">Seçilen Tarihte Toplam Üretim</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                                <Trash2 size={24} />
                            </div>
                        </div>
                        <h3 className="text-4xl font-bold text-slate-800 mb-1">{totalScrap.toLocaleString()}</h3>
                        <p className="text-sm text-slate-500">Toplam Hurda</p>
                    </div>
                </div>

                {/* Mobile View (Cards) for Production Report */}
                <div className="md:hidden space-y-4">
                    {Object.entries(productionByProduct).length === 0 ? (
                        <div className="text-center text-slate-500 py-8 bg-white rounded-lg border border-slate-200">
                            Üretim kaydı bulunamadı.
                        </div>
                    ) : (
                        Object.entries(productionByProduct).map(([name, stats]) => (
                            <div key={name} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="font-medium text-slate-800 mb-3">{name}</div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                                        <div className="text-xs text-green-600 font-medium mb-1">Üretilen</div>
                                        <div className="text-lg font-bold text-green-700">{stats.produced.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                                        <div className="text-xs text-red-600 font-medium mb-1">Hurda</div>
                                        <div className="text-lg font-bold text-red-700">{stats.scrap.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Desktop View (Table) for Production Report */}
                <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                        <h3 className="font-semibold text-slate-800">Ürün Bazlı Üretim Dağılımı</h3>
                    </div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-medium">
                            <tr>
                                <th className="px-6 py-3">Ürün Adı</th>
                                <th className="px-6 py-3 text-right">Üretilen Miktar</th>
                                <th className="px-6 py-3 text-right">Hurda Miktar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {Object.entries(productionByProduct).length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                                        Üretim kaydı bulunamadı.
                                    </td>
                                </tr>
                            ) : (
                                Object.entries(productionByProduct).map(([name, stats]) => (
                                    <tr key={name} className="hover:bg-slate-50">
                                        <td className="px-6 py-3 font-medium text-slate-800">{name}</td>
                                        <td className="px-6 py-3 text-right">{stats.produced.toLocaleString()}</td>
                                        <td className="px-6 py-3 text-right text-red-600">{stats.scrap.toLocaleString()}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Raporlar & Analizler</h1>
                <p className="text-slate-500">İşletme performansınızı analiz edin ve raporlayın</p>
            </div>

            <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex overflow-x-auto md:inline-flex w-full md:w-auto gap-1 no-scrollbar" role="tablist" aria-label="Rapor Sekmeleri">
                <button
                    onClick={() => setActiveTab('monthly')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                        activeTab === 'monthly' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                    role="tab"
                    aria-selected={activeTab === 'monthly'}
                    aria-controls="monthly-panel"
                >
                    Aylık Özet
                </button>
                <button
                    onClick={() => setActiveTab('monthly-price')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                        activeTab === 'monthly-price' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                    role="tab"
                    aria-selected={activeTab === 'monthly-price'}
                    aria-controls="monthly-price-panel"
                >
                    Finansal Rapor
                </button>
                <button
                    onClick={() => setActiveTab('detailed')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                        activeTab === 'detailed' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                    role="tab"
                    aria-selected={activeTab === 'detailed'}
                    aria-controls="detailed-panel"
                >
                    Detaylı Rapor
                </button>
                <button
                    onClick={() => setActiveTab('production')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                        activeTab === 'production' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                    role="tab"
                    aria-selected={activeTab === 'production'}
                    aria-controls="production-panel"
                >
                    Üretim Raporu
                </button>
                {user?.roleName === 'Admin' && (
                    <button
                        onClick={() => setActiveTab('messages')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                            activeTab === 'messages' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                        role="tab"
                        aria-selected={activeTab === 'messages'}
                        aria-controls="messages-panel"
                    >
                        Mesajlar
                    </button>
                )}
            </div>

            <div className="min-h-[400px]">
                {activeTab === 'monthly' && <div id="monthly-panel" role="tabpanel">{renderMonthlyReport(false)}</div>}
                {activeTab === 'monthly-price' && <div id="monthly-price-panel" role="tabpanel">{renderMonthlyReport(true)}</div>}
                {activeTab === 'detailed' && <div id="detailed-panel" role="tabpanel">{renderDetailedReport()}</div>}
                {activeTab === 'production' && <div id="production-panel" role="tabpanel">{renderProductionReport()}</div>}
                {activeTab === 'messages' && <div id="messages-panel" role="tabpanel">{renderMessagesReport()}</div>}
            </div>
        </div>
    );
}
