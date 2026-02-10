import React, { useState, useEffect, useRef } from 'react';
import { Plus, Calendar, Save, History, X, Trash2, Check, Search, Printer, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useOrders } from '../hooks/useOrders';
import { Modal } from '../components/ui/Modal';
import { ORDER_STATUS_MAP } from '../constants/orderStatus';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

const MACHINES = [
  "DörtKöşe Bant-1",
  "DörtKöşe Bant-2",
  "Dörtköşe Bant-3",
  "DörtKöşe Bant-4",
  "Yuvarlak",
  "Yuvarlak (Kutu)",
  "Oto Yuvarlak",
  "Ek Bant-1",
  "Ek Bant-2",
  "Ek-Bant-3"
];

const DAYS = [
  { name: "Pazartesi", id: "monday", color: "text-slate-900" },
  { name: "Salı", id: "tuesday", color: "text-slate-900" },
  { name: "Çarşamba", id: "wednesday", color: "text-slate-900" },
  { name: "Perşembe", id: "thursday", color: "text-slate-900" },
  { name: "Cuma", id: "friday", color: "text-slate-900" },
  { name: "Cumartesi", id: "saturday", color: "text-orange-600" },
  { name: "Pazar", id: "sunday", color: "text-red-600" }
];

// Helper to generate rows
const generateRows = () => {
  const rows: { day: string; label: string; key: string; color: string }[] = [];
  DAYS.forEach(day => {
    if (day.id === 'sunday') {
      rows.push({ day: day.name, label: day.name, key: `${day.id}-1`, color: day.color });
    } else {
      rows.push({ day: day.name, label: `${day.name}-1`, key: `${day.id}-1`, color: day.color });
      rows.push({ day: day.name, label: `${day.name}-2`, key: `${day.id}-2`, color: day.color });
    }
  });
  return rows;
};

const ROWS = generateRows();

interface MonthlyPlan {
    id: string;
    month: number;
    year: number;
    planData: Record<string, Record<string, PlanItem[]>>; // weekIndex -> cellKey -> items
    createdAt: string;
}

interface PlanItem {
    orderId: string;
    customerName: string;
    productName: string;
    quantity: number;
    description?: string;
}

// Helper to get weeks of the month
const getWeeksOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Start from the first day of the month
    const firstDay = new Date(year, month, 1);
    
    // Find the Monday of the week containing the 1st
    // Day 0 is Sunday, 1 is Monday.
    const dayOfWeek = firstDay.getDay(); // 0 (Sun) - 6 (Sat)
    // If it's Sunday (0), we go back 6 days. If Monday (1), we go back 0.
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const startOfFirstWeek = new Date(firstDay);
    startOfFirstWeek.setDate(firstDay.getDate() + diff);

    const weeks = [];
    let currentWeekStart = new Date(startOfFirstWeek);

    // Generate 4-5 weeks
    // We stop when the week start is in the next month
    // BUT user asked for 4 weeks explicitly? "1.hafta... 4.hafta"
    // We will generate enough weeks to cover the month, but UI might highlight 4.
    
    // Loop until we are past the end of the month
    // Actually, we should probably just do 4 or 5 weeks fixed logic.
    // Let's generate weeks until the start date is in the next month
    while (true) {
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(currentWeekStart.getDate() + 6);
        
        // If the week starts in the next month, stop (unless it's the very first week which started in prev month)
        // Actually, simpler: just generate weeks that overlap with the current month.
        // If weekStart > endOfMonth, stop.
        const endOfMonth = new Date(year, month + 1, 0);
        if (currentWeekStart > endOfMonth) break;

        weeks.push({
            start: new Date(currentWeekStart),
            end: new Date(weekEnd)
        });

        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    return weeks;
};

