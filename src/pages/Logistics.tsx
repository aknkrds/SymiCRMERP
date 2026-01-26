import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrders } from '../hooks/useOrders';
import { Truck, CheckCircle2, X, Upload, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { Order } from '../types';

export default function Logistics() {
    const navigate = useNavigate();
    const { orders, updateOrder } = useOrders();
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        packagingType: 'Koli',
        packagingCount: '',
        packageNumber: '',
        vehiclePlate: '',
        trailerPlate: '',
        additionalDocUrl: ''
    });

    // Filter orders that have invoice added (waiting for shipping)
    const logisticsOrders = orders.filter(o => o.status === 'invoice_added');

    const handleOpenModal = (order: Order) => {
        setSelectedOrder(order);
        setFormData({
            packagingType: 'Koli',
            packagingCount: '',
            packageNumber: '',
            vehiclePlate: '',
            trailerPlate: '',
            additionalDocUrl: ''
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedOrder(null);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        
        setUploading(true);
        try {
            const file = e.target.files[0];
            const formData = new FormData();
            formData.append('image', file);
            
            const response = await fetch('/upload?folder=doc', {
                method: 'POST',
                body: formData,
            });
            
            if (!response.ok) throw new Error('Upload failed');
            const data = await response.json();
            
            setFormData(prev => ({ ...prev, additionalDocUrl: data.url }));
        } catch (error) {
            alert('Dosya yüklenirken hata oluştu');
            console.error(error);
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOrder) return;

        if (confirm('Sipariş sevkiyatı tamamlanarak onay aşamasına gönderilecek. Onaylıyor musunuz?')) {
            try {
                await updateOrder(selectedOrder.id, {
                    packagingType: formData.packagingType,
                    packagingCount: Number(formData.packagingCount),
                    packageNumber: formData.packageNumber,
                    vehiclePlate: formData.vehiclePlate,
                    trailerPlate: formData.trailerPlate,
                    additionalDocUrl: formData.additionalDocUrl,
                    status: 'shipping_completed'
                });
                
                handleCloseModal();
                navigate('/approvals');
            } catch (error) {
                console.error(error);
                alert('İşlem sırasında bir hata oluştu.');
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Sevkiyat</h1>
                    <p className="text-slate-500">Faturası kesilmiş ve sevkiyat bekleyen siparişler</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-semibold text-slate-800">Sevkiyat Bekleyen Siparişler</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Sipariş No</th>
                                <th className="px-6 py-4">Müşteri</th>
                                <th className="px-6 py-4">Tarih</th>
                                <th className="px-6 py-4">Durum</th>
                                <th className="px-6 py-4 text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {logisticsOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        Sevkiyat bekleyen sipariş bulunmuyor.
                                    </td>
                                </tr>
                            ) : (
                                logisticsOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs">#{order.id.slice(0, 8)}</td>
                                        <td className="px-6 py-4 font-medium text-slate-800">{order.customerName}</td>
                                        <td className="px-6 py-4">
                                            {format(new Date(order.createdAt), 'dd MMM yyyy', { locale: tr })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                                                Fatura/İrsaliye Eklendi
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleOpenModal(order)}
                                                className="flex items-center gap-2 ml-auto px-3 py-1.5 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors text-xs font-medium"
                                            >
                                                <Truck size={16} />
                                                Sevkiyat Bilgileri Girişi
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Shipment Details Modal */}
            {showModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Sevkiyat Bilgileri</h3>
                                <p className="text-sm text-slate-500">#{selectedOrder.id.slice(0, 8)} nolu sipariş için bilgileri giriniz</p>
                            </div>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Paketleme Türü</label>
                                <select 
                                    name="packagingType"
                                    value={formData.packagingType}
                                    onChange={handleInputChange}
                                    className="w-full rounded-lg border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    required
                                >
                                    <option value="Koli">Koli</option>
                                    <option value="Palet">Palet</option>
                                    <option value="Konteyner">Konteyner</option>
                                    <option value="Sandık">Sandık</option>
                                    <option value="Çuval">Çuval</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Paketleme Adet</label>
                                <input 
                                    type="number" 
                                    name="packagingCount"
                                    value={formData.packagingCount}
                                    onChange={handleInputChange}
                                    className="w-full rounded-lg border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    required
                                    min="1"
                                    placeholder="Adet giriniz"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Paket Numarası (Manuel)</label>
                                <input 
                                    type="text" 
                                    name="packageNumber"
                                    value={formData.packageNumber}
                                    onChange={handleInputChange}
                                    className="w-full rounded-lg border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    required
                                    placeholder="Örn: PKT-2024-001"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Araç Plakası</label>
                                    <input 
                                        type="text" 
                                        name="vehiclePlate"
                                        value={formData.vehiclePlate}
                                        onChange={handleInputChange}
                                        className="w-full rounded-lg border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        required
                                        placeholder="34 ABC 123"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Dorse Plakası (Opsiyonel)</label>
                                    <input 
                                        type="text" 
                                        name="trailerPlate"
                                        value={formData.trailerPlate}
                                        onChange={handleInputChange}
                                        className="w-full rounded-lg border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="34 XYZ 789"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Ek Evrak Ekle (Opsiyonel)</label>
                                <div className="flex items-center gap-2">
                                    <label className="flex-1 cursor-pointer group">
                                        <div className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-dashed border-slate-300 rounded-lg text-slate-600 group-hover:bg-slate-50 group-hover:border-indigo-300 transition-all">
                                            <Upload size={16} className="text-slate-400 group-hover:text-indigo-500" />
                                            <span className="text-sm">{uploading ? 'Yükleniyor...' : 'Dosya Seç'}</span>
                                        </div>
                                        <input 
                                            type="file" 
                                            onChange={handleFileUpload}
                                            className="hidden" 
                                        />
                                    </label>
                                </div>
                                {formData.additionalDocUrl && (
                                    <div className="mt-2 text-emerald-600 text-sm flex items-center gap-1 bg-emerald-50 p-2 rounded border border-emerald-100">
                                        <CheckCircle2 size={16} />
                                        <span>Evrak başarıyla yüklendi</span>
                                        <a href={formData.additionalDocUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs underline">Görüntüle</a>
                                    </div>
                                )}
                            </div>
                            
                            <div className="pt-4 flex gap-3">
                                <button 
                                    type="button" 
                                    onClick={handleCloseModal}
                                    className="flex-1 px-4 py-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                                >
                                    İptal
                                </button>
                                <button 
                                    type="submit" 
                                    className="flex-1 px-4 py-2.5 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors flex justify-center items-center gap-2 shadow-lg shadow-indigo-200"
                                >
                                    <CheckCircle2 size={18} />
                                    Sevkiyatı Tamamla
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
