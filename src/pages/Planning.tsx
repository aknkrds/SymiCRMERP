import React, { useState, useEffect, useRef } from 'react';
import { Plus, Calendar, Save, History, X, Trash2, Check, Search, Printer, Download, ChevronLeft, ChevronRight, Menu, Filter, Info, FileText } from 'lucide-react';
import { useOrders } from '../hooks/useOrders';
import { Modal } from '../components/ui/Modal';
import { ORDER_STATUS_MAP } from '../constants/orderStatus';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ERPPageLayout, ToolbarBtn } from '../components/ui/ERPPageLayout';

const MACHINES = ["DörtKöşe Bant-1", "DörtKöşe Bant-2", "Dörtköşe Bant-3", "DörtKöşe Bant-4", "Yuvarlak", "Yuvarlak (Kutu)", "Oto Yuvarlak", "Ek Bant-1", "Ek Bant-2", "Ek-Bant-3"];
const DAYS = [
  { name: "Pazartesi", id: "monday", color: "text-slate-900" },
  { name: "Salı", id: "tuesday", color: "text-slate-900" },
  { name: "Çarşamba", id: "wednesday", color: "text-slate-900" },
  { name: "Perşembe", id: "thursday", color: "text-slate-900" },
  { name: "Cuma", id: "friday", color: "text-slate-900" },
  { name: "Cumartesi", id: "saturday", color: "text-orange-600" },
  { name: "Pazar", id: "sunday", color: "text-red-600" }
];

const ROWS = (() => {
  const rows: { day: string; label: string; key: string; color: string }[] = [];
  DAYS.forEach(day => {
    if (day.id === 'sunday') rows.push({ day: day.name, label: day.name, key: `${day.id}-1`, color: day.color });
    else { rows.push({ day: day.name, label: `${day.name}-1`, key: `${day.id}-1`, color: day.color }); rows.push({ day: day.name, label: `${day.name}-2`, key: `${day.id}-2`, color: day.color }); }
  });
  return rows;
})();

interface MonthlyPlan { id: string; month: number; year: number; planData: Record<string, Record<string, PlanItem[]>>; createdAt: string; }
interface PlanItem { orderId: string; customerName: string; productName: string; quantity: number; description?: string; }

