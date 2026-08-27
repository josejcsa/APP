import React, { useState, useEffect } from 'react';
import {
  User,
  Zap,
  Calendar,
  DollarSign,
  TrendingUp,
  FileText,
  Clock,
  Sparkles,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  Download,
  Share2,
  Plus,
  AlertCircle,
  Edit3,
  Trash2,
  Folder,
  History,
  Lock,
  Save,
  X,
  CheckCircle2
} from 'lucide-react';
import { Contact, TechnicalChecklist, Appointment, FinancialRecord, AuthSession, Address, SolarSystemInfo } from '../types';
import { storage } from '../utils/storage';
import { formatCurrency, formatNumberBRL, formatPowerKw, formatPercentGain } from '../utils/formatters';

interface ClientDashboardProps {
  selectedCustomerId?: string;
  session?: AuthSession | null;
  onSelectCustomer: (id: string) => void;
  onStartNewChecklist: (appointmentId?: string, customerId?: string) => void;
  onEditChecklist?: (checklist: TechnicalChecklist) => void;
  onOpenPdfReport: (checklist: TechnicalChecklist) => void;
  onScheduleAppointment: (customerId?: string) => void;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({
  selectedCustomerId,
  session,
  onSelectCustomer,
  onStartNewChecklist,
  onEditChecklist,
  onOpenPdfReport,
  onScheduleAppointment,
}) => {
  const [clients, setClients] = useState<Contact[]>(storage.getClients());
  const technicians = storage.getTechnicians();
  const [allChecklists, setAllChecklists] = useState<TechnicalChecklist[]>(storage.getChecklists());
  const [allAppointments, setAllAppointments] = useState<Appointment[]>(storage.getAppointments());
  const [allFinancials, setAllFinancials] = useState<FinancialRecord[]>(storage.getFinancials());
  const settings = storage.getSettings();

  const isClientUser = Boolean(session && !session.isAdmin && !session.isTechnician);
  const isAdminUser = Boolean(session?.isAdmin);
  const isTechnicianUser = Boolean(session?.isTechnician);

  // Identify matching client if user is client
  const loggedClient = clients.find((c) => 
    (session?.contactId && c.id === session.contactId) || 
    (session?.phone && (c.phone === session.phone || c.phone.replace(/\D/g, '') === session.phone.replace(/\D/g, '')))
  ) || clients[0];

  const [activeCustomerId, setActiveCustomerId] = useState<string>(() => {
    if (isClientUser && loggedClient) {
      return loggedClient.id;
    }
    return selectedCustomerId || (clients[0]?.id || '');
  });

  useEffect(() => {
    if (isClientUser && loggedClient) {
      setActiveCustomerId(loggedClient.id);
    } else if (selectedCustomerId) {
      setActiveCustomerId(selectedCustomerId);
    }
  }, [selectedCustomerId, isClientUser, loggedClient?.id]);

  // Delete modal state (Admin only)
  const [checklistToDelete, setChecklistToDelete] = useState<TechnicalChecklist | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>('');
  const [deleteOperator, setDeleteOperator] = useState<string>(session?.name || settings.currentUser || 'Administrador');

  // Client Self-Edit Modal State
  const [isSelfEditOpen, setIsSelfEditOpen] = useState(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState('');
  
  const currentClient = isClientUser && loggedClient 
    ? loggedClient 
    : (clients.find((c) => c.id === activeCustomerId) || clients[0]);

  // Edit form state
  const [selfName, setSelfName] = useState('');
  const [selfDocument, setSelfDocument] = useState('');
  const [selfPhone, setSelfPhone] = useState('');
  const [selfEmail, setSelfEmail] = useState('');
  const [selfStreet, setSelfStreet] = useState('');
  const [selfNumber, setSelfNumber] = useState('');
  const [selfComplement, setSelfComplement] = useState('');
  const [selfNeighborhood, setSelfNeighborhood] = useState('');
  const [selfCity, setSelfCity] = useState('');
  const [selfState, setSelfState] = useState('');
  const [selfZipCode, setSelfZipCode] = useState('');
  const [selfPowerKwp, setSelfPowerKwp] = useState(10);
  const [selfModuleCount, setSelfModuleCount] = useState(20);
  const [selfInverterBrandModel, setSelfInverterBrandModel] = useState('');
  const [selfRoofType, setSelfRoofType] = useState('fibrocimento');
  const [selfCleaningPeriodicityMonths, setSelfCleaningPeriodicityMonths] = useState(6);

  const openSelfEditModal = () => {
    if (!currentClient) return;
    setSelfName(currentClient.name || '');
    setSelfDocument(currentClient.document || '');
    setSelfPhone(currentClient.phone || '');
    setSelfEmail(currentClient.email || '');
    setSelfStreet(currentClient.address?.street || '');
    setSelfNumber(currentClient.address?.number || '');
    setSelfComplement(currentClient.address?.complement || '');
    setSelfNeighborhood(currentClient.address?.neighborhood || '');
    setSelfCity(currentClient.address?.city || '');
    setSelfState(currentClient.address?.state || '');
    setSelfZipCode(currentClient.address?.zipCode || '');
    setSelfPowerKwp(currentClient.solarSystem?.powerKwp || 10);
    setSelfModuleCount(currentClient.solarSystem?.moduleCount || 20);
    setSelfInverterBrandModel(currentClient.solarSystem?.inverterBrandModel || '');
    setSelfRoofType(currentClient.solarSystem?.roofType || 'fibrocimento');
    setSelfCleaningPeriodicityMonths(currentClient.solarSystem?.cleaningPeriodicityMonths || 6);
    setIsSelfEditOpen(true);
  };

  const handleSaveSelfData = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClient) return;

    const updatedAddress: Address = {
      street: selfStreet,
      number: selfNumber,
      complement: selfComplement,
      neighborhood: selfNeighborhood,
      city: selfCity,
      state: selfState,
      zipCode: selfZipCode,
      distanceKm: currentClient.address?.distanceKm || 0,
      coordinates: currentClient.address?.coordinates,
    };

    const updatedSolar: SolarSystemInfo = {
      powerKwp: Number(selfPowerKwp),
      moduleCount: Number(selfModuleCount),
      inverterBrandModel: selfInverterBrandModel,
      roofType: selfRoofType,
      structureType: currentClient.solarSystem?.structureType || 'fixa',
      cleaningPeriodicityMonths: Number(selfCleaningPeriodicityMonths),
    };

    const updatedContact: Contact = {
      ...currentClient,
      name: selfName.trim(),
      document: selfDocument.trim(),
      phone: selfPhone.trim(),
      email: selfEmail.trim(),
      address: updatedAddress,
      solarSystem: updatedSolar,
      updatedAt: new Date().toISOString(),
    };

    const saved = storage.saveContact(updatedContact, session?.name || selfName);
    setClients(storage.getClients());
    setEditSuccessMsg('Seus dados cadastrais foram atualizados com sucesso!');
    setTimeout(() => {
      setEditSuccessMsg('');
      setIsSelfEditOpen(false);
    }, 1500);
  };

