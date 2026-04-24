import { useEffect, useState } from 'react';
import { useOrders } from '../hooks/useOrders';
import { useProducts } from '../hooks/useProducts';
import { Eye, Package, ClipboardList, ShoppingBag, Plus, Trash2, X, FileText, Image as ImageIcon, Truck, CheckCircle, Warehouse } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { Order } from '../types';
import { ORDER_STATUS_MAP } from '../constants/orderStatus';
import { ERPPageLayout } from '../components/ui/ERPPageLayout';
import { Modal } from '../components/ui/Modal';

type Tab = 'orders' | 'goods_receipt' | 'purchasing' | 'stock';

interface GoodsReceipt {
  id: string; receiptDate: string; supplier: string; plateType: string;
  quantity: number; dimensions: string; notes: string; createdAt: string;
}

interface PurchaseOrder {
  id: string; orderDate: string; supplier: string; productName: string;
  category: string; quantity: number; unit: string; unitPrice: number;
  totalPrice: number; notes: string; createdAt: string;
  status?: string; receivedQuantity?: number; receipts?: string;
  relatedOrderIds?: string[];
}

interface StockItemData {
  id: string; stockNumber: string; company: string; product: string;
  quantity: number; unit: string; category?: string; notes?: string; createdAt: string;
}

