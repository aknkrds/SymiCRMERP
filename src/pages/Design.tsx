import { useState } from 'react';
import { useOrders } from '../hooks/useOrders';
import { useProducts } from '../hooks/useProducts';
import { Eye, Plus, X, Upload } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ProductDetail } from '../components/products/ProductDetail';
import type { Order, Product } from '../types';

export default function Design() {
    const { orders, updateStatus, updateOrder } = useOrders();
    const { products } = useProducts();
    
    // Filter orders waiting for design
    const designOrders = orders.filter(o => o.status === 'design_pending');

    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);

    const [uploadOrder, setUploadOrder] = useState<Order | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);

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
                const response = await fetch('/upload?folder=tasarim', {
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

        // Update order with images
        await updateOrder(uploadOrder.id, {
            designImages: uploadedImages
        } as any);

        // Update status to design_approved
        await updateStatus(uploadOrder.id, 'design_approved');

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
                <div className="overflow-x-auto">
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
                                                    onClick={() => handleOpenUpload(order)}
                                                    className="flex items-center gap-2 px-3 py-1.5 text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-xs font-medium"
                                                >
                                                    <Upload size={16} />
                                                    Tasarım Ekle
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
                        >
                            İptal
                        </button>
                        <button
                            onClick={handleSaveDesign}
                            disabled={uploadedImages.length === 0 || isUploading}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Kaydet ve Onayla
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
