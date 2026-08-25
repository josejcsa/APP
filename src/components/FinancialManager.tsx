import React, { useState } from 'react';
import {
  DollarSign,
  Download,
  RefreshCw,
  CheckCircle2,
  Search,
  Calendar,
  Package,
  Plus,
  Trash2,
  Edit2,
  X,
  Eye
} from 'lucide-react';
import { FinancialRecord, Contact, TechnicalChecklist, ExpenseSupplyItem } from '../types';
import { storage, exportFinancialsToCsv } from '../utils/storage';
import { PdfReportModal } from './PdfReportModal';

export const FinancialManager: React.FC = () => {
  const [financials, setFinancials] = useState<FinancialRecord[]>(storage.getFinancials());
  const [contacts, setContacts] = useState<Contact[]>(storage.getContacts());
  const [checklists, setChecklists] = useState<TechnicalChecklist[]>(storage.getChecklists());
  const [expenseItems, setExpenseItems] = useState<ExpenseSupplyItem[]>(storage.getExpenseItems());
  
  const currentMonthISO = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthISO);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>('all');

  // Insumos Modal & Form State
  const [isInsumosModalOpen, setIsInsumosModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ExpenseSupplyItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ExpenseSupplyItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState<ExpenseSupplyItem['category']>('insumo');
  const [itemUnit, setItemUnit] = useState('Litro');
  const [itemCost, setItemCost] = useState(10);
  const [itemSupplier, setItemSupplier] = useState('');
  const [itemNotes, setItemNotes] = useState('');
  const [itemRelatedServices, setItemRelatedServices] = useState<string[]>([]);
  const allServicesList = storage.getServices();

  const refreshList = () => {
    setFinancials(storage.getFinancials());
    setContacts(storage.getContacts());
    setChecklists(storage.getChecklists());
    setExpenseItems(storage.getExpenseItems());
  };

  const handleOpenAddItem = () => {
    setEditingItem(null);
    setItemName('');
    setItemCategory('insumo');
    setItemUnit('Litro');
    setItemCost(10);
    setItemSupplier('');
    setItemNotes('');
    setItemRelatedServices([]);
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: ExpenseSupplyItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemCategory(item.category);
    setItemUnit(item.unit);
    setItemCost(item.defaultUnitCost);
    setItemSupplier(item.supplier || '');
    setItemNotes(item.notes || '');
    setItemRelatedServices(item.relatedServices || []);
    setIsItemModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    const newItem: ExpenseSupplyItem = {
      id: editingItem ? editingItem.id : `exp-${Date.now()}`,
      name: itemName.trim(),
      category: itemCategory,
      unit: itemUnit.trim() || 'Unidade',
      defaultUnitCost: Number(itemCost) || 0,
      supplier: itemSupplier.trim(),
      notes: itemNotes.trim(),
      relatedServices: itemRelatedServices,
    };

    storage.saveExpenseItem(newItem);
    setExpenseItems(storage.getExpenseItems());
    setIsItemModalOpen(false);
  };

  const handleDeleteItem = (item: ExpenseSupplyItem) => {
    setItemToDelete(item);
  };

  const handleConfirmDeleteItem = () => {
    if (!itemToDelete) return;
    const settings = storage.getSettings();
    storage.deleteExpenseItem(itemToDelete.id, settings.currentUser, 'Removido pelo gestor');
    refreshList();
    setItemToDelete(null);
  };

  // Generate available month options dynamically
  const availableMonths = React.useMemo(() => {
    const set = new Set<string>();
    set.add(currentMonthISO);
    financials.forEach(f => { if (f.month) set.add(f.month); });
    const now = new Date();
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      set.add(d.toISOString().slice(0, 7));
    }
    return Array.from(set).sort().reverse();
  }, [financials, currentMonthISO]);

  // Filtered by Month & Search
  const filteredFinancials = financials.filter((f) => {
    const matchMonth = selectedMonth === 'all' || f.month === selectedMonth;
    const matchStatus = filterPaymentStatus === 'all' || f.paymentStatus === filterPaymentStatus;
    const client = contacts.find((c) => c.id === f.customerId);
    const matchSearch = searchQuery === '' ||
      client?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.serviceDescription.toLowerCase().includes(searchQuery.toLowerCase());

    return matchMonth && matchStatus && matchSearch;
  });

  // Calculate KPIs
  const totalGross = filteredFinancials.reduce((acc, curr) => acc + curr.grossAmount, 0);
  const totalNet = filteredFinancials.reduce((acc, curr) => acc + curr.netAmount, 0);
  const totalCommissions = filteredFinancials.reduce((acc, curr) => acc + curr.technicianCommission, 0);
  const totalExpenses = filteredFinancials.reduce((acc, curr) => {
    const exp = curr.expenses?.reduce((eAcc, e) => eAcc + e.amount, 0) || 0;
    return acc + exp;
  }, 0);
  const totalProfit = totalNet - totalCommissions - totalExpenses;
  const avgTicket = filteredFinancials.length > 0 ? totalGross / filteredFinancials.length : 0;

  const handleTogglePaymentStatus = (record: FinancialRecord) => {
    const newStatus = record.paymentStatus === 'pago' ? 'pendente' : 'pago';
    record.paymentStatus = newStatus;
    record.paidAt = newStatus === 'pago' ? new Date().toISOString() : undefined;
    storage.saveFinancial(record);
    refreshList();
  };

  const handleExportCsv = () => {
    exportFinancialsToCsv(financials);
  };

  const [recordToDelete, setRecordToDelete] = useState<FinancialRecord | null>(null);
  const [pdfChecklist, setPdfChecklist] = useState<TechnicalChecklist | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>('');
  const settings = storage.getSettings();

  const handleConfirmDelete = () => {
    if (!recordToDelete) return;
    storage.deleteFinancial(recordToDelete.id, settings.currentUser, deleteReason);
    refreshList();
    setRecordToDelete(null);
    setDeleteReason('');
  };

  return (
    <div id="financial-manager-container" className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center font-black text-amber-950 text-sm shadow-xs shadow-amber-200">
              <DollarSign className="w-4 h-4 text-amber-950" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Controle Financeiro Mensal & Planilha</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Valores consolidados dos checklists técnicos com sincronização em tempo real no Google Sheets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Month Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              id="select-financial-month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              {availableMonths.map((m) => {
                const [y, monthNum] = m.split('-');
                const monthDate = new Date(Number(y), Number(monthNum) - 1, 1);
                const label = monthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                return (
                  <option key={m} value={m}>
                    {label.charAt(0).toUpperCase() + label.slice(1)}
                  </option>
                );
              })}
              <option value="all">Todos os Meses</option>
            </select>
          </div>

          {/* Insumos Button */}
          <button
            type="button"
            id="btn-open-insumos-modal"
            onClick={() => setIsInsumosModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Package className="w-3.5 h-3.5" />
            <span>Insumos</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            id="btn-export-financial-csv"
            onClick={handleExportCsv}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>



      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Gross Revenue */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Faturamento Bruto</span>
          <span className="text-xl font-black text-slate-900 block">
            R$ {totalGross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-emerald-600 font-semibold">{filteredFinancials.length} atendimentos</span>
        </div>

        {/* Commissions */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Comissões Técnicos</span>
          <span className="text-xl font-bold text-slate-900 block">
            - R$ {totalCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-slate-400">Média 20% a 25%</span>
        </div>

        {/* Operating Expenses */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Insumos & Despesas</span>
          <span className="text-xl font-bold text-slate-900 block">
            - R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-slate-400">Água pura, combustível</span>
        </div>

        {/* Net Profit */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lucro Líquido Real</span>
          <span className="text-xl font-black text-emerald-600 block">
            R$ {totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            Margem: <span className="text-emerald-700 font-bold">{totalGross > 0 ? ((totalProfit / totalGross) * 100).toFixed(0) : 0}%</span>
          </span>
        </div>

        {/* Average Ticket */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ticket Médio</span>
          <span className="text-xl font-bold text-amber-700 block">
            R$ {avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-slate-400">Por limpeza solar</span>
        </div>
      </div>

      {/* Spreadsheet Table (Google Sheets Replica) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Filters */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por cliente ou serviço..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500 font-semibold">Status:</span>
            <select
              value={filterPaymentStatus}
              onChange={(e) => setFilterPaymentStatus(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="all">Todos os Status</option>
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Data</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Serviço / Descrição</th>
                <th className="p-3 text-center">Módulos</th>
                <th className="p-3 text-right">Bruto (R$)</th>
                <th className="p-3 text-right">Comissão Tech</th>
                <th className="p-3 text-right">Líquido (R$)</th>
                <th className="p-3 text-center">Status Pagamento</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFinancials.map((record) => {
                const client = contacts.find((c) => c.id === record.customerId);
                return (
                  <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono text-slate-600 whitespace-nowrap">{record.date}</td>
                    <td className="p-3 font-bold text-slate-900">{client?.name || 'Cliente'}</td>
                    <td className="p-3 text-slate-700 font-medium">{record.serviceDescription}</td>
                    <td className="p-3 text-center font-bold text-slate-700">{record.moduleCount}</td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      R$ {record.grossAmount.toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-medium text-amber-700">
                      - R$ {record.technicianCommission.toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-black text-emerald-700">
                      R$ {record.netAmount.toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePaymentStatus(record)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 cursor-pointer transition-all ${
                          record.paymentStatus === 'pago'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {record.paymentStatus === 'pago' ? <CheckCircle2 className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                        <span>{record.paymentStatus}</span>
                      </button>
                    </td>
                    <td className="p-3 text-center flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const allChecklists = storage.getChecklists();
                          const found = allChecklists.find(c => c.id === record.checklistId || record.serviceDescription.includes(c.protocolNumber) || c.customerId === record.customerId);
                          if (found) {
                            setPdfChecklist(found);
                          } else {
                            alert('Relatório Técnico correspondente não encontrado.');
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        title="Ver Relatório Técnico em PDF"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecordToDelete(record)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Excluir Lançamento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredFinancials.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                    Nenhum registro financeiro encontrado para o período/filtro selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insumos & Despesas Catalog Modal */}
      {isInsumosModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base tracking-tight">Tabela de Insumos, Materiais & Despesas</h3>
                  <p className="text-xs text-slate-400">Gerencie os insumos de limpeza, combustíveis e EPIs com seus custos unitários.</p>
                </div>
              </div>
              <button onClick={() => setIsInsumosModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700">Itens Cadastrados ({expenseItems.length})</span>
                <button
                  type="button"
                  onClick={handleOpenAddItem}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-all text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Insumo</span>
                </button>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Item / Insumo</th>
                      <th className="p-2.5">Categoria</th>
                      <th className="p-2.5">Unidade</th>
                      <th className="p-2.5 text-right">Custo Padrão</th>
                      <th className="p-2.5 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expenseItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-2.5 font-bold text-slate-800">
                          {item.name}
                          {item.supplier && <span className="block text-[10px] text-slate-400 font-normal">Fornecedor: {item.supplier}</span>}
                        </td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                            {item.category}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-600 font-medium">{item.unit}</td>
                        <td className="p-2.5 text-right font-bold text-emerald-700">
                          R$ {item.defaultUnitCost.toFixed(2)}
                        </td>
                        <td className="p-2.5 text-center flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditItem(item)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {expenseItems.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                          Nenhum insumo cadastrado na tabela.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsInsumosModalOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Expense Item Sub-Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="font-bold text-slate-900 text-sm">
                {editingItem ? 'Editar Insumo / Despesa' : 'Novo Insumo ou Material'}
              </h4>
              <button type="button" onClick={() => setIsItemModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Nome do Insumo / Material</label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Ex: Desengraxante especial..."
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Categoria</label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="insumo">Insumo</option>
                    <option value="despesa">Despesa</option>
                    <option value="produto_limpeza">Produto de Limpeza</option>
                    <option value="material">Material Elétrico/Estrutura</option>
                    <option value="epi">EPI / Segurança</option>
                    <option value="equipamento">Equipamento</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Unidade de Medida</label>
                  <input
                    type="text"
                    value={itemUnit}
                    onChange={(e) => setItemUnit(e.target.value)}
                    placeholder="Litro, Metro, Unidade..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Custo Unitário Padrão (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemCost}
                    onChange={(e) => setItemCost(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Fornecedor Principal</label>
                  <input
                    type="text"
                    value={itemSupplier}
                    onChange={(e) => setItemSupplier(e.target.value)}
                    placeholder="Ex: Loja Solar..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold">Serviços Relacionados (Multi-seleção):</label>
                <div className="space-y-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                  {allServicesList.map((srv) => {
                    const isChecked = itemRelatedServices.includes(srv.title);
                    return (
                      <label key={srv.id} className="flex items-center space-x-2 cursor-pointer text-slate-700">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setItemRelatedServices((prev) => [...prev, srv.title]);
                            } else {
                              setItemRelatedServices((prev) => prev.filter((t) => t !== srv.title));
                            }
                          }}
                          className="rounded text-amber-500 focus:ring-amber-400 h-3.5 w-3.5"
                        />
                        <span className="truncate">{srv.title}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold">Observações / Aplicação</label>
                <textarea
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  rows={2}
                  placeholder="Detalhes ou instrução de uso..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Salvar Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Report Modal */}
      <PdfReportModal
        checklist={pdfChecklist}
        isOpen={Boolean(pdfChecklist)}
        onClose={() => setPdfChecklist(null)}
      />

      {/* Delete Record Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-slate-900 text-base">Excluir Lançamento Financeiro?</h3>
            <p className="text-xs text-slate-500">
              Valor: <strong>R$ {recordToDelete.netAmount.toFixed(2)}</strong> ({recordToDelete.serviceDescription})
            </p>
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950">
              Esta exclusão será registrada no histórico de auditoria com seu usuário e data/hora.
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Motivo da Exclusão</label>
              <input
                type="text"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Ex: Cancelamento de serviço / Lançamento incorreto"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-slate-900 text-base">Excluir Insumo / Despesa?</h3>
            <p className="text-xs text-slate-500">
              Item: <strong>{itemToDelete.name}</strong> (R$ {itemToDelete.defaultUnitCost.toFixed(2)})
            </p>
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950">
              Esta exclusão será registrada no histórico de auditoria.
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteItem}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs"
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
