import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  DollarSign,
  Fuel,
  Award,
  Package,
  Trash2,
  Edit2,
  Download,
  Zap,
  Check,
  X,
  Link as LinkIcon,
  QrCode
} from 'lucide-react';
import { AccountPayable, PaymentStatusAP, Contact, Appointment, TechnicalChecklist } from '../../types';
import { storage } from '../../utils/storage';
import { formatCurrency } from '../../utils/formatters';
import { calculateTechnicianRouteCost } from '../../utils/routeCost';
import { PixQrCodeSection } from './PixQrCodeSection';
import { PixKeyType, detectPixKeyType } from '../../utils/pixPayload';

interface AccountsPayableTabProps {
  contacts: Contact[];
  appointments: Appointment[];
  checklists: TechnicalChecklist[];
  onRefreshParent: () => void;
}

export const AccountsPayableTab: React.FC<AccountsPayableTabProps> = ({
  contacts,
  appointments,
  checklists,
  onRefreshParent
}) => {
  const [payables, setPayables] = useState<AccountPayable[]>(storage.getAccountsPayable());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [categoryFilter, setCategoryFilter] = useState<string>('todas');
  const [periodFilter, setPeriodFilter] = useState<string>('todos');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AccountPayable | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payingItem, setPayingItem] = useState<AccountPayable | null>(null);
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payMethod, setPayMethod] = useState<AccountPayable['paymentMethod']>('pix');
  const [payNotes, setPayNotes] = useState('');

  // Delete modal state
  const [itemToDelete, setItemToDelete] = useState<AccountPayable | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  // Import suggestions state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Form fields
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<AccountPayable['category']>('combustivel_rota');
  const [beneficiary, setBeneficiary] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<AccountPayable['paymentMethod']>('pix');
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>('email');
  const [status, setStatus] = useState<PaymentStatusAP>('pendente');
  const [linkedAppointmentId, setLinkedAppointmentId] = useState('');
  const [linkedChecklistId, setLinkedChecklistId] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [notes, setNotes] = useState('');

  const technicians = useMemo(() => contacts.filter(c => c.isTechnician), [contacts]);
  const todayISO = new Date().toISOString().slice(0, 10);

  // Busca dados de chave PIX a partir do cadastro do contato/técnico
  const getPixDetailsFromContact = (techId?: string, benName?: string): { key: string; type: PixKeyType } => {
    let contact = techId ? contacts.find(c => c.id === techId) : undefined;
    if (!contact && benName) {
      contact = contacts.find(c => c.name.trim().toLowerCase() === benName.trim().toLowerCase());
    }
    if (!contact) {
      return { key: '', type: 'email' };
    }

    // 1. Chave explícita cadastrada no técnico
    if (contact.technicianDetails?.pixKey && contact.technicianDetails.pixKey.trim()) {
      const raw = contact.technicianDetails.pixKey.trim();
      return { key: raw, type: detectPixKeyType(raw) };
    }

    // 2. CPF / CNPJ do cadastro
    if (contact.document && contact.document.trim()) {
      const digits = contact.document.replace(/\D/g, '');
      if (digits.length === 11) {
        return { key: digits, type: 'cpf' };
      }
      if (digits.length === 14) {
        return { key: digits, type: 'cnpj' };
      }
    }

    // 3. E-mail do cadastro
    if (contact.email && contact.email.trim() && contact.email.includes('@')) {
      return { key: contact.email.trim().toLowerCase(), type: 'email' };
    }

    // 4. Telefone celular do cadastro
    if (contact.phone && contact.phone.trim()) {
      const digits = contact.phone.replace(/\D/g, '');
      if (digits.length >= 10) {
        return { key: digits, type: 'telefone' };
      }
    }

    return { key: '', type: 'email' };
  };

  const refreshList = () => {
    setPayables(storage.getAccountsPayable());
    onRefreshParent();
  };

  const handleOpenNewModal = () => {
    setEditingItem(null);
    setDescription('');
    setCategory('combustivel_rota');
    const defaultTech = technicians[0];
    const techName = defaultTech?.name || '';
    const techId = defaultTech?.id || '';
    setBeneficiary(techName);
    setTechnicianId(techId);
    setAmount(0);
    setDueDate(todayISO);
    setPaymentDate('');
    setPaymentMethod('pix');
    setStatus('pendente');
    setLinkedAppointmentId('');
    setLinkedChecklistId('');
    setDocumentNumber('');
    setNotes('');

    const pixData = getPixDetailsFromContact(techId, techName);
    setPixKey(pixData.key);
    setPixKeyType(pixData.type);

    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: AccountPayable) => {
    setEditingItem(item);
    setDescription(item.description);
    setCategory(item.category);
    setBeneficiary(item.beneficiary);
    setTechnicianId(item.technicianId || '');
    setAmount(item.amount);
    setDueDate(item.dueDate);
    setPaymentDate(item.paymentDate || '');
    setPaymentMethod(item.paymentMethod);
    setStatus(item.status);
    setLinkedAppointmentId(item.appointmentId || '');
    setLinkedChecklistId(item.checklistId || '');
    setDocumentNumber(item.documentNumber || '');
    setNotes(item.notes || '');

    if (item.pixKey) {
      setPixKey(item.pixKey);
      setPixKeyType(item.pixKeyType || detectPixKeyType(item.pixKey));
    } else {
      const pixData = getPixDetailsFromContact(item.technicianId, item.beneficiary);
      setPixKey(pixData.key);
      setPixKeyType(pixData.type);
    }

    setIsModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || amount <= 0) {
      alert('Preencha uma descrição válida e um valor maior que zero.');
      return;
    }

    const payload: AccountPayable = {
      id: editingItem ? editingItem.id : `pay-${Date.now()}`,
      description: description.trim(),
      category,
      beneficiary: beneficiary.trim(),
      technicianId: technicianId || undefined,
      amount: Number(amount),
      dueDate,
      paymentDate: status === 'pago' ? (paymentDate || todayISO) : undefined,
      paymentMethod,
      status,
      appointmentId: linkedAppointmentId || undefined,
      checklistId: linkedChecklistId || undefined,
      documentNumber: documentNumber.trim() || undefined,
      pixKey: paymentMethod === 'pix' ? pixKey.trim() : undefined,
      pixKeyType: paymentMethod === 'pix' ? pixKeyType : undefined,
      reconciled: editingItem ? editingItem.reconciled : false,
      reconciliationBatchId: editingItem ? editingItem.reconciliationBatchId : undefined,
      notes: notes.trim() || undefined,
      createdAt: editingItem ? editingItem.createdAt : new Date().toISOString(),
    };

    storage.saveAccountPayable(payload);
    refreshList();
    setIsModalOpen(false);
  };

  const handleOpenPayModal = (item: AccountPayable) => {
    setPayingItem(item);
    setPayDate(todayISO);
    setPayMethod(item.paymentMethod || 'pix');
    setPayNotes(item.notes || '');
    setIsPayModalOpen(true);
  };

  const handleConfirmPayment = () => {
    if (!payingItem) return;
    const updated: AccountPayable = {
      ...payingItem,
      status: 'pago',
      paymentDate: payDate,
      paymentMethod: payMethod,
      notes: payNotes ? `${payingItem.notes || ''} [Baixa: ${payNotes}]`.trim() : payingItem.notes,
    };
    storage.saveAccountPayable(updated);
    refreshList();
    setIsPayModalOpen(false);
    setPayingItem(null);
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    storage.deleteAccountPayable(itemToDelete.id, undefined, deleteReason);
    refreshList();
    setItemToDelete(null);
    setDeleteReason('');
  };

  // Find unimported route costs and commissions
  const unimportedItems = useMemo(() => {
    const list: {
      type: 'rota' | 'comissao';
      title: string;
      category: AccountPayable['category'];
      beneficiary: string;
      technicianId?: string;
      amount: number;
      appointmentId?: string;
      checklistId?: string;
      dueDate: string;
      notes: string;
    }[] = [];

    // Check appointments for route fuel
    appointments.forEach(apt => {
      const alreadyHasPayable = payables.some(p => p.appointmentId === apt.id && p.category === 'combustivel_rota');
      if (!alreadyHasPayable) {
        const client = contacts.find(c => c.id === apt.customerId);
        const tech = contacts.find(c => c.id === apt.technicianId);
        const route = calculateTechnicianRouteCost(client, tech);
        if (route.totalRouteCost > 0) {
          const visitDate = apt.scheduledDate || (apt as any).date;
          list.push({
            type: 'rota',
            title: `Combustível Rota - ${client?.name || 'Cliente'} (${visitDate})`,
            category: 'combustivel_rota',
            beneficiary: tech?.name || 'Técnico Responsável',
            technicianId: tech?.id,
            amount: route.totalRouteCost,
            appointmentId: apt.id,
            dueDate: visitDate,
            notes: `Cálculo automático: ${route.roundTripKm.toFixed(1)} km ida/volta x R$ ${tech?.technicianDetails?.travelCostPerKm?.toFixed(2) || '0,67'}/km`,
          });
        }
      }
    });

    // Check checklists for technician commission
    checklists.forEach(chk => {
      if (chk.status === 'concluido' && chk.serviceValue > 0) {
        const alreadyHasCommission = payables.some(p => p.checklistId === chk.id && p.category === 'comissao_tecnico');
        if (!alreadyHasCommission) {
          const tech = contacts.find(c => c.id === chk.technicianId);
          const commissionPercent = tech?.technicianDetails?.commissionPercentage || 25;
          const commissionAmount = (chk.serviceValue * commissionPercent) / 100;
          if (commissionAmount > 0) {
            list.push({
              type: 'comissao',
              title: `Comissão Técnica - Laudo #${chk.protocolNumber}`,
              category: 'comissao_tecnico',
              beneficiary: tech?.name || 'Técnico',
              technicianId: tech?.id,
              amount: commissionAmount,
              checklistId: chk.id,
              dueDate: chk.date,
              notes: `Comissão de ${commissionPercent}% sobre serviço de ${formatCurrency(chk.serviceValue)}`,
            });
          }
        }
      }
    });

    return list;
  }, [appointments, checklists, payables, contacts]);

  const handleImportAllSuggestions = () => {
    unimportedItems.forEach(item => {
      const pixData = getPixDetailsFromContact(item.technicianId, item.beneficiary);
      const payable: AccountPayable = {
        id: `pay-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        description: item.title,
        category: item.category,
        beneficiary: item.beneficiary,
        technicianId: item.technicianId,
        amount: item.amount,
        dueDate: item.dueDate,
        paymentMethod: 'pix',
        pixKey: pixData.key || undefined,
        pixKeyType: pixData.key ? pixData.type : undefined,
        status: 'pendente',
        appointmentId: item.appointmentId,
        checklistId: item.checklistId,
        notes: item.notes,
        createdAt: new Date().toISOString(),
      };
      storage.saveAccountPayable(payable);
    });
    refreshList();
    setIsImportModalOpen(false);
  };

  const handleImportSingle = (item: typeof unimportedItems[0]) => {
    const pixData = getPixDetailsFromContact(item.technicianId, item.beneficiary);
    const payable: AccountPayable = {
      id: `pay-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      description: item.title,
      category: item.category,
      beneficiary: item.beneficiary,
      technicianId: item.technicianId,
      amount: item.amount,
      dueDate: item.dueDate,
      paymentMethod: 'pix',
      pixKey: pixData.key || undefined,
      pixKeyType: pixData.key ? pixData.type : undefined,
      status: 'pendente',
      appointmentId: item.appointmentId,
      checklistId: item.checklistId,
      notes: item.notes,
      createdAt: new Date().toISOString(),
    };
    storage.saveAccountPayable(payable);
    refreshList();
  };

  // Filter items
  const filteredPayables = useMemo(() => {
    return payables.filter(item => {
      const isOverdue = item.status === 'pendente' && item.dueDate < todayISO;
      const effectiveStatus: PaymentStatusAP = isOverdue ? 'atrasado' : item.status;

      if (statusFilter === 'pendente' && (effectiveStatus !== 'pendente' || item.reconciled)) return false;
      if (statusFilter === 'atrasado' && effectiveStatus !== 'atrasado') return false;
      if (statusFilter === 'pago' && item.status !== 'pago') return false;
      if (statusFilter === 'reconciliado' && !item.reconciled) return false;

      if (categoryFilter !== 'todas' && item.category !== categoryFilter) return false;

      if (periodFilter !== 'todos') {
        const itemMonth = item.dueDate.slice(0, 7);
        if (itemMonth !== periodFilter) return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesDesc = item.description.toLowerCase().includes(query);
        const matchesBeneficiary = item.beneficiary.toLowerCase().includes(query);
        const matchesDoc = item.documentNumber?.toLowerCase().includes(query);
        const matchesNotes = item.notes?.toLowerCase().includes(query);
        if (!matchesDesc && !matchesBeneficiary && !matchesDoc && !matchesNotes) return false;
      }

      return true;
    });
  }, [payables, statusFilter, categoryFilter, periodFilter, searchQuery, todayISO]);

  // KPIs
  const totalPending = payables
    .filter(p => p.status === 'pendente' && !p.reconciled)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalPaid = payables
    .filter(p => p.status === 'pago')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalOverdue = payables
    .filter(p => p.status === 'pendente' && p.dueDate < todayISO && !p.reconciled)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalRouteFuel = payables
    .filter(p => p.category === 'combustivel_rota')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalCommission = payables
    .filter(p => p.category === 'comissao_tecnico')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const getCategoryBadge = (cat: AccountPayable['category']) => {
    switch (cat) {
      case 'combustivel_rota':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
            <Fuel className="w-3 h-3 text-amber-700" />
            <span>Combustível Rota</span>
          </span>
        );
      case 'comissao_tecnico':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-200">
            <Award className="w-3 h-3 text-blue-700" />
            <span>Comissão Técnico</span>
          </span>
        );
      case 'insumo_estoque':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
            <Package className="w-3 h-3 text-emerald-700" />
            <span>Insumos / Estoque</span>
          </span>
        );
      case 'ferramenta_epi':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-900 border border-purple-200">
            <span>Ferramenta / EPI</span>
          </span>
        );
      case 'manutencao':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-900 border border-rose-200">
            <span>Manutenção</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <span>Outro</span>
          </span>
        );
    }
  };

  const getStatusBadge = (item: AccountPayable) => {
    if (item.reconciled) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
          <Check className="w-3 h-3" />
          <span>Compensado (Encontro)</span>
        </span>
      );
    }
    if (item.status === 'pago') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3 h-3" />
          <span>Pago</span>
        </span>
      );
    }
    if (item.dueDate < todayISO) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <AlertTriangle className="w-3 h-3" />
          <span>Atrasado</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
        <Clock className="w-3 h-3" />
        <span>Pendente</span>
      </span>
    );
  };

  const handleExportCsv = () => {
    const headers = ['Vencimento', 'Data Pagamento', 'Descrição', 'Categoria', 'Favorecido', 'Valor (R$)', 'Forma Pagto', 'Status', 'Vínculo', 'NF/Doc', 'Observações'];
    const rows = filteredPayables.map(p => [
      p.dueDate,
      p.paymentDate || '',
      `"${p.description.replace(/"/g, '""')}"`,
      p.category,
      `"${p.beneficiary.replace(/"/g, '""')}"`,
      p.amount.toFixed(2).replace('.', ','),
      p.paymentMethod,
      p.reconciled ? 'compensado_encontro' : p.status,
      p.appointmentId ? `Agendamento #${p.appointmentId}` : p.checklistId ? `Checklist #${p.checklistId}` : 'Avulso',
      p.documentNumber || '',
      `"${(p.notes || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `contas_a_pagar_${todayISO}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center font-black text-white text-sm shadow-xs shadow-rose-200">
              <CreditCard className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Contas a Pagar (Custos & Despesas)</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestão de pagamentos: combustível de rota (PIX), repasses de comissão técnica, reposição de estoque e despesas operacionais.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {unimportedItems.length > 0 && (
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer relative"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Importar Rotas/Comissões ({unimportedItems.length})</span>
              <span className="w-2 h-2 bg-rose-500 rounded-full absolute -top-1 -right-1 animate-ping"></span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenNewModal}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Título a Pagar</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">A Pagar (Pendente)</span>
          <span className="text-xl font-black text-rose-600 block">{formatCurrency(totalPending)}</span>
          <span className="text-[11px] text-slate-500">{payables.filter(p => p.status === 'pendente' && !p.reconciled).length} títulos em aberto</span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Pago / Liquidado</span>
          <span className="text-xl font-black text-emerald-600 block">{formatCurrency(totalPaid)}</span>
          <span className="text-[11px] text-slate-500">{payables.filter(p => p.status === 'pago').length} títulos baixados</span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vencidos / Atrasados</span>
          <span className="text-xl font-black text-rose-700 block">{formatCurrency(totalOverdue)}</span>
          <span className="text-[11px] text-rose-600 font-semibold">{payables.filter(p => p.status === 'pendente' && p.dueDate < todayISO && !p.reconciled).length} títulos vencidos</span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Combustível de Rotas</span>
          <span className="text-xl font-bold text-amber-800 block">{formatCurrency(totalRouteFuel)}</span>
          <span className="text-[11px] text-slate-400">PIX deslocamento técnicos</span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Comissões Técnicas</span>
          <span className="text-xl font-bold text-blue-800 block">{formatCurrency(totalCommission)}</span>
          <span className="text-[11px] text-slate-400">Repasses por checklist</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por descrição, favorecido, técnico ou documento..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs">
            <Filter className="w-3 h-3 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="todos">Status: Todos</option>
              <option value="pendente">Apenas Pendentes</option>
              <option value="atrasado">Apenas Atrasados</option>
              <option value="pago">Apenas Pagos</option>
              <option value="reconciliado">Compensados (Encontro)</option>
            </select>
          </div>

          {/* Category */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="todas">Categoria: Todas</option>
              <option value="combustivel_rota">Combustível Rota (PIX)</option>
              <option value="comissao_tecnico">Comissão Técnico</option>
              <option value="insumo_estoque">Insumos & Estoque</option>
              <option value="ferramenta_epi">Ferramentas & EPI</option>
              <option value="manutencao">Manutenção</option>
              <option value="outro">Outros</option>
            </select>
          </div>
        </div>
      </div>

      {/* Accounts Payable Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Vencimento</th>
                <th className="p-3">Descrição da Despesa</th>
                <th className="p-3">Categoria</th>
                <th className="p-3">Favorecido / Credor</th>
                <th className="p-3">Vínculo</th>
                <th className="p-3 text-right">Valor (R$)</th>
                <th className="p-3 text-center">Forma Pagto</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayables.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-mono text-slate-600 whitespace-nowrap">
                    <div>{item.dueDate}</div>
                    {item.paymentDate && (
                      <span className="text-[10px] text-emerald-600 block">Pago em {item.paymentDate}</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-slate-900">{item.description}</div>
                    {item.documentNumber && (
                      <span className="text-[10px] text-slate-400 font-mono">Doc: {item.documentNumber}</span>
                    )}
                    {item.notes && (
                      <p className="text-[10px] text-slate-400 italic truncate max-w-xs">{item.notes}</p>
                    )}
                  </td>
                  <td className="p-3">{getCategoryBadge(item.category)}</td>
                  <td className="p-3 font-medium text-slate-800">{item.beneficiary}</td>
                  <td className="p-3 text-slate-500 text-[11px]">
                    {item.appointmentId ? (
                      <span className="inline-flex items-center gap-1 text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        <LinkIcon className="w-2.5 h-2.5" /> Agenda
                      </span>
                    ) : item.checklistId ? (
                      <span className="inline-flex items-center gap-1 text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        <LinkIcon className="w-2.5 h-2.5" /> Checklist
                      </span>
                    ) : (
                      <span className="text-slate-400">Avulso</span>
                    )}
                  </td>
                  <td className="p-3 text-right font-black text-rose-700 text-sm whitespace-nowrap">
                    - {formatCurrency(item.amount)}
                  </td>
                  <td className="p-3 text-center uppercase text-[10px] font-bold text-slate-600 tracking-wider">
                    {item.paymentMethod === 'pix' ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200 font-black">
                        <QrCode className="w-3 h-3 text-emerald-600" /> PIX
                      </span>
                    ) : (
                      item.paymentMethod
                    )}
                  </td>
                  <td className="p-3 text-center whitespace-nowrap">{getStatusBadge(item)}</td>
                  <td className="p-3 text-center flex items-center justify-center gap-1">
                    {item.status !== 'pago' && !item.reconciled && (
                      <button
                        type="button"
                        onClick={() => handleOpenPayModal(item)}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                        title="Dar Baixa / Quitar Pagamento"
                      >
                        <Check className="w-3 h-3" />
                        <span>Baixar</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(item)}
                      className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemToDelete(item)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredPayables.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                    Nenhum lançamento de Conta a Pagar encontrado com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Novo / Editar Título a Pagar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-xl max-w-xl w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-200">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingItem ? 'Editar Conta a Pagar' : 'Novo Título a Pagar'}
                  </h3>
                  <p className="text-xs text-slate-400">Cadastre despesas operacionais, combustível de rota ou comissão técnica.</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Descrição da Despesa *</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: PIX Combustível Rota Navegantes ou Aquisição de Insumos..."
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-rose-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                  >
                    <option value="combustivel_rota">🚗 Combustível Rota Técnico</option>
                    <option value="comissao_tecnico">⭐ Comissão Técnica</option>
                    <option value="insumo_estoque">📦 Insumos & Estoque</option>
                    <option value="ferramenta_epi">🧰 Ferramenta / EPI</option>
                    <option value="manutencao">🔧 Manutenção Veicular/Equipamento</option>
                    <option value="alimentacao">🍲 Alimentação em Rota</option>
                    <option value="imposto">🏛️ Imposto / Taxa</option>
                    <option value="outro">📋 Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Valor da Despesa (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-rose-700 text-sm focus:ring-2 focus:ring-rose-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Favorecido / Credor *</label>
                  <input
                    type="text"
                    value={beneficiary}
                    onChange={(e) => setBeneficiary(e.target.value)}
                    placeholder="Nome do técnico, fornecedor ou posto..."
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Técnico Vinculado (Opcional)</label>
                  <select
                    value={technicianId}
                    onChange={(e) => {
                      const techId = e.target.value;
                      setTechnicianId(techId);
                      const tech = technicians.find(t => t.id === techId);
                      if (tech) {
                        if (!beneficiary || technicians.some(t => t.name === beneficiary)) {
                          setBeneficiary(tech.name);
                        }
                        const pixData = getPixDetailsFromContact(tech.id, tech.name);
                        if (pixData.key) {
                          setPixKey(pixData.key);
                          setPixKeyType(pixData.type);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                  >
                    <option value="">Nenhum (Despesa Geral)</option>
                    {technicians.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Data Vencimento *</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                  />
                  {linkedAppointmentId && (
                    <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                      ✓ Alinhada à data da visita técnica
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Forma Pagamento</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setPaymentMethod(val);
                      if (val === 'pix' && !pixKey) {
                        const pixData = getPixDetailsFromContact(technicianId, beneficiary);
                        if (pixData.key) {
                          setPixKey(pixData.key);
                          setPixKeyType(pixData.type);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                  >
                    <option value="pix">PIX (Gera QR Code Automático)</option>
                    <option value="boleto">Boleto</option>
                    <option value="transferencia">Transferência TED/DOC</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                    <option value="dinheiro">Dinheiro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Status Inicial</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="pago">Já Pago (Quitado)</option>
                  </select>
                </div>
              </div>

              {status === 'pago' && (
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Data Efetiva do Pagamento</label>
                  <input
                    type="date"
                    value={paymentDate || todayISO}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Vincular a Agendamento (Opcional)</label>
                  <select
                    value={linkedAppointmentId}
                    onChange={(e) => {
                      const aptId = e.target.value;
                      setLinkedAppointmentId(aptId);
                      if (aptId) {
                        const apt = appointments.find(a => a.id === aptId);
                        if (apt) {
                          // No formulário a data de vencimento deve ser a data da visita técnica
                          const visitDate = apt.scheduledDate || (apt as any).date;
                          if (visitDate) {
                            setDueDate(visitDate);
                          }
                          if (apt.technicianId) {
                            setTechnicianId(apt.technicianId);
                            const tech = contacts.find(c => c.id === apt.technicianId);
                            if (tech) {
                              if (!beneficiary || technicians.some(t => t.name === beneficiary)) {
                                setBeneficiary(tech.name);
                              }
                              const pixData = getPixDetailsFromContact(tech.id, tech.name);
                              if (pixData.key) {
                                setPixKey(pixData.key);
                                setPixKeyType(pixData.type);
                              }
                            }
                          }
                        }
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  >
                    <option value="">Sem vínculo com agenda</option>
                    {appointments.map(apt => {
                      const client = contacts.find(c => c.id === apt.customerId);
                      const aptDate = apt.scheduledDate || (apt as any).date;
                      return (
                        <option key={apt.id} value={apt.id}>
                          {aptDate} - {client?.name || 'Cliente'} (#{apt.id.slice(-4)})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Vincular a Checklist (Opcional)</label>
                  <select
                    value={linkedChecklistId}
                    onChange={(e) => setLinkedChecklistId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  >
                    <option value="">Sem vínculo com checklist</option>
                    {checklists.map(chk => (
                      <option key={chk.id} value={chk.id}>
                        #{chk.protocolNumber} - {chk.date} ({formatCurrency(chk.serviceValue)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold">Nº Documento / Nota Fiscal / Comprovante</label>
                <input
                  type="text"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="Ex: NF-e 12345 / Chave PIX E2E..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold">Observações / Detalhes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Instruções de pagamento, dados bancários do técnico..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                />
              </div>

              {/* Gerar o Qrcode no final do formulario deste popup quando PIX */}
              {paymentMethod === 'pix' && (
                <PixQrCodeSection
                  initialKey={pixKey}
                  initialKeyType={pixKeyType}
                  amount={amount}
                  category={category}
                  beneficiaryName={beneficiary}
                  onKeyChange={(newKey, newType) => {
                    setPixKey(newKey);
                    setPixKeyType(newType);
                  }}
                />
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  {editingItem ? 'Salvar Alterações' : 'Cadastrar Conta a Pagar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Baixar / Quitar Pagamento */}
      {isPayModalOpen && payingItem && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Liquidar Conta a Pagar</h3>
                <p className="text-xs text-slate-400">Confirmar a baixa e efetivação do pagamento.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Título:</span>
                <span className="font-bold text-slate-900">{payingItem.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Favorecido:</span>
                <span className="font-bold text-slate-800">{payingItem.beneficiary}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Valor a Liquidar:</span>
                <span className="font-black text-rose-700 text-sm">{formatCurrency(payingItem.amount)}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Data Efetiva do Pagamento</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold">Meio Utilizado</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                >
                  <option value="pix">PIX (Transferência Instantânea)</option>
                  <option value="boleto">Boleto Bancário</option>
                  <option value="transferencia">Transferência Bancária TED/DOC</option>
                  <option value="cartao_credito">Cartão de Crédito</option>
                  <option value="cartao_debito">Cartão de Débito</option>
                  <option value="dinheiro">Dinheiro Espécie</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold">Comprovante / ID de Transação (Opcional)</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Ex: Chave PIX enviada às 14h30 / Comprovante Santander..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                />
              </div>

              {payMethod === 'pix' && (
                <PixQrCodeSection
                  initialKey={payingItem.pixKey || getPixDetailsFromContact(payingItem.technicianId, payingItem.beneficiary).key}
                  initialKeyType={payingItem.pixKeyType || getPixDetailsFromContact(payingItem.technicianId, payingItem.beneficiary).type}
                  amount={payingItem.amount}
                  category={payingItem.category}
                  beneficiaryName={payingItem.beneficiary}
                />
              )}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Importar Sugestões de Agendamento/Checklist */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Importar Custos Automáticos</h3>
                  <p className="text-xs text-slate-400">
                    Rotas de combustível de agendamentos e comissões de checklists concluídos não lançados.
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {unimportedItems.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{item.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900">
                        {item.type === 'rota' ? '🚗 Rota' : '⭐ Comissão'}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      Favorecido: <strong className="text-slate-700">{item.beneficiary}</strong> | Venc: {item.dueDate}
                    </p>
                    <p className="text-slate-400 text-[10px] italic">{item.notes}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-rose-700 text-sm whitespace-nowrap">
                      {formatCurrency(item.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleImportSingle(item)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all text-xs cursor-pointer"
                    >
                      Importar
                    </button>
                  </div>
                </div>
              ))}

              {unimportedItems.length === 0 && (
                <p className="text-slate-400 text-center py-6 italic text-xs">
                  Todos os custos de rotas e comissões técnicas já foram importados para o Contas a Pagar!
                </p>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500 font-medium">
                {unimportedItems.length} itens pendentes de importação
              </span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium text-xs cursor-pointer"
                >
                  Fechar
                </button>
                {unimportedItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleImportAllSuggestions}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-xs text-xs cursor-pointer"
                  >
                    Importar Todos ({unimportedItems.length})
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <h3 className="font-bold text-slate-900 text-base">Excluir Conta a Pagar?</h3>
            <p className="text-xs text-slate-500">
              Item: <strong>{itemToDelete.description}</strong> ({formatCurrency(itemToDelete.amount)})
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Motivo da Exclusão</label>
              <input
                type="text"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Ex: Despesa duplicada / cancelada"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
