import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Play,
  Share2,
  MapPin,
  Phone,
  Filter,
  Check,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit3,
  FileText,
  History,
  RefreshCw,
  LogIn,
  Settings
} from 'lucide-react';
import { Appointment, Contact, SolarServiceItem, TechnicalChecklist } from '../types';
import { storage } from '../utils/storage';
import { notificationService } from '../utils/notifications';

interface AppointmentsManagerProps {
  onStartChecklist: (appointmentId: string, customerId: string) => void;
  onEditChecklist?: (checklist: TechnicalChecklist) => void;
  onOpenPdfReport?: (checklist: TechnicalChecklist) => void;
  onSelectCustomer: (customerId: string) => void;
}

export const AppointmentsManager: React.FC<AppointmentsManagerProps> = ({
  onStartChecklist,
  onEditChecklist,
  onOpenPdfReport,
  onSelectCustomer,
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>(storage.getAppointments());
  const [clients, setClients] = useState<Contact[]>(storage.getClients());
  const [technicians, setTechnicians] = useState<Contact[]>(storage.getTechnicians());
  const [services, setServices] = useState<SolarServiceItem[]>(storage.getServices());
  const [allChecklists, setAllChecklists] = useState<TechnicalChecklist[]>(storage.getChecklists());
  const settings = storage.getSettings();

  const [filterTechnician, setFilterTechnician] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isGcalModalOpen, setIsGcalModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [copiedIcal, setCopiedIcal] = useState(false);

  // New Appointment Form State
  const [newCustomerId, setNewCustomerId] = useState(clients[0]?.id || '');
  const [newTechnicianId, setNewTechnicianId] = useState(technicians[0]?.id || '');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newTime, setNewTime] = useState('09:00');
  const [newDuration, setNewDuration] = useState(120);
  const [newSelectedServices, setNewSelectedServices] = useState<string[]>(['srv-1']);
  const [newNotes, setNewNotes] = useState('');
  const [newAmount, setNewAmount] = useState(450);

  // Edit Appointment Form State
  const [editCustomerId, setEditCustomerId] = useState('');
  const [editTechnicianId, setEditTechnicianId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editDuration, setEditDuration] = useState(120);
  const [editSelectedServices, setEditSelectedServices] = useState<string[]>([]);
  const [editNotes, setEditNotes] = useState('');
  const [editAmount, setEditAmount] = useState(0);
  const [editStatus, setEditStatus] = useState<any>('agendado');

  const refreshList = () => {
    setAppointments(storage.getAppointments());
    setClients(storage.getClients());
    setTechnicians(storage.getTechnicians());
    setServices(storage.getServices());
    setAllChecklists(storage.getChecklists());
  };

  const openNewModal = () => {
    const currentClients = storage.getClients();
    const currentTechs = storage.getTechnicians();
    if (currentClients.length > 0 && (!newCustomerId || !currentClients.some(c => c.id === newCustomerId))) {
      setNewCustomerId(currentClients[0].id);
    }
    if (currentTechs.length > 0 && (!newTechnicianId || !currentTechs.some(t => t.id === newTechnicianId))) {
      setNewTechnicianId(currentTechs[0].id);
    }
    setIsNewModalOpen(true);
  };

  const openEditModal = (apt: Appointment) => {
    setEditingAppointment(apt);
    setEditCustomerId(apt.customerId);
    setEditTechnicianId(apt.technicianId);
    setEditDate(apt.scheduledDate);
    setEditTime(apt.scheduledTime);
    setEditDuration(apt.estimatedDurationMinutes || 90);
    setEditSelectedServices(apt.serviceIds && apt.serviceIds.length > 0 ? apt.serviceIds : ['srv-1']);
    setEditNotes(apt.notes || '');
    setEditAmount(apt.totalAmount || 0);
    setEditStatus(apt.status);
    setIsEditModalOpen(true);
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    const customer = clients.find((c) => c.id === newCustomerId);
    const technician = technicians.find((t) => t.id === newTechnicianId);

    if (!customer || !technician) return;

    const newApt: Appointment = {
      id: `apt-${Date.now()}`,
      customerId: newCustomerId,
      technicianId: newTechnicianId,
      serviceIds: newSelectedServices,
      status: 'agendado',
      scheduledDate: newDate,
      scheduledTime: newTime,
      estimatedDurationMinutes: Number(newDuration),
      notes: newNotes,
      totalAmount: Number(newAmount),
      notificationSent: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save locally
    const saved = storage.saveAppointment(newApt);

    // Automatically open Google Calendar event creation for this new appointment
    openGoogleCalendarAdd(saved);

    // Trigger push notification to technician
    notificationService.notifyTechnician(
      `📅 Novo Agendamento: ${customer.name}`,
      `Atendimento agendado para ${newDate.split('-').reverse().join('/')} às ${newTime}. Técnico: ${technician.name}.`,
      { appointmentId: saved.id, customerId: customer.id, priority: 'media' }
    );

    refreshList();
    setIsNewModalOpen(false);
  };

  const handleSaveEditAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAppointment) return;

    const customer = clients.find((c) => c.id === editCustomerId);
    const technician = technicians.find((t) => t.id === editTechnicianId);

    if (!customer || !technician) return;

    const updatedApt: Appointment = {
      ...editingAppointment,
      customerId: editCustomerId,
      technicianId: editTechnicianId,
      scheduledDate: editDate,
      scheduledTime: editTime,
      estimatedDurationMinutes: Number(editDuration),
      serviceIds: editSelectedServices,
      notes: editNotes,
      totalAmount: Number(editAmount),
      status: editStatus,
      updatedAt: new Date().toISOString(),
    };

    storage.saveAppointment(updatedApt);
    refreshList();
    setIsEditModalOpen(false);
    setEditingAppointment(null);
  };

  const handleUpdateStatus = async (appointment: Appointment, newStatus: any) => {
    appointment.status = newStatus;
    appointment.updatedAt = new Date().toISOString();

    storage.saveAppointment(appointment);
    refreshList();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja realmente remover este agendamento?')) {
      storage.deleteAppointment(id);
      refreshList();
    }
  };

  const copyIcalUrl = () => {
    const url = settings.googleCalendarIcalUrl || 'https://calendar.google.com/calendar/ical/256f7c038eaf3761a6266660d80213727d070d59a07c26a715d6f00f1f6c0625%40group.calendar.google.com/private-27219e3eda7c4ad0193e7e6ce43decb8/basic.ics';
    navigator.clipboard.writeText(url);
    setCopiedIcal(true);
    setTimeout(() => setCopiedIcal(false), 2500);
  };

  const openGoogleCalendarAdd = (apt: Appointment) => {
    const customer = clients.find((c) => c.id === apt.customerId);
    const technician = technicians.find((t) => t.id === apt.technicianId);
    const title = encodeURIComponent(`Visita Técnica: ${customer?.name || 'Cliente'} (${technician?.name || 'Técnico'})`);
    const details = encodeURIComponent(
      `Serviço de Limpeza e Manutenção Solar\n` +
      `Cliente: ${customer?.name}\n` +
      `Endereço: ${customer?.address?.street}, ${customer?.address?.number} - ${customer?.address?.city}\n` +
      `Técnico Responsável: ${technician?.name} (${technician?.email || ''})\n` +
      `Valor: R$ ${apt.totalAmount.toFixed(2)}\n` +
      `Observações: ${apt.notes || 'Nenhuma'}`
    );
    const location = encodeURIComponent(customer?.address ? `${customer.address.street}, ${customer.address.number} - ${customer.address.city}/${customer.address.state}` : 'Brasil');
    
    const [year, month, day] = apt.scheduledDate.split('-').map(Number);
    const [hour, minute] = apt.scheduledTime.split(':').map(Number);
    const startDate = new Date(year, month - 1, day, hour, minute);
    const endDate = new Date(startDate.getTime() + (apt.estimatedDurationMinutes || 120) * 60000);

    const formatDateStr = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const dates = `${formatDateStr(startDate)}/${formatDateStr(endDate)}`;

    const calId = settings.googleCalendarId || '256f7c038eaf3761a6266660d80213727d070d59a07c26a715d6f00f1f6c0625@group.calendar.google.com';
    let gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}&add=${encodeURIComponent(calId)}`;
    
    if (technician?.email) {
      gcalUrl += `&add=${encodeURIComponent(technician.email)}`;
    }

    const width = 900;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    window.open(gcalUrl, 'GoogleCalendarPopup', `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`);
  };

  const filteredAppointments = appointments.filter((apt) => {
    const matchTech = filterTechnician === 'all' || apt.technicianId === filterTechnician;
    const matchStatus = filterStatus === 'all' || apt.status === filterStatus;
    return matchTech && matchStatus;
  });

  return (
    <div id="appointments-manager-container" className="space-y-6">
      {/* Top Header & Filters */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center font-black text-amber-950 text-sm shadow-xs shadow-amber-200">
              <CalendarIcon className="w-4 h-4 text-amber-950" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Agendamentos & Google Calendar</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestão de visitas técnicas vinculadas à agenda privada Google com sincronização em tempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Tech Filter */}
          <select
            value={filterTechnician}
            onChange={(e) => setFilterTechnician(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="all">Todos os Técnicos</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="all">Todos os Status</option>
            <option value="agendado">Agendados</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="concluido">Concluídos</option>
            <option value="cancelado">Cancelados</option>
          </select>

          <button
            type="button"
            id="btn-open-new-appointment-modal"
            onClick={openNewModal}
            className="px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-amber-950 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs shadow-amber-200 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Novo Agendamento</span>
          </button>

          <button
            type="button"
            onClick={() => setIsGcalModalOpen(true)}
            title="Configurações e Sincronização Google Calendar"
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all active:scale-95 cursor-pointer border border-slate-200 flex items-center justify-center shadow-2xs"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Google Calendar Modal Popup */}
      {isGcalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-400 text-amber-950 rounded-xl shadow-xs">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Sincronização da Agenda via Link iCal Secreto</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGcalModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3 bg-amber-50/60 border border-amber-200/80 rounded-xl p-4">
                <div className="p-2 bg-amber-400 text-amber-950 rounded-xl shrink-0 mt-0.5 shadow-xs">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 space-y-2">
                  <span className="font-bold text-slate-900 text-xs block">Endereço Secreto iCal do Google Calendar:</span>
                  <div className="bg-white p-2.5 rounded-lg border border-amber-200 text-slate-700 font-mono text-[11px] break-all select-all">
                    https://calendar.google.com/calendar/ical/256f7c038eaf3761a6266660d80213727d070d59a07c26a715d6f00f1f6c0625%40group.calendar.google.com/private-27219e3eda7c4ad0193e7e6ce43decb8/basic.ics
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Copie este link iCal privado para sincronizar e assinar esta agenda em qualquer aplicativo compatível (Google Calendar, Apple Calendar, Outlook, etc.).
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('https://calendar.google.com/calendar/ical/256f7c038eaf3761a6266660d80213727d070d59a07c26a715d6f00f1f6c0625%40group.calendar.google.com/private-27219e3eda7c4ad0193e7e6ce43decb8/basic.ics');
                    setCopiedIcal(true);
                    setTimeout(() => setCopiedIcal(false), 2500);
                  }}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>{copiedIcal ? '✓ Link iCal Copiado!' : 'Copiar Link iCal'}</span>
                </button>
                <a
                  href="https://calendar.google.com/calendar/u/0/r"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-amber-950 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <span>Abrir no Google Calendar</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appointments List / Pipeline Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAppointments.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl p-12 text-center text-slate-400 border border-dashed border-slate-300">
            <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
            <p className="text-sm font-semibold">Nenhum agendamento encontrado com os filtros selecionados.</p>
            <button
              onClick={openNewModal}
              className="mt-3 px-4 py-2 bg-amber-400 hover:bg-amber-500 text-amber-950 text-xs font-bold rounded-xl shadow-xs cursor-pointer"
            >
              Criar Novo Agendamento
            </button>
          </div>
        ) : (
          filteredAppointments.map((apt) => {
            const customer = clients.find((c) => c.id === apt.customerId);
            const technician = technicians.find((t) => t.id === apt.technicianId);
            const isCompleted = apt.status === 'concluido';

            return (
              <div
                key={apt.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs transition-all space-y-3.5 flex flex-col justify-between ${
                  isCompleted ? 'border-slate-200 bg-slate-50/50' : 'border-slate-200 hover:border-amber-400'
                }`}
              >
                {/* Header */}
                <div className="space-y-1">
                  <div className="flex items-start justify-between">
                    <button
                      onClick={() => customer && onSelectCustomer(customer.id)}
                      className="font-bold text-slate-900 text-sm hover:text-amber-600 text-left line-clamp-1 transition-colors"
                    >
                      {customer?.name || 'Cliente'}
                    </button>
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border ${
                        apt.status === 'concluido'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : apt.status === 'em_andamento'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : apt.status === 'cancelado'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {apt.status === 'concluido' ? 'Concluído' : apt.status === 'em_andamento' ? 'Em Andamento' : apt.status === 'cancelado' ? 'Cancelado' : 'Agendado'}
                    </span>
                  </div>

                  <div className="flex items-center text-xs text-slate-500 font-medium space-x-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      {apt.scheduledDate.split('-').reverse().join('/')} às {apt.scheduledTime}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span>{apt.estimatedDurationMinutes} min</span>
                  </div>
                </div>

                {/* Body details */}
                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-700 border border-slate-100">
                  <p className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="font-semibold">{technician?.name || 'Técnico'}</span>
                  </p>
                  {customer?.address && (
                    <p className="flex items-start gap-1.5 text-[11px] text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">
                        {customer.address.street}, {customer.address.number} - {customer.address.neighborhood}, {customer.address.city}
                      </span>
                    </p>
                  )}
                  <p className="text-[11px] text-slate-900 font-bold pt-1 border-t border-slate-200">
                    Valor Estimado: <span className="text-emerald-600">R$ {apt.totalAmount.toFixed(2)}</span>
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  {!isCompleted ? (
                    <button
                      type="button"
                      onClick={() => onStartChecklist(apt.id, apt.customerId)}
                      className="w-full py-2 bg-amber-400 hover:bg-amber-500 text-amber-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-amber-950 text-amber-950" />
                      <span>Iniciar Checklist Técnico</span>
                    </button>
                  ) : (
                    (() => {
                      const linkedChecklist = allChecklists.find(
                        (c) => c.id === apt.checklistId || c.appointmentId === apt.id
                      );
                      return linkedChecklist ? (
                        <div className="grid grid-cols-2 gap-2">
                          {onOpenPdfReport && (
                            <button
                              type="button"
                              onClick={() => onOpenPdfReport(linkedChecklist)}
                              className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Ver Laudo PDF</span>
                            </button>
                          )}
                          {onEditChecklist && (
                            <button
                              type="button"
                              onClick={() => onEditChecklist(linkedChecklist)}
                              className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3 text-amber-700" />
                              <span>Editar Laudo</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onStartChecklist(apt.id, apt.customerId)}
                          className="w-full py-1.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                        >
                          <span>Criar Laudo Técnico</span>
                        </button>
                      );
                    })()
                  )}

                  <button
                    type="button"
                    onClick={() => openGoogleCalendarAdd(apt)}
                    className="w-full py-1.5 px-3 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Enviar ou adicionar este agendamento ao Google Calendar"
                  >
                    <CalendarIcon className="w-3.5 h-3.5 text-sky-600" />
                    <span>Adicionar ao Google Calendar</span>
                  </button>

                  <div className="flex items-center justify-between text-xs">
                    <select
                      value={apt.status}
                      onChange={(e) => handleUpdateStatus(apt, e.target.value)}
                      className="text-[11px] py-1 px-2 border border-slate-200 rounded-lg bg-white text-slate-700 font-medium cursor-pointer"
                    >
                      <option value="agendado">Status: Agendado</option>
                      <option value="em_andamento">Status: Em Andamento</option>
                      <option value="concluido">Status: Concluído</option>
                      <option value="cancelado">Status: Cancelado</option>
                    </select>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(apt)}
                        className="text-[11px] text-slate-500 hover:text-amber-700 font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        title="Editar agendamento e sincronizar agenda"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(apt.id)}
                        className="text-[11px] text-slate-400 hover:text-rose-600 font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        title="Excluir agendamento do app e do Google Calendar"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Appointment Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 bg-amber-400 rounded-lg flex items-center justify-center font-black text-amber-950 text-xs">
                  <CalendarIcon className="w-4 h-4 text-amber-950" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Novo Agendamento Técnico</h3>
              </div>
              <button onClick={() => setIsNewModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Cliente / Usina Solar *</label>
                {clients.length === 0 ? (
                  <p className="text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-xs">
                    Nenhum cliente cadastrado. Cadastre um cliente na aba "Contatos & Técnicos" antes de agendar.
                  </p>
                ) : (
                  <select
                    value={newCustomerId}
                    onChange={(e) => {
                      setNewCustomerId(e.target.value);
                      const sel = clients.find((c) => c.id === e.target.value);
                      if (sel?.solarSystem?.moduleCount) {
                        setNewAmount(180 + sel.solarSystem.moduleCount * 16);
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800"
                    required
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.solarSystem?.powerKwp ? `(${c.solarSystem.powerKwp} kWp)` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Técnico Designado *</label>
                {technicians.length === 0 ? (
                  <p className="text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-xs">
                    Nenhum técnico cadastrado. Cadastre um técnico na aba "Contatos & Técnicos".
                  </p>
                ) : (
                  <select
                    value={newTechnicianId}
                    onChange={(e) => setNewTechnicianId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800"
                    required
                  >
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data *</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Horário *</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Duração (minutos)</label>
                  <input
                    type="number"
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Valor Estimado (R$)</label>
                  <input
                    type="number"
                    value={newAmount}
                    onChange={(e) => setNewAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Services Multi-Select */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Serviços a Executar ({newSelectedServices.length} selecionado{newSelectedServices.length !== 1 ? 's' : ''})
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto p-1 bg-slate-50 border border-slate-200 rounded-xl">
                  {services.map((srv) => {
                    const isSelected = newSelectedServices.includes(srv.id);
                    return (
                      <label
                        key={srv.id}
                        className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-all ${
                          isSelected ? 'bg-amber-100/70 border border-amber-300' : 'bg-white border border-slate-100 hover:bg-slate-100/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewSelectedServices((prev) => [...prev, srv.id]);
                            } else {
                              if (newSelectedServices.length > 1) {
                                setNewSelectedServices((prev) => prev.filter((id) => id !== srv.id));
                              }
                            }
                          }}
                          className="mt-0.5 rounded text-amber-500 focus:ring-amber-400 h-3.5 w-3.5"
                        />
                        <div className="min-w-0 flex-1 text-xs">
                          <span className="font-bold text-slate-900 block leading-tight">{srv.title}</span>
                          <span className="text-[10px] text-slate-500 leading-tight block truncate">{srv.description}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observações para o Técnico</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Ex: Levar tanque de água deionizada 1000L e equipamento NR-35."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-950 font-medium">
                ⚡ Este atendimento será sincronizado automaticamente com o <b>Google Calendar</b> e enviará notificação push ao técnico.
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-amber-950 rounded-xl font-bold shadow-xs shadow-amber-200 cursor-pointer"
                >
                  Salvar & Sincronizar Calendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Appointment Modal */}
      {isEditModalOpen && editingAppointment && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 bg-amber-400 rounded-lg flex items-center justify-center font-black text-amber-950 text-xs">
                  <Edit3 className="w-4 h-4 text-amber-950" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Editar Agendamento & Google Calendar</h3>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingAppointment(null);
                }}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditAppointment} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Cliente / Usina Solar *</label>
                <select
                  value={editCustomerId}
                  onChange={(e) => setEditCustomerId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800"
                  required
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.solarSystem?.powerKwp ? `(${c.solarSystem.powerKwp} kWp)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Técnico Designado *</label>
                <select
                  value={editTechnicianId}
                  onChange={(e) => setEditTechnicianId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800"
                  required
                >
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data *</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Horário *</label>
                  <input
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Duração (minutos)</label>
                  <input
                    type="number"
                    value={editDuration}
                    onChange={(e) => setEditDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Valor Total (R$)</label>
                  <input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 font-semibold"
                  >
                    <option value="agendado">Agendado</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluido">Concluído</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              {/* Services Multi-Select */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Serviços a Executar ({editSelectedServices.length} selecionado{editSelectedServices.length !== 1 ? 's' : ''})
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-36 overflow-y-auto p-1 bg-slate-50 border border-slate-200 rounded-xl">
                  {services.map((srv) => {
                    const isSelected = editSelectedServices.includes(srv.id);
                    return (
                      <label
                        key={srv.id}
                        className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-all ${
                          isSelected ? 'bg-amber-100/70 border border-amber-300' : 'bg-white border border-slate-100 hover:bg-slate-100/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditSelectedServices((prev) => [...prev, srv.id]);
                            } else {
                              if (editSelectedServices.length > 1) {
                                setEditSelectedServices((prev) => prev.filter((id) => id !== srv.id));
                              }
                            }
                          }}
                          className="mt-0.5 rounded text-amber-500 focus:ring-amber-400 h-3.5 w-3.5"
                        />
                        <div className="min-w-0 flex-1 text-xs">
                          <span className="font-bold text-slate-900 block leading-tight">{srv.title}</span>
                          <span className="text-[10px] text-slate-500 leading-tight block truncate">{srv.description}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observações para o Técnico</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Ex: Levar tanque de água deionizada 1000L e equipamento NR-35."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-950 font-medium">
                ⚡ Ao salvar, o evento anterior no <b>Google Calendar</b> será excluído e um novo evento com os dados atualizados será registrado.
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingAppointment(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-amber-950 rounded-xl font-bold shadow-xs shadow-amber-200 cursor-pointer"
                >
                  Salvar Alterações & Re-sincronizar Calendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
