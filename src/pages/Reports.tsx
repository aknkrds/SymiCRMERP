import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { 
    Calendar, DollarSign, Package, FileText, Filter, 
    BarChart2, PieChart, TrendingUp, AlertCircle, CheckCircle2,
    Trash2, Factory
} from 'lucide-react';
import { useOrders } from '../hooks/useOrders';
import { ORDER_STATUS_MAP } from '../constants/orderStatus';
import type { Shift, Order } from '../types';

export default function Reports() {
    const { orders } = useOrders();
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [activeTab, setActiveTab] = useState<'monthly' | 'monthly-price' | 'detailed' | 'production'>('monthly');
    
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

    useEffect(() => {
        fetch('/api/shifts')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setShifts(data);
            })
            .catch(console.error);
    }, []);

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

                {/* Optional: Simple List for context */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Bitiş Tarihi</label>
                        <input 
                            type="date" 
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    
                    <div className="flex gap-4 border-l border-slate-200 pl-6 ml-2">
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

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Bitiş Tarihi</label>
                        <input 
                            type="date" 
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
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

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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

            <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm inline-flex">
                <button
                    onClick={() => setActiveTab('monthly')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeTab === 'monthly' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    Aylık Özet
                </button>
                <button
                    onClick={() => setActiveTab('monthly-price')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeTab === 'monthly-price' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    Finansal Rapor
                </button>
                <button
                    onClick={() => setActiveTab('detailed')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeTab === 'detailed' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    Detaylı Rapor
                </button>
                <button
                    onClick={() => setActiveTab('production')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeTab === 'production' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    Üretim Raporu
                </button>
            </div>

            <div className="min-h-[400px]">
                {activeTab === 'monthly' && renderMonthlyReport(false)}
                {activeTab === 'monthly-price' && renderMonthlyReport(true)}
                {activeTab === 'detailed' && renderDetailedReport()}
                {activeTab === 'production' && renderProductionReport()}
            </div>
        </div>
    );
}