const getWeeksOfMonth = (date: Date) => {
    const year = date.getFullYear(); const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const dayOfWeek = firstDay.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const startOfFirstWeek = new Date(firstDay); startOfFirstWeek.setDate(firstDay.getDate() + diff);
    const weeks = []; let currentWeekStart = new Date(startOfFirstWeek);
    while (true) {
        const weekEnd = new Date(currentWeekStart); weekEnd.setDate(currentWeekStart.getDate() + 6);
        const endOfMonth = new Date(year, month + 1, 0);
        if (currentWeekStart > endOfMonth) break;
        weeks.push({ start: new Date(currentWeekStart), end: new Date(weekEnd) });
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
  const [monthlyPlanData, setMonthlyPlanData] = useState<Record<string, Record<string, PlanItem[]>>>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{rowKey: string, machine: string} | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const tableRef = useRef<HTMLDivElement>(null);
  const weeks = getWeeksOfMonth(currentMonth);

  useEffect(() => {
    const fetchMonthlyPlan = async () => {
        try {
            const year = currentMonth.getFullYear(); const month = currentMonth.getMonth();
            const res = await fetch(`/api/planning/monthly?month=${month}&year=${year}`);
            const plan = await res.json();
            if (plan) { setMonthlyPlanData(plan.planData || {}); setCurrentPlanId(plan.id); } 
            else { setMonthlyPlanData({}); setCurrentPlanId(null); }
        } catch (error) { console.error('Error fetching plan:', error); }
    };
    fetchMonthlyPlan();
    const today = new Date();
    if (today.getFullYear() === currentMonth.getFullYear() && today.getMonth() === currentMonth.getMonth()) {
      const idx = weeks.findIndex(w => today >= w.start && today <= w.end);
      setActiveWeekIndex(idx >= 0 ? idx : 0);
    } else {
      setActiveWeekIndex(0);
    }
  }, [currentMonth]);

  useEffect(() => {
    if (isHistoryModalOpen) {
        setIsLoadingHistory(true);
        fetch('/api/planning/monthly').then(res => res.json()).then(data => { setHistoryPlans(data); setIsLoadingHistory(false); }).catch(err => { console.error(err); setIsLoadingHistory(false); });
    }
  }, [isHistoryModalOpen]);

  const autoSave = async (newData: Record<string, Record<string, PlanItem[]>>) => {
      try {
          const res = await fetch('/api/planning/monthly', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ month: currentMonth.getMonth(), year: currentMonth.getFullYear(), planData: newData }) });
          if (res.ok) { const d = await res.json(); if (d.id) setCurrentPlanId(d.id); }
      } catch (e) { console.error("Auto-save failed", e); }
  };

  const handlePrint = async () => {
      if (!tableRef.current) return;
      try {
          const dataUrl = await toPng(tableRef.current, { quality: 0.95, backgroundColor: '#ffffff' });
          const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
          const pdfW = 297; const pdfH = 210; const margin = 5;
          pdf.addImage(dataUrl, 'PNG', margin, margin, pdfW - margin * 2, pdfH - margin * 2);
          pdf.save(`planlama-${format(currentMonth, 'MMMM-yyyy', { locale: tr })}.pdf`);
      } catch (err) { alert('Hata.'); }
  };

  const handleAddClick = (rowKey: string, machine: string) => { setSelectedCell({ rowKey, machine }); setSelectedOrderIds([]); setSearchTerm(''); setIsAddModalOpen(true); };
  const handleToggleOrder = (orderId: string) => { setSelectedOrderIds(prev => prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]); };
  const handleConfirmAdd = () => {
      if (!selectedCell || selectedOrderIds.length === 0) return;
      const cellKey = `${selectedCell.rowKey}-${selectedCell.machine}`;
      const newItems: PlanItem[] = selectedOrderIds.map(id => {
          const order = orders.find(o => o.id === id); if (!order) return null;
          let pName = 'Ürün'; let qty = 0;
          try { const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items; if (Array.isArray(items) && items.length > 0) { pName = items[0].productName || items[0].name || 'Ürün'; qty = items[0].quantity || 0; } } catch (e) {}
          return { orderId: order.id, customerName: order.customerName, productName: pName, quantity: qty };
      }).filter(Boolean) as PlanItem[];
      const newMonthlyData = { ...monthlyPlanData, [activeWeekIndex.toString()]: { ...(monthlyPlanData[activeWeekIndex.toString()] || {}), [cellKey]: [...(monthlyPlanData[activeWeekIndex.toString()]?.[cellKey] || []), ...newItems] } };
      setMonthlyPlanData(newMonthlyData); autoSave(newMonthlyData); setIsAddModalOpen(false);
  };

  const handleRemoveItem = (cellKey: string, index: number) => {
      const cur = monthlyPlanData[activeWeekIndex.toString()] || {}; const list = [...(cur[cellKey] || [])]; list.splice(index, 1);
      const newMonthlyData = { ...monthlyPlanData, [activeWeekIndex.toString()]: { ...cur, [cellKey]: list } };
      setMonthlyPlanData(newMonthlyData); autoSave(newMonthlyData);
  };

  const activeWeekData = monthlyPlanData[activeWeekIndex.toString()] || {};
  const availableOrders = orders.filter(o => o.productionStatus !== 'Tamamlandı' && !['production_completed', 'shipping_completed', 'order_completed'].includes(o.status || ''))
                         .filter(o => o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || o.id.includes(searchTerm));

  return (
    <ERPPageLayout
      breadcrumbs={[{ label: 'Planlama' }, { label: 'Üretim Planı', active: true }]}
      toolbar={
        <>
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded border border-slate-200 mr-4">
             <button onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))} className="p-1 hover:bg-white rounded transition-all" title="Önceki Ay"><ChevronLeft size={14} /></button>
             <span className="text-[10px] font-bold uppercase tracking-widest px-2 min-w-[100px] text-center">{format(currentMonth, 'MMMM yyyy', { locale: tr })}</span>
             <button onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))} className="p-1 hover:bg-white rounded transition-all" title="Sonraki Ay"><ChevronRight size={14} /></button>
          </div>
          <button
            onClick={() => {
              const now = new Date();
              setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
              const idx = getWeeksOfMonth(now).findIndex(w => now >= w.start && now <= w.end);
              setActiveWeekIndex(idx >= 0 ? idx : 0);
            }}
            className="px-2 py-1 text-[10px] font-semibold uppercase bg-white border border-slate-200 rounded hover:bg-slate-50 mr-2"
            title="Bu Hafta"
          >
            Bu Hafta
          </button>
          <div className="flex bg-slate-100 p-0.5 rounded border border-slate-200">
             {weeks.map((_, i) => (
               <button key={i} onClick={() => setActiveWeekIndex(i)} className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${activeWeekIndex === i ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500'}`} title={`${i+1}. Hafta Seç`}>{i + 1}. HAFTA</button>
             ))}
          </div>
        </>
      }
      toolbarRight={
        <div className="flex items-center gap-1.5">
           <ToolbarBtn icon={<Printer size={13} />} label="Yazdır" onClick={handlePrint} />
           <ToolbarBtn icon={<History size={13} />} label="Geçmiş" onClick={() => setIsHistoryModalOpen(true)} />
        </div>
      }
    >
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-220px)]">
         <div className="overflow-auto flex-1 custom-scrollbar" ref={tableRef}>
            <table className="w-full border-collapse min-w-[2000px] text-[10px]">
               <thead className="sticky top-0 z-30 shadow-sm shadow-slate-200/50">
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-2 border-r border-slate-200 font-bold text-slate-700 bg-slate-50 sticky left-0 z-40 w-24 text-center">GÜN / BANT</th>
                    {MACHINES.map(m => <th key={m} className="p-2 border-r border-slate-200 font-bold text-slate-700 bg-slate-50 text-center uppercase tracking-tight">{m}</th>)}
                  </tr>
               </thead>
               <tbody>
                  {ROWS.map(row => (
                    <tr key={row.key} className="group border-b border-slate-100 last:border-0">
                       <td className={`p-2 border-r border-slate-200 font-bold bg-slate-50/50 sticky left-0 z-20 text-center uppercase transition-colors group-hover:bg-slate-50 ${row.color}`}>{row.label}</td>
                       {MACHINES.map(machine => {
                          const cellKey = `${row.key}-${machine}`;
                          const items = activeWeekData[cellKey] || [];
                          return (
                            <td key={cellKey} className="p-1 border-r border-slate-200 align-top h-24 hover:bg-blue-50/20 group transition-colors">
                               <div className="flex flex-col gap-1 h-full">
                                  {items.map((item, idx) => (
                                    <div key={idx} className="bg-indigo-50/50 border border-indigo-100 p-1 rounded text-[9px] relative group/item hover:bg-white hover:border-indigo-400 transition-all shadow-sm">
                                       <div className="font-bold text-indigo-900 truncate">{item.customerName}</div>
                                       <div className="text-slate-500 truncate">{item.productName}</div>
                                       <div className="text-[8px] font-bold text-slate-400 mt-0.5">{item.quantity} ADET</div>
                                       <button onClick={() => handleRemoveItem(cellKey, idx)} className="absolute top-0.5 right-0.5 p-0.5 text-slate-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100" title="Satırı kaldır"><X size={10} /></button>
                                    </div>
                                  ))}
                                  <button onClick={() => handleAddClick(row.key, machine)} className="mt-auto w-full py-1 text-[9px] font-bold text-slate-300 border border-dashed border-slate-200 rounded hover:bg-white hover:text-blue-600 hover:border-blue-400 opacity-0 group-hover:opacity-100 transition-all uppercase">+ EKLE</button>
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

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Üretim Planına Ekle">
         <div className="space-y-4 p-1">
            <div className="relative">
               <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
               <input type="text" placeholder="Müşteri veya Sipariş Ara..." className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded text-xs outline-none focus:ring-1 focus:ring-blue-400" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="max-h-64 overflow-y-auto border border-slate-100 rounded bg-slate-50/30 custom-scrollbar">
               <table className="w-full text-[10px] text-left">
                  <thead className="bg-slate-50 sticky top-0 font-bold text-slate-500 uppercase">
                     <tr><th className="p-2 w-8"></th><th className="p-2">Müşteri</th><th className="p-2">Ürün</th><th className="p-2">Adet</th></tr>
                  </thead>
                  <tbody>
                     {availableOrders.map(o => {
                        let pName = '-'; let qty = 0;
                        try { const i = typeof o.items === 'string' ? JSON.parse(o.items) : o.items; if (Array.isArray(i) && i.length > 0) { pName = i[0].productName || i[0].name || '-'; qty = i[0].quantity || 0; } } catch (e) {}
                        const sel = selectedOrderIds.includes(o.id);
                        return (
                          <tr key={o.id} className={`hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 ${sel ? 'bg-blue-50/50' : ''}`} onClick={() => handleToggleOrder(o.id)}>
                             <td className="p-2 text-center"><div className={`w-3 h-3 rounded border mx-auto flex items-center justify-center ${sel ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'}`}>{sel && <Check size={8} />}</div></td>
                             <td className="p-2 font-bold text-slate-700">{o.customerName}</td>
                             <td className="p-2 text-slate-500">{pName}</td>
                             <td className="p-2 font-bold text-slate-400">{qty}</td>
                          </tr>
                        );
                     })}
                  </tbody>
               </table>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-50"><button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded text-[10px] font-bold uppercase transition-all">İptal</button><button onClick={handleConfirmAdd} disabled={selectedOrderIds.length === 0} className="px-5 py-2 bg-blue-600 text-white rounded text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50">EKLE ({selectedOrderIds.length})</button></div>
         </div>
      </Modal>

      <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title="Aylık Plan Geçmişi">
         <div className="space-y-3 p-1 max-h-80 overflow-auto custom-scrollbar">
            {historyPlans.map(p => (
              <div key={p.id} className="p-3 bg-slate-50 border border-slate-100 rounded flex items-center justify-between hover:border-blue-200 transition-all group">
                 <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded border border-slate-200 text-blue-600 shadow-sm"><Calendar size={16} /></div>
                    <div><h4 className="text-[11px] font-bold text-slate-800 uppercase">{format(new Date(p.year, p.month), 'MMMM yyyy', { locale: tr })}</h4><p className="text-[9px] text-slate-400 mt-0.5">Tarih: {format(new Date(p.createdAt), 'dd.MM.yyyy')}</p></div>
                 </div>
                 <button onClick={() => { setCurrentMonth(new Date(p.year, p.month)); setMonthlyPlanData(p.planData); setCurrentPlanId(p.id); setIsHistoryModalOpen(false); }} className="px-3 py-1 bg-white border border-slate-200 text-blue-600 rounded text-[10px] font-bold uppercase hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all">Yükle</button>
              </div>
            ))}
         </div>
      </Modal>

      {/* Temizleme işlemi kullanıcı isteği gereği devre dışı bırakıldı */}
    </ERPPageLayout>
  );
}
