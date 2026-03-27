import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Phone, Mail, User, ChevronLeft, ChevronRight, Filter, Star, Menu } from 'lucide-react';
import { useCustomers } from '../hooks/useCustomers';
import type { Customer, CustomerFormData } from '../types';
import { Modal } from '../components/ui/Modal';
import { CustomerForm } from '../components/customers/CustomerForm';
import { ERPPageLayout, ToolbarBtn } from '../components/ui/ERPPageLayout';

export default function Customers() {
    const { customers, addCustomer, updateCustomer, deleteCustomer } = useCustomers();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 25;

    const filteredCustomers = customers.filter(c =>
        c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
    };

    const handleAdd = () => { setEditingCustomer(undefined); setIsModalOpen(true); };
    const handleEdit = (customer: Customer) => { setEditingCustomer(customer); setIsModalOpen(true); };
    const handleSubmit = (data: CustomerFormData) => {
        if (editingCustomer) updateCustomer(editingCustomer.id, data);
        else addCustomer(data);
        setIsModalOpen(false);
    };
    const handleDelete = (id: string) => {
        if (confirm('Bu müşteriyi silmek istediğinize emin misiniz?')) deleteCustomer(id);
    };

    return (
        <>
            <ERPPageLayout
                breadcrumbs={[
                    { label: 'CRM' },
                    { label: 'Müşteri İlişkileri' },
                    { label: 'Müşteriler', active: true },
                ]}
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
                        <input
                            type="text"
                            placeholder="Müşteri ara..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="pl-8 pr-3 py-1 text-xs bg-white border border-slate-200 rounded outline-none focus:ring-1 focus:ring-blue-400 w-48"
                        />
                    </div>
                }
            >
                <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                            <th className="w-8 px-2 py-2 text-center border-r border-slate-200 text-[11px]">#</th>
                            <th className="px-3 py-2 border-r border-slate-200 text-[11px] uppercase tracking-wide">Firma</th>
                            <th className="px-3 py-2 border-r border-slate-200 text-[11px] uppercase tracking-wide">İletişim Kişisi</th>
                            <th className="px-3 py-2 border-r border-slate-200 text-[11px] uppercase tracking-wide">Telefon</th>
                            <th className="px-3 py-2 border-r border-slate-200 text-[11px] uppercase tracking-wide">E-posta</th>
                            <th className="px-3 py-2 text-[11px] uppercase tracking-wide">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedCustomers.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Kayıtlı müşteri bulunamadı.</td></tr>
                        ) : paginatedCustomers.map((customer, idx) => (
                            <tr key={customer.id} className="border-b border-slate-100 hover:bg-blue-50/40 transition-colors">
                                <td className="px-2 py-2 text-center text-slate-400 border-r border-slate-100 font-mono">{startIndex + idx + 1}</td>
                                <td className="px-3 py-2 border-r border-slate-100">
                                    <div className="font-semibold text-slate-800">{customer.companyName}</div>
                                    {customer.address && <div className="text-[11px] text-slate-400 truncate max-w-[160px]">{customer.address}</div>}
                                </td>
                                <td className="px-3 py-2 border-r border-slate-100">
                                    <div className="flex items-center gap-1.5 text-slate-700">
                                        <User size={12} className="text-indigo-400 flex-shrink-0" />
                                        {customer.contactName}
                                    </div>
                                </td>
                                <td className="px-3 py-2 border-r border-slate-100">
                                    <div className="flex items-center gap-1.5 text-slate-600">
                                        <Phone size={12} className="text-emerald-500 flex-shrink-0" />
                                        {customer.mobile}
                                    </div>
                                </td>
                                <td className="px-3 py-2 border-r border-slate-100">
                                    <div className="flex items-center gap-1.5 text-slate-600">
                                        <Mail size={12} className="text-blue-400 flex-shrink-0" />
                                        <span className="truncate max-w-[160px]">{customer.email}</span>
                                    </div>
                                </td>
                                <td className="px-3 py-2">
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => handleEdit(customer)} title="Düzenle"
                                            className="p-1 rounded hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition-colors">
                                            <Edit2 size={14} />
                                        </button>
                                        <button onClick={() => handleDelete(customer.id)} title="Sil"
                                            className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-2 border-t border-slate-200 bg-slate-50/50">
                        <p className="text-xs text-slate-500">
                            {filteredCustomers.length} kayıttan {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredCustomers.length)} gösteriliyor
                        </p>
                        <nav className="flex items-center gap-1">
                            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}
                                className="p-1 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed">
                                <ChevronLeft size={14} />
                            </button>
                            {[...Array(Math.min(totalPages, 7))].map((_, i) => {
                                const page = i + 1;
                                return (
                                    <button key={page} onClick={() => handlePageChange(page)}
                                        className={`px-2.5 py-1 rounded border text-xs font-medium transition-colors ${currentPage === page ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 hover:bg-slate-100 text-slate-600'}`}>
                                        {page}
                                    </button>
                                );
                            })}
                            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}
                                className="p-1 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed">
                                <ChevronRight size={14} />
                            </button>
                        </nav>
                    </div>
                )}
            </ERPPageLayout>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="lg"
                title={editingCustomer ? "Müşteri Düzenle" : "Yeni Müşteri Ekle"}>
                <CustomerForm initialData={editingCustomer} onSubmit={handleSubmit} onCancel={() => setIsModalOpen(false)} />
            </Modal>
        </>
    );
}
