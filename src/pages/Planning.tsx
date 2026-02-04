import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Save, History, X, Trash2 } from 'lucide-react';

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

interface WeeklyPlan {
    id: string;
    weekStartDate: string;
    weekEndDate: string;
    planData: any; // Placeholder for now
    createdAt: string;
}

export default function Planning() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<{name: string, key: string} | null>(null);
  const [historyPlans, setHistoryPlans] = useState<WeeklyPlan[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Fetch history when modal opens
  useEffect(() => {
    if (isHistoryModalOpen) {
        setIsLoadingHistory(true);
        fetch('/api/planning/weekly')
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

  const handleSaveAndClear = async () => {
    if (!confirm('Haftalık plan kaydedilip temizlenecek. Onaylıyor musunuz?')) return;

    // Calculate start and end of current week (assuming currentWeek is within the week)
    const curr = new Date(currentWeek);
    const first = curr.getDate() - curr.getDay() + 1; // First day is the day of the month - the day of the week
    const last = first + 6; // last day is the first day + 6

    const firstDay = new Date(curr.setDate(first));
    const lastDay = new Date(curr.setDate(last));

    try {
        const response = await fetch('/api/planning/weekly', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                weekStartDate: firstDay.toISOString(),
                weekEndDate: lastDay.toISOString(),
                planData: {} // Empty for now as requested, just simulating the save
            })
        });

        if (response.ok) {
            alert('Haftalık plan başarıyla kaydedildi.');
            // Here we would clear the local state of the plan items if we had any
        } else {
            alert('Plan kaydedilirken bir hata oluştu.');
        }
    } catch (error) {
        console.error('Error saving plan:', error);
        alert('Plan kaydedilirken bir hata oluştu.');
    }
  };

  const handleDayClick = (dayName: string, rowKey: string) => {
    setSelectedDay({ name: dayName, key: rowKey });
    setIsDailyModalOpen(true);
  };

  const formatDateRange = (startStr: string, endStr: string) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    
    // Custom formatting to match "2 - 8 Şubat 2026"
    const startDay = start.getDate();
    const endPart = end.toLocaleDateString('tr-TR', options);
    
    return `${startDay} - ${endPart}`;
  };

  return (
    <div className="space-y-6 h-full flex flex-col relative">
        <div className="flex justify-between items-center flex-shrink-0">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Planlama</h1>
                <p className="text-slate-500">Haftalık üretim planlama</p>
            </div>
            
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => setIsHistoryModalOpen(true)}
                    className="flex items-center gap-2 bg-white text-slate-600 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm font-medium"
                >
                    <History size={20} />
                    Geçmiş Haftalık Planlar
                </button>
                <button 
                    onClick={handleSaveAndClear}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
                >
                    <Save size={20} />
                    Haftalık Planı Kaydet ve Temizle
                </button>
            </div>
        </div>

        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1">
                <table className="w-full border-collapse min-w-[1500px]">
                    <thead className="sticky top-0 z-20 shadow-sm">
                        <tr>
                            <th className="p-3 border-b border-r border-slate-200 bg-slate-50 text-left text-sm font-bold text-slate-700 sticky left-0 z-30 w-32 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                Gün
                            </th>
                            {MACHINES.map((machine) => (
                                <th key={machine} className="p-3 border-b border-r border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-700 min-w-[140px]">
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
                                {MACHINES.map((machine) => (
                                    <td key={`${row.key}-${machine}`} className="p-2 border-b border-r border-slate-200 align-top min-h-[120px] bg-white group-hover:bg-slate-50/50">
                                        <div className="flex flex-col gap-2 min-h-[80px]">
                                            {/* Items will go here */}
                                            
                                            <button className="flex items-center justify-center gap-1 w-full py-2 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all text-xs font-medium opacity-0 group-hover:opacity-100 focus:opacity-100">
                                                <Plus size={14} />
                                                Ekle
                                            </button>
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* History Modal */}
        {isHistoryModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                    <div className="flex justify-between items-center p-4 border-b border-slate-200">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <History size={20} className="text-slate-500" />
                            Geçmiş Haftalık Planlar
                        </h2>
                        <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={24} />
                        </button>
                    </div>
                    <div className="p-4 overflow-y-auto flex-1">
                        {isLoadingHistory ? (
                            <div className="text-center py-8 text-slate-500">Yükleniyor...</div>
                        ) : historyPlans.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                Henüz kaydedilmiş geçmiş plan bulunmuyor.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {historyPlans.map((plan) => (
                                    <div key={plan.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 transition-colors shadow-sm group">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                                                <Calendar size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-slate-800">
                                                    {formatDateRange(plan.weekStartDate, plan.weekEndDate)}
                                                </h3>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    Oluşturulma: {new Date(plan.createdAt).toLocaleDateString('tr-TR')}
                                                </p>
                                            </div>
                                        </div>
                                        <button className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors">
                                            Görüntüle
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Daily Plan Modal (Placeholder) */}
        {isDailyModalOpen && selectedDay && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                    <div className="flex justify-between items-center p-4 border-b border-slate-200">
                        <h2 className="text-lg font-bold text-slate-800">
                            Günlük Plan Detayı: <span className="text-indigo-600">{selectedDay.name}</span>
                        </h2>
                        <button onClick={() => setIsDailyModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={24} />
                        </button>
                    </div>
                    <div className="p-8 text-center text-slate-500">
                        <p className="text-lg">Günlük planlama modülü yapım aşamasında...</p>
                        <p className="text-sm mt-2">Bu alan seçilen gün için detaylı planlama yapmak üzere kullanılacak.</p>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}
