import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Package, Eye } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import type { Product, ProductFormData } from '../types';
import { Modal } from '../components/ui/Modal';
import { ProductForm } from '../components/products/ProductForm';
import { ProductDetail } from '../components/products/ProductDetail';

export default function Products() {
    const { products, addProduct, updateProduct, deleteProduct } = useProducts();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
    const [viewingProduct, setViewingProduct] = useState<Product | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredProducts = products.filter(p =>
        (p.code?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (p.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    const handleAdd = () => {
        setEditingProduct(undefined);
        setIsModalOpen(true);
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleView = (product: Product) => {
        setViewingProduct(product);
        setIsViewModalOpen(true);
    };

    const handleSubmit = (data: ProductFormData) => {
        if (editingProduct) {
            updateProduct(editingProduct.id, data);
        } else {
            addProduct(data);
        }
        setIsModalOpen(false);
    };

    const handleDelete = (id: string) => {
        if (confirm('Bu ürünü silmek istediğinize emin misiniz?')) {
            deleteProduct(id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Ürünler & Reçeteler</h1>
                    <p className="text-slate-500">Ürün yönetimi ve reçete detayları</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    <Plus size={20} />
                    Yeni Ürün
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Ürün ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 bg-white text-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Mobile View (Cards) */}
                <div className="md:hidden">
                    {filteredProducts.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            Kayıtlı ürün bulunamadı.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-200">
                            {filteredProducts.map((product) => (
                                <div key={product.id} className="p-4 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                                            <Package size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <div className="font-semibold text-slate-800 truncate">{product.code}</div>
                                                <div className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                                    {product.dimensions.length}x{product.dimensions.width}x{product.dimensions.depth}
                                                </div>
                                            </div>
                                            <div className="text-sm text-slate-600 mt-1 line-clamp-2">{product.description}</div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {product.features.hasLid && (
                                            <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full">Kapaklı</span>
                                        )}
                                        {product.features.hasWindow && (
                                            <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">Pencereli</span>
                                        )}
                                        {product.features.extras && (
                                            <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-full" title={product.features.extras}>+Ekstra</span>
                                        )}
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                        <button
                                            onClick={() => handleView(product)}
                                            className="p-2 text-blue-600 bg-blue-50 rounded-lg"
                                            title="Görüntüle"
                                        >
                                            <Eye size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleEdit(product)}
                                            className="p-2 text-indigo-600 bg-indigo-50 rounded-lg"
                                            title="Düzenle"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(product.id)}
                                            className="p-2 text-red-600 bg-red-50 rounded-lg"
                                            title="Sil"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Desktop View (Table) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Kod & Açıklama</th>
                                <th className="px-6 py-4">Boyutlar (mm)</th>
                                <th className="px-6 py-4">Özellikler</th>
                                <th className="px-6 py-4 text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                        Kayıtlı ürün bulunamadı.
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                                    <Package size={20} />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-800">{product.code}</div>
                                                    <div className="text-xs text-slate-500">{product.description}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-slate-700">
                                                {product.dimensions.length} x {product.dimensions.width} x {product.dimensions.depth}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap gap-2">
                                                    {product.features.hasLid && (
                                                    <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full">Kapaklı</span>
                                                    )}
                                                    {product.features.hasWindow && (
                                                    <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">Pencereli</span>
                                                    )}
                                                    {product.features.extras && (
                                                    <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-full" title={product.features.extras}>+Ekstra</span>
                                                    )}
                                                </div>
                                                {product.details && (
                                                    <div className="text-xs text-slate-600 line-clamp-2">
                                                        {product.details}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleView(product)}
                                                    className="p-2 text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                                                    title="Görüntüle"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(product)}
                                                    className="p-2 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
                                                    title="Düzenle"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    className="p-2 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                                                    title="Sil"
                                                >
                                                    <Trash2 size={18} />
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

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingProduct ? "Ürün Düzenle" : "Yeni Ürün Ekle"}
            >
                <ProductForm
                    initialData={editingProduct}
                    onSubmit={handleSubmit}
                    onCancel={() => setIsModalOpen(false)}
                />
            </Modal>

            <Modal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                title="Ürün Detayları"
            >
                {viewingProduct && (
                    <ProductDetail
                        product={viewingProduct}
                        onClose={() => setIsViewModalOpen(false)}
                    />
                )}
            </Modal>
        </div>
    );
}
