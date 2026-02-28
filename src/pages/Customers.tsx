import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Phone, Mail, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCustomers } from '../hooks/useCustomers';
import type { Customer, CustomerFormData } from '../types';
import { Modal } from '../components/ui/Modal';
import { CustomerForm } from '../components/customers/CustomerForm';

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
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const handleAdd = () => {
        setEditingCustomer(undefined);
        setIsModalOpen(true);
    };

    const handleEdit = (customer: Customer) => {
        setEditingCustomer(customer);
        setIsModalOpen(true);
    };

    const handleSubmit = (data: CustomerFormData) => {
        if (editingCustomer) {
            updateCustomer(editingCustomer.id, data);
        } else {
            addCustomer(data);
        }
        setIsModalOpen(false);
    };

    const handleDelete = (id: string) => {
        if (confirm('Bu müşteriyi silmek istediğinize emin misiniz?')) {
            deleteCustomer(id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Müşteriler</h1>
                    <p className="text-slate-500">Müşteri listesi ve yönetimi</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-xl hover:bg-[var(--accent-strong)] hover:shadow-lg hover:shadow-[var(--accent)]/30 transition-all duration-300 transform hover:-translate-y-0.5"
                >
                    <Plus size={20} />
                    Yeni Müşteri
                </button>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-slate-200">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Müşteri ara..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1); // Reset to first page on search
                            }}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-all"
                            aria-label="Müşteri ara"
                        />
                    </div>
                </div>

                {/* Mobile View (Cards) */}
                <div className="md:hidden">
                    {paginatedCustomers.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            Kayıtlı müşteri bulunamadı.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-200">
                            {paginatedCustomers.map((customer) => (
                                <div key={customer.id} className="p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-semibold text-slate-800">{customer.companyName}</div>
                                            <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                                                <User size={14} />
                                                {customer.contactName}
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleEdit(customer)}
                                                className="p-2 text-indigo-600 bg-indigo-50 rounded-lg"
                                                aria-label="Düzenle"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(customer.id)}
                                                className="p-2 text-red-600 bg-red-50 rounded-lg"
                                                aria-label="Sil"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2 text-sm text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <Phone size={14} className="text-emerald-500" />
                                            {customer.mobile}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Mail size={14} className="text-blue-500" />
                                            <span className="truncate">{customer.email}</span>
                                        </div>
                                        {customer.address && (
                                            <div className="text-xs text-slate-400 mt-1">
                                                {customer.address}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Desktop View (Table) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50/50 text-slate-800 font-semibold border-b border-slate-100 uppercase tracking-wider text-xs">
                            <tr>
                                <th className="px-6 py-4">Firma</th>
                                <th className="px-6 py-4">İletişim</th>
                                <th className="px-6 py-4">Telefon & Email</th>
                                <th className="px-6 py-4 text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                        Kayıtlı müşteri bulunamadı.
                                    </td>
                                </tr>
                            ) : (
                                paginatedCustomers.map((customer) => (
                                    <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-slate-800">{customer.companyName}</div>
                                            <div className="text-xs text-slate-500 max-w-xs truncate">{customer.address}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <User size={16} className="text-indigo-500" />
                                                {customer.contactName}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Phone size={16} className="text-emerald-500" />
                                                {customer.mobile}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Mail size={16} className="text-blue-500" />
                                                {customer.email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(customer)}
                                                    className="p-2 text-slate-500 hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)] rounded-lg transition-colors"
                                                    title="Düzenle"
                                                    aria-label="Düzenle"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(customer.id)}
                                                    className="p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                                                    title="Sil"
                                                    aria-label="Sil"
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

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 sm:px-6">
                        <div className="flex flex-1 justify-between sm:hidden">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Önceki
                            </button>
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Sonraki
                            </button>
                        </div>
                        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-slate-700">
                                    Toplam <span className="font-medium">{filteredCustomers.length}</span> kayıttan <span className="font-medium">{startIndex + 1}</span> - <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredCustomers.length)}</span> arası gösteriliyor
                                </p>
                            </div>
                            <div>
                                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className="sr-only">Önceki</span>
                                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                                    </button>

                                    {/* Page Numbers */}
                                    {[...Array(totalPages)].map((_, i) => {
                                        const page = i + 1;
                                        // Show first, last, current, and surrounding pages
                                        if (
                                            page === 1 ||
                                            page === totalPages ||
                                            (page >= currentPage - 1 && page <= currentPage + 1)
                                        ) {
                                            return (
                                                <button
                                                    key={page}
                                                    onClick={() => handlePageChange(page)}
                                                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === page
                                                            ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                                                            : 'text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0'
                                                        }`}
                                                >
                                                    {page}
                                                </button>
                                            );
                                        } else if (
                                            page === currentPage - 2 ||
                                            page === currentPage + 2
                                        ) {
                                            return (
                                                <span
                                                    key={page}
                                                    className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 focus:outline-offset-0"
                                                >
                                                    ...
                                                </span>
                                            );
                                        }
                                        return null;
                                    })}

                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className="sr-only">Sonraki</span>
                                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingCustomer ? "Müşteri Düzenle" : "Yeni Müşteri Ekle"}
            >
                <CustomerForm
                    initialData={editingCustomer}
                    onSubmit={handleSubmit}
                    onCancel={() => setIsModalOpen(false)}
                />
            </Modal>
        </div>
    );
}
