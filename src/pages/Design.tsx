import { useState } from 'react';
import { useOrders } from '../hooks/useOrders';
import { useProducts } from '../hooks/useProducts';
import { Eye, Plus, X, Upload, PencilLine, Info, CheckCircle2 } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ProductDetail } from '../components/products/ProductDetail';
import type { Order, Product } from '../types';
import { ProductForm } from '../components/products/ProductForm';

export default function Design() {
    const { orders, updateStatus, updateOrder } = useOrders();
    const { products, updateProduct } = useProducts();
    
    // Filter orders waiting for design
    const designOrders = orders.filter(o => 
        o.status === 'supply_design_process' || o.status === 'design_waiting' || o.status === 'offer_accepted'
    );

    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);

    const [uploadOrder, setUploadOrder] = useState<Order | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    // Product Info Entry (Edit) modal
    const [infoOrder, setInfoOrder] = useState<Order | null>(null);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [infoSelectedItemId, setInfoSelectedItemId] = useState<string | null>(null);
    const currentInfoProduct = (() => {
        if (!infoOrder || !infoSelectedItemId) return null;
        const item = infoOrder.items.find(i => i.productId === infoSelectedItemId);
        if (!item) return null;
        return products.find(p => p.id === item.productId) || null;
    })();

    // Job Info Entry modal
    const [jobOrder, setJobOrder] = useState<Order | null>(null);
    const [isJobModalOpen, setIsJobModalOpen] = useState(false);
    const [jobSize, setJobSize] = useState('');
    const [boxSize, setBoxSize] = useState('');
    const [efficiency, setEfficiency] = useState('');

    const handleCompleteDesign = async (orderId: string) => {
        if (confirm('Tasarım işlemleri tamamlandı olarak işaretlensin mi?')) {
            await updateOrder(orderId, { designStatus: 'completed' } as any);
        }
    };

    const handleViewOrder = (order: Order) => {
        setSelectedOrder(order);
        setIsOrderModalOpen(true);
    };

    const handleViewProduct = (productId: string) => {
        const product = products.find(p => p.id === productId);
        if (product) {
            setSelectedProduct(product);
            setIsProductModalOpen(true);
        }
    };

    const handleOpenUpload = (order: Order) => {
        setUploadOrder(order);
        setUploadedImages(order.designImages || []);
        setIsUploadModalOpen(true);
    };

    const handleOpenInfo = (order: Order) => {
        setInfoOrder(order);
        const firstItem = order.items[0];
        setInfoSelectedItemId(firstItem?.productId || null);
        setIsInfoModalOpen(true);
    };

    const handleSaveProductInfo = async (data: any) => {
        if (!infoOrder || !currentInfoProduct) return;
        await updateProduct(currentInfoProduct.id, data);
        // Reflect name change to order items (for display)
        const updatedItems = infoOrder.items.map(i => 
            i.productId === currentInfoProduct.id ? { ...i, productName: data.name || i.productName } : i
        );
        await updateOrder(infoOrder.id, { items: updatedItems } as any);
        setIsInfoModalOpen(false);
        setInfoOrder(null);
        setInfoSelectedItemId(null);
    };

    const handleOpenJob = (order: Order) => {
        setJobOrder(order);
        setJobSize(order.jobSize || '');
        setBoxSize(order.boxSize || '');
        setEfficiency(order.efficiency || '');
        setIsJobModalOpen(true);
    };

    const handleSaveJob = async () => {
        if (!jobOrder) return;
        await updateOrder(jobOrder.id, { jobSize, boxSize, efficiency } as any);
        setIsJobModalOpen(false);
        setJobOrder(null);
        setJobSize('');
        setBoxSize('');
        setEfficiency('');
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !uploadOrder) return;
        
        const files = Array.from(e.target.files);
        if (uploadedImages.length + files.length > 5) {
            alert('En fazla 5 adet tasarım görseli yükleyebilirsiniz.');
            return;
        }

        setIsUploading(true);
        const newUploadedUrls: string[] = [];

        for (const file of files) {
            const formData = new FormData();
            formData.append('image', file);

            try {
                // Upload to 'tasarim' folder
                const response = await fetch('/api/upload?folder=tasarim', {
                    method: 'POST',
                    body: formData,
                });

                if (response.ok) {
                    const data = await response.json();
                    newUploadedUrls.push(data.url);
                } else {
                    console.error('Upload failed');
                    alert(`"${file.name}" yüklenirken hata oluştu.`);
                }
            } catch (error) {
                console.error('Error uploading image:', error);
                alert('Resim yüklenirken bir hata oluştu.');
            }
        }

        if (newUploadedUrls.length > 0) {
            setUploadedImages(prev => [...prev, ...newUploadedUrls]);
        }
        setIsUploading(false);
        // Clear input
        e.target.value = '';
    };

    const handleRemoveImage = (indexToRemove: number) => {
        setUploadedImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    const handleSaveDesign = async () => {
        if (!uploadOrder) return;
        
        if (uploadedImages.length === 0) {
            alert('Lütfen en az bir tasarım görseli yükleyin.');
            return;
        }

        // Update order with images and set designStatus to completed
        await updateOrder(uploadOrder.id, {
            designImages: uploadedImages,
            designStatus: 'completed'
        } as any);

        setIsUploadModalOpen(false);
        setUploadOrder(null);
        setUploadedImages([]);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Tasarım</h1>
                    <p className="text-slate-500">Tasarım bekleyen siparişler ve onay işlemleri</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Mobile View (Cards) */}
                <div className="md:hidden">
                    {designOrders.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            Tasarım bekleyen sipariş bulunmuyor.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-200">
                            {designOrders.map((order) => (
                                <div key={order.id} className="p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-mono text-xs text-slate-500">#{order.id.slice(0, 8)}</div>
                                            <div className="font-medium text-slate-800">{order.customerName}</div>
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {format(new Date(order.createdAt), 'dd MMM yyyy', { locale: tr })}
                                        </div>
                                    </div>

                                    <div className="text-sm text-slate-600">
                                        <span className="text-xs text-slate-400 block mb-1">Ürünler:</span>
                                        {order.items.map(i => i.productName).join(', ')}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                                        <button
                                            onClick={() => handleViewOrder(order)}
                                            className="flex items-center justify-center gap-2 px-3 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors text-xs font-medium"
                                            aria-label="Sipariş Detaylarını Görüntüle"
                                        >
                                            <Eye size={16} />
                                            Görüntüle
                                        </button>
                                        <button
                                            onClick={() => handleOpenInfo(order)}
                                            className="flex items-center justify-center gap-2 px-3 py-2 text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors text-xs font-medium"
                                            aria-label="Bilgi Girişi Yap"
                                        >
                                            <PencilLine size={16} />
                                            Bilgi Girişi
                                        </button>
                                        <button
                                            onClick={() => handleOpenUpload(order)}
                                            className="flex items-center justify-center gap-2 px-3 py-2 text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-xs font-medium"
                                            aria-label="Tasarım Yükle"
                                        >
                                            <Upload size={16} />
                                            Tasarım Ekle
                                        </button>
                                        <button
                                            onClick={() => handleOpenJob(order)}
                                            className="flex items-center justify-center gap-2 px-3 py-2 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors text-xs font-medium"
                                            aria-label="İş Bilgisi Gir"
                                        >
                                            <Info size={16} />
                                            İş Bilgi
                                        </button>
                                        <button
                                            onClick={() => handleCompleteDesign(order.id)}
                                            className="col-span-2 flex items-center justify-center gap-2 px-3 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-xs font-medium"
                                            aria-label="Tasarımı Tamamla"
                                        >
                                            <CheckCircle2 size={16} />
                                            İşlem Tamamlandı
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Sipariş No</th>
                                <th className="px-6 py-4">Müşteri</th>
                                <th className="px-6 py-4">Ürünler</th>
                                <th className="px-6 py-4">Tarih</th>
                                <th className="px-6 py-4 text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {designOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        Tasarım bekleyen sipariş bulunmuyor.
                                    </td>
                                </tr>
                            ) : (
                                designOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs">#{order.id.slice(0, 8)}</td>
                                        <td className="px-6 py-4 font-medium text-slate-800">{order.customerName}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {order.items.map(i => i.productName).join(', ')}
                                        </td>
                                        <td className="px-6 py-4">
                                            {format(new Date(order.createdAt), 'dd MMM yyyy', { locale: tr })}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleViewOrder(order)}
                                                    className="flex items-center gap-2 px-3 py-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors text-xs font-medium"
                                                >
                                                    <Eye size={16} />
                                                    Görüntüle
                                                </button>
                                            <button
                                                onClick={() => handleOpenInfo(order)}
                                                className="flex items-center gap-2 px-3 py-1.5 text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors text-xs font-medium"
                                            >
                                                <PencilLine size={16} />
                                                Bilgi Girişi
                                            </button>
                                                <button
                                                    onClick={() => handleOpenUpload(order)}
                                                    className="flex items-center gap-2 px-3 py-1.5 text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-xs font-medium"
                                                >
                                                    <Upload size={16} />
                                                    Tasarım Ekle
                                                </button>
                                            <button
                                                onClick={() => handleOpenJob(order)}
                                                className="flex items-center gap-2 px-3 py-1.5 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors text-xs font-medium"
                                            >
                                                <Info size={16} />
                                                İş Bilgi Girişi
                                            </button>
                                            <button
                                                onClick={() => handleCompleteDesign(order.id)}
                                                className="flex items-center gap-2 px-3 py-1.5 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-xs font-medium"
                                            >
                                                <CheckCircle2 size={16} />
                                                İşlem Tamamlandı
                                            </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Order Detail Modal */}
            <Modal
                isOpen={isOrderModalOpen}
                onClose={() => setIsOrderModalOpen(false)}
                title={`Sipariş Detayı #${selectedOrder?.id.slice(0, 8)}`}
            >
                {selectedOrder && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-slate-500">Müşteri:</span>
                                <p className="font-medium text-slate-800">{selectedOrder.customerName}</p>
                            </div>
                            <div>
                                <span className="text-slate-500">Tarih:</span>
                                <p className="font-medium text-slate-800">
                                    {format(new Date(selectedOrder.createdAt), 'dd MMM yyyy HH:mm', { locale: tr })}
                                </p>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-medium text-slate-800 mb-3">Sipariş Kalemleri</h4>
                            <div className="space-y-3">
                                {selectedOrder.items.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                                        <div>
                                            <p className="font-medium text-slate-800">{item.productName}</p>
                                            <p className="text-xs text-slate-500">
                                                {item.quantity} Adet
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleViewProduct(item.productId)}
                                            className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors border border-blue-200"
                                        >
                                            Ürünü Görüntüle
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-slate-100">
                            <button
                                onClick={() => setIsOrderModalOpen(false)}
                                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Product Detail Modal (Nested) */}
            <Modal
                isOpen={isProductModalOpen}
                onClose={() => setIsProductModalOpen(false)}
                title="Ürün Detayları"
            >
                {selectedProduct && (
                    <ProductDetail
                        product={selectedProduct}
                        onClose={() => setIsProductModalOpen(false)}
                    />
                )}
            </Modal>

            {/* Product Info Entry Modal */}
            <Modal
                isOpen={isInfoModalOpen}
                onClose={() => setIsInfoModalOpen(false)}
                title="Ürün Bilgi Girişi / Düzenleme"
            >
                {infoOrder && (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs text-slate-500">Sipariş Ürünü Seç</label>
                            <select
                                value={infoSelectedItemId || ''}
                                onChange={e => setInfoSelectedItemId(e.target.value)}
                                className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                title="Sipariş Ürünü Seç"
                                aria-label="Sipariş Ürünü Seç"
                            >
                                {infoOrder.items.map(item => (
                                    <option key={item.productId} value={item.productId}>
                                        {item.productName}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        {currentInfoProduct && (
                            <ProductForm
                                initialData={currentInfoProduct}
                                onSubmit={handleSaveProductInfo}
                                onCancel={() => setIsInfoModalOpen(false)}
                            />
                        )}
                    </div>
                )}
            </Modal>

            {/* Upload Design Modal */}
            <Modal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                title="Tasarım Görselleri Ekle"
            >
                <div className="space-y-6">
                    <p className="text-sm text-slate-600">
                        Bu sipariş için onaylanan tasarım görsellerini yükleyin. 
                        İşlem tamamlandığında sipariş durumu "Tasarım Onaylandı" olarak güncellenecektir.
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {uploadedImages.map((img, idx) => (
                            <div key={idx} className="relative aspect-square group rounded-lg overflow-hidden border border-slate-200">
                                <img src={img} alt={`Design ${idx + 1}`} className="w-full h-full object-cover" />
                                <button
                                    onClick={() => handleRemoveImage(idx)}
                                    className="absolute top-1 right-1 p-1 bg-white/80 hover:bg-red-500 hover:text-white rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                    title="Resmi Kaldır"
                                    aria-label="Resmi Kaldır"
                                    type="button"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                        
                        {uploadedImages.length < 5 && (
                            <label className={`
                                flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed border-slate-300 
                                hover:border-indigo-500 hover:bg-indigo-50 transition-colors cursor-pointer
                                ${isUploading ? 'opacity-50 pointer-events-none' : ''}
                            `}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={handleImageUpload}
                                    disabled={isUploading}
                                    aria-label="Görsel Yükle"
                                />
                                {isUploading ? (
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                                ) : (
                                    <>
                                        <Plus className="text-slate-400 mb-2" size={24} />
                                        <span className="text-xs text-slate-500 font-medium text-center px-2">
                                            Görsel Ekle<br />(Max 5)
                                        </span>
                                    </>
                                )}
                            </label>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            onClick={() => setIsUploadModalOpen(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            aria-label="İptal"
                        >
                            İptal
                        </button>
                        <button
                            onClick={handleSaveDesign}
                            disabled={uploadedImages.length === 0 || isUploading}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Kaydet ve Onayla"
                        >
                            Kaydet ve Onayla
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Job Info Entry Modal */}
            <Modal
                isOpen={isJobModalOpen}
                onClose={() => setIsJobModalOpen(false)}
                title="İş Bilgi Girişi"
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">İşin ebadı</label>
                        <input
                            type="text"
                            value={jobSize}
                            onChange={e => setJobSize(e.target.value)}
                            placeholder="Örn: 500x700 mm"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                            aria-label="İşin ebadı"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Kutu boyutu</label>
                        <input
                            type="text"
                            value={boxSize}
                            onChange={e => setBoxSize(e.target.value)}
                            placeholder="Örn: 90x90x25 mm"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                            aria-label="Kutu boyutu"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Verim</label>
                        <input
                            type="text"
                            value={efficiency}
                            onChange={e => setEfficiency(e.target.value)}
                            placeholder="Örn: 6 adet/baskı"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                            aria-label="Verim"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            onClick={() => setIsJobModalOpen(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            aria-label="İptal"
                        >
                            İptal
                        </button>
                        <button
                            onClick={handleSaveJob}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            aria-label="Kaydet"
                        >
                            Kaydet
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