  const clientChecklists = allChecklists.filter((c) => c.customerId === currentClient?.id);
  const clientAppointments = allAppointments.filter((a) => a.customerId === currentClient?.id);
  const clientFinancials = allFinancials.filter((f) => f.customerId === currentClient?.id);

  // Client Accumulated KPIs
  const totalSpent = clientFinancials.reduce((acc, curr) => acc + curr.netAmount, 0);
  const avgEfficiencyGain = clientChecklists.length > 0
    ? (clientChecklists.reduce((acc, curr) => acc + (curr.after.calculatedGainPercent || 0), 0) / clientChecklists.length).toFixed(1)
    : '0.0';

  const totalEstimatedExtraKwh = clientChecklists.reduce((acc, curr) => acc + (curr.after.estimatedMonthlyExtraKwh || 0), 0);
  const totalEstimatedSavingsBrl = clientChecklists.reduce((acc, curr) => acc + (curr.after.estimatedMonthlySavingsBrl || 0), 0);

  const solar = currentClient?.solarSystem;

  const handleConfirmDeleteChecklist = () => {
    if (!checklistToDelete) return;
    storage.deleteChecklist(checklistToDelete.id, deleteOperator, deleteReason);
    setAllChecklists(storage.getChecklists());
    setAllAppointments(storage.getAppointments());
    setAllFinancials(storage.getFinancials());
    setChecklistToDelete(null);
    setDeleteReason('');
  };