export default function Planning() {
  const { orders } = useOrders();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeWeekIndex, setActiveWeekIndex] = useState(0);
  
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<{name: string, key: string} | null>(null);
  const [historyPlans, setHistoryPlans] = useState<MonthlyPlan[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);

  // Data structure: { "0": { "monday-1-MachineA": [...] }, "1": { ... } }
  const [monthlyPlanData, setMonthlyPlanData] = useState<Record<string, Record<string, PlanItem[]>>>({});
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{rowKey: string, machine: string} | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const tableRef = useRef<HTMLDivElement>(null);

  const weeks = getWeeksOfMonth(currentMonth);

  // Helper to get current week's data
  const getCurrentWeekData = () => {
      return monthlyPlanData[activeWeekIndex.toString()] || {};
  };

  // Helper to update current week's data
  const updateCurrentWeekData = (newData: Record<string, PlanItem[]>) => {
      setMonthlyPlanData(prev => ({
          ...prev,
          [activeWeekIndex.toString()]: newData
      }));
  };

  // Fetch monthly plan
  useEffect(() => {
    const fetchMonthlyPlan = async () => {
        try {
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth(); // 0-11
            
            // Adjust month for query (server uses 0-11 based on my implementation?)
            // I used `const { month, year } = req.query;` in server.
            // Let's assume consistent usage.
            
            const res = await fetch(`/api/planning/monthly?month=${month}&year=${year}`);
            const plan = await res.json();
            
            if (plan) {
                setMonthlyPlanData(plan.planData || {});
                setCurrentPlanId(plan.id);
            } else {
                setMonthlyPlanData({});
                setCurrentPlanId(null);
            }
        } catch (error) {
            console.error('Error fetching plan:', error);
        }
    };
    fetchMonthlyPlan();
    // Reset active week when month changes
    setActiveWeekIndex(0);
  }, [currentMonth]);

  // Fetch history
  useEffect(() => {
    if (isHistoryModalOpen) {
        setIsLoadingHistory(true);
        fetch('/api/planning/monthly')
            .then(res => res.json())
            .then(data => {
                setHistoryPlans(data);
                setIsLoadingHistory(false);
            })
            .catch(err => {
                console.error('Failed to fetch history:', err);
                setIsLoadingHistory(false);
            });
    }
  }, [isHistoryModalOpen]);

  const handleSave = async (shouldClear = false) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    try {
        const response = await fetch('/api/planning/monthly', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                month,
                year,
                planData: monthlyPlanData
            })
        });

        if (response.ok) {
            const resData = await response.json();
            if (resData.id) setCurrentPlanId(resData.id);
            alert('Aylık plan başarıyla kaydedildi.');
            
            if (shouldClear) {
                setMonthlyPlanData({});
            }
            return true;
        } else {
            alert('Plan kaydedilirken bir hata oluştu.');
            return false;
        }
    } catch (error) {
        console.error('Error saving plan:', error);
        alert('Plan kaydedilirken bir hata oluştu.');
        return false;
    }
  };

  // Auto-save wrapper (saves the whole month)
  const autoSave = async (newData: Record<string, Record<string, PlanItem[]>>) => {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      
      try {
          const response = await fetch('/api/planning/monthly', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  month,
                  year,
                  planData: newData
              })
          });
          
          if (response.ok) {
              const resData = await response.json();
              if (resData.id) setCurrentPlanId(resData.id);
          }
      } catch (e) {
          console.error("Auto-save failed", e);
      }
  };

  const handlePrint = async () => {
      if (!tableRef.current) return;
      
      try {
          const dataUrl = await toPng(tableRef.current, { 
              quality: 0.95,
              backgroundColor: '#ffffff'
          });
          
          const img = new Image();
          img.src = dataUrl;
          await new Promise((resolve) => { img.onload = resolve; });
          
          const imgWidth = img.width;
          const imgHeight = img.height;
          
          const pdfWidth = 297;
          const pdfHeight = 210;
          
          const pdf = new jsPDF({
              orientation: 'landscape',
              unit: 'mm',
              format: 'a4'
          });
          
          const margin = 10;
          const availableWidth = pdfWidth - (margin * 2);
          const availableHeight = pdfHeight - (margin * 2);
          
          const widthRatio = availableWidth / imgWidth;
          const heightRatio = availableHeight / imgHeight;
          
          const ratio = Math.min(widthRatio, heightRatio);
          
          const finalWidth = imgWidth * ratio;
          const finalHeight = imgHeight * ratio;
          
          const imgX = (pdfWidth - finalWidth) / 2;
          const imgY = (pdfHeight - finalHeight) / 2;
          
          pdf.addImage(dataUrl, 'PNG', imgX, imgY, finalWidth, finalHeight);
          pdf.save(`planlama-${currentMonth.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}-hafta-${activeWeekIndex + 1}.pdf`);
      } catch (err) {
          console.error('PDF export failed:', err);
          alert('PDF oluşturulurken bir hata oluştu.');
      }
  };

  const handleDayClick = (dayName: string, rowKey: string) => {
    setSelectedDay({ name: dayName, key: rowKey });
    setIsDailyModalOpen(true);
  };

  const handleAddClick = (rowKey: string, machine: string) => {
      setSelectedCell({ rowKey, machine });
      setSelectedOrderIds([]);
      setSearchTerm('');
      setIsAddModalOpen(true);
  };

  const handleToggleOrder = (orderId: string) => {
      setSelectedOrderIds(prev => 
          prev.includes(orderId) 
              ? prev.filter(id => id !== orderId)
              : [...prev, orderId]
      );
  };

  const handleConfirmAdd = () => {
      if (!selectedCell || selectedOrderIds.length === 0) return;

      const cellKey = `${selectedCell.rowKey}-${selectedCell.machine}`;
      const newItems: PlanItem[] = selectedOrderIds.map(id => {
          const order = orders.find(o => o.id === id);
          if (!order) return null;
          let productName = 'Ürün';
          let quantity = 0;
          try {
            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
            if (Array.isArray(items) && items.length > 0) {
                productName = items[0].productName || items[0].name || 'Ürün';
                quantity = items[0].quantity || 0;
            }
          } catch (e) {}

          return {
              orderId: order.id,
              customerName: order.customerName,
              productName: productName,
              quantity: quantity
          };
      }).filter(Boolean) as PlanItem[];

      const newMonthlyData = {
          ...monthlyPlanData,
          [activeWeekIndex.toString()]: {
              ...(monthlyPlanData[activeWeekIndex.toString()] || {}),
              [cellKey]: [...(monthlyPlanData[activeWeekIndex.toString()]?.[cellKey] || []), ...newItems]
          }
      };

      setMonthlyPlanData(newMonthlyData);
      autoSave(newMonthlyData);
      setIsAddModalOpen(false);
  };

  const handleRemoveItem = (cellKey: string, index: number) => {
      const currentWeekData = monthlyPlanData[activeWeekIndex.toString()] || {};
      const newList = [...(currentWeekData[cellKey] || [])];
      newList.splice(index, 1);
      
      const newMonthlyData = {
          ...monthlyPlanData,
          [activeWeekIndex.toString()]: {
              ...currentWeekData,
              [cellKey]: newList
          }
      };
      
      setMonthlyPlanData(newMonthlyData);
      autoSave(newMonthlyData);
  };

  const formatDateRange = (start: Date, end: Date) => {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    return `${start.toLocaleDateString('tr-TR', options)} - ${end.toLocaleDateString('tr-TR', options)}`;
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
      const newDate = new Date(currentMonth);
      if (direction === 'prev') {
          newDate.setMonth(newDate.getMonth() - 1);
      } else {
          newDate.setMonth(newDate.getMonth() + 1);
      }
      setCurrentMonth(newDate);
  };

  const availableOrders = orders.filter(o => 
      o.productionStatus !== 'Tamamlandı' && 
      o.status !== 'production_completed' &&
      o.status !== 'shipping_completed' && 
      o.status !== 'order_completed'
  ).filter(o => 
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.id.includes(searchTerm)
  );

  const activeWeekData = getCurrentWeekData();

  return (
  <div className="space-y-6 h-full flex flex-col relative">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 flex-shrink-0">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Aylık Planlama</h1>
                <div className="flex items-center gap-2 mt-1">
                    <button onClick={() => handleMonthChange('prev')} className="p-1 hover:bg-slate-100 rounded">
                        <ChevronLeft size={20} className="text-slate-500" />
                    </button>
                    <span className="text-lg font-medium text-indigo-600">
                        {currentMonth.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={() => handleMonthChange('next')} className="p-1 hover:bg-slate-100 rounded">
                        <ChevronRight size={20} className="text-slate-500" />
                    </button>
                </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                 {/* Week Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-lg mr-4 overflow-x-auto max-w-full">
                    {weeks.map((week, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveWeekIndex(idx)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                                activeWeekIndex === idx 
                                    ? 'bg-white text-indigo-600 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <div className="font-bold">{idx + 1}. Hafta</div>
                            <div className="text-[10px] opacity-75">{formatDateRange(week.start, week.end)}</div>
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={handlePrint}
                        className="flex items-center justify-center gap-2 bg-white text-slate-600 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm font-medium text-sm"
                    >
                        <Download size={18} />
                        <span className="hidden sm:inline">PDF</span>
                    </button>
                    <button 
                        onClick={() => setIsHistoryModalOpen(true)}
                        className="flex items-center justify-center gap-2 bg-white text-slate-600 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm font-medium text-sm"
                    >
                        <History size={18} />
                        <span className="hidden sm:inline">Geçmiş</span>
                    </button>
                    <button 
                        onClick={() => handleSave(false)}
                        className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium text-sm"
                    >
                        <Save size={18} />
                        <span className="hidden sm:inline">Kaydet</span>
                    </button>
                    <button 
                        onClick={() => setIsClearModalOpen(true)}
                        className="flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 px-3 py-2 rounded-lg hover:bg-red-100 transition-colors shadow-sm font-medium text-sm"
                    >
                        <Trash2 size={18} />
                        <span className="hidden sm:inline">Temizle</span>
                    </button>
                </div>
            </div>
        </div>

        {/* Mobile View (List) */}
        <div className="md:hidden space-y-4 overflow-y-auto pb-20">
            {Object.keys(activeWeekData).length === 0 ? (
                <div className="text-center text-slate-500 py-8 bg-white rounded-lg border border-slate-200">
                    Bu hafta için planlanmış bir üretim yok.
                    <p className="text-xs mt-2 text-slate-400">Planlama yapmak için masaüstü görünümünü kullanınız.</p>
                </div>
            ) : (
                ROWS.map(row => {
                    const hasItems = MACHINES.some(machine => {
                        const cellKey = `${row.key}-${machine}`;
                        return (activeWeekData[cellKey] || []).length > 0;
                    });
                    
                    if (!hasItems) return null;
                    
                    return (
                         <div key={row.key} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                            <div className={`px-4 py-2 font-bold text-sm bg-slate-50 border-b border-slate-200 flex justify-between items-center ${row.color}`}>
                                <span>{row.label}</span>
                                <button 
                                    onClick={() => handleDayClick(row.day, row.key)}
                                    className="text-xs font-normal text-indigo-600 hover:underline"
                                >
                                    Detay/Ekle
                                </button>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {MACHINES.map(machine => {
                                     const cellKey = `${row.key}-${machine}`;
                                     const items = activeWeekData[cellKey] || [];
                                     if (items.length === 0) return null;
                                     
                                     return (
                                        <div key={machine} className="p-3">
                                            <div className="text-xs font-semibold text-slate-500 mb-2">{machine}</div>
                                            <div className="space-y-2">
                                                {items.map((item, idx) => (
                                                    <div key={idx} className="bg-indigo-50 p-2 rounded text-sm border border-indigo-100 relative group/mobile-item">
                                                        <div className="font-medium text-indigo-900 pr-6">{item.customerName}</div>
                                                        <div className="text-indigo-700 text-xs">{item.productName}</div>
                                                        <div className="text-slate-500 text-xs mt-1">{item.quantity} Adet</div>
                                                        <button 
                                                            onClick={() => handleRemoveItem(cellKey, idx)}
                                                            className="absolute top-2 right-2 text-indigo-400 hover:text-red-500 p-2 -mr-2 -mt-2"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                     );
                                })}
                            </div>
                         </div>
                    );
                })
            )}
        </div>

        {/* Desktop View (Table) */}
        <div className="hidden md:flex flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-col">
            <div className="overflow-auto flex-1">
                <table className="w-full border-collapse min-w-[1500px]" id="planning-table" ref={tableRef}>
                    <thead className="sticky top-0 z-20 shadow-sm">
                        <tr>
                            <th scope="col" className="p-3 border-b border-r border-slate-200 bg-slate-50 text-left text-sm font-bold text-slate-700 sticky left-0 z-30 w-32 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                Gün
                            </th>
                            {MACHINES.map((machine) => (
                                <th key={machine} scope="col" className="p-3 border-b border-r border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-700 min-w-[140px]">
                                    {machine}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {ROWS.map((row) => (
                            <tr key={row.key} className="group hover:bg-slate-50/50">
                                <td 
                                    onClick={() => handleDayClick(row.day, row.key)}
                                    className={`p-3 border-b border-r border-slate-200 text-sm font-bold bg-white sticky left-0 z-10 group-hover:bg-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] cursor-pointer hover:underline ${row.color}`}
                                >
                                    {row.label}
                                </td>
                                {MACHINES.map((machine) => {
                                    const cellKey = `${row.key}-${machine}`;
                                    const items = activeWeekData[cellKey] || [];
                                    
                                    return (
                                    <td key={cellKey} className="p-2 border-b border-r border-slate-200 align-top min-h-[120px] bg-white group-hover:bg-slate-50/50">
                                        <div className="flex flex-col gap-2 min-h-[80px]">
                                            {/* Items */}
                                            {items.map((item, idx) => (
                                                <div key={idx} className="bg-indigo-50 border border-indigo-100 p-2 rounded text-xs relative group/item hover:border-indigo-300 transition-colors">
                                                    <div className="font-bold text-indigo-700 truncate" title={item.customerName}>{item.customerName}</div>
                                                    <div className="text-slate-600 truncate" title={item.productName}>{item.productName}</div>
                                                    <div className="text-slate-500 mt-1">{item.quantity} Adet</div>
                                                    
                                                    {/* Delete Button (visible on hover) */}
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveItem(cellKey, idx);
                                                        }}
                                                        className="absolute -top-1.5 -right-1.5 bg-white rounded-full p-0.5 text-slate-400 border border-slate-200 shadow-sm opacity-0 group-hover/item:opacity-100 hover:text-red-500 transition-all"
                                                        title="Sil"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                            
                                            {/* Add Button (visible on hover) */}
                                            <button 
                                                onClick={() => handleAddClick(row.key, machine)}
                                                className="w-full mt-auto py-1 text-[10px] font-medium text-slate-400 border border-dashed border-slate-300 rounded hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1"
                                            >
                                                <Plus size={12} />
                                                Ekle
                                            </button>
                                        </div>
                                    </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Add Order Modal */}
        <Modal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            title="Üretim Planına Ekle"
            size="lg"
        >
            <div className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Müşteri veya Sipariş No Ara..." 
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="max-h-[400px] overflow-y-auto border border-slate-200 rounded-lg">
                    {availableOrders.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            {searchTerm ? 'Sonuç bulunamadı.' : 'Planlanacak uygun sipariş bulunmuyor.'}
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-700 font-semibold sticky top-0">
                                <tr>
                                    <th className="p-3 w-10">
                                        <div className="w-4 h-4" />
                                    </th>
                                    <th className="p-3">Müşteri</th>
                                    <th className="p-3">Ürün</th>
                                    <th className="p-3">Adet</th>
                                    <th className="p-3">Tarih</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {availableOrders.map(order => {
                                    let productName = '-';
                                    let quantity = 0;
                                    try {
                                        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                                        if (Array.isArray(items) && items.length > 0) {
                                            productName = items[0].productName || items[0].name || '-';
                                            quantity = items[0].quantity || 0;
                                        }
                                    } catch (e) {}
                                    
                                    const isSelected = selectedOrderIds.includes(order.id);
                                    
                                    return (
                                        <tr 
                                            key={order.id} 
                                            className={`hover:bg-slate-50 cursor-pointer ${isSelected ? 'bg-indigo-50' : ''}`}
                                            onClick={() => handleToggleOrder(order.id)}
                                        >
                                            <td className="p-3">
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                                                    {isSelected && <Check size={12} />}
                                                </div>
                                            </td>
                                            <td className="p-3 font-medium text-slate-900">{order.customerName}</td>
                                            <td className="p-3 text-slate-600">{productName}</td>
                                            <td className="p-3 text-slate-600">{quantity}</td>
                                            <td className="p-3 text-slate-500 text-xs">
                                                {new Date(order.createdAt).toLocaleDateString('tr-TR')}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button 
                        onClick={() => setIsAddModalOpen(false)}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        İptal
                    </button>
                    <button 
                        onClick={handleConfirmAdd}
                        disabled={selectedOrderIds.length === 0}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Seçilenleri Ekle ({selectedOrderIds.length})
                    </button>
                </div>
            </div>
        </Modal>

        {/* Clear Confirmation Modal */}
        <Modal
            isOpen={isClearModalOpen}
            onClose={() => setIsClearModalOpen(false)}
            title="Planı Temizle"
            size="sm"
        >
            <div className="space-y-4">
                <p className="text-slate-600">
                    Mevcut aylık planı temizlemek istediğinize emin misiniz? Bu işlem geri alınamaz.
                </p>
                <div className="flex justify-end gap-3 pt-4">
                    <button 
                        onClick={() => setIsClearModalOpen(false)}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        İptal
                    </button>
                    <button 
                        onClick={() => {
                            setMonthlyPlanData({});
                            autoSave({});
                            setIsClearModalOpen(false);
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Temizle
                    </button>
                </div>
            </div>
        </Modal>

        {/* History Modal */}
        <Modal
            isOpen={isHistoryModalOpen}
            onClose={() => setIsHistoryModalOpen(false)}
            title="Plan Geçmişi"
            size="lg"
        >
            <div className="max-h-[60vh] overflow-y-auto">
                {isLoadingHistory ? (
                    <div className="text-center py-8 text-slate-500">Yükleniyor...</div>
                ) : historyPlans.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        Henüz kaydedilmiş geçmiş plan bulunmuyor.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {historyPlans.map((plan) => {
                            const date = new Date(plan.year, plan.month);
                            return (
                                <div key={plan.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 transition-colors shadow-sm group">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                                            <Calendar size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-slate-800">
                                                {date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Oluşturulma: {new Date(plan.createdAt).toLocaleDateString('tr-TR')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => {
                                                setCurrentMonth(new Date(plan.year, plan.month));
                                                setMonthlyPlanData(plan.planData);
                                                setCurrentPlanId(plan.id);
                                                setIsHistoryModalOpen(false);
                                            }}
                                            className="px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition-colors"
                                        >
                                            Görüntüle
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Modal>

        {/* Daily Detail Modal */}
        <Modal
            isOpen={isDailyModalOpen}
            onClose={() => setIsDailyModalOpen(false)}
            title={`${selectedDay?.name || ''} - Detaylar`}
            size="xl"
        >
            {selectedDay && (
                <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {MACHINES.map(machine => {
                            const cellKey = `${selectedDay.key}-${machine}`;
                            const items = activeWeekData[cellKey] || [];
                            
                            return (
                                <div key={machine} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="font-semibold text-slate-700 text-sm">{machine}</h3>
                                        <button 
                                            onClick={() => {
                                                setIsDailyModalOpen(false);
                                                handleAddClick(selectedDay.key, machine);
                                            }}
                                            className="flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1.5 rounded-lg hover:bg-indigo-200 transition-colors font-medium"
                                        >
                                            <Plus size={14} />
                                            Ekle
                                        </button>
                                    </div>
                                    
                                    {items.length === 0 ? (
                                        <div className="text-xs text-slate-400 italic text-center py-2 border border-dashed border-slate-200 rounded">
                                            Bu makine için plan bulunmuyor
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {items.map((item, idx) => (
                                                <div key={idx} className="bg-white p-3 rounded border border-slate-200 shadow-sm relative group">
                                                    <div className="font-medium text-slate-800 text-sm">{item.customerName}</div>
                                                    <div className="text-slate-600 text-xs mt-0.5">{item.productName}</div>
                                                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                                                        <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{item.quantity} Adet</span>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleRemoveItem(cellKey, idx)}
                                                        className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        title="Sil"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </Modal>
  </div>
  );
}