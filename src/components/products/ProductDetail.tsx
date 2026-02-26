import type { Product } from '../../types';

interface ProductDetailProps {
    product: Product;
    onClose: () => void;
    jobDetails?: {
        jobSize?: string;
        boxSize?: string;
        efficiency?: string;
    };
    designImages?: (string | { url: string; productId?: string })[];
}

export function ProductDetail({ product, onClose, jobDetails, designImages }: ProductDetailProps) {
    const hasCustomerImages = !!product.images?.customer && product.images.customer.length > 0;
    
    const relevantDesignImages = (designImages || []).filter(img => {
        if (typeof img === 'string') return true;
        return !img.productId || img.productId === product.id;
    });

    const hasDesignImages =
        ((product as any).images?.design && (product as any).images.design.length > 0) ||
        relevantDesignImages.length > 0;

    return (
        <div className="space-y-6">
            {/* Job Details moved to bottom */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="space-y-4">
                    <div>
                        <h4 className="text-sm font-medium text-slate-500">Ürün Kodu</h4>
                        <p className="text-lg font-semibold text-slate-800">{product.code}</p>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-slate-500">Ürün Adı</h4>
                        <p className="text-slate-800">{product.name || product.description}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h4 className="text-sm font-medium text-slate-500">Ürün Tipi</h4>
                            <p className="text-slate-800 capitalize">{product.productType || '-'}</p>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-slate-500">Kutu Şekli</h4>
                            <p className="text-slate-800">{product.boxShape || '-'}</p>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-slate-500">Boyutlar (mm)</h4>
                        <p className="text-slate-800">
                            {product.dimensions?.length || 0} x {product.dimensions?.width || 0} x {product.dimensions?.depth || 0}
                        </p>
                    </div>
                </div>

                {/* Features & Inks */}
                <div className="space-y-4">
                    <div>
                        <h4 className="text-sm font-medium text-slate-500">Özellikler</h4>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {product.features?.hasLid && (
                                <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full">Kapaklı</span>
                            )}
                            {product.features?.hasWindow && (
                                <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">Pencereli</span>
                            )}
                            {product.features?.gofre && (
                                <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-full">Gofre</span>
                            )}
                            {product.features?.extras && (
                                <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-full">{product.features.extras}</span>
                            )}
                        </div>
                    </div>

                    {/* Inks Section */}
                    {product.inks && (
                        <div>
                            <h4 className="text-sm font-medium text-slate-500">Mürekkepler & Baskı</h4>
                            <div className="space-y-2 mt-1">
                                <div className="flex flex-wrap gap-2">
                                    {product.inks.cmyk && <span className="px-2 py-1 bg-cyan-50 text-cyan-700 text-xs rounded-full">CMYK</span>}
                                    {product.inks.white && <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-full">Beyaz</span>}
                                    {product.inks.mold && <span className="px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded-full">Kalıp</span>}
                                </div>
                                
                                {product.inks.pantones && product.inks.pantones.length > 0 && (
                                    <div className="text-sm">
                                        <span className="text-slate-500">Pantone: </span>
                                        <span className="text-slate-800">{product.inks.pantones.join(', ')}</span>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                    {product.inks.goldLak?.has && (
                                        <>
                                            <span className="text-slate-500">Gold Lak:</span>
                                            <span className="text-slate-800">{product.inks.goldLak.code || 'Var'}</span>
                                        </>
                                    )}
                                    {product.inks.emaye?.has && (
                                        <>
                                            <span className="text-slate-500">Emaye:</span>
                                            <span className="text-slate-800">{product.inks.emaye.code || 'Var'}</span>
                                        </>
                                    )}
                                    {product.inks.astar?.has && (
                                        <>
                                            <span className="text-slate-500">Astar:</span>
                                            <span className="text-slate-800">{product.inks.astar.code || 'Var'}</span>
                                        </>
                                    )}
                                    {product.inks.silverLak?.has && (
                                        <>
                                            <span className="text-slate-500">Silver Lak:</span>
                                            <span className="text-slate-800">{product.inks.silverLak.code || 'Var'}</span>
                                        </>
                                    )}
                                </div>
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
                {product.features?.hasWindow && product.windowDetails && (
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
                
                {product.features?.gofre && product.features?.gofreDetails && (
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
                
                {product.features?.hasLid && product.lidDetails && (
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

            {/* Job Details (if available) - Moved here */}
            {jobDetails && (jobDetails.jobSize || jobDetails.boxSize || jobDetails.efficiency) && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 pt-4 border-t border-slate-100">
                    <h4 className="font-medium text-blue-800 mb-2 border-b border-blue-200 pb-2">Levha Bilgileri (Tasarım)</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                            <span className="block text-xs font-medium text-blue-500 mb-1">Levha Ebadı</span>
                            <span className="font-medium text-blue-900">{jobDetails.jobSize || '-'}</span>
                        </div>
                        <div>
                            <span className="block text-xs font-medium text-blue-500 mb-1">Kutu Boyutu</span>
                            <span className="font-medium text-blue-900">{jobDetails.boxSize || '-'}</span>
                        </div>
                        <div>
                            <span className="block text-xs font-medium text-blue-500 mb-1">Verim</span>
                            <span className="font-medium text-blue-900">{jobDetails.efficiency || '-'}</span>
                        </div>
                    </div>
                </div>
            )}

            {(hasCustomerImages || hasDesignImages) && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h4 className="font-medium text-slate-800">Görseller</h4>
                    
                    {hasCustomerImages && product.images && product.images.customer && (
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

                    {hasDesignImages && (
                        <div className="space-y-2">
                            <h5 className="text-sm text-slate-500">Tasarım Görselleri</h5>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {[
                                    ...(((product as any).images?.design as string[] | undefined) || []),
                                    ...relevantDesignImages,
                                ].map((img, idx) => {
                                    const url = typeof img === 'string' ? img : img.url;
                                    return (
                                        <div
                                            key={`${url}-${idx}`}
                                            className="aspect-square rounded-lg overflow-hidden border border-slate-200"
                                        >
                                            <img src={url} alt={`Design ${idx + 1}`} className="w-full h-full object-cover" />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                    aria-label="Kapat"
                >
                    Kapat
                </button>
            </div>
        </div>
    );
}