export default function Purchasing() {
  const { orders } = useOrders();
  const { products } = useProducts();
  const [activeTab, setActiveTab] = useState<Tab>('orders');
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  // Goods Receipt state
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [isReceiptForm, setIsReceiptForm] = useState(false);
  const [receiptForm, setReceiptForm] = useState({ receiptDate: new Date().toISOString().slice(0,10), supplier: '', plateType: '', quantity: 0, dimensions: '', notes: '' });

  // Purchase Order state
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [isPurchaseForm, setIsPurchaseForm] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({ orderDate: new Date().toISOString().slice(0,10), supplier: '', productName: '', category: '', quantity: 0, unit: 'Adet', unitPrice: 0, totalPrice: 0, notes: '' });
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  const closedStatuses = ['order_cancelled', 'order_completed', 'offer_cancelled', 'production_cancelled'];
  const activeOrders = orders.filter(o => !closedStatuses.includes(o.status));

  // Shipment receipt modal state
  const [shipmentTarget, setShipmentTarget] = useState<PurchaseOrder | null>(null);
  const [shipmentForm, setShipmentForm] = useState({ quantity: 0, receiptDate: new Date().toISOString().slice(0,10), imageUrl: '', notes: '' });

  // Stock detail modal
  const [stockDetail, setStockDetail] = useState<StockItemData | null>(null);

  // Stock state
  const [stockItems, setStockItems] = useState<StockItemData[]>([]);

  const fetchStock = () => fetch('/api/stock-items').then(r => r.json()).then(d => Array.isArray(d) && setStockItems(d)).catch(() => {});

  useEffect(() => {
    fetch('/api/goods-receipts').then(r => r.json()).then(d => Array.isArray(d) && setReceipts(d)).catch(() => {});
    fetch('/api/purchase-orders').then(r => r.json()).then(d => Array.isArray(d) && setPurchases(d)).catch(() => {});
    fetchStock();
  }, []);

  const handleViewOrder = (o: Order) => { setViewOrder(o); setIsViewOpen(true); };

  const handleSaveReceipt = async () => {
    try {
      const res = await fetch('/api/goods-receipts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...receiptForm, id: crypto.randomUUID(), createdAt: new Date().toISOString() }) });
      if (res.ok) { const d = await res.json(); setReceipts(prev => [d, ...prev]); setIsReceiptForm(false); setReceiptForm({ receiptDate: new Date().toISOString().slice(0,10), supplier: '', plateType: '', quantity: 0, dimensions: '', notes: '' }); }
    } catch (e) { alert('Kayıt başarısız'); }
  };

  const handleDeleteReceipt = async (id: string) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    await fetch(`/api/goods-receipts/${id}`, { method: 'DELETE' });
    setReceipts(prev => prev.filter(r => r.id !== id));
  };

  const handleSavePurchase = async () => {
    const total = (purchaseForm.quantity || 0) * (purchaseForm.unitPrice || 0);
    try {
      const res = await fetch('/api/purchase-orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...purchaseForm, totalPrice: total, relatedOrderIds: selectedOrderIds, id: crypto.randomUUID(), createdAt: new Date().toISOString() }) });
      if (res.ok) { const d = await res.json(); setPurchases(prev => [d, ...prev]); setIsPurchaseForm(false); setPurchaseForm({ orderDate: new Date().toISOString().slice(0,10), supplier: '', productName: '', category: '', quantity: 0, unit: 'Adet', unitPrice: 0, totalPrice: 0, notes: '' }); setSelectedOrderIds([]); }
    } catch (e) { alert('Kayıt başarısız'); }
  };

  const handleDeletePurchase = async (id: string) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    await fetch(`/api/purchase-orders/${id}`, { method: 'DELETE' });
    setPurchases(prev => prev.filter(r => r.id !== id));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setShipmentForm(p => ({...p, imageUrl: reader.result as string}));
    reader.readAsDataURL(file);
  };

  const handleShipmentSubmit = async () => {
    if (!shipmentTarget || !shipmentForm.quantity) return;
    try {
      const res = await fetch(`/api/purchase-orders/${shipmentTarget.id}/receipt`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shipmentForm)
      });
      if (res.ok) {
        const updated = await res.json();
        setPurchases(prev => prev.map(p => p.id === updated.id ? updated : p));
        setShipmentTarget(null);
        setShipmentForm({ quantity: 0, receiptDate: new Date().toISOString().slice(0,10), imageUrl: '', notes: '' });
        fetchStock();
      }
    } catch (e) { alert('Sevkiyat kaydı başarısız'); }
  };

  const handleCompletePurchase = async (po: PurchaseOrder) => {
    const received = po.receivedQuantity || 0;
    const ordered = po.quantity || 0;
    let msg = 'Siparişi tamamlamak istediğinize emin misiniz?';
    if (received < ordered) {
      msg = `⚠️ Eksik teslimat var! Sipariş: ${ordered}, Teslim: ${received} (${ordered - received} eksik).\n\nYine de kapatmak istiyor musunuz?`;
    } else if (received > ordered) {
      msg = `ℹ️ Fazla teslimat var! Sipariş: ${ordered}, Teslim: ${received} (+${received - ordered} fazla).\n\nKapatmak istiyor musunuz?`;
    }
    if (!confirm(msg)) return;
    try {
      const res = await fetch(`/api/purchase-orders/${po.id}/complete`, { method: 'PATCH' });
      if (res.ok) {
        const updated = await res.json();
        setPurchases(prev => prev.map(p => p.id === updated.id ? updated : p));
      }
    } catch (e) { alert('İşlem başarısız'); }
  };

  const getStockHistory = (s: StockItemData) => {
    const history: {date: string; type: 'in'|'out'; quantity: number; note: string}[] = [];
    purchases.filter(p => p.productName === s.product && p.supplier === s.company).forEach(p => {
      history.push({ date: p.orderDate, type: 'out', quantity: 0, note: `Sipariş geçildi: ${p.quantity} ${p.unit}` });
      let receipts: any[] = [];
      try { receipts = typeof p.receipts === 'string' ? JSON.parse(p.receipts) : (p.receipts || []); } catch(e) {}
      receipts.forEach((r: any) => {
        history.push({ date: r.receiptDate, type: 'in', quantity: r.quantity, note: `Teslim alındı` });
      });
    });
    return history.sort((a, b) => a.date.localeCompare(b.date));
  };

  const getDesignDetails = (order: Order) => {
    const details: any = order.designJobDetails || {};
    return details;
  };

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'orders', label: 'Siparişler', icon: ClipboardList },
    { key: 'goods_receipt', label: 'Mal Kabul', icon: Package },
    { key: 'purchasing', label: 'Satın Alma', icon: ShoppingBag },
    { key: 'stock', label: 'Stok', icon: Warehouse },
  ];

  const inputCls = "w-full p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-400";

  return (
    <ERPPageLayout breadcrumbs={[{ label: 'Satın Alma' }, { label: 'Satın Alma Yönetimi', active: true }]}>
      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${activeTab === t.key ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Siparişler */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold text-slate-700 uppercase tracking-widest">
            Tüm Siparişler ({orders.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2">Sipariş No</th>
                  <th className="px-4 py-2">Müşteri</th>
                  <th className="px-4 py-2">Ürünler</th>
                  <th className="px-4 py-2">Tarih</th>
                  <th className="px-4 py-2">Toplam</th>
                  <th className="px-4 py-2">Durum</th>
                  <th className="px-4 py-2 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-2 font-mono text-[11px]">#{o.id.slice(0,8)}</td>
                    <td className="px-4 py-2 font-medium text-slate-800">{o.customerName}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {o.items.map((item, i) => <div key={i} className="text-[10px]">{item.productName} <span className="text-slate-400">x{item.quantity}</span></div>)}
                    </td>
                    <td className="px-4 py-2 text-slate-500">{format(new Date(o.createdAt), 'dd.MM.yyyy', { locale: tr })}</td>
                    <td className="px-4 py-2 font-bold text-slate-700">{o.grandTotal.toLocaleString()} {o.currency}</td>
                    <td className="px-4 py-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${ORDER_STATUS_MAP[o.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                        {ORDER_STATUS_MAP[o.status]?.label || o.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => handleViewOrder(o)} className="flex items-center gap-1 px-2.5 py-1 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-[10px] font-bold ml-auto">
                        <Eye size={12} /> Görüntüle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Mal Kabul */}
      {activeTab === 'goods_receipt' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800">Mal Kabul Kayıtları</h3>
            <button onClick={() => setIsReceiptForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"><Plus size={14} /> Yeni Kayıt</button>
          </div>
          {isReceiptForm && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-700 uppercase">Yeni Mal Kabul</span><button onClick={() => setIsReceiptForm(false)}><X size={16} className="text-slate-400" /></button></div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tarih</label><input type="date" value={receiptForm.receiptDate} onChange={e => setReceiptForm(p => ({...p, receiptDate: e.target.value}))} className={inputCls} /></div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tedarikçi</label><input value={receiptForm.supplier} onChange={e => setReceiptForm(p => ({...p, supplier: e.target.value}))} className={inputCls} /></div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Levha Tipi</label><input value={receiptForm.plateType} onChange={e => setReceiptForm(p => ({...p, plateType: e.target.value}))} className={inputCls} /></div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Miktar</label><input type="number" value={receiptForm.quantity || ''} onChange={e => setReceiptForm(p => ({...p, quantity: Number(e.target.value)}))} className={inputCls} /></div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Ölçüler</label><input value={receiptForm.dimensions} onChange={e => setReceiptForm(p => ({...p, dimensions: e.target.value}))} placeholder="Örn: 70x100cm" className={inputCls} /></div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Not</label><input value={receiptForm.notes} onChange={e => setReceiptForm(p => ({...p, notes: e.target.value}))} className={inputCls} /></div>
              </div>
              <button onClick={handleSaveReceipt} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700">Kaydet</button>
            </div>
          )}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] border-b border-slate-200">
                <tr><th className="px-4 py-2">Tarih</th><th className="px-4 py-2">Tedarikçi</th><th className="px-4 py-2">Levha Tipi</th><th className="px-4 py-2">Miktar</th><th className="px-4 py-2">Ölçüler</th><th className="px-4 py-2">Not</th><th className="px-4 py-2"></th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipts.length === 0 ? <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">Henüz kayıt yok</td></tr> :
                  receipts.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2">{r.receiptDate}</td><td className="px-4 py-2 font-medium">{r.supplier}</td><td className="px-4 py-2">{r.plateType}</td><td className="px-4 py-2">{r.quantity}</td><td className="px-4 py-2">{r.dimensions}</td><td className="px-4 py-2 text-slate-500">{r.notes}</td>
                      <td className="px-4 py-2 text-right"><button onClick={() => handleDeleteReceipt(r.id)} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button></td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Satın Alma */}
      {activeTab === 'purchasing' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800">Satın Alma Talepleri</h3>
            <button onClick={() => setIsPurchaseForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"><Plus size={14} /> Yeni Satın Alma Talebi</button>
          </div>
          {isPurchaseForm && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-700 uppercase">Yeni Satın Alma Talebi</span><button onClick={() => setIsPurchaseForm(false)}><X size={16} className="text-slate-400" /></button></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Sipariş Tarihi</label><input type="date" value={purchaseForm.orderDate} onChange={e => setPurchaseForm(p => ({...p, orderDate: e.target.value}))} className={inputCls} /></div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tedarikçi Firma</label><input value={purchaseForm.supplier} onChange={e => setPurchaseForm(p => ({...p, supplier: e.target.value}))} className={inputCls} /></div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Ürün</label><input value={purchaseForm.productName} onChange={e => setPurchaseForm(p => ({...p, productName: e.target.value}))} className={inputCls} /></div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Adet</label><input type="number" value={purchaseForm.quantity || ''} onChange={e => setPurchaseForm(p => ({...p, quantity: Number(e.target.value)}))} className={inputCls} /></div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Birim Fiyat</label><input type="number" step="0.01" value={purchaseForm.unitPrice || ''} onChange={e => setPurchaseForm(p => ({...p, unitPrice: Number(e.target.value)}))} className={inputCls} /></div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Not</label><input value={purchaseForm.notes} onChange={e => setPurchaseForm(p => ({...p, notes: e.target.value}))} className={inputCls} /></div>
              </div>
              {/* İlgili Siparişler - çoklu seçim */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">İlgili Siparişler</label>
                <div className="border border-slate-200 rounded-lg p-2 max-h-32 overflow-y-auto space-y-1 bg-white">
                  {activeOrders.length === 0 ? <div className="text-[10px] text-slate-400 text-center py-2">Aktif sipariş yok</div> :
                    activeOrders.map(o => (
                      <label key={o.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-[11px] transition-colors ${selectedOrderIds.includes(o.id) ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}>
                        <input type="checkbox" checked={selectedOrderIds.includes(o.id)}
                          onChange={e => setSelectedOrderIds(prev => e.target.checked ? [...prev, o.id] : prev.filter(x => x !== o.id))}
                          className="accent-blue-600 w-3.5 h-3.5" />
                        <span className="font-mono text-[10px] text-slate-400">#{o.id.slice(0,8)}</span>
                        <span className="font-medium">{o.customerName}</span>
                        <span className="text-slate-400 ml-auto">{o.items.map(i => i.productName).join(', ')}</span>
                      </label>
                    ))
                  }
                </div>
                {selectedOrderIds.length > 0 && <div className="text-[10px] text-blue-600 font-bold mt-1">{selectedOrderIds.length} sipariş seçildi</div>}
              </div>
              <button onClick={handleSavePurchase} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700">Siparişi Kaydet</button>
            </div>
          )}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] border-b border-slate-200">
                <tr><th className="px-3 py-2">Tarih</th><th className="px-3 py-2">Tedarikçi</th><th className="px-3 py-2">Ürün</th><th className="px-3 py-2">İlgili Siparişler</th><th className="px-3 py-2">Adet</th><th className="px-3 py-2">Teslim</th><th className="px-3 py-2">B.Fiyat</th><th className="px-3 py-2">Toplam</th><th className="px-3 py-2">Durum</th><th className="px-3 py-2 text-right">İşlemler</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchases.length === 0 ? <tr><td colSpan={10} className="px-4 py-6 text-center text-slate-400">Henüz kayıt yok</td></tr> :
                  purchases.map(p => {
                    const isCompleted = p.status === 'completed';
                    const rowBg = isCompleted ? 'bg-emerald-50/60' : (p.receivedQuantity && p.receivedQuantity > 0 ? 'bg-amber-50/40' : '');
                    return (
                      <tr key={p.id} className={`${rowBg} hover:bg-slate-50/50 transition-colors`}>
                        <td className="px-3 py-2">{p.orderDate}</td>
                        <td className="px-3 py-2 font-medium">{p.supplier}</td>
                        <td className="px-3 py-2">{p.productName}</td>
                        <td className="px-3 py-2">
                          {(() => {
                            let ids: string[] = [];
                            try { ids = typeof p.relatedOrderIds === 'string' ? JSON.parse(p.relatedOrderIds) : (p.relatedOrderIds || []); } catch(e) {}
                            if (!ids.length) return <span className="text-slate-400 text-[10px]">—</span>;
                            return ids.map(oid => {
                              const o = orders.find(x => x.id === oid);
                              return <div key={oid} className="text-[10px]"><span className="font-mono text-slate-400">#{oid.slice(0,6)}</span> {o ? o.customerName : ''}</div>;
                            });
                          })()}
                        </td>
                        <td className="px-3 py-2">{p.quantity} {p.unit}</td>
                        <td className="px-3 py-2 font-mono">{p.receivedQuantity || 0} / {p.quantity}</td>
                        <td className="px-3 py-2">{p.unitPrice}</td>
                        <td className="px-3 py-2">
                          <span className="font-bold">{p.totalPrice}</span>
                          {(() => {
                            const diff = (p.quantity || 0) - (p.receivedQuantity || 0);
                            if (diff > 0) return <div className="text-[9px] font-bold text-red-500">-{diff} eksik</div>;
                            if (diff < 0) return <div className="text-[9px] font-bold text-blue-500">+{Math.abs(diff)} fazla</div>;
                            return null;
                          })()}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {isCompleted ? 'Tamamlandı' : 'Bekliyor'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            {!isCompleted && (
                              <>
                                <button onClick={() => { setShipmentTarget(p); setShipmentForm({ quantity: 0, receiptDate: new Date().toISOString().slice(0,10), imageUrl: '', notes: '' }); }}
                                  className="flex items-center gap-1 px-2 py-1 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-[10px] font-bold">
                                  <Truck size={12} /> Sevkiyat
                                </button>
                                <button onClick={() => handleCompletePurchase(p)}
                                  className="flex items-center gap-1 px-2 py-1 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-[10px] font-bold">
                                  <CheckCircle size={12} /> Tamamla
                                </button>
                              </>
                            )}
                            <button onClick={() => handleDeletePurchase(p.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Stok */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800">Stok Durumu</h3>
            <button onClick={fetchStock} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200">
              Yenile
            </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] border-b border-slate-200">
                <tr><th className="px-4 py-2">Stok No</th><th className="px-4 py-2">Tedarikçi</th><th className="px-4 py-2">Ürün</th><th className="px-4 py-2">İlgili Siparişler</th><th className="px-4 py-2">Miktar</th><th className="px-4 py-2">Birim</th><th className="px-4 py-2 text-right">İşlemler</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockItems.length === 0 ? <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">Henüz stok kaydı yok</td></tr> :
                  stockItems.map(s => {
                    const relatedPOs = purchases.filter(p => p.productName === s.product && p.supplier === s.company);
                    const relatedOIds = relatedPOs.flatMap(p => {
                      try { return typeof p.relatedOrderIds === 'string' ? JSON.parse(p.relatedOrderIds) : (p.relatedOrderIds || []); } catch(e) { return []; }
                    });
                    const uniqueOIds = [...new Set(relatedOIds)] as string[];
                    return (
                      <tr key={s.id} className={`hover:bg-slate-50/50 transition-colors ${s.quantity <= 0 ? 'bg-red-50' : ''}`}>
                        <td className="px-4 py-2 font-mono text-[11px]">{s.stockNumber}</td>
                        <td className="px-4 py-2 font-medium">{s.company}</td>
                        <td className="px-4 py-2">{s.product}</td>
                        <td className="px-4 py-2">
                          {uniqueOIds.length === 0 ? <span className="text-slate-400 text-[10px]">—</span> :
                            uniqueOIds.slice(0, 3).map(oid => {
                              const o = orders.find(x => x.id === oid);
                              return <div key={oid} className="text-[10px]"><span className="font-mono text-slate-400">#{oid.slice(0,6)}</span> {o?.customerName || ''}</div>;
                            })
                          }
                          {uniqueOIds.length > 3 && <div className="text-[9px] text-slate-400">+{uniqueOIds.length - 3} daha</div>}
                        </td>
                        <td className={`px-4 py-2 font-bold ${s.quantity <= 0 ? 'text-red-600' : 'text-slate-700'}`}>{s.quantity}</td>
                        <td className="px-4 py-2">{s.unit}</td>
                        <td className="px-4 py-2 text-right">
                          <button onClick={() => setStockDetail(s)} className="flex items-center gap-1 px-2 py-1 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-[10px] font-bold ml-auto">
                            <Eye size={12} /> Görüntüle
                          </button>
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Detail Modal */}
      <Modal isOpen={!!stockDetail} onClose={() => setStockDetail(null)} title={stockDetail ? `Stok Detayı — ${stockDetail.product}` : 'Stok'}>
        {stockDetail && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 rounded-xl p-4">
              <div><span className="text-[9px] font-bold text-slate-400 uppercase block">Stok No</span><span className="font-mono">{stockDetail.stockNumber}</span></div>
              <div><span className="text-[9px] font-bold text-slate-400 uppercase block">Tedarikçi</span><span className="font-medium">{stockDetail.company}</span></div>
              <div><span className="text-[9px] font-bold text-slate-400 uppercase block">Ürün</span><span>{stockDetail.product}</span></div>
              <div><span className="text-[9px] font-bold text-slate-400 uppercase block">Mevcut Miktar</span><span className={`font-bold ${stockDetail.quantity <= 0 ? 'text-red-600' : 'text-emerald-600'}`}>{stockDetail.quantity} {stockDetail.unit}</span></div>
            </div>

            {/* Sevkiyat Görselleri */}
            {(() => {
              const relatedPOs = purchases.filter(p => p.productName === stockDetail.product && p.supplier === stockDetail.company);
              const allImages: string[] = [];
              relatedPOs.forEach(po => {
                let recs: any[] = [];
                try { recs = typeof po.receipts === 'string' ? JSON.parse(po.receipts) : (po.receipts || []); } catch(e) {}
                recs.forEach((r: any) => { if (r.imageUrl) allImages.push(r.imageUrl); });
              });
              if (allImages.length === 0) return null;
              return (
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Görseller</div>
                  <div className="flex flex-wrap gap-2">{allImages.map((img, i) => <img key={i} src={img} alt="" className="w-20 h-20 object-cover rounded-lg border border-slate-200" />)}</div>
                </div>
              );
            })()}

            {/* Hareket Geçmişi */}
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Hareket Geçmişi</div>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[9px] font-bold text-slate-500 uppercase border-b">
                    <tr><th className="px-3 py-2">Tarih</th><th className="px-3 py-2">İşlem</th><th className="px-3 py-2">Miktar</th><th className="px-3 py-2">Açıklama</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {getStockHistory(stockDetail).map((h, i) => (
                      <tr key={i} className={h.type === 'in' ? 'bg-emerald-50/40' : 'bg-red-50/40'}>
                        <td className="px-3 py-2 font-mono">{h.date}</td>
                        <td className="px-3 py-2">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${h.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            {h.type === 'in' ? 'Giriş' : 'Sipariş'}
                          </span>
                        </td>
                        <td className={`px-3 py-2 font-bold ${h.type === 'in' ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {h.type === 'in' ? `+${h.quantity}` : '—'}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{h.note}</td>
                      </tr>
                    ))}
                    {getStockHistory(stockDetail).length === 0 && (
                      <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-400">Henüz hareket yok</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Shipment Receipt Modal */}
      <Modal isOpen={!!shipmentTarget} onClose={() => setShipmentTarget(null)} title={`Sevkiyat Girişi — ${shipmentTarget?.productName || ''}`}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Teslim Adeti</label><input type="number" value={shipmentForm.quantity || ''} onChange={e => setShipmentForm(p => ({...p, quantity: Number(e.target.value)}))} className={inputCls} /></div>
            <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Teslim Tarihi</label><input type="date" value={shipmentForm.receiptDate} onChange={e => setShipmentForm(p => ({...p, receiptDate: e.target.value}))} className={inputCls} /></div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Görsel Ekle (Opsiyonel)</label>
            <input type="file" accept="image/*" onChange={handleFileSelect} className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100" />
            {shipmentForm.imageUrl && <img src={shipmentForm.imageUrl} alt="Önizleme" className="mt-2 w-24 h-24 object-cover rounded-lg border border-slate-200" />}
          </div>
          <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Not</label><input value={shipmentForm.notes} onChange={e => setShipmentForm(p => ({...p, notes: e.target.value}))} className={inputCls} /></div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShipmentTarget(null)} className="px-4 py-2 text-slate-500 text-xs font-bold hover:bg-slate-100 rounded-lg">Vazgeç</button>
            <button onClick={handleShipmentSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700">Sevkiyatı Kaydet</button>
          </div>
        </div>
      </Modal>

      {/* Order View Modal */}
      <Modal isOpen={isViewOpen} onClose={() => { setIsViewOpen(false); setViewOrder(null); }} size="full" theme="glass" title={viewOrder ? `Sipariş Detayı — #${viewOrder.id.slice(0,8)}` : 'Sipariş'}>
        {viewOrder && (
          <div className="space-y-5 text-xs">
            {/* General Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 rounded-xl p-4">
              <div><span className="text-[9px] font-bold text-slate-400 uppercase block">Müşteri</span><span className="font-bold text-slate-800">{viewOrder.customerName}</span></div>
              <div><span className="text-[9px] font-bold text-slate-400 uppercase block">Tarih</span><span>{format(new Date(viewOrder.createdAt), 'dd.MM.yyyy', { locale: tr })}</span></div>
              <div><span className="text-[9px] font-bold text-slate-400 uppercase block">Ödeme</span><span>{viewOrder.paymentMethod || '—'}</span></div>
              <div><span className="text-[9px] font-bold text-slate-400 uppercase block">Durum</span><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${ORDER_STATUS_MAP[viewOrder.status]?.color || ''}`}>{ORDER_STATUS_MAP[viewOrder.status]?.label || viewOrder.status}</span></div>
              {viewOrder.salesRepName && <div><span className="text-[9px] font-bold text-slate-400 uppercase block">Satış Temsilcisi</span><span>{viewOrder.salesRepName}</span></div>}
              {viewOrder.prepaymentRate && <div><span className="text-[9px] font-bold text-slate-400 uppercase block">Peşin Tutar</span><span>%{viewOrder.prepaymentRate} → {(viewOrder.grandTotal * viewOrder.prepaymentRate / 100).toLocaleString()} {viewOrder.currency}</span></div>}
              {viewOrder.salesNotes && <div className="col-span-2"><span className="text-[9px] font-bold text-slate-400 uppercase block">Satış Notu</span><span className="text-slate-600">{viewOrder.salesNotes}</span></div>}
              {viewOrder.designNotes && <div className="col-span-2"><span className="text-[9px] font-bold text-slate-400 uppercase block">Tasarım Notu</span><span className="text-slate-600">{viewOrder.designNotes}</span></div>}
            </div>

            {/* Products */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold text-slate-700 uppercase tracking-widest">Ürünler</div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/50 text-slate-400 text-[9px] font-bold uppercase border-b"><tr><th className="px-4 py-2">Ürün</th><th className="px-4 py-2">Miktar</th><th className="px-4 py-2">B.Fiyat</th><th className="px-4 py-2">KDV</th><th className="px-4 py-2">Toplam</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {viewOrder.items.map((item, i) => (
                    <tr key={i}><td className="px-4 py-2 font-medium text-slate-800">{item.productName}</td><td className="px-4 py-2">{item.quantity}</td><td className="px-4 py-2">{item.unitPrice}</td><td className="px-4 py-2">%{item.vatRate}</td><td className="px-4 py-2 font-bold">{(item.quantity * item.unitPrice).toLocaleString()}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Design Info */}
            {(() => {
              const dd = getDesignDetails(viewOrder);
              const imgs = viewOrder.designImages || [];
              if (Object.keys(dd).length === 0 && imgs.length === 0) return null;
              return (
                <div className="bg-indigo-50/50 rounded-xl border border-indigo-100 p-4 space-y-3">
                  <div className="text-[10px] font-bold text-indigo-800 uppercase flex items-center gap-1"><FileText size={13} /> Tasarım & Levha Bilgileri</div>
                  {viewOrder.items.map(item => {
                    const d = (dd as any)[item.productId];
                    if (!d) return null;
                    const plates = Array.isArray(d) ? d : [{ type: 'Gövde', ...d }];
                    return (
                      <div key={item.productId} className="bg-white rounded-lg border border-indigo-100 p-3 mb-2">
                        <div className="text-[10px] font-bold text-indigo-700 mb-2">{item.productName}</div>
                        <div className="space-y-2">
                          {plates.map((plate: any, pIdx: number) => (
                            <div key={pIdx} className="bg-slate-50 border border-slate-100 rounded p-2">
                              <div className="text-[9px] font-bold text-slate-500 uppercase mb-1 flex justify-between">
                                <span>{plate.type || 'Gövde'} Levhası</span>
                                {(plate.includesKapak || plate.includesDip) && (
                                  <span className="text-blue-500">
                                    Aynı Levhada: {[plate.includesKapak && 'Kapak', plate.includesDip && 'Dip'].filter(Boolean).join(', ')}
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-[10px]">
                                <div><span className="text-slate-400 block">Levha Ebadı</span><span className="font-mono">{plate.jobSize || '—'}</span></div>
                                <div><span className="text-slate-400 block">Levha Adeti</span><span className="font-mono">{plate.boxSize || '—'}</span></div>
                                <div><span className="text-slate-400 block">Montaj</span><span className="font-mono">{plate.efficiency || '—'}</span></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {imgs.length > 0 && (
                    <div><div className="text-[9px] font-bold text-indigo-600 uppercase mb-1 flex items-center gap-1"><ImageIcon size={11} /> Görseller</div>
                      <div className="flex flex-wrap gap-2">{imgs.map((img: any, i: number) => <div key={i} className="w-20 h-20 rounded-lg border border-indigo-100 overflow-hidden"><img src={typeof img === 'string' ? img : img.url} alt="" className="w-full h-full object-cover" /></div>)}</div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Totals */}
            <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><span className="text-[9px] font-bold text-slate-400 uppercase block">Gofre</span><span className="font-mono">{viewOrder.gofrePrice || 0} {viewOrder.currency}</span></div>
              <div><span className="text-[9px] font-bold text-slate-400 uppercase block">Nakliye</span><span className="font-mono">{viewOrder.shippingPrice || 0} {viewOrder.currency}</span></div>
              <div><span className="text-[9px] font-bold text-slate-400 uppercase block">Genel Toplam</span><span className="font-mono font-bold text-blue-600 text-sm">{viewOrder.grandTotal.toLocaleString()} {viewOrder.currency}</span></div>
            </div>
          </div>
        )}
      </Modal>
    </ERPPageLayout>
  );
}
