import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Plus,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  DollarSign,
  Sun,
  Handshake,
  ShoppingBag,
  Trash2,
  Edit2,
  Download,
  Zap,
  Check,
  X,
  Link as LinkIcon
} from 'lucide-react';
import { AccountReceivable, PaymentStatusAR, Contact, Appointment, TechnicalChecklist } from '../../types';
import { storage } from '../../utils/storage';
import { formatCurrency } from '../../utils/formatters';

interface AccountsReceivableTabProps {
  contacts: Contact[];
  appointments: Appointment[];
  checklists: TechnicalChecklist[];
  onRefreshParent: () => void;
}

export const AccountsReceivableTab: React.FC<AccountsReceivableTabProps> = ({
  contacts,
  appointments,
  checklists,
  onRefreshParent
}) => {
  const [receivables, setReceivables] = useState<AccountReceivable[]>(storage.getAccountsReceivable());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [categoryFilter, setCategoryFilter] = useState<string>('todas');
  const [periodFilter, setPeriodFilter] = useState<string>('todos');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AccountReceivable | null>(null);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [receivingItem, setReceivingItem] = useState<AccountReceivable | null>(null);
  const [receiveDate, setReceiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [receiveMethod, setReceiveMethod] = useState<AccountReceivable['paymentMethod']>('pix');
  const [receiveNotes, setReceiveNotes] = useState('');

  // Delete modal state
  const [itemToDelete, setItemToDelete] = useState<AccountReceivable | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  // Import suggestions state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Form fields
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<AccountReceivable['category']>('servico_solar');
  const [payerName, setPayerName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [receiptDate, setReceiptDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<AccountReceivable['paymentMethod']>('pix');
  const [status, setStatus] = useState<PaymentStatusAR>('pendente');
  const [linkedAppointmentId, setLinkedAppointmentId] = useState('');
  const [linkedChecklistId, setLinkedChecklistId] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [notes, setNotes] = useState('');

  const todayISO = new Date().toISOString().slice(0, 10);

  const refreshList = () => {
    setReceivables(storage.getAccountsReceivable());
    onRefreshParent();
  };

  const handleOpenNewModal = () => {
    setEditingItem(null);
    setDescription('');
    setCategory('servico_solar');
    setPayerName('');
    setCustomerId('');
    setAmount(0);
    setDueDate(todayISO);
    setReceiptDate('');
    setPaymentMethod('pix');
    setStatus('pendente');
    setLinkedAppointmentId('');
    setLinkedChecklistId('');
    setDocumentNumber('');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: AccountReceivable) => {
    setEditingItem(item);
    setDescription(item.description);
    setCategory(item.category);
    setPayerName(item.payerName);
    setCustomerId(item.customerId || '');
    setAmount(item.amount);
    setDueDate(item.dueDate);
    setReceiptDate(item.receiptDate || '');
    setPaymentMethod(item.paymentMethod);
    setStatus(item.status);
    setLinkedAppointmentId(item.appointmentId || '');
    setLinkedChecklistId(item.checklistId || '');
    setDocumentNumber(item.documentNumber || '');
    setNotes(item.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || amount <= 0) {
      alert('Preencha uma descrição válida e um valor maior que zero.');
      return;
    }

    const payload: AccountReceivable = {
      id: editingItem ? editingItem.id : `rec-${Date.now()}`,
      description: description.trim(),
      category,
      payerName: payerName.trim(),
      customerId: customerId || undefined,
      amount: Number(amount),
      dueDate,
      receiptDate: status === 'recebido' ? (receiptDate || todayISO) : undefined,
      paymentMethod,
      status,
      appointmentId: linkedAppointmentId || undefined,
      checklistId: linkedChecklistId || undefined,
      documentNumber: documentNumber.trim() || undefined,
      reconciled: editingItem ? editingItem.reconciled : false,
      reconciliationBatchId: editingItem ? editingItem.reconciliationBatchId : undefined,
      notes: notes.trim() || undefined,
      createdAt: editingItem ? editingItem.createdAt : new Date().toISOString(),
    };

    storage.saveAccountReceivable(payload);
    refreshList();
    setIsModalOpen(false);
  };

  const handleOpenReceiveModal = (item: AccountReceivable) => {
    setReceivingItem(item);
    setReceiveDate(todayISO);
    setReceiveMethod(item.paymentMethod || 'pix');
    setReceiveNotes(item.notes || '');
    setIsReceiveModalOpen(true);
  };

  const handleConfirmReceipt = () => {
    if (!receivingItem) return;
    const updated: AccountReceivable = {
      ...receivingItem,
      status: 'recebido',
      receiptDate: receiveDate,
      paymentMethod: receiveMethod,
      notes: receiveNotes ? `${receivingItem.notes || ''} [Recebimento: ${receiveNotes}]`.trim() : receivingItem.notes,
    };
    storage.saveAccountReceivable(updated);
    refreshList();
    setIsReceiveModalOpen(false);
    setReceivingItem(null);
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    storage.deleteAccountReceivable(itemToDelete.id, undefined, deleteReason);
    refreshList();
    setItemToDelete(null);
    setDeleteReason('');
  };

  // Find checklists that can be imported to Accounts Receivable
  const unimportedChecklists = useMemo(() => {
    const list: {
      title: string;
      category: AccountReceivable['category'];
      payerName: string;
      customerId?: string;
      amount: number;
      checklistId: string;
      dueDate: string;
      notes: string;
    }[] = [];

    checklists.forEach(chk => {
      const alreadyHasReceivable = receivables.some(r => r.checklistId === chk.id);
      if (!alreadyHasReceivable && chk.serviceValue > 0) {
        const client = contacts.find(c => c.id === chk.customerId);
        list.push({
          title: `Limpeza Solar #${chk.protocolNumber} - ${client?.name || 'Cliente'}`,
          category: 'servico_solar',
          payerName: client?.name || 'Cliente Solar',
          customerId: client?.id,
          amount: chk.serviceValue,
          checklistId: chk.id,
          dueDate: chk.date,
          notes: `Gerado a partir do Checklist #${chk.protocolNumber} (${chk.procedure.modulesCleanedCount || 0} módulos)`,
        });
      }
    });

    return list;
  }, [checklists, receivables, contacts]);

  const handleImportAllChecklists = () => {
    unimportedChecklists.forEach(item => {
      const receivable: AccountReceivable = {
        id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        description: item.title,
        category: item.category,
        payerName: item.payerName,
        customerId: item.customerId,
        amount: item.amount,
        dueDate: item.dueDate,
        paymentMethod: 'pix',
        status: 'pendente',
        checklistId: item.checklistId,
        notes: item.notes,
        createdAt: new Date().toISOString(),
      };
      storage.saveAccountReceivable(receivable);
    });
    refreshList();
    setIsImportModalOpen(false);
  };

  const handleImportSingle = (item: typeof unimportedChecklists[0]) => {
    const receivable: AccountReceivable = {
      id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      description: item.title,
      category: item.category,
      payerName: item.payerName,
      customerId: item.customerId,
      amount: item.amount,
      dueDate: item.dueDate,
      paymentMethod: 'pix',
      status: 'pendente',
      checklistId: item.checklistId,
      notes: item.notes,
      createdAt: new Date().toISOString(),
    };
    storage.saveAccountReceivable(receivable);
    refreshList();
  };

  // Filter items
  const filteredReceivables = useMemo(() => {
    return receivables.filter(item => {
      const isOverdue = item.status === 'pendente' && item.dueDate < todayISO;
      const effectiveStatus: PaymentStatusAR = isOverdue ? 'atrasado' : item.status;

      if (statusFilter === 'pendente' && (effectiveStatus !== 'pendente' || item.reconciled)) return false;
      if (statusFilter === 'atrasado' && effectiveStatus !== 'atrasado') return false;
      if (statusFilter === 'recebido' && item.status !== 'recebido') return false;
      if (statusFilter === 'reconciliado' && !item.reconciled) return false;

      if (categoryFilter !== 'todas' && item.category !== categoryFilter) return false;

      if (periodFilter !== 'todos') {
        const itemMonth = item.dueDate.slice(0, 7);
        if (itemMonth !== periodFilter) return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesDesc = item.description.toLowerCase().includes(query);
        const matchesPayer = item.payerName.toLowerCase().includes(query);
        const matchesDoc = item.documentNumber?.toLowerCase().includes(query);
        const matchesNotes = item.notes?.toLowerCase().includes(query);
        if (!matchesDesc && !matchesPayer && !matchesDoc && !matchesNotes) return false;
      }

      return true;
    });
  }, [receivables, statusFilter, categoryFilter, periodFilter, searchQuery, todayISO]);

  // KPIs
  const totalPending = receivables
    .filter(r => r.status === 'pendente' && !r.reconciled)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalReceived = receivables
    .filter(r => r.status === 'recebido')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalOverdue = receivables
    .filter(r => r.status === 'pendente' && r.dueDate < todayISO && !r.reconciled)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalSolarServices = receivables
    .filter(r => r.category === 'servico_solar')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalPartnerCommissions = receivables
    .filter(r => r.category === 'comissao_parceiro')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const getCategoryBadge = (cat: AccountReceivable['category']) => {
    switch (cat) {
      case 'servico_solar':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
            <Sun className="w-3 h-3 text-amber-600" />
            <span>Serviço Solar</span>
          </span>
        );
      case 'comissao_parceiro':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-900 border border-indigo-200">
            <Handshake className="w-3 h-3 text-indigo-600" />
            <span>Comissão Parceiro</span>
          </span>
        );
      case 'venda_produtos':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
            <ShoppingBag className="w-3 h-3 text-emerald-600" />
            <span>Venda Produtos</span>
          </span>
        );
      case 'manutencao_avulsa':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-900 border border-cyan-200">
            <span>Manutenção Avulsa</span>
          </span>
        );
      case 'consultoria':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-200">
            <span>Consultoria</span>
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

  const getStatusBadge = (item: AccountReceivable) => {
    if (item.reconciled) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
          <Check className="w-3 h-3" />
          <span>Compensado (Encontro)</span>
        </span>
      );
    }
    if (item.status === 'recebido') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3 h-3" />
          <span>Recebido</span>
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
    const headers = ['Vencimento', 'Data Recebimento', 'Descrição', 'Categoria', 'Sacado / Cliente', 'Valor (R$)', 'Forma Pagto', 'Status', 'Vínculo', 'NF/Doc', 'Observações'];
    const rows = filteredReceivables.map(r => [
      r.dueDate,
      r.receiptDate || '',
      `"${r.description.replace(/"/g, '""')}"`,
      r.category,
      `"${r.payerName.replace(/"/g, '""')}"`,
      r.amount.toFixed(2).replace('.', ','),
      r.paymentMethod,
      r.reconciled ? 'compensado_encontro' : r.status,
      r.appointmentId ? `Agendamento #${r.appointmentId}` : r.checklistId ? `Checklist #${r.checklistId}` : 'Avulso',
      r.documentNumber || '',
      `"${(r.notes || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `contas_a_receber_${todayISO}.csv`);
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
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-black text-white text-sm shadow-xs shadow-emerald-200">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Contas a Receber (Receitas & Entradas)</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Controle de recebimentos: PIX de clientes, comissões recebidas de parceiros integradores, faturamentos avulsos e contratos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {unimportedChecklists.length > 0 && (
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer relative"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Importar Checklists ({unimportedChecklists.length})</span>
              <span className="w-2 h-2 bg-emerald-500 rounded-full absolute -top-1 -right-1 animate-ping"></span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenNewModal}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Título a Receber</span>
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
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">A Receber (Pendente)</span>
          <span className="text-xl font-black text-amber-700 block">{formatCurrency(totalPending)}</span>
          <span className="text-[11px] text-slate-500">{receivables.filter(r => r.status === 'pendente' && !r.reconciled).length} títulos aguardando</span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Recebido / Liquidado</span>
          <span className="text-xl font-black text-emerald-600 block">{formatCurrency(totalReceived)}</span>
          <span className="text-[11px] text-slate-500">{receivables.filter(r => r.status === 'recebido').length} títulos recebidos</span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vencidos / Atrasados</span>
          <span className="text-xl font-black text-rose-700 block">{formatCurrency(totalOverdue)}</span>
          <span className="text-[11px] text-rose-600 font-semibold">{receivables.filter(r => r.status === 'pendente' && r.dueDate < todayISO && !r.reconciled).length} títulos em atraso</span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Limpezas Solares</span>
          <span className="text-xl font-bold text-amber-800 block">{formatCurrency(totalSolarServices)}</span>
          <span className="text-[11px] text-slate-400">Receitas operacionais</span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Parceiros & Outros</span>
          <span className="text-xl font-bold text-indigo-800 block">{formatCurrency(totalPartnerCommissions)}</span>
          <span className="text-[11px] text-slate-400">Comissões recebidas</span>
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
            placeholder="Buscar por descrição, cliente/parceiro ou documento..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
              <option value="recebido">Apenas Recebidos</option>
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
              <option value="servico_solar">Serviço de Limpeza Solar</option>
              <option value="comissao_parceiro">Comissão de Parceiro</option>
              <option value="venda_produtos">Venda de Produtos</option>
              <option value="manutencao_avulsa">Manutenção Avulsa</option>
              <option value="consultoria">Consultoria</option>
              <option value="outro">Outros</option>
            </select>
          </div>
        </div>
      </div>

      {/* Accounts Receivable Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Vencimento</th>
                <th className="p-3">Descrição da Receita</th>
                <th className="p-3">Categoria</th>
                <th className="p-3">Sacado / Cliente / Parceiro</th>
                <th className="p-3">Vínculo</th>
                <th className="p-3 text-right">Valor (R$)</th>
                <th className="p-3 text-center">Forma Pagto</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReceivables.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-mono text-slate-600 whitespace-nowrap">
                    <div>{item.dueDate}</div>
                    {item.receiptDate && (
                      <span className="text-[10px] text-emerald-600 block">Recebido em {item.receiptDate}</span>
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
                  <td className="p-3 font-medium text-slate-800">{item.payerName}</td>
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
                  <td className="p-3 text-right font-black text-emerald-700 text-sm whitespace-nowrap">
                    + {formatCurrency(item.amount)}
                  </td>
                  <td className="p-3 text-center uppercase text-[10px] font-bold text-slate-600 tracking-wider">
                    {item.paymentMethod}
                  </td>
                  <td className="p-3 text-center whitespace-nowrap">{getStatusBadge(item)}</td>
                  <td className="p-3 text-center flex items-center justify-center gap-1">
                    {item.status !== 'recebido' && !item.reconciled && (
                      <button
                        type="button"
                        onClick={() => handleOpenReceiveModal(item)}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                        title="Confirmar Recebimento / Dar Baixa"
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

              {filteredReceivables.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                    Nenhum lançamento de Conta a Receber encontrado com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Novo / Editar Título a Receber */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-xl max-w-xl w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingItem ? 'Editar Conta a Receber' : 'Novo Título a Receber (Entrada)'}
                  </h3>
                  <p className="text-xs text-slate-400">Insira valores manualmente ou vincule a serviços solares e parceiros.</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Descrição da Receita *</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: PIX Limpeza Solar Fazenda Sol ou Comissão Parceria Fotovoltaica..."
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Categoria da Entrada</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                  >
                    <option value="servico_solar">☀️ Serviço de Limpeza Solar</option>
                    <option value="comissao_parceiro">🤝 Comissão de Parceiro Integrador</option>
                    <option value="venda_produtos">🛍️ Venda de Produtos / Insumos</option>
                    <option value="manutencao_avulsa">🔧 Manutenção Elétrica / Termografia</option>
                    <option value="consultoria">📑 Consultoria / Vistoria Técnica</option>
                    <option value="outro">📋 Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Valor a Receber (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-emerald-700 text-sm focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Sacado / Cliente / Pagador *</label>
                  <input
                    type="text"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    placeholder="Nome do cliente ou empresa parceira..."
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Cliente Cadastrado (Opcional)</label>
                  <select
                    value={customerId}
                    onChange={(e) => {
                      setCustomerId(e.target.value);
                      const cli = contacts.find(c => c.id === e.target.value);
                      if (cli && !payerName) setPayerName(cli.name);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                  >
                    <option value="">Nenhum (Cliente Avulso)</option>
                    {contacts.filter(c => !c.isTechnician).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
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
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Forma Prevista</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                  >
                    <option value="pix">PIX (Instantâneo)</option>
                    <option value="boleto">Boleto Bancário</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                    <option value="transferencia">Transferência TED/DOC</option>
                    <option value="dinheiro">Dinheiro Espécie</option>
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
                    <option value="recebido">Já Recebido</option>
                  </select>
                </div>
              </div>

              {status === 'recebido' && (
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Data Efetiva do Recebimento</label>
                  <input
                    type="date"
                    value={receiptDate || todayISO}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Vincular a Agendamento (Opcional)</label>
                  <select
                    value={linkedAppointmentId}
                    onChange={(e) => setLinkedAppointmentId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  >
                    <option value="">Sem vínculo com agenda</option>
                    {appointments.map(apt => {
                      const client = contacts.find(c => c.id === apt.customerId);
                      return (
                        <option key={apt.id} value={apt.id}>
                          {apt.date} - {client?.name || 'Cliente'} (#{apt.id.slice(-4)})
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
                  placeholder="Ex: NF-e 9876 / Pedido Solar..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold">Observações / Detalhes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Instruções de cobrança, dados da transação..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                />
              </div>

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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  {editingItem ? 'Salvar Alterações' : 'Cadastrar Conta a Receber'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Baixar / Confirmar Recebimento */}
      {isReceiveModalOpen && receivingItem && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Confirmar Recebimento</h3>
                <p className="text-xs text-slate-400">Registrar entrada financeira no caixa.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Título:</span>
                <span className="font-bold text-slate-900">{receivingItem.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pagador:</span>
                <span className="font-bold text-slate-800">{receivingItem.payerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Valor Recebido:</span>
                <span className="font-black text-emerald-700 text-sm">{formatCurrency(receivingItem.amount)}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Data Efetiva do Recebimento</label>
                <input
                  type="date"
                  value={receiveDate}
                  onChange={(e) => setReceiveDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold">Meio Utilizado</label>
                <select
                  value={receiveMethod}
                  onChange={(e) => setReceiveMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                >
                  <option value="pix">PIX (Transferência Instantânea)</option>
                  <option value="boleto">Boleto Bancário</option>
                  <option value="cartao_credito">Cartão de Crédito</option>
                  <option value="cartao_debito">Cartão de Débito</option>
                  <option value="transferencia">Transferência TED/DOC</option>
                  <option value="dinheiro">Dinheiro Espécie</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold">Comprovante / ID de Transação (Opcional)</label>
                <input
                  type="text"
                  value={receiveNotes}
                  onChange={(e) => setReceiveNotes(e.target.value)}
                  placeholder="Ex: Comprovante PIX recebido via WhatsApp..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsReceiveModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReceipt}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Confirmar Recebimento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Importar Sugestões de Checklists Concluídos */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Importar Receitas de Checklists</h3>
                  <p className="text-xs text-slate-400">
                    Faturamentos de laudos técnicos concluídos que ainda não foram cadastrados em Contas a Receber.
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {unimportedChecklists.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{item.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900">
                        ☀️ Serviço Solar
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      Cliente: <strong className="text-slate-700">{item.payerName}</strong> | Venc: {item.dueDate}
                    </p>
                    <p className="text-slate-400 text-[10px] italic">{item.notes}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-emerald-700 text-sm whitespace-nowrap">
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

              {unimportedChecklists.length === 0 && (
                <p className="text-slate-400 text-center py-6 italic text-xs">
                  Todos os checklists técnicos com valor já foram importados para o Contas a Receber!
                </p>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500 font-medium">
                {unimportedChecklists.length} faturamentos pendentes de importação
              </span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium text-xs cursor-pointer"
                >
                  Fechar
                </button>
                {unimportedChecklists.length > 0 && (
                  <button
                    type="button"
                    onClick={handleImportAllChecklists}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs text-xs cursor-pointer"
                  >
                    Importar Todos ({unimportedChecklists.length})
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
            <h3 className="font-bold text-slate-900 text-base">Excluir Conta a Receber?</h3>
            <p className="text-xs text-slate-500">
              Item: <strong>{itemToDelete.description}</strong> ({formatCurrency(itemToDelete.amount)})
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Motivo da Exclusão</label>
              <input
                type="text"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Ex: Receita cancelada / lançamento incorreto"
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
