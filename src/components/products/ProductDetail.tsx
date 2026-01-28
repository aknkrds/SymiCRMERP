import type { Product } from '../../types';
import { X } from 'lucide-react';

interface ProductDetailProps {
    product: Product;
    onClose: () => void;
}

export function ProductDetail({ product, onClose }: ProductDetailProps) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="space-y-4">
                    <div>
                        <h4 className="text-sm font-medium text-slate-500">Ürün Kodu</h4>
                        <p className="text-lg font-semibold text-slate-800">{product.code}</p>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-slate-500">Açıklama</h4>
                        <p className="text-slate-800">{product.description}</p>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-slate-500">Boyutlar (mm)</h4>
                        <p className="text-slate-800">
                            {product.dimensions.length} x {product.dimensions.width} x {product.dimensions.depth}
                        </p>
                    </div>
                </div>

                {/* Features & Details */}
                <div className="space-y-4">
                    <div>
                        <h4 className="text-sm font-medium text-slate-500">Özellikler</h4>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {product.features.hasLid && (
                                <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full">Kapaklı</span>
                            )}
                            {product.features.hasWindow && (
                                <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">Pencereli</span>
                            )}
                            {product.features.gofre && (
                                <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-full">Gofre</span>
                            )}
                            {product.features.foodGrade && (
                                <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">Gıda İşlemi</span>
                            )}
                            {product.features.extras && (
                                <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-full">{product.features.extras}</span>
                            )}
                        </div>
                    </div>

                    {product.features.colors && product.features.colors.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-slate-500">Renkler</h4>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {product.features.colors.map((color, idx) => (
                                    <span key={idx} className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full border border-indigo-100">
                                        {color}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {product.details && (
                        <div>
                            <h4 className="text-sm font-medium text-slate-500">Ürün Detayları</h4>
                            <p className="text-slate-700 whitespace-pre-wrap">{product.details}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Specific Details (Window/Lid/Gofre) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                {product.features.hasWindow && product.windowDetails && (
                    <div className="bg-slate-50 p-4 rounded-lg">
                        <h5 className="font-medium text-slate-800 mb-2">Pencere Detayları</h5>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            <dt className="text-slate-500">Boyut:</dt>
                            <dd>{product.windowDetails.width} x {product.windowDetails.height} mm</dd>
                            <dt className="text-slate-500">Pencere Adet:</dt>
                            <dd>{product.windowDetails.count}</dd>
                        </dl>
                    </div>
                )}
                
                {product.features.gofre && product.features.gofreDetails && (
                    <div className="bg-slate-50 p-4 rounded-lg">
                        <h5 className="font-medium text-slate-800 mb-2">Gofre Detayları</h5>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            <dt className="text-slate-500">Adet:</dt>
                            <dd>{product.features.gofreDetails.count || '-'}</dd>
                            <dt className="text-slate-500">Konum/Not:</dt>
                            <dd>{product.features.gofreDetails.notes || '-'}</dd>
                        </dl>
                    </div>
                )}
                
                {product.features.hasLid && product.lidDetails && (
                    <div className="bg-slate-50 p-4 rounded-lg md:col-span-2">
                        <h5 className="font-medium text-slate-800 mb-2 flex items-center gap-2">
                            Kapak Detayları
                            {product.lidDetails.hasGofre && <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">Gofre Var</span>}
                            {product.lidDetails.hasWindow && <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Pencere Var</span>}
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                <dt className="text-slate-500">Materyal:</dt>
                                <dd>{product.lidDetails.material || '-'}</dd>
                                <dt className="text-slate-500">Boya/Renk:</dt>
                                <dd>{product.lidDetails.paint || product.lidDetails.color || '-'}</dd>
                            </dl>

                            {product.lidDetails.dimensions && (
                                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <dt className="text-slate-500">Boy:</dt>
                                    <dd>{product.lidDetails.dimensions.length} mm</dd>
                                    <dt className="text-slate-500">En:</dt>
                                    <dd>{product.lidDetails.dimensions.width} mm</dd>
                                    <dt className="text-slate-500">Derinlik:</dt>
                                    <dd>{product.lidDetails.dimensions.depth} mm</dd>
                                </dl>
                            )}

                            <div className="space-y-2">
                                {product.lidDetails.hasGofre && product.lidDetails.gofreDetails && (
                                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm border-b pb-2">
                                        <dt className="text-slate-500">Gofre Adet:</dt>
                                        <dd>{product.lidDetails.gofreDetails.count || '-'}</dd>
                                        <dt className="text-slate-500">Konum:</dt>
                                        <dd>{product.lidDetails.gofreDetails.notes || '-'}</dd>
                                    </dl>
                                )}
                                {product.lidDetails.hasWindow && product.lidDetails.windowDimensions && (
                                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm border-b pb-2">
                                        <dt className="text-slate-500">Pencere En:</dt>
                                        <dd>{product.lidDetails.windowDimensions.width} mm</dd>
                                        <dt className="text-slate-500">Pencere Boy:</dt>
                                        <dd>{product.lidDetails.windowDimensions.height} mm</dd>
                                    </dl>
                                )}
                                {product.lidDetails.notes && (
                                    <div className="text-sm pt-1">
                                        <span className="text-slate-500 block">Notlar:</span>
                                        <p className="text-slate-700">{product.lidDetails.notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Images */}
            {product.images && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h4 className="font-medium text-slate-800">Görseller</h4>
                    
                    {product.images.customer && product.images.customer.length > 0 && (
                        <div className="space-y-2">
                            <h5 className="text-sm text-slate-500">Müşteri Görselleri</h5>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {product.images.customer.map((img, idx) => (
                                    <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-slate-200">
                                        <img src={img} alt={`Customer ${idx + 1}`} className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {product.images.design && product.images.design.length > 0 && (
                        <div className="space-y-2">
                            <h5 className="text-sm text-slate-500">Tasarım Görselleri</h5>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {product.images.design.map((img, idx) => (
                                    <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-slate-200">
                                        <img src={img} alt={`Design ${idx + 1}`} className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                    Kapat
                </button>
            </div>
        </div>
    );
}
