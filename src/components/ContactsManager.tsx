import React, { useState, useEffect } from 'react';
import {
  Users,
  User,
  ShieldCheck,
  Plus,
  MapPin,
  Phone,
  Mail,
  Zap,
  Edit2,
  Trash2,
  Check,
  X,
  Search,
  Wrench,
  Percent,
  KeyRound,
  Eye,
  EyeOff,
  RefreshCw,
  LayoutDashboard,
  UserCheck,
  ClipboardCheck,
  Calendar,
  DollarSign,
  ShieldAlert,
  Lock,
  FileSpreadsheet,
  FolderSync,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  LogIn,
  Settings,
} from 'lucide-react';
import { Contact, Address, SolarSystemInfo, TechnicianDetails, NavTabId } from '../types';
import { storage, ALL_NAV_TABS, generateAlphanumericPassword, exportContactsToCsv } from '../utils/storage';

interface ContactsManagerProps {
  onSelectCustomerForDashboard?: (id: string) => void;
}

export const ContactsManager: React.FC<ContactsManagerProps> = ({
  onSelectCustomerForDashboard,
}) => {
  const [contacts, setContacts] = useState<Contact[]>(storage.getContacts());
  const [activeTab, setActiveTab] = useState<'all' | 'clients' | 'technicians'>('clients');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [isSyncingCadastros, setIsSyncingCadastros] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string; url?: string } | null>(null);

  const handleConnectAndSync = async () => {
    setIsSyncingCadastros(true);
    setSyncFeedback(null);
    try {
      await new Promise(r => setTimeout(r, 600));
      setSyncFeedback({
        type: 'success',
        message: `Cadastros locais atualizados (${contacts.length} registros salvos com segurança).`,
      });
    } catch (e: any) {
      setSyncFeedback({
        type: 'error',
        message: 'Erro ao sincronizar.',
      });
    } finally {
      setIsSyncingCadastros(false);
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };

  // Form State
  const [name, setName] = useState('');
  const [isTechnician, setIsTechnician] = useState(false);
  const [personType, setPersonType] = useState<'PF' | 'PJ'>('PF');
  const [document, setDocument] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Access Credentials & Navbar Active Permissions
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [allowedNavTabs, setAllowedNavTabs] = useState<NavTabId[]>(['checklist', 'agenda', 'cliente']);
  
  // Address
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [distanceKm, setDistanceKm] = useState(0);

  // Solar System (Client)
  const [powerKwp, setPowerKwp] = useState(10);
  const [moduleCount, setModuleCount] = useState(20);
  const [inverterBrandModel, setInverterBrandModel] = useState('');
  const [roofType, setRoofType] = useState<any>('fibrocimento');
  const [cleaningPeriodicityMonths, setCleaningPeriodicityMonths] = useState(6);

  // Technician Specifics
  const [certifications, setCertifications] = useState<string[]>(['NR-35 Trabalho em Altura', 'NR-10 Segurança Elétrica']);
  const [commissionPercentage, setCommissionPercentage] = useState(20);
  const [pixKey, setPixKey] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState(6.70);
  const [carFuelEconomyKmPerLiter, setCarFuelEconomyKmPerLiter] = useState(10);
  const [travelCostPerKm, setTravelCostPerKm] = useState(0.67);

  const [notes, setNotes] = useState('');

  const refreshList = () => {
    setContacts(storage.getContacts());
  };

  const handleOpenNewModal = (defaultTech = false) => {
    setEditingContact(null);
    setName('');
    setIsTechnician(defaultTech);
    setPersonType('PF');
    setDocument('');
    setEmail('');
    setPhone('');
    setPassword(generateAlphanumericPassword(8));
    setShowPassword(false);
    setAllowedNavTabs(
      defaultTech
        ? ['checklist', 'agenda', 'cliente']
        : ['cliente']
    );
    setStreet('');
    setNumber('');
    setComplement('');
    setNeighborhood('');
    setCity('');
    setState('');
    setZipCode('');
    setDistanceKm(0);
    setPowerKwp(10);
    setModuleCount(20);
    setInverterBrandModel('');
    setRoofType('fibrocimento');
    setCleaningPeriodicityMonths(6);
    setCertifications(['NR-35 Trabalho em Altura', 'NR-10 Segurança Elétrica']);
    setCommissionPercentage(20);
    setPixKey('');
    setVehiclePlate('');
    setFuelPricePerLiter(6.70);
    setCarFuelEconomyKmPerLiter(10);
    setTravelCostPerKm(0.67);
    setNotes('');
    setIsModalOpen(true);
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setName(contact.name);
    setIsTechnician(contact.isTechnician);
    setPersonType(contact.personType);
    setDocument(contact.document || '');
    setEmail(contact.email || '');
    setPhone(contact.phone || '');
    setPassword(contact.password || generateAlphanumericPassword(8));
    setShowPassword(false);
    setAllowedNavTabs(
      contact.allowedNavTabs && contact.allowedNavTabs.length > 0
        ? contact.allowedNavTabs
        : contact.isTechnician
        ? ['checklist', 'agenda', 'cliente']
        : ['cliente']
    );
    setStreet(contact.address.street);
    setNumber(contact.address.number);
    setComplement(contact.address.complement || '');
    setNeighborhood(contact.address.neighborhood);
    setCity(contact.address.city);
    setState(contact.address.state);
    setZipCode(contact.address.zipCode);
    setDistanceKm(contact.address.distanceKm || 0);
    
    if (contact.solarSystem) {
      setPowerKwp(contact.solarSystem.powerKwp);
      setModuleCount(contact.solarSystem.moduleCount);
      setInverterBrandModel(contact.solarSystem.inverterBrandModel);
      setRoofType(contact.solarSystem.roofType);
      setCleaningPeriodicityMonths(contact.solarSystem.cleaningPeriodicityMonths);
    }

    if (contact.technicianDetails) {
      setCertifications(contact.technicianDetails.certifications);
      setCommissionPercentage(contact.technicianDetails.commissionPercentage);
      setPixKey(contact.technicianDetails.pixKey || '');
      setVehiclePlate(contact.technicianDetails.vehiclePlate || '');
      setFuelPricePerLiter(contact.technicianDetails.fuelPricePerLiter ?? 6.70);
      setCarFuelEconomyKmPerLiter(contact.technicianDetails.carFuelEconomyKmPerLiter ?? 10);
      setTravelCostPerKm(contact.technicianDetails.travelCostPerKm ?? 0.67);
    }

    setNotes(contact.notes || '');
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente remover este cadastro?')) {
      const settings = storage.getSettings();
      storage.deleteContact(id, settings.currentUser, 'Removido pelo gestor no cadastro unificado');
      refreshList();
    }
  };

  const toggleNavTabPermission = (tabId: NavTabId) => {
    setAllowedNavTabs((prev) => {
      if (prev.includes(tabId)) {
        if (prev.length === 1) {
          alert('O usuário deve ter permissão para pelo menos 1 aba de navegação.');
          return prev;
        }
        return prev.filter((t) => t !== tabId);
      } else {
        return [...prev, tabId];
      }
    });
  };

  const togglePasswordVisibility = (contactId: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [contactId]: !prev[contactId],
    }));
  };

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();

    const addressObj: Address = {
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
      zipCode,
      distanceKm: Number(distanceKm),
    };

    const solarObj: SolarSystemInfo = {
      powerKwp: Number(powerKwp),
      moduleCount: Number(moduleCount),
      inverterBrandModel,
      roofType,
      structureType: 'fixa',
      cleaningPeriodicityMonths: Number(cleaningPeriodicityMonths),
    };

    const techObj: TechnicianDetails = {
      certifications,
      commissionPercentage: Number(commissionPercentage),
      active: true,
      color: '#16a34a',
      pixKey,
      vehiclePlate,
      fuelPricePerLiter: Number(fuelPricePerLiter),
      carFuelEconomyKmPerLiter: Number(carFuelEconomyKmPerLiter),
      travelCostPerKm: Number(travelCostPerKm),
    };

    const contactData: Contact = {
      id: editingContact ? editingContact.id : `ct-${Date.now()}`,
      name,
      isTechnician,
      personType,
      document,
      email,
      phone,
      password: password.trim() || generateAlphanumericPassword(8),
      allowedNavTabs: allowedNavTabs.length > 0 ? allowedNavTabs : (isTechnician ? ['checklist', 'agenda', 'cliente'] : ['cliente']),
      address: addressObj,
      solarSystem: !isTechnician ? solarObj : undefined,
      technicianDetails: isTechnician ? techObj : undefined,
      notes,
      createdAt: editingContact ? editingContact.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    storage.saveContact(contactData);
    refreshList();
    setIsModalOpen(false);

    // Auto-sync client registration to CadastrosElthera spreadsheet

  };

  const filteredContacts = contacts.filter((c) => {
    const matchTab = activeTab === 'all' || (activeTab === 'clients' ? !c.isTechnician : c.isTechnician);
    const matchSearch = searchQuery === '' ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.document?.includes(searchQuery);

    return matchTab && matchSearch;
  });

  return (
    <div id="contacts-manager-container" className="space-y-6">
      {/* Google Sheets Modal Popup */}
      {isSheetsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/20 text-emerald-700 rounded-xl shadow-xs">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Planilha de Cadastros (CSV / Exportação)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSheetsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Você pode exportar todos os clientes, técnicos e dados cadastrais em formato CSV compatível com o Excel e Google Sheets a qualquer momento.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => exportContactsToCsv(contacts)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Baixar Planilha de Cadastros (CSV)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl border border-amber-200">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Cadastro de Clientes & Técnicos</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Cadastro unificado com flag de técnico, dados da usina fotovoltaica e certificações de campo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={() => handleOpenNewModal(false)}
            className="px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-amber-950 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs shadow-amber-200 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Cadastrar Cliente</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenNewModal(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Cadastrar Técnico</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSheetsModalOpen(true)}
            title="Configurações e Sincronização Google Sheets & Drive"
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all active:scale-95 cursor-pointer border border-slate-200 flex items-center justify-center shadow-2xs"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-1.5 w-full sm:w-auto">
          {[
            { id: 'clients', label: `Clientes (${contacts.filter((c) => !c.isTechnician).length})` },
            { id: 'technicians', label: `Técnicos (${contacts.filter((c) => c.isTechnician).length})` },
            { id: 'all', label: `Todos (${contacts.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, CPF ou fone..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-400"
          />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContacts.map((contact) => (
          <div
            key={contact.id}
            className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
          >
            {/* Header */}
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm tracking-tight">{contact.name}</h3>
                  <span className="text-[11px] text-slate-400">{contact.document || 'Documento não informado'}</span>
                </div>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                    contact.isTechnician
                      ? 'bg-blue-50 text-blue-800 border border-blue-200'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {contact.isTechnician ? 'Técnico' : 'Cliente'}
                </span>
              </div>

              {/* Contact Info */}
              <div className="mt-3.5 space-y-1.5 text-xs text-slate-600">
                <p className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-medium">{contact.phone}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">{contact.email || 'Email não informado'}</span>
                </p>
                <p className="flex items-start gap-2 text-[11px]">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">
                    {contact.address.street}, {contact.address.number} - {contact.address.city}/{contact.address.state}
                  </span>
                </p>
              </div>

              {/* Login & Access Credentials Card */}
              <div className="mt-3.5 p-3 bg-amber-50/50 border border-amber-200/80 rounded-2xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-amber-950 uppercase flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-amber-600" /> Acesso ao App
                  </span>
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility(contact.id)}
                    className="text-[10px] text-amber-800 hover:text-amber-950 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {visiblePasswords[contact.id] ? (
                      <>
                        <EyeOff className="w-3 h-3" /> Ocultar Senha
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" /> Ver Senha
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-amber-200 text-[11px]">
                  <span className="text-slate-500">Login: <strong>{contact.phone}</strong></span>
                  <span className="font-mono font-bold text-slate-800">
                    {visiblePasswords[contact.id] ? (contact.password || 'Sem senha') : '••••••••'}
                  </span>
                </div>

                {/* Permitted Nav Tabs */}
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1">
                    Abas Permitidas ({contact.allowedNavTabs?.length || (contact.isTechnician ? 3 : 1)}/6):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {(contact.allowedNavTabs || (contact.isTechnician ? ['checklist', 'agenda', 'cliente'] : ['cliente'])).map((tabId) => {
                      const tabInfo = ALL_NAV_TABS.find((t) => t.id === tabId);
                      return (
                        <span
                          key={tabId}
                          className="px-2 py-0.5 bg-white border border-amber-200 text-amber-900 rounded-md text-[10px] font-semibold"
                        >
                          {tabInfo?.label || tabId}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Custom payload according to flag */}
              {!contact.isTechnician && contact.solarSystem && (
                <div className="mt-3.5 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-900 uppercase flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" /> Sistema Fotovoltaico
                  </span>
                  <div className="flex justify-between text-slate-700 text-[11px] pt-1">
                    <span>Potência: <b>{contact.solarSystem.powerKwp} kWp</b></span>
                    <span>Módulos: <b>{contact.solarSystem.moduleCount} placas</b></span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">
                    Telhado {contact.solarSystem.roofType} • {contact.solarSystem.inverterBrandModel}
                  </p>
                </div>
              )}

              {contact.isTechnician && contact.technicianDetails && (
                <div className="mt-3.5 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-900 uppercase flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-amber-500" /> Certificações & Comissão
                  </span>
                  <p className="text-[11px] text-slate-700 pt-1">
                    Comissão: <b>{contact.technicianDetails.commissionPercentage}% por serviço</b>
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {contact.technicianDetails.certifications.join(', ')}
                  </p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              {!contact.isTechnician ? (
                <button
                  type="button"
                  onClick={() => onSelectCustomerForDashboard?.(contact.id)}
                  className="text-amber-950 font-bold hover:underline"
                >
                  Ver Histórico ➔
                </button>
              ) : (
                <span className="text-slate-400 text-[11px]">Técnico de Campo</span>
              )}

              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => handleEdit(contact)}
                  className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Editar"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(contact.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Contact Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full p-6 space-y-4 border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 text-base tracking-tight">
                  {editingContact ? 'Editar Cadastro' : 'Novo Cadastro Unificado'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="space-y-4 text-xs">
              {/* Type Switch (Customer vs Technician Flag) */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">Tipo de Cadastro:</span>
                  <span className="text-slate-500 text-[11px]">
                    {isTechnician ? 'Técnico responsável pelo atendimento e checklists' : 'Cliente / Proprietário de Usina Solar'}
                  </span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => setIsTechnician(false)}
                    className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all ${
                      !isTechnician ? 'bg-amber-400 text-amber-950 shadow-xs' : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    Cliente
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTechnician(true)}
                    className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all ${
                      isTechnician ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    Técnico
                  </button>
                </div>
              </div>

              {/* General Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Nome Completo / Razão Social *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Ex: João da Silva ou Fazenda Solar Ltda"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo de Pessoa</label>
                  <select
                    value={personType}
                    onChange={(e) => setPersonType(e.target.value as any)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="PF">Pessoa Física (PF)</option>
                    <option value="PJ">Pessoa Jurídica (PJ)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">CPF / CNPJ</label>
                  <input
                    type="text"
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telefone / WhatsApp *</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="(11) 98765-4321"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contato@exemplo.com.br"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="border-t border-slate-100 pt-3 space-y-3">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" /> Endereço Completo
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 mb-1">Logradouro (Rua/Avenida)</label>
                    <input
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Rua das Flores"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Número</label>
                    <input
                      type="text"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="123"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Bairro</label>
                    <input
                      type="text"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="Centro"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Cidade</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Estado / UF</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  {!isTechnician && (
                    <div className="sm:col-span-3">
                      <label className="block text-amber-950 mb-1 font-bold">Distância (KM) do Cliente para Cálculo de Deslocamento</label>
                      <input
                        type="number"
                        step="0.1"
                        value={distanceKm}
                        onChange={(e) => setDistanceKm(Number(e.target.value))}
                        placeholder="Ex: 25"
                        className="w-full px-3 py-2 bg-amber-50 border border-amber-300 rounded-xl font-bold text-amber-950 focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Conditional Form Sections */}
              {!isTechnician ? (
                /* Solar Plant Specifications */
                <div className="border-t border-slate-100 pt-3 space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500" /> Dados do Sistema Fotovoltaico do Cliente
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-slate-700 mb-1">Potência (kWp)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={powerKwp}
                        onChange={(e) => setPowerKwp(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 mb-1">Qtd. Módulos</label>
                      <input
                        type="number"
                        value={moduleCount}
                        onChange={(e) => setModuleCount(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 mb-1">Tipo de Telhado</label>
                      <select
                        value={roofType}
                        onChange={(e) => setRoofType(e.target.value as any)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-800"
                      >
                        <option value="ceramica">Cerâmica</option>
                        <option value="metalico">Metálico</option>
                        <option value="laje">Laje</option>
                        <option value="solo">Usina de Solo</option>
                        <option value="fibrocimento">Fibrocimento</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-slate-700 mb-1">Marca / Modelo do Inversor</label>
                      <input
                        type="text"
                        value={inverterBrandModel}
                        onChange={(e) => setInverterBrandModel(e.target.value)}
                        placeholder="Ex: Fronius Primo 8.2 ou Huawei"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 mb-1">Periodicidade</label>
                      <select
                        value={cleaningPeriodicityMonths}
                        onChange={(e) => setCleaningPeriodicityMonths(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-800"
                      >
                        <option value={3}>A cada 3 meses</option>
                        <option value={4}>A cada 4 meses</option>
                        <option value={6}>A cada 6 meses (Padrão)</option>
                        <option value={12}>Anual</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                /* Technician Details */
                <div className="border-t border-slate-100 pt-3 space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-500" /> Dados Operacionais do Técnico
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-700 mb-1">Comissão por Serviço (%)</label>
                      <input
                        type="number"
                        value={commissionPercentage}
                        onChange={(e) => setCommissionPercentage(Number(e.target.value))}
                        placeholder="25"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 mb-1">Chave PIX para Repasses</label>
                      <input
                        type="text"
                        value={pixKey}
                        onChange={(e) => setPixKey(e.target.value)}
                        placeholder="CPF ou Chave Aleatória"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-900"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-slate-700 mb-1">Certificações (NR-35 / NR-10)</label>
                      <input
                        type="text"
                        value={certifications.join(', ')}
                        onChange={(e) => setCertifications(e.target.value.split(',').map((s) => s.trim()))}
                        placeholder="NR-35 Trabalho em Altura, NR-10 Segurança Elétrica"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-900"
                      />
                    </div>
                    <div className="sm:col-span-2 pt-2 border-t border-slate-200">
                      <label className="block font-bold text-slate-800 mb-1.5">🚗 Custo de Deslocamento & Combustível por KM</label>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-600 mb-0.5">Preço Gasolina (R$/l)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={fuelPricePerLiter}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setFuelPricePerLiter(val);
                              if (carFuelEconomyKmPerLiter > 0) {
                                setTravelCostPerKm(Number((val / carFuelEconomyKmPerLiter).toFixed(2)));
                              }
                            }}
                            placeholder="6.70"
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-600 mb-0.5">Autonomia (km/l)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={carFuelEconomyKmPerLiter}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setCarFuelEconomyKmPerLiter(val);
                              if (val > 0) {
                                setTravelCostPerKm(Number((fuelPricePerLiter / val).toFixed(2)));
                              }
                            }}
                            placeholder="10"
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-emerald-800 font-bold mb-0.5">Custo por KM (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={travelCostPerKm}
                            onChange={(e) => setTravelCostPerKm(Number(e.target.value))}
                            placeholder="1.49"
                            className="w-full px-2.5 py-1.5 bg-emerald-50 border border-emerald-300 rounded-xl font-black text-emerald-950 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Access Credentials & Navbar Permissions Section */}
              <div className="border-t border-slate-100 pt-3 space-y-3 bg-amber-50/40 p-4 rounded-2xl border border-amber-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    <span>Acesso ao App: Telefone & Senha de 8 Dígitos</span>
                  </h4>
                  <span className="text-[10px] bg-amber-200/80 text-amber-950 font-bold px-2 py-0.5 rounded-full">
                    Autenticação & Permissões
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Phone login preview */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                      Login no App (Telefone cadastrado)
                    </label>
                    <div className="px-3 py-2 bg-white border border-amber-200 rounded-xl text-slate-700 font-medium flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{phone ? phone : 'Informe o telefone acima'}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      O usuário informará este telefone na tela de acesso.
                    </span>
                  </div>

                  {/* Password field */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-slate-700 font-bold text-[11px]">
                        Senha de Acesso (8 Dígitos Alfanuméricos) *
                      </label>
                      <button
                        type="button"
                        onClick={() => setPassword(generateAlphanumericPassword(8))}
                        className="text-[10px] text-amber-900 hover:text-amber-950 font-bold flex items-center gap-1 bg-amber-200/70 hover:bg-amber-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-2.5 h-2.5" /> Gerar Nova Senha
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                        required
                        placeholder="Ex: a8B9x2Z1"
                        maxLength={16}
                        className="w-full pl-3.5 pr-10 py-2 bg-white border border-amber-300 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-400 text-xs tracking-wider"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                        title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                      <span>Mínimo 8 caracteres alfanuméricos</span>
                      <span className={password.length === 8 ? 'text-emerald-700 font-bold' : 'text-slate-500 font-medium'}>
                        {password.length}/8 caracteres
                      </span>
                    </div>
                  </div>
                </div>

                {/* Navbar Multi-selection Section */}
                <div className="pt-3 border-t border-amber-200/80 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-900 text-xs block">
                        Permissões de Telas (Itens da Barra de Navegação / Navbar)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Marque quais abas este usuário poderá visualizar e acessar no app.
                      </span>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setAllowedNavTabs(['geral', 'cliente', 'checklist', 'agenda', 'financeiro', 'contatos'])}
                        className="text-[10px] px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-lg font-bold transition-colors cursor-pointer"
                      >
                        Todas (Total)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllowedNavTabs(['checklist', 'agenda', 'cliente'])}
                        className="text-[10px] px-2.5 py-1 bg-blue-100 hover:bg-blue-200 border border-blue-300 text-blue-900 rounded-lg font-bold transition-colors cursor-pointer"
                      >
                        Padrão Técnico
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllowedNavTabs(['cliente'])}
                        className="text-[10px] px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 text-emerald-900 rounded-lg font-bold transition-colors cursor-pointer"
                      >
                        Padrão Cliente
                      </button>
                    </div>
                  </div>

                  {/* Multi-select Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                    {ALL_NAV_TABS.map((tab) => {
                      const isSelected = allowedNavTabs.includes(tab.id);
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => toggleNavTabPermission(tab.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all flex items-start space-x-2.5 cursor-pointer ${
                            isSelected
                              ? 'bg-white border-amber-500 ring-2 ring-amber-400/30 shadow-xs'
                              : 'bg-white/60 border-slate-200 text-slate-400 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                              isSelected
                                ? 'bg-amber-400 border-amber-500 text-amber-950'
                                : 'bg-white border-slate-300'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <span className={`font-bold text-xs block truncate ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>
                              {tab.label}
                            </span>
                            <span className="text-[10px] text-slate-500 line-clamp-1 block">
                              {tab.description}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-amber-900/80 italic block">
                    * O usuário terá seu menu Navbar adaptado exclusivamente às {allowedNavTabs.length} abas selecionadas.
                  </span>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-400 hover:bg-amber-500 text-amber-950 rounded-xl font-bold transition-all shadow-xs shadow-amber-200"
                >
                  Salvar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
