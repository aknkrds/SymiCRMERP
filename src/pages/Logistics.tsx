import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrders } from '../hooks/useOrders';
import { Truck, CheckCircle2, X, Upload, Menu } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { Order } from '../types';
import { ERPPageLayout, ToolbarBtn } from '../components/ui/ERPPageLayout';

export default function Logistics() {
    const navigate = useNavigate();
    const { orders, updateOrder } = useOrders();
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [formData, setFormData] = useState({
        packagingType: 'Koli', packagingCount: '', packageNumber: '',
        vehiclePlate: '', trailerPlate: '', additionalDocUrl: ''
    });

    const logisticsOrders = orders.filter(o => o.status === 'invoice_added' || o.status === 'shipping_waiting');

    const handleOpenModal = (order: Order) => {
        setSelectedOrder(order);
        setFormData({ packagingType: 'Koli', packagingCount: '', packageNumber: '', vehiclePlate: '', trailerPlate: '', additionalDocUrl: '' });
        setShowModal(true);
    };
    const handleCloseModal = () => { setShowModal(false); setSelectedOrder(null); };
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        setUploading(true);
        try {
            const file = e.target.files[0];
            const fd = new FormData();
            fd.append('image', file);
            const response = await fetch('/api/upload?folder=doc', { method: 'POST', body: fd });
            if (!response.ok) throw new Error('Upload failed');
            const data = await response.json();
            setFormData(prev => ({ ...prev, additionalDocUrl: data.url }));
        } catch (error) {
            alert('Dosya yüklenirken hata oluştu'); console.error(error);
        } finally { setUploading(false); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOrder) return;
        if (confirm('Sipariş sevkiyatı tamamlanarak onay aşamasına gönderilecek. Onaylıyor musunuz?')) {
            try {
                await updateOrder(selectedOrder.id, {
                    packagingType: formData.packagingType, packagingCount: Number(formData.packagingCount),
                    packageNumber: formData.packageNumber, vehiclePlate: formData.vehiclePlate,
                    trailerPlate: formData.trailerPlate, additionalDocUrl: formData.additionalDocUrl,
                    status: 'shipping_completed'
                });
                handleCloseModal(); navigate('/approvals');
            } catch (error) { console.error(error); alert('İşlem sırasında bir hata oluştu.'); }
        }
    };

    return (
        <>
            <ERPPageLayout
                breadcrumbs={[{ label: 'Lojistik' }, { label: 'Sevkiyat', active: true }]}
                toolbar={<><ToolbarBtn icon={<Menu size={13} />} /></>}
            >
                <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                            <th className="w-8 px-2 py-2 text-center border-r border-slate-200 text-[11px]">#</th>
                            <th className="px-3 py-2 border-r border-slate-200 text-[11px] uppercase tracking-wide">Sipariş No</th>
                            <th className="px-3 py-2 border-r border-slate-200 text-[11px] uppercase tracking-wide">Müşteri</th>
                            <th className="px-3 py-2 border-r border-slate-200 text-[11px] uppercase tracking-wide">Tarih</th>
                            <th className="px-3 py-2 border-r border-slate-200 text-[11px] uppercase tracking-wide">Durum</th>
                            <th className="px-3 py-2 text-[11px] uppercase tracking-wide">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logisticsOrders.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Sevkiyat bekleyen sipariş bulunmuyor.</td></tr>
                        ) : logisticsOrders.map((order, idx) => (
                            <tr key={order.id} className="border-b border-slate-100 hover:bg-blue-50/40 transition-colors">
                                <td className="px-2 py-2 text-center text-slate-400 border-r border-slate-100 font-mono">{idx + 1}</td>
                                <td className="px-3 py-2 border-r border-slate-100 font-mono text-blue-600 font-medium">#{order.id.slice(0, 10).toUpperCase()}</td>
                                <td className="px-3 py-2 border-r border-slate-100 font-medium text-slate-800">{order.customerName}</td>
                                <td className="px-3 py-2 border-r border-slate-100 text-slate-600">{format(new Date(order.createdAt), 'dd MMM yyyy', { locale: tr })}</td>
                                <td className="px-3 py-2 border-r border-slate-100">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">Fatura / İrsaliye Eklendi</span>
                                </td>
                                <td className="px-3 py-2">
                                    <button onClick={() => handleOpenModal(order)}
                                        className="flex items-center gap-1.5 px-2.5 py-1 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 text-[11px] font-medium transition-colors">
                                        <Truck size={12} /> Sevkiyat Girişi
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </ERPPageLayout>

            {showModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">Sevkiyat Bilgileri</h3>
                                <p className="text-xs text-slate-500">#{selectedOrder.id.slice(0, 8)} nolu sipariş</p>
                            </div>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Paketleme Türü</label>
                                <select name="packagingType" value={formData.packagingType} onChange={handleInputChange}
                                    className="w-full rounded border border-slate-200 text-sm p-2 focus:ring-1 focus:ring-indigo-500 outline-none" required>
                                    {['Koli', 'Palet', 'Konteyner', 'Sandık', 'Çuval'].map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Paketleme Adet</label>
                                    <input type="number" name="packagingCount" value={formData.packagingCount} onChange={handleInputChange}
                                        className="w-full rounded border border-slate-200 text-sm p-2 focus:ring-1 focus:ring-indigo-500 outline-none" required min="1" placeholder="Adet" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Paket Numarası</label>
                                    <input type="text" name="packageNumber" value={formData.packageNumber} onChange={handleInputChange}
                                        className="w-full rounded border border-slate-200 text-sm p-2 focus:ring-1 focus:ring-indigo-500 outline-none" required placeholder="PKT-001" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Araç Plakası</label>
                                    <input type="text" name="vehiclePlate" value={formData.vehiclePlate} onChange={handleInputChange}
                                        className="w-full rounded border border-slate-200 text-sm p-2 focus:ring-1 focus:ring-indigo-500 outline-none" required placeholder="34 ABC 123" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Dorse Plakası</label>
                                    <input type="text" name="trailerPlate" value={formData.trailerPlate} onChange={handleInputChange}
                                        className="w-full rounded border border-slate-200 text-sm p-2 focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="Opsiyonel" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Ek Evrak (Opsiyonel)</label>
                                <label className="cursor-pointer block">
                                    <div className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-dashed border-slate-300 rounded text-slate-600 hover:bg-slate-50 hover:border-indigo-300 transition-all">
                                        <Upload size={15} className="text-slate-400" />
                                        <span className="text-xs">{uploading ? 'Yükleniyor...' : 'Dosya Seç'}</span>
                                    </div>
                                    <input type="file" onChange={handleFileUpload} className="hidden" />
                                </label>
                                {formData.additionalDocUrl && (
                                    <div className="mt-2 text-emerald-700 text-xs flex items-center gap-1 bg-emerald-50 p-2 rounded border border-emerald-100">
                                        <CheckCircle2 size={13} /> Evrak yüklendi
                                        <a href={formData.additionalDocUrl} target="_blank" rel="noopener noreferrer" className="ml-auto underline">Görüntüle</a>
                                    </div>
                                )}
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded text-sm font-medium transition-colors">İptal</button>
                                <button type="submit" className="flex-1 px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded text-sm font-medium transition-colors flex justify-center items-center gap-2">
                                    <CheckCircle2 size={15} /> Sevkiyatı Tamamla
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
