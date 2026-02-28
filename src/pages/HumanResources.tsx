import React, { useState, useEffect } from 'react';
import { Users, Plus, Eye, Search, User, Phone, Mail, MapPin, Calendar, Briefcase, Heart, AlertCircle, X } from 'lucide-react';
import type { Personnel } from '../types';

export default function HumanResources() {
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Personnel | null>(null);
  const [formData, setFormData] = useState<Partial<Personnel>>({});
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchPersonnel();
  }, []);

  const fetchPersonnel = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/personnel');
      if (response.ok) {
        const data = await response.json();
        setPersonnelList(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching personnel:', error);
      setPersonnelList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (person?: Personnel) => {
    if (person) {
      setSelectedPerson(person);
      setFormData({ 
        ...person,
        childrenAges: Array.isArray(person.childrenAges) ? person.childrenAges : [],
        hasDisability: person.hasDisability || false
      });
    } else {
      setSelectedPerson(null);
      setFormData({
        childrenCount: 0,
        childrenAges: [],
        hasDisability: false
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPerson(null);
    setFormData({});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'childrenCount') {
      const count = parseInt(value) || 0;
      // Resize array safely
      const currentAges = Array.isArray(formData.childrenAges) ? formData.childrenAges : [];
      const newAges = Array(count).fill(0).map((_, i) => currentAges[i] || 0);
      
      setFormData(prev => ({ 
        ...prev, 
        [name]: count,
        childrenAges: newAges
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleChildAgeChange = (index: number, value: string) => {
    const age = parseInt(value) || 0;
    const currentAges = Array.isArray(formData.childrenAges) ? formData.childrenAges : [];
    const newAges = [...currentAges];
    // Ensure array is long enough
    while (newAges.length <= index) {
      newAges.push(0);
    }
    newAges[index] = age;
    setFormData(prev => ({ ...prev, childrenAges: newAges }));
  };

  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const url = selectedPerson ? `/api/personnel/${selectedPerson.id}` : '/api/personnel';
      const method = selectedPerson ? 'PATCH' : 'POST';
      
      const body = {
        ...formData,
        id: selectedPerson ? selectedPerson.id : generateId(),
        createdAt: selectedPerson ? selectedPerson.createdAt : new Date().toISOString()
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        await fetchPersonnel();
        handleCloseModal();
      } else {
        console.error('Failed to save personnel');
      }
    } catch (error) {
      console.error('Error saving personnel:', error);
    } finally {
      setFormLoading(false);
    }
  };

  const filteredPersonnel = personnelList
    .filter(p => 
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.department?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // İşten çıkanları (endDate dolu olanları) en sona at
      if (a.endDate && !b.endDate) return 1;
      if (!a.endDate && b.endDate) return -1;
      return 0;
    });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">İnsan Kaynakları</h1>
          <p className="text-slate-600">Personel yönetimi ve takibi</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Yeni Personel Ekle
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Personel Ara (İsim, Görev, Departman)..." 
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Personnel List */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-3">Adı Soyadı</th>
              <th className="px-6 py-3">Görevi</th>
              <th className="px-6 py-3">Departman</th>
              <th className="px-6 py-3">İletişim</th>
              <th className="px-6 py-3 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Yükleniyor...</td>
              </tr>
            ) : filteredPersonnel.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Kayıtlı personel bulunamadı.</td>
              </tr>
            ) : (
              filteredPersonnel.map((person) => {
                const isExited = !!person.endDate;
                const rowStyle = isExited ? 'bg-red-50' : 'hover:bg-slate-50';
                const textStyle = isExited ? 'line-through decoration-red-500 decoration-2 text-slate-500' : '';
                
                return (
                <tr key={person.id} className={`${rowStyle} transition-colors`}>
                  <td className={`px-6 py-4 ${textStyle}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isExited ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                        {(person.firstName || '').charAt(0)}{(person.lastName || '').charAt(0)}
                      </div>
                      <div>
                        <div className={`font-medium ${isExited ? 'text-slate-600' : 'text-slate-900'}`}>{person.firstName} {person.lastName}</div>
                        <div className="text-xs text-slate-500">{person.tcNumber}</div>
                      </div>
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-slate-700 ${textStyle}`}>{person.role}</td>
                  <td className={`px-6 py-4 text-slate-700 ${textStyle}`}>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${isExited ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                      {person.department}
                    </span>
                  </td>
                  <td className={`px-6 py-4 ${textStyle}`}>
                    <div className="flex flex-col text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Phone size={14} /> {person.mobilePhone}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                        <Mail size={14} /> {person.email || '-'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleOpenModal(person)}
                      className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center justify-end gap-1 ml-auto"
                    >
                      <Eye size={16} /> Gözat
                    </button>
                  </td>
                </tr>
              );
            })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b flex justify-between items-center z-10">
              <h2 className="text-xl font-bold text-slate-800">
                {selectedPerson ? 'Personel Detayları' : 'Yeni Personel Ekle'}
              </h2>
              <button onClick={handleCloseModal} className="text-slate-500 hover:text-slate-700" aria-label="Kapat" title="Kapat">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8">
              {/* 1. Kişisel Bilgiler */}
              <section>
                <h3 className="text-lg font-semibold text-indigo-700 mb-4 flex items-center gap-2">
                  <User size={20} /> Kişisel Bilgiler
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-1">Adı</label>
                    <input id="firstName" required name="firstName" value={formData.firstName || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" title="Adı" placeholder="Adı" />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-1">Soyadı</label>
                    <input id="lastName" required name="lastName" value={formData.lastName || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" title="Soyadı" placeholder="Soyadı" />
                  </div>
                  <div>
                    <label htmlFor="tcNumber" className="block text-sm font-medium text-slate-700 mb-1">TC Kimlik No</label>
                    <input id="tcNumber" required name="tcNumber" maxLength={11} value={formData.tcNumber || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" title="TC Kimlik No" placeholder="TC Kimlik No" />
                  </div>
                  <div>
                    <label htmlFor="birthDate" className="block text-sm font-medium text-slate-700 mb-1">Doğum Tarihi</label>
                    <input id="birthDate" type="date" name="birthDate" value={formData.birthDate || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" title="Doğum Tarihi" />
                  </div>
                  <div>
                    <label htmlFor="birthPlace" className="block text-sm font-medium text-slate-700 mb-1">Doğum Yeri</label>
                    <input id="birthPlace" name="birthPlace" value={formData.birthPlace || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" title="Doğum Yeri" placeholder="Doğum Yeri" />
                  </div>
                  <div>
                    <label htmlFor="maritalStatus" className="block text-sm font-medium text-slate-700 mb-1">Medeni Durum</label>
                    <select id="maritalStatus" name="maritalStatus" value={formData.maritalStatus || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" title="Medeni Durum" aria-label="Medeni Durum">
                      <option value="">Seçiniz</option>
                      <option value="Bekar">Bekar</option>
                      <option value="Evli">Evli</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* 2. İletişim Bilgileri */}
              <section>
                <h3 className="text-lg font-semibold text-indigo-700 mb-4 flex items-center gap-2">
                  <MapPin size={20} /> İletişim Bilgileri
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3">
                    <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-1">Ev Adresi</label>
                    <textarea id="address" name="address" rows={2} value={formData.address || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" title="Ev Adresi" placeholder="Ev Adresi" />
                  </div>
                  <div>
                    <label htmlFor="mobilePhone" className="block text-sm font-medium text-slate-700 mb-1">Cep Telefonu</label>
                    <input id="mobilePhone" type="tel" name="mobilePhone" value={formData.mobilePhone || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" title="Cep Telefonu" placeholder="Cep Telefonu" />
                  </div>
                  <div>
                    <label htmlFor="homePhone" className="block text-sm font-medium text-slate-700 mb-1">Ev Telefonu</label>
                    <input id="homePhone" type="tel" name="homePhone" value={formData.homePhone || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" title="Ev Telefonu" placeholder="Ev Telefonu" />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">E-posta Adresi</label>
                    <input id="email" type="email" name="email" value={formData.email || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" title="E-posta Adresi" placeholder="E-posta Adresi" />
                  </div>
                </div>
              </section>

              {/* 3. Acil Durum */}
              <section>
                <h3 className="text-lg font-semibold text-indigo-700 mb-4 flex items-center gap-2">
                  <AlertCircle size={20} /> Acil Durumda Ulaşılacak Kişi
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="emergencyContactName" className="block text-sm font-medium text-slate-700 mb-1">Adı Soyadı</label>
                    <input id="emergencyContactName" name="emergencyContactName" value={formData.emergencyContactName || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" title="Adı Soyadı" placeholder="Adı Soyadı" />
                  </div>
                  <div>
                    <label htmlFor="emergencyContactRelation" className="block text-sm font-medium text-slate-700 mb-1">Yakınlık Derecesi</label>
                    <input id="emergencyContactRelation" name="emergencyContactRelation" value={formData.emergencyContactRelation || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" title="Yakınlık Derecesi" placeholder="Yakınlık Derecesi" />
                  </div>
                  <div>
                    <label htmlFor="emergencyContactPhone" className="block text-sm font-medium text-slate-700 mb-1">Cep Telefonu</label>
                    <input id="emergencyContactPhone" type="tel" name="emergencyContactPhone" value={formData.emergencyContactPhone || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" title="Cep Telefonu" placeholder="Cep Telefonu" />
                  </div>
                </div>
              </section>

              {/* 4. İş Bilgileri */}
              <section>
                <h3 className="text-lg font-semibold text-indigo-700 mb-4 flex items-center gap-2">
                  <Briefcase size={20} /> İş Bilgileri
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="department" className="block text-sm font-medium text-slate-700 mb-1">Departmanı</label>
                    <select id="department" name="department" value={formData.department || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" title="Departmanı" aria-label="Departmanı">
                      <option value="">Seçiniz</option>
                      <option value="Yönetim">Yönetim</option>
                      <option value="İnsan Kaynakları">İnsan Kaynakları</option>
                      <option value="Muhasebe">Muhasebe</option>
                      <option value="Satış">Satış</option>
                      <option value="Pazarlama">Pazarlama</option>
                      <option value="Üretim">Üretim</option>
                      <option value="Depo">Depo</option>
                      <option value="Sevkiyat">Sevkiyat</option>
                      <option value="Tasarım">Tasarım</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-1">Görevi</label>
                    <input id="role" name="role" value={formData.role || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" title="Görevi" placeholder="Görevi" />
                  </div>
                  <div>
                    <label htmlFor="sskNumber" className="block text-sm font-medium text-slate-700 mb-1">SSK Numarası</label>
                    <input id="sskNumber" name="sskNumber" value={formData.sskNumber || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" title="SSK Numarası" placeholder="SSK Numarası" />
                  </div>
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-slate-700 mb-1">İşe Giriş Tarihi</label>
                    <input id="startDate" type="date" name="startDate" value={formData.startDate || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" title="İşe Giriş Tarihi" />
                  </div>
                  <div>
                    <label htmlFor="recruitmentPlace" className="block text-sm font-medium text-slate-700 mb-1">İşe Alım Yeri</label>
                    <input id="recruitmentPlace" name="recruitmentPlace" value={formData.recruitmentPlace || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" title="İşe Alım Yeri" placeholder="İşe Alım Yeri" />
                  </div>
                  <div></div>
                  <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-slate-700 mb-1">İşten Çıkış Tarihi</label>
                    <input id="endDate" type="date" name="endDate" value={formData.endDate || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" title="İşten Çıkış Tarihi" />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="exitReason" className="block text-sm font-medium text-slate-700 mb-1">İşten Çıkış Sebebi</label>
                    <input id="exitReason" name="exitReason" value={formData.exitReason || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" title="İşten Çıkış Sebebi" placeholder="İşten Çıkış Sebebi" />
                  </div>
                </div>
              </section>

              {/* 5. Aile ve Sağlık */}
              <section>
                <h3 className="text-lg font-semibold text-indigo-700 mb-4 flex items-center gap-2">
                  <Heart size={20} /> Aile ve Sağlık
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="childrenCount" className="block text-sm font-medium text-slate-700 mb-1">Çocuk Sayısı</label>
                    <select id="childrenCount" name="childrenCount" value={formData.childrenCount || 0} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" title="Çocuk Sayısı" aria-label="Çocuk Sayısı">
                      {[...Array(11)].map((_, i) => (
                        <option key={i} value={i}>{i}</option>
                      ))}
                    </select>
                  </div>
                  
                  {formData.childrenCount && formData.childrenCount > 0 ? (
                    <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <p className="col-span-full text-xs font-semibold text-slate-500 mb-1">Çocukların Yaşları:</p>
                      {[...Array(Number(formData.childrenCount) || 0)].map((_, i) => (
                        <div key={i} className="flex flex-col">
                          <label htmlFor={`child-age-${i}`} className="text-xs text-slate-500">{i + 1}. Çocuk</label>
                          <input 
                            id={`child-age-${i}`}
                            type="number" 
                            min="0" 
                            max="99" 
                            value={Array.isArray(formData.childrenAges) && formData.childrenAges[i] !== undefined ? formData.childrenAges[i] : ''} 
                            onChange={(e) => handleChildAgeChange(i, e.target.value)}
                            className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                            title={`${i + 1}. Çocuk Yaşı`}
                            placeholder="Yaş"
                          />
                        </div>
                      ))}
                    </div>
                  ) : <div className="md:col-span-2"></div>}

                  <div>
                    <label htmlFor="parentsStatus" className="block text-sm font-medium text-slate-700 mb-1">Anne Baba Sağ mı?</label>
                    <select id="parentsStatus" name="parentsStatus" value={formData.parentsStatus || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" title="Anne Baba Sağ mı?" aria-label="Anne Baba Sağ mı?">
                      <option value="">Seçiniz</option>
                      <option value="İkisi de Sağ">İkisi de Sağ</option>
                      <option value="Anne Sağ, Baba Vefat">Anne Sağ, Baba Vefat</option>
                      <option value="Baba Sağ, Anne Vefat">Baba Sağ, Anne Vefat</option>
                      <option value="İkisi de Vefat">İkisi de Vefat</option>
                    </select>
                  </div>

                  <div className="space-y-2 md:col-span-3">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="hasDisability"
                        name="hasDisability" 
                        checked={formData.hasDisability || false} 
                        onChange={handleInputChange}
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        title="Engeli var mı?"
                      />
                      <label htmlFor="hasDisability" className="text-sm font-medium text-slate-700">Engeli var mı?</label>
                    </div>
                    {formData.hasDisability && (
                      <textarea 
                        name="disabilityDescription" 
                        placeholder="Engel durumu hakkında açıklama giriniz..."
                        rows={2} 
                        value={formData.disabilityDescription || ''} 
                        onChange={handleInputChange} 
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none mt-2"
                        title="Engel durumu açıklaması"
                      />
                    )}
                  </div>
                </div>
              </section>

              {/* Action Buttons */}
              <div className="sticky bottom-0 bg-white pt-4 pb-2 border-t flex justify-end gap-3 z-10">
                <button 
                  type="button" 
                  onClick={handleCloseModal}
                  className="px-6 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  İptal
                </button>
                <button 
                  type="submit" 
                  disabled={formLoading}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
                >
                  {formLoading ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
