import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Package, Eye, Filter, Star, Menu } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import type { Product, ProductFormData } from '../types';
import { Modal } from '../components/ui/Modal';
import { ProductForm } from '../components/products/ProductForm';
import { ProductDetail } from '../components/products/ProductDetail';
import { ERPPageLayout, ToolbarBtn } from '../components/ui/ERPPageLayout';

export default function Products() {
    const { products, addProduct, updateProduct, deleteProduct } = useProducts();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
    const [viewingProduct, setViewingProduct] = useState<Product | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredProducts = products.filter(p =>
        (p.code?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (p.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    const handleAdd = useCallback(() => { setEditingProduct(undefined); setIsModalOpen(true); }, []);
    const handleEdit = (product: Product) => { setEditingProduct(product); setIsModalOpen(true); };
    const handleView = (product: Product) => { setViewingProduct(product); setIsViewModalOpen(true); };
    const handleSubmit = (data: ProductFormData) => {
        if (editingProduct) updateProduct(editingProduct.id, data);
        else addProduct(data);
        setIsModalOpen(false);
    };
    const handleDelete = (id: string) => {
        if (confirm('Bu ürünü silmek istediğinize emin misiniz?')) deleteProduct(id);
    };

    useEffect(() => {
        const onCreate = () => handleAdd();
        window.addEventListener('symi:products:create', onCreate);
        try {
            const key = 'symi:shortcut:symi:products:create';
            if (sessionStorage.getItem(key)) {
                sessionStorage.removeItem(key);
                handleAdd();
            }
        } catch {}
        return () => window.removeEventListener('symi:products:create', onCreate);
    }, [handleAdd]);

    return (
        <>
            <ERPPageLayout
                breadcrumbs={[{ label: 'Üretim' }, { label: 'Ürünler & Reçeteler', active: true }]}
                toolbar={
                    <>
                        <ToolbarBtn icon={<Plus size={13} />} label="Yeni" variant="primary" onClick={handleAdd} />
                        <ToolbarBtn icon={<Filter size={13} />} label="Filtrele" />
                        <ToolbarBtn icon={<Star size={13} />} />
                        <ToolbarBtn icon={<Menu size={13} />} />
                    </>
                }
                toolbarRight={
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                        <input type="text" placeholder="Ürün ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 pr-3 py-1 text-xs bg-white border border-slate-200 rounded outline-none focus:ring-1 focus:ring-blue-400 w-48" />
                    </div>
                }
            >
                <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                            <th className="w-8 px-2 py-2 text-center border-r border-slate-200 text-[11px]">#</th>
                            <th className="px-3 py-2 border-r border-slate-200 text-[11px] uppercase tracking-wide">Kod</th>
                            <th className="px-3 py-2 border-r border-slate-200 text-[11px] uppercase tracking-wide">Ürün Adı</th>
                            <th className="px-3 py-2 border-r border-slate-200 text-[11px] uppercase tracking-wide">Tip</th>
                            <th className="px-3 py-2 border-r border-slate-200 text-[11px] uppercase tracking-wide">Boyutlar (mm)</th>
                            <th className="px-3 py-2 border-r border-slate-200 text-[11px] uppercase tracking-wide">Özellikler</th>
                            <th className="px-3 py-2 text-[11px] uppercase tracking-wide">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.length === 0 ? (
                            <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Kayıtlı ürün bulunamadı.</td></tr>
                        ) : filteredProducts.map((product, idx) => (
                            <tr key={product.id} className="border-b border-slate-100 hover:bg-blue-50/40 transition-colors">
                                <td className="px-2 py-2 text-center text-slate-400 border-r border-slate-100 font-mono">{idx + 1}</td>
                                <td className="px-3 py-2 border-r border-slate-100 font-mono text-blue-600 font-medium">{product.code}</td>
                                <td className="px-3 py-2 border-r border-slate-100 font-medium text-slate-800">{product.name}</td>
                                <td className="px-3 py-2 border-r border-slate-100">
                                    {product.productType && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                                            {product.productType === 'percinli' ? 'Perçinli' : product.productType === 'sivama' ? 'Sıvama' : product.productType}
                                        </span>
                                    )}
                                </td>
                                <td className="px-3 py-2 border-r border-slate-100 font-mono text-slate-600">
                                    {product.dimensions?.length && `${product.dimensions.length}×${product.dimensions.width}×${product.dimensions.depth}`}
                                </td>
                                <td className="px-3 py-2 border-r border-slate-100">
                                    <div className="flex flex-wrap gap-1">
                                        {product.features?.lid?.selected && <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] rounded-full border border-emerald-200">Kapaklı</span>}
                                        {product.features?.window?.selected && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded-full border border-blue-200">Pencereli</span>}
                                        {product.features?.gofre?.selected && <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] rounded-full border border-amber-200">Gofre</span>}
                                    </div>
                                </td>
                                <td className="px-3 py-2">
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => handleView(product)} title="Görüntüle" className="p-1 rounded hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition-colors"><Eye size={14} /></button>
                                        <button onClick={() => handleEdit(product)} title="Düzenle" className="p-1 rounded hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={14} /></button>
                                        <button onClick={() => handleDelete(product.id)} title="Sil" className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </ERPPageLayout>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProduct ? "Ürün Düzenle" : "Yeni Ürün Ekle"} size="full">
                <ProductForm initialData={editingProduct} onSubmit={handleSubmit} onCancel={() => setIsModalOpen(false)} />
            </Modal>
            <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Ürün Detayları" size="lg">
                {viewingProduct && <ProductDetail product={viewingProduct} onClose={() => setIsViewModalOpen(false)} />}
            </Modal>
        </>
    );
}