  return (
    <div id="client-dashboard-container" className="space-y-6">
      {/* Customer Selector Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center font-black text-amber-950 text-sm shadow-xs shadow-amber-200">
            <User className="w-4 h-4 text-amber-950" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {isClientUser ? 'Meu Portal de Atendimento' : 'Painel Individual do Cliente'}
            </label>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              {isClientUser ? `Bem-vindo, ${currentClient?.name || 'Cliente'}` : 'Histórico Técnico & Financeiro'}
            </h2>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 w-full sm:w-auto">
          {!isClientUser && clients.length > 0 && (
            <select
              id="select-active-client-portal"
              value={currentClient?.id || ''}
              onChange={(e) => {
                setActiveCustomerId(e.target.value);
                onSelectCustomer(e.target.value);
              }}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400 w-full sm:w-64"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.solarSystem?.powerKwp ? `(${c.solarSystem.powerKwp} kWp)` : ''}
                </option>
              ))}
            </select>
          )}

          {/* Botão de Auto-Edição de Dados para o Cliente */}
          {isClientUser && currentClient && (
            <button
              type="button"
              id="btn-edit-my-info"
              onClick={openSelfEditModal}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              <span>Alterar Meus Dados</span>
            </button>
          )}

          {/* Botão de Novo Checklist (Apenas Admins e Técnicos) */}
          {!isClientUser && (
            <button
              type="button"
              onClick={() => onStartNewChecklist(undefined, currentClient?.id)}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-amber-950 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs shadow-amber-200 transition-all active:scale-95 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Novo Checklist</span>
            </button>
          )}
        </div>
      </div>

      {currentClient ? (
        <>
          {/* Client Overview Card & Solar Specifications */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Contact & Address */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-base tracking-tight">{currentClient.name}</h3>
                  <span className="text-xs text-slate-400">{currentClient.personType || 'Pessoa Física'} • {currentClient.document || 'Sem documento'}</span>
                </div>
                <button
                  type="button"
                  onClick={openSelfEditModal}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Editar dados cadastrais e endereço"
                >
                  <Edit3 className="w-3 h-3 text-amber-700" />
                  <span>Editar Dados</span>
                </button>
              </div>

              <div className="space-y-2.5 text-xs text-slate-700">
                <div className="flex items-center space-x-2">
                  <Phone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="font-semibold">{currentClient.phone || 'Telefone não informado'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="text-slate-600">{currentClient.email || 'E-mail não informado'}</span>
                </div>
                <div className="flex items-start space-x-2">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span className="text-slate-600 leading-relaxed">
                    {currentClient.address?.street || 'Rua não cadastrada'}, {currentClient.address?.number || 'S/N'}
                    {currentClient.address?.complement ? ` (${currentClient.address.complement})` : ''} - {currentClient.address?.neighborhood || ''}, {currentClient.address?.city || ''}/{currentClient.address?.state || ''}
                  </span>
                </div>
              </div>

              {currentClient.notes && (
                <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-600 border border-slate-100">
                  <span className="font-bold block text-slate-800 mb-0.5">Observações da Instalação:</span>
                  {currentClient.notes}
                </div>
              )}
            </div>

            {/* Solar Plant Technical Specs */}
            <div className="lg:col-span-2 bg-white text-slate-900 p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900">Especificações da Usina Fotovoltaica</h3>
                </div>
                <span className="text-[11px] bg-slate-100 px-2.5 py-0.5 rounded-full text-slate-700 font-semibold border border-slate-200">
                  Limpeza recomendada a cada {solar?.cleaningPeriodicityMonths || 6} meses
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Potência Total</span>
                  <span className="text-xl font-black text-slate-900">{solar?.powerKwp || 0} kWp</span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Qtd. Módulos</span>
                  <span className="text-xl font-black text-slate-900">{solar?.moduleCount || 0} un.</span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Estrutura Telhado</span>
                  <span className="text-sm font-bold text-slate-900 uppercase">{solar?.roofType || 'Cerâmica'}</span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Inversor</span>
                  <span className="text-xs font-semibold text-slate-900 truncate block">{solar?.inverterBrandModel || 'Padrão'}</span>
                </div>
              </div>

              {/* Accumulated ROI metrics for this customer */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
                <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200/50">
                  <span className="text-amber-900/70 block text-[10px] font-bold uppercase">Ganho Médio Solar</span>
                  <span className="text-base font-black text-amber-700">+{avgEfficiencyGain}%</span>
                </div>
                <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200/50">
                  <span className="text-emerald-900/70 block text-[10px] font-bold uppercase">Economia Gerada</span>
                  <span className="text-base font-black text-emerald-700">{formatCurrency(totalEstimatedSavingsBrl)}/mês</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Total Investido</span>
                  <span className="text-base font-black text-slate-800">{formatCurrency(totalSpent)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Historical Cleanings & Checklists Timeline */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-500" />
                  Histórico de Atendimentos & Relatórios Técnicos
                </h3>
                <p className="text-xs text-slate-400">Histórico completo de laudos com antes/depois e assinaturas digitais</p>
              </div>
            </div>

            {clientChecklists.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
                <p className="text-xs font-medium">Nenhum checklist concluído para esta usina ainda.</p>
                {!isClientUser && (
                  <button
                    type="button"
                    onClick={() => onStartNewChecklist(undefined, currentClient.id)}
                    className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-amber-950 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    Realizar Primeiro Checklist
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {clientChecklists.map((chk) => {
                  const tech = technicians.find((t) => t.id === chk.technicianId);
                  const gain = chk.after.calculatedGainPercent || 0;

                  return (
                    <div
                      key={chk.id}
                      className="border border-slate-200 rounded-2xl p-4 hover:border-amber-400 transition-colors bg-white space-y-3 shadow-2xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-black text-slate-900 text-xs">{chk.protocolNumber}</span>
                          <span className="text-xs text-slate-400">• Data: {chk.date.split('-').reverse().join('/')}</span>
                          <span className="text-xs text-slate-700">• Técnico: {tech?.name || 'Técnico'}</span>
                        </div>

                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            +{gain.toFixed(1)}% Ganho
                          </span>
                          <button
                            type="button"
                            onClick={() => onOpenPdfReport(chk)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Ver Laudo PDF</span>
                          </button>
                          {/* Botão de Edição (Admins e Técnicos) */}
                          {!isClientUser && onEditChecklist && (
                            <button
                              type="button"
                              onClick={() => onEditChecklist(chk)}
                              title="Editar todos os dados deste checklist"
                              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                              <span>Editar</span>
                            </button>
                          )}
                          {/* Botão de Exclusão (Apenas Admins) */}
                          {isAdminUser && (
                            <button
                              type="button"
                              onClick={() => setChecklistToDelete(chk)}
                              title="Excluir checklist (mantém registro na auditoria)"
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Excluir</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Summary Metrics & Photos */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <span className="text-slate-400 block text-[10px] font-bold uppercase">Potência Instantânea:</span>
                          <span className="font-bold text-slate-900">
                            {formatPowerKw(chk.before.readingKwBefore)} kW ➔ {formatPowerKw(chk.after.readingKwAfter)} kW
                          </span>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <span className="text-slate-400 block text-[10px] font-bold uppercase">Economia Estimada:</span>
                          <span className="font-bold text-emerald-700">
                            + {formatCurrency(chk.after.estimatedMonthlySavingsBrl || 0)} / mês
                          </span>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <span className="text-slate-400 block text-[10px] font-bold uppercase">Valor do Serviço:</span>
                          <span className="font-bold text-slate-900">
                            {formatCurrency(chk.serviceValue)} ({chk.paymentMethod.toUpperCase()})
                          </span>
                        </div>
                      </div>

                      {/* Photos Preview */}
                      <div className="grid grid-cols-2 gap-3">
                        {chk.before.photos.length > 0 && (
                          <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                            <div className="bg-slate-900 text-white text-[9px] font-bold px-2 py-0.5">FOTO ANTES DA LIMPEZA</div>
                            <img
                              src={chk.before.photos[0].dataUrl}
                              alt="Antes"
                              className="w-full h-28 object-cover"
                            />
                          </div>
                        )}
                        {chk.after.photos.length > 0 && (
                          <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                            <div className="bg-amber-400 text-amber-950 text-[9px] font-black px-2 py-0.5">FOTO DEPOIS DA LIMPEZA</div>
                            <img
                              src={chk.after.photos[0].dataUrl}
                              alt="Depois"
                              className="w-full h-28 object-cover"
                            />
                          </div>
                        )}
                      </div>

                      {/* Card Audit Trail & Nuvem Badge */}
                      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-[10px] text-slate-400 gap-1.5 font-mono">
                        <div className="flex items-center space-x-1 flex-wrap">
                          <History className="w-3 h-3 text-slate-400" />
                          <span>Criado por: <strong className="text-slate-700">{chk.createdBy || tech?.name || 'Técnico'}</strong> em {new Date(chk.createdAt || chk.date).toLocaleString('pt-BR')}</span>
                          {chk.updatedBy && chk.updatedAt && chk.updatedAt !== chk.createdAt && (
                            <span className="text-amber-800">
                              • Última alteração por: <strong>{chk.updatedBy}</strong> ({new Date(chk.updatedAt).toLocaleTimeString('pt-BR')})
                            </span>
                          )}
                        </div>
                        <div className="text-emerald-700 font-semibold flex items-center gap-1">
                          <span>✅ Sincronizado</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-xs text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <User className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Nenhum cliente cadastrado ainda</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Cadastre seu primeiro cliente ou inicie um checklist para visualizar os dados técnicos da usina, histórico de atendimentos e laudos em PDF.
          </p>
          {!isClientUser && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onStartNewChecklist()}
                className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold text-xs rounded-xl shadow-xs shadow-amber-200 transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Atendimento / Checklist</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal de Alteração dos Próprios Dados do Cliente */}
      {isSelfEditOpen && currentClient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center font-bold">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Alterar Meus Dados de Cadastro</h3>
                  <p className="text-xs text-slate-500">Atualize suas informações de contato, endereço e especificações da usina.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSelfEditOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editSuccessMsg && (
              <div className="m-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{editSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveSelfData} className="p-6 space-y-5 text-xs">
              {/* Seção 1: Dados Pessoais */}
              <div>
                <h4 className="font-bold text-slate-900 text-xs mb-3 uppercase tracking-wider flex items-center gap-1 text-amber-600">
                  <User className="w-3.5 h-3.5" /> 1. Dados Pessoais / Empresa
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nome Completo / Razão Social *</label>
                    <input
                      type="text"
                      required
                      value={selfName}
                      onChange={(e) => setSelfName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-amber-400 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">CPF ou CNPJ</label>
                    <input
                      type="text"
                      value={selfDocument}
                      onChange={(e) => setSelfDocument(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">WhatsApp / Telefone *</label>
                    <input
                      type="text"
                      required
                      value={selfPhone}
                      onChange={(e) => setSelfPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-amber-400 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">E-mail</label>
                    <input
                      type="email"
                      value={selfEmail}
                      onChange={(e) => setSelfEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Endereço */}
              <div className="pt-3 border-t border-slate-100">
                <h4 className="font-bold text-slate-900 text-xs mb-3 uppercase tracking-wider flex items-center gap-1 text-amber-600">
                  <MapPin className="w-3.5 h-3.5" /> 2. Endereço da Instalação
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Rua / Logradouro</label>
                    <input
                      type="text"
                      value={selfStreet}
                      onChange={(e) => setSelfStreet(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Número</label>
                    <input
                      type="text"
                      value={selfNumber}
                      onChange={(e) => setSelfNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Complemento</label>
                    <input
                      type="text"
                      value={selfComplement}
                      onChange={(e) => setSelfComplement(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Bairro</label>
                    <input
                      type="text"
                      value={selfNeighborhood}
                      onChange={(e) => setSelfNeighborhood(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Cidade</label>
                    <input
                      type="text"
                      value={selfCity}
                      onChange={(e) => setSelfCity(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Estado (UF)</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={selfState}
                      onChange={(e) => setSelfState(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-amber-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">CEP</label>
                    <input
                      type="text"
                      value={selfZipCode}
                      onChange={(e) => setSelfZipCode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-amber-400 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 3: Usina Solar */}
              <div className="pt-3 border-t border-slate-100">
                <h4 className="font-bold text-slate-900 text-xs mb-3 uppercase tracking-wider flex items-center gap-1 text-amber-600">
                  <Zap className="w-3.5 h-3.5" /> 3. Dados da Usina Solar
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Potência (kWp)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={selfPowerKwp}
                      onChange={(e) => setSelfPowerKwp(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-amber-400 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Qtd. Módulos</label>
                    <input
                      type="number"
                      value={selfModuleCount}
                      onChange={(e) => setSelfModuleCount(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-amber-400 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Inversor (Marca/Modelo)</label>
                    <input
                      type="text"
                      value={selfInverterBrandModel}
                      onChange={(e) => setSelfInverterBrandModel(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tipo de Telhado</label>
                    <select
                      value={selfRoofType}
                      onChange={(e) => setSelfRoofType(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-amber-400"
                    >
                      <option value="fibrocimento">Fibrocimento</option>
                      <option value="ceramica">Cerâmica</option>
                      <option value="metalico">Metálico / Trapezoidal</option>
                      <option value="laje">Laje de Concreto</option>
                      <option value="solo">Estrutura de Solo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Intervalo de Limpeza</label>
                    <select
                      value={selfCleaningPeriodicityMonths}
                      onChange={(e) => setSelfCleaningPeriodicityMonths(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-amber-400"
                    >
                      <option value={3}>A cada 3 meses</option>
                      <option value={6}>A cada 6 meses (Padrão)</option>
                      <option value={12}>A cada 12 meses</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSelfEditOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold rounded-xl shadow-xs shadow-amber-200 flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Checklist Deletion Confirmation Modal with Audit Log */}
      {checklistToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Excluir Laudo #{checklistToDelete.protocolNumber}?</h3>
                <p className="text-xs text-slate-400">Esta ação registrará o evento no log de auditoria permanente.</p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 space-y-1">
              <p><strong>Aviso de Auditoria:</strong> O laudo de <strong>{currentClient?.name}</strong> será removido, mas o histórico da exclusão ficará gravado com o seu usuário e horário.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Operador Responsável pela Exclusão *</label>
              <input
                type="text"
                value={deleteOperator}
                onChange={(e) => setDeleteOperator(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Motivo da Exclusão (Opcional)</label>
              <textarea
                rows={2}
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Ex: Laudo duplicado / teste de demonstração"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setChecklistToDelete(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteChecklist}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                Confirmar Exclusão com Auditoria
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
