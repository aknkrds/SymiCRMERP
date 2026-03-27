import { useState, useEffect } from 'react';
import { Plus, Eye, Search, User, Phone, Mail, Briefcase, FileText, Upload, Trash2, Menu, Filter } from 'lucide-react';
import type { Personnel } from '../types';
import { Modal } from '../components/ui/Modal';
import { ERPPageLayout, ToolbarBtn } from '../components/ui/ERPPageLayout';

const REQUIRED_DOCUMENTS = [
  'Kimlik Ön Resmi', 'Kimlik Arka Resmi', 'İşe Başvuru Formu', 'Engelli Belgesi', 'Askerlik Belgesi',
  'İşe Giriş Belgesi', 'Sağlık Raporu', 'İkametgah', 'İşkur Evrağı', 'Resim', 'Diploma',
  'Adli Sicil Raporu', 'Odio İşitme Testi', 'Akciğer Grafisi', 'EKG', 'Kan ve İdrar Tahlili'
];

export default function HumanResources() {
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Personnel | null>(null);
  const [formData, setFormData] = useState<Partial<Personnel>>({});
  const [formLoading, setFormLoading] = useState(false);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
  const [selectedPersonDocs, setSelectedPersonDocs] = useState<Personnel | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  useEffect(() => { fetchPersonnel(); }, []);

  const fetchPersonnel = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/personnel');
      if (response.ok) {
        const data = await response.json();
        setPersonnelList(Array.isArray(data) ? data : []);
      }
    } catch (error) { console.error('Error fetching personnel:', error); setPersonnelList([]); }
    finally { setLoading(false); }
  };

  const handleOpenModal = (person?: Personnel) => {
    if (person) {
      setSelectedPerson(person);
      setFormData({ ...person, childrenAges: Array.isArray(person.childrenAges) ? person.childrenAges : [], hasDisability: person.hasDisability || false });
    } else {
      setSelectedPerson(null);
      setFormData({ childrenCount: 0, childrenAges: [], hasDisability: false });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => { setIsModalOpen(false); setSelectedPerson(null); setFormData({}); };
  const handleOpenDocsModal = (person: Personnel) => { setSelectedPersonDocs(person); setIsDocsModalOpen(true); };
  const handleCloseDocsModal = () => { setIsDocsModalOpen(false); setSelectedPersonDocs(null); setUploadingDoc(null); };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file || !selectedPersonDocs) return;
    try {
      setUploadingDoc(docType);
      const formDataUpload = new FormData();
      formDataUpload.append('image', file);
      const uploadRes = await fetch('/api/upload?folder=doc', { method: 'POST', body: formDataUpload });
      if (!uploadRes.ok) throw new Error('Dosya yüklenemedi');
      const { url } = await uploadRes.json();
      const currentDocs = selectedPersonDocs.documents || {};
      const updatedDocs = { ...currentDocs, [docType]: url };
      const updateRes = await fetch(`/api/personnel/${selectedPersonDocs.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documents: updatedDocs }) });
      if (!updateRes.ok) throw new Error('Personel güncellenemedi');
      const updatedPerson = await updateRes.json();
      setSelectedPersonDocs(updatedPerson);
      setPersonnelList(prev => prev.map(p => p.id === updatedPerson.id ? updatedPerson : p));
    } catch (error) { console.error('Upload error:', error); alert('Dosya yüklenirken bir hata oluştu'); }
    finally { setUploadingDoc(null); if (input) input.value = ''; }
  };

  const handleDeleteDocument = async (docType: string) => {
    if (!selectedPersonDocs || !confirm('Bu belgeyi silmek istediğinize emin misiniz?')) return;
    try {
      const currentDocs = selectedPersonDocs.documents || {};
      const updatedDocs = { ...currentDocs };
      delete updatedDocs[docType];
      const updateRes = await fetch(`/api/personnel/${selectedPersonDocs.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documents: updatedDocs }) });
      if (!updateRes.ok) throw new Error('Belge silinemedi');
      const updatedPerson = await updateRes.json();
      setSelectedPersonDocs(updatedPerson);
      setPersonnelList(prev => prev.map(p => p.id === updatedPerson.id ? updatedPerson : p));
    } catch (error) { console.error('Delete error:', error); alert('Belge silinirken bir hata oluştu'); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'childrenCount') {
      const count = parseInt(value) || 0;
      const currentAges = Array.isArray(formData.childrenAges) ? formData.childrenAges : [];
      const newAges = Array(count).fill(0).map((_, i) => currentAges[i] || 0);
      setFormData(prev => ({ ...prev, [name]: count, childrenAges: newAges }));
    } else { setFormData(prev => ({ ...prev, [name]: value })); }
  };

  const handleChildAgeChange = (index: number, value: string) => {
    const age = parseInt(value) || 0;
    const currentAges = Array.isArray(formData.childrenAges) ? formData.childrenAges : [];
    const newAges = [...currentAges];
    while (newAges.length <= index) { newAges.push(0); }
    newAges[index] = age;
    setFormData(prev => ({ ...prev, childrenAges: newAges }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const url = selectedPerson ? `/api/personnel/${selectedPerson.id}` : '/api/personnel';
      const method = selectedPerson ? 'PATCH' : 'POST';
      const body = { ...formData, id: selectedPerson ? selectedPerson.id : crypto.randomUUID(), createdAt: selectedPerson ? selectedPerson.createdAt : new Date().toISOString() };
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (response.ok) { await fetchPersonnel(); handleCloseModal(); }
    } catch (error) { console.error('Error saving personnel:', error); }
    finally { setFormLoading(false); }
  };

  const filteredPersonnel = personnelList.filter(p => 
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.department?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => (a.endDate && !b.endDate) ? 1 : (!a.endDate && b.endDate) ? -1 : 0);

  return (
    <ERPPageLayout
      breadcrumbs={[{ label: 'İK' }, { label: 'Personel Yönetimi', active: true }]}
      toolbar={
        <>
          <ToolbarBtn icon={<Plus size={13} />} label="Yeni Personel" variant="primary" onClick={() => handleOpenModal()} />
          <ToolbarBtn icon={<Filter size={13} />} label="Filtrele" />
          <ToolbarBtn icon={<Menu size={13} />} />
        </>
      }
      toolbarRight={
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
          <input 
            type="text" 
            placeholder="Personel ara..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-3 py-1 text-xs bg-white border border-slate-200 rounded outline-none focus:ring-1 focus:ring-blue-400 w-64" 
          />
        </div>
      }
    >
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden text-[11px]">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center whitespace-nowrap">
            <span className="font-bold text-slate-700 uppercase tracking-widest text-[10px]">Personel Listesi</span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-bold border border-indigo-100 text-[9px]">{filteredPersonnel.length} PERSONEL</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/30 text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-100">
                <th className="w-12 px-5 py-3 text-center border-r border-slate-100">#</th>
                <th className="px-5 py-3 border-r border-slate-100">Personel Bilgileri</th>
                <th className="px-5 py-3 border-r border-slate-100">Görev & Organizasyon</th>
                <th className="px-5 py-3 border-r border-slate-100">İletişim Kanalları</th>
                <th className="px-5 py-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-20 text-center text-slate-400 uppercase tracking-widest animate-pulse font-bold">Veriler Yükleniyor...</td></tr>
              ) : filteredPersonnel.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-20 text-center text-slate-400">Aranan kriterlere uygun personel bulunamadı.</td></tr>
              ) : filteredPersonnel.map((person, idx) => {
                const isExited = !!person.endDate;
                return (
                  <tr key={person.id} className={`hover:bg-blue-50/30 transition-all group ${isExited ? 'bg-red-50/20' : ''}`}>
                    <td className="px-5 py-4 text-center text-slate-300 border-r border-slate-50 font-mono font-bold">{idx + 1}</td>
                    <td className="px-5 py-4 border-r border-slate-50">
                      <div className="flex items-center gap-3">
                         <div className={`w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-600 flex items-center justify-center font-bold text-xs border border-indigo-100 shadow-sm ${isExited ? 'grayscale opacity-40' : ''}`}>
                          {(person.firstName || '').charAt(0)}{(person.lastName || '').charAt(0)}
                        </div>
                        <div>
                          <div className={`font-bold text-slate-800 text-[12px] uppercase tracking-tight ${isExited ? 'line-through text-slate-400' : ''}`}>{person.firstName} {person.lastName}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] text-slate-400 font-mono font-bold">TC: {person.tcNumber}</span>
                            {isExited && <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[8px] font-black uppercase tracking-tighter">AYRILDI</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 border-r border-slate-50">
                      <div className="flex items-center gap-2">
                        <Briefcase size={12} className="text-slate-300" />
                        <span className={`font-bold text-slate-700 uppercase tracking-tight ${isExited ? 'text-slate-400' : ''}`}>{person.role}</span>
                      </div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 ml-5">{person.department}</div>
                    </td>
                    <td className="px-5 py-4 border-r border-slate-50 text-slate-500">
                      <div className="flex items-center gap-2 group/phone cursor-pointer">
                        <Phone size={11} className="text-slate-300 group-hover/phone:text-blue-500 transition-colors" /> 
                        <span className="font-mono text-[10px] font-bold tracking-tighter">{person.mobilePhone}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 group/mail cursor-pointer">
                        <Mail size={11} className="text-slate-300 group-hover/mail:text-blue-500 transition-colors" />
                        <span className="text-[10px] truncate max-w-[120px] font-medium">{person.email || '-'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1.5 translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                        <button onClick={() => handleOpenDocsModal(person)} className="p-2 rounded-lg bg-white border border-slate-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm" title="Evrak Arşivi">
                          <FileText size={14} />
                        </button>
                        <button onClick={() => handleOpenModal(person)} className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm" title="Profil Detayı">
                          <Eye size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Docs Modal */}
      {isDocsModalOpen && selectedPersonDocs && (
        <Modal isOpen={isDocsModalOpen} onClose={handleCloseDocsModal} title={`Personel Arşivi: ${selectedPersonDocs.firstName} ${selectedPersonDocs.lastName}`} size="lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-1 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            {REQUIRED_DOCUMENTS.map((docName) => {
              const docUrl = selectedPersonDocs.documents?.[docName];
              const isUploading = uploadingDoc === docName;
              return (
                <div key={docName} className="group border border-slate-200/60 rounded-xl p-3 flex flex-col justify-between gap-3 bg-white hover:border-blue-200 hover:shadow-md hover:shadow-blue-500/5 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight leading-tight">{docName}</span>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${docUrl ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-200'}`}></div>
                        <span className={`text-[9px] font-bold tracking-widest ${docUrl ? 'text-emerald-600' : 'text-slate-400'}`}>{docUrl ? 'MEVCUT' : 'BEKLENİYOR'}</span>
                      </div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-400 transition-colors">
                      <FileText size={16} />
                    </div>
                  </div>
                  
                  <div className="flex gap-1.5">
                    {docUrl ? (
                      <>
                        <a href={docUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex justify-center items-center p-2 rounded-lg bg-slate-50 border border-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm group/view">
                          <Eye size={14} />
                          <span className="ml-2 text-[10px] font-bold uppercase tracking-widest">GÖRÜNTÜLE</span>
                        </a>
                        <button onClick={() => handleDeleteDocument(docName)} className="p-2 rounded-lg bg-red-50 border border-red-100 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-sm">
                          <Trash2 size={14} />
                        </button>
                      </>
                    ) : (
                      <label className={`flex-1 flex justify-center items-center p-2 rounded-lg bg-blue-600 text-white border border-blue-500 cursor-pointer hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 active:scale-[0.98] ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                        {isUploading ? (
                          <span className="text-[10px] font-bold uppercase tracking-widest animate-pulse">YÜKLENİYOR...</span>
                        ) : (
                          <>
                            <Upload size={14} />
                            <span className="ml-2 text-[10px] font-bold uppercase tracking-widest">DOSYA YÜKLE</span>
                          </>
                        )}
                        <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, docName)} accept=".pdf,.png,.jpg,.jpeg" disabled={isUploading} />
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      {/* Detail/Form Modal */}
      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={selectedPerson ? 'Personel Profil Detayı' : 'Yeni Personel Kaydı'} size="lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="max-h-[65vh] overflow-y-auto pr-4 -mr-4 custom-scrollbar px-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Kişisel Bilgiler */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <User size={14} className="text-blue-500" />
                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em]">KİŞİSEL BİLGİLER</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">ADINIZ</label>
                      <input required name="firstName" value={formData.firstName || ''} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">SOYADINIZ</label>
                      <input required name="lastName" value={formData.lastName || ''} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-all" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">TC KİMLİK NUMARASI</label>
                    <input required name="tcNumber" maxLength={11} value={formData.tcNumber || ''} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-all" placeholder="11 haneli TC no" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">TELEFON</label>
                      <input type="tel" name="mobilePhone" value={formData.mobilePhone || ''} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-all" placeholder="05XX XXX XX XX" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">E-POSTA</label>
                      <input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-all" placeholder="ornek@firma.com" />
                    </div>
                  </div>
                </div>

                {/* İş Bilgileri */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Briefcase size={14} className="text-indigo-500" />
                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em]">ORGANİZASYONEL BİLGİLER</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">DEPARTMAN</label>
                      <select name="department" value={formData.department || ''} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-400/20 focus:border-indigo-400 transition-all">
                        <option value="">Seçiniz</option>
                        <option value="Yönetim">Yönetim</option>
                        <option value="İnsan Kaynakları">İnsan Kaynakları</option>
                        <option value="Muhasebe">Muhasebe</option>
                        <option value="Üretim">Üretim</option>
                        <option value="Depo">Depo</option>
                        <option value="Sevkiyat">Sevkiyat</option>
                        <option value="Tasarım">Tasarım</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">POZİSYON / GÖREV</label>
                      <input name="role" value={formData.role || ''} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-400/20 focus:border-indigo-400 transition-all" placeholder="Örn: Operatör" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">İşe Giriş Tarihi</label>
                      <input type="date" name="startDate" value={formData.startDate || ''} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-400 transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-red-500 uppercase tracking-widest ml-1">İşten Çıkış Tarihi</label>
                      <input type="date" name="endDate" value={formData.endDate || ''} onChange={handleInputChange} className="w-full px-4 py-2 bg-red-50/30 border border-red-100 rounded-xl text-xs font-bold text-red-600 outline-none focus:ring-2 focus:ring-red-400/20 focus:border-red-400 transition-all" />
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative flex items-center">
                        <input type="checkbox" name="hasDisability" checked={formData.hasDisability || false} onChange={handleInputChange} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide group-hover:text-blue-600 transition-colors">Engellilik Durumu Mevcut</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
              <button type="button" onClick={handleCloseModal} className="px-6 py-2.5 text-slate-500 hover:bg-slate-100 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all">VAZGEÇ</button>
              <button type="submit" disabled={formLoading} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale">{formLoading ? 'KAYDEDİLİYOR...' : 'KAYDET'}</button>
            </div>
          </form>
        </Modal>
      )}
    </ERPPageLayout>
  );
}
