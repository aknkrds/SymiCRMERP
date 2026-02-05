import { useStock } from '../hooks/useStock';
import { PackagePlus, Boxes } from 'lucide-react';

export default function Stock() {
  const { stockItems, loading, error } = useStock();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Stok</h1>
          <p className="text-slate-500">İzinler ve içerik daha sonra ayarlanacaktır.</p>
        </div>
      </div>

      {/* Procurement / Raw Material Stock */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <PackagePlus size={18} /> Hammadde & Tedarik Stokları
          </h2>
        </div>

        {loading && <div className="p-6 text-slate-500">Yükleniyor...</div>}
        {error && <div className="p-6 text-red-600">Hata: {error}</div>}
        {!loading && !error && (
          <>
            {/* Mobile View */}
            <div className="md:hidden">
                {stockItems.filter(s => (s.category || 'procurement') === 'procurement').length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    Tedarik/hammadde stoğu bulunmuyor.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {stockItems
                        .filter(s => (s.category || 'procurement') === 'procurement')
                        .map((item) => (
                        <div key={item.id} className="p-4 space-y-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-mono text-xs text-slate-500">#{item.stockNumber}</div>
                                    <div className="font-medium text-slate-800">{item.product}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-slate-700">{item.quantity}</div>
                                    <div className="text-xs text-slate-500">{item.unit}</div>
                                </div>
                            </div>
                            <div className="text-sm text-slate-600 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                                {item.company}
                            </div>
                        </div>
                    ))}
                  </div>
                )}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Stok No</th>
                  <th className="px-6 py-3">Firma</th>
                  <th className="px-6 py-3">Ürün</th>
                  <th className="px-6 py-3 text-right">Miktar</th>
                  <th className="px-6 py-3">Birim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {stockItems.filter(s => (s.category || 'procurement') === 'procurement').length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      Tedarik/hammadde stoğu bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  stockItems
                    .filter(s => (s.category || 'procurement') === 'procurement')
                    .map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 font-mono text-xs">#{item.stockNumber}</td>
                      <td className="px-6 py-3">{item.company}</td>
                      <td className="px-6 py-3">{item.product}</td>
                      <td className="px-6 py-3 text-right">{item.quantity}</td>
                      <td className="px-6 py-3">{item.unit}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
      {/* Finished Goods / Genel Stock */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Boxes size={18} /> Genel Stok (Mamul ve Hurda)
          </h2>
        </div>

        {loading && <div className="p-6 text-slate-500">Yükleniyor...</div>}
        {error && <div className="p-6 text-red-600">Hata: {error}</div>}
        {!loading && !error && (
          <>
            {/* Mobile View */}
            <div className="md:hidden">
                {stockItems.filter(s => ['finished', 'Mamul', 'Hurda'].includes(s.category)).length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    Genel stok kaydı bulunmuyor.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {stockItems
                        .filter(s => ['finished', 'Mamul', 'Hurda'].includes(s.category))
                        .map((item) => (
                        <div key={item.id} className="p-4 space-y-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-mono text-xs text-slate-500">#{item.stockNumber}</div>
                                    <div className="font-medium text-slate-800">{item.product}</div>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                        item.category === 'Hurda' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                        {item.category === 'finished' ? 'Mamul' : item.category}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-slate-700">{item.quantity}</div>
                                    <div className="text-xs text-slate-500">{item.unit}</div>
                                </div>
                            </div>
                            <div className="text-sm text-slate-600 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                                {item.company}
                            </div>
                        </div>
                    ))}
                  </div>
                )}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Stok No</th>
                  <th className="px-6 py-3">Kategori</th>
                  <th className="px-6 py-3">Firma</th>
                  <th className="px-6 py-3">Ürün</th>
                  <th className="px-6 py-3 text-right">Miktar</th>
                  <th className="px-6 py-3">Birim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {stockItems.filter(s => ['finished', 'Mamul', 'Hurda'].includes(s.category)).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      Genel stok kaydı bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  stockItems
                    .filter(s => ['finished', 'Mamul', 'Hurda'].includes(s.category))
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 font-mono text-xs">#{item.stockNumber}</td>
                        <td className="px-6 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                item.category === 'Hurda' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                            }`}>
                                {item.category === 'finished' ? 'Mamul' : item.category}
                            </span>
                        </td>
                        <td className="px-6 py-3">{item.company}</td>
                        <td className="px-6 py-3">{item.product}</td>
                        <td className="px-6 py-3 text-right">{item.quantity}</td>
                        <td className="px-6 py-3">{item.unit}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
