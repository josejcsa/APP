import React, { useState, useMemo } from 'react';
import {
  Scale,
  TrendingUp,
  CreditCard,
  CheckSquare,
  Square,
  ArrowRightLeft,
  Search,
  Eye,
  ChevronDown,
  ChevronUp,
  FileCheck,
  RotateCcw
} from 'lucide-react';
import { AccountPayable, AccountReceivable, ReconciliationBatch } from '../../types';
import { storage } from '../../utils/storage';
import { formatCurrency } from '../../utils/formatters';

interface AccountReconciliationTabProps {
  onRefreshParent: () => void;
}

export const AccountReconciliationTab: React.FC<AccountReconciliationTabProps> = ({
  onRefreshParent
}) => {
  const [payables, setPayables] = useState<AccountPayable[]>(storage.getAccountsPayable());
  const [receivables, setReceivables] = useState<AccountReceivable[]>(storage.getAccountsReceivable());
  const [batches, setBatches] = useState<ReconciliationBatch[]>(storage.getReconciliationBatches());

  // Multi-to-multi selection
  const [selectedReceivableIds, setSelectedReceivableIds] = useState<string[]>([]);
  const [selectedPayableIds, setSelectedPayableIds] = useState<string[]>([]);

  // Filters for each column
  const [receivableSearch, setReceivableSearch] = useState('');
  const [payableSearch, setPayableSearch] = useState('');
  const [showOnlyUnreconciled, setShowOnlyUnreconciled] = useState(true);

  // Settlement Modal State
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [batchCode, setBatchCode] = useState(`ENC-${new Date().getFullYear()}-${String(batches.length + 1).padStart(4, '0')}`);
  const [batchDate, setBatchDate] = useState(new Date().toISOString().slice(0, 10));
  const [settlementMethod, setSettlementMethod] = useState<NonNullable<ReconciliationBatch['settlementMethod']>>('compensacao_total');
  const [batchNotes, setBatchNotes] = useState('');

  // View Batch Details Modal State
  const [viewingBatch, setViewingBatch] = useState<ReconciliationBatch | null>(null);

  // History collapse state
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);

  const refreshAll = () => {
    setPayables(storage.getAccountsPayable());
    setReceivables(storage.getAccountsReceivable());
    setBatches(storage.getReconciliationBatches());
    onRefreshParent();
  };

  // Filtered lists
  const filteredReceivables = useMemo(() => {
    return receivables.filter(r => {
      if (showOnlyUnreconciled && r.reconciled) return false;
      if (receivableSearch.trim()) {
        const q = receivableSearch.toLowerCase();
        return r.description.toLowerCase().includes(q) || r.payerName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [receivables, showOnlyUnreconciled, receivableSearch]);

  const filteredPayables = useMemo(() => {
    return payables.filter(p => {
      if (showOnlyUnreconciled && p.reconciled) return false;
      if (payableSearch.trim()) {
        const q = payableSearch.toLowerCase();
        return p.description.toLowerCase().includes(q) || p.beneficiary.toLowerCase().includes(q);
      }
      return true;
    });
  }, [payables, showOnlyUnreconciled, payableSearch]);

  // Selected totals
  const totalSelectedReceivable = useMemo(() => {
    return receivables
      .filter(r => selectedReceivableIds.includes(r.id))
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [receivables, selectedReceivableIds]);

  const totalSelectedPayable = useMemo(() => {
    return payables
      .filter(p => selectedPayableIds.includes(p.id))
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [payables, selectedPayableIds]);

  const netBalance = totalSelectedReceivable - totalSelectedPayable;

  // Toggle selection handlers
  const toggleReceivable = (id: string) => {
    setSelectedReceivableIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const togglePayable = (id: string) => {
    setSelectedPayableIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllReceivables = () => {
    const selectable = filteredReceivables.filter(r => !r.reconciled).map(r => r.id);
    const allSelected = selectable.every(id => selectedReceivableIds.includes(id));
    if (allSelected) {
      setSelectedReceivableIds(prev => prev.filter(id => !selectable.includes(id)));
    } else {
      setSelectedReceivableIds(prev => Array.from(new Set([...prev, ...selectable])));
    }
  };

  const handleSelectAllPayables = () => {
    const selectable = filteredPayables.filter(p => !p.reconciled).map(p => p.id);
    const allSelected = selectable.every(id => selectedPayableIds.includes(id));
    if (allSelected) {
      setSelectedPayableIds(prev => prev.filter(id => !selectable.includes(id)));
    } else {
      setSelectedPayableIds(prev => Array.from(new Set([...prev, ...selectable])));
    }
  };

  const handleClearSelection = () => {
    setSelectedReceivableIds([]);
    setSelectedPayableIds([]);
  };

  // Execute reconciliation
  const handleOpenSettlementModal = () => {
    if (selectedReceivableIds.length === 0 && selectedPayableIds.length === 0) {
      alert('Selecione pelo menos um título a receber e um título a pagar para efetivar o encontro de contas.');
      return;
    }
    setBatchCode(`ENC-${new Date().getFullYear()}-${String(batches.length + 1).padStart(4, '0')}`);
    setBatchDate(new Date().toISOString().slice(0, 10));
    setSettlementMethod(
      Math.abs(netBalance) < 0.01
        ? 'compensacao_total'
        : netBalance > 0
        ? 'pix_diferenca'
        : 'credito_futuro'
    );
    setBatchNotes('');
    setIsSettlementModalOpen(true);
  };

  const handleConfirmReconciliation = () => {
    const newBatch: ReconciliationBatch = {
      id: `batch-${Date.now()}`,
      batchCode,
      title: `Encontro de Contas #${batchCode}`,
      date: batchDate,
      totalReceivable: totalSelectedReceivable,
      totalPayable: totalSelectedPayable,
      netBalance,
      receivableItemIds: selectedReceivableIds,
      payableItemIds: selectedPayableIds,
      settlementMethod,
      notes: batchNotes.trim() || undefined,
      operator: storage.getSettings().currentUser || 'Administrador Elthera',
      createdAt: new Date().toISOString(),
    };

    storage.saveReconciliationBatch(newBatch);
    setSelectedReceivableIds([]);
    setSelectedPayableIds([]);
    setIsSettlementModalOpen(false);
    refreshAll();
  };

  const handleUndoBatch = (batchId: string) => {
    if (window.confirm('Tem certeza que deseja estornar este Encontro de Contas? Os títulos a receber e a pagar selecionados retornarão ao estado não compensado.')) {
      storage.undoReconciliationBatch(batchId);
      refreshAll();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-black text-white text-sm shadow-xs shadow-indigo-200">
              <Scale className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Encontro de Contas (Compensação Cruzada Múltipla)</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Relacione créditos (lucros/receitas) e débitos (despesas/custos) selecionando múltiplos títulos com check para apuração e quitação de saldo líquido.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyUnreconciled}
              onChange={(e) => setShowOnlyUnreconciled(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-400 h-3.5 w-3.5"
            />
            <span>Ocultar já compensados</span>
          </label>

          {(selectedReceivableIds.length > 0 || selectedPayableIds.length > 0) && (
            <button
              type="button"
              onClick={handleClearSelection}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Limpar Seleção
            </button>
          )}
        </div>
      </div>

      {/* Live Reconciliation Formula / Summary Panel */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-5 rounded-3xl text-white shadow-md border border-slate-700 space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Apuração em Tempo Real do Encontro de Contas
            </span>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {/* Total Receivables Box */}
              <div className="bg-emerald-950/60 border border-emerald-500/30 px-3 py-2 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-emerald-300 block">
                  Créditos Selecionados ({selectedReceivableIds.length})
                </span>
                <span className="text-base font-black text-emerald-400">
                  + {formatCurrency(totalSelectedReceivable)}
                </span>
              </div>

              <span className="text-xl font-black text-slate-400">-</span>

              {/* Total Payables Box */}
              <div className="bg-rose-950/60 border border-rose-500/30 px-3 py-2 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-rose-300 block">
                  Débitos Selecionados ({selectedPayableIds.length})
                </span>
                <span className="text-base font-black text-rose-400">
                  - {formatCurrency(totalSelectedPayable)}
                </span>
              </div>

              <span className="text-xl font-black text-slate-400">=</span>

              {/* Net Result Box */}
              <div className={`px-4 py-2 rounded-xl border ${
                netBalance > 0
                  ? 'bg-emerald-900/60 border-emerald-400 text-emerald-300'
                  : netBalance < 0
                  ? 'bg-amber-900/60 border-amber-400 text-amber-300'
                  : 'bg-indigo-900/60 border-indigo-400 text-indigo-300'
              }`}>
                <span className="text-[10px] uppercase font-bold block">
                  {netBalance > 0
                    ? 'Superávit a Receber (Crédito)'
                    : netBalance < 0
                    ? 'Déficit a Pagar (Débito)'
                    : 'Compensação Exata (Zero a Zero)'}
                </span>
                <span className="text-lg font-black tracking-tight">
                  {formatCurrency(Math.abs(netBalance))}
                </span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div>
            <button
              type="button"
              onClick={handleOpenSettlementModal}
              disabled={selectedReceivableIds.length === 0 && selectedPayableIds.length === 0}
              className={`px-5 py-3 rounded-2xl font-black text-xs flex items-center space-x-2 transition-all shadow-lg ${
                selectedReceivableIds.length > 0 || selectedPayableIds.length > 0
                  ? 'bg-indigo-500 hover:bg-indigo-400 text-white cursor-pointer active:scale-95'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>Efetivar Encontro de Contas ({selectedReceivableIds.length + selectedPayableIds.length} títulos)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dual Column Layout: Left = Receitas, Right = Despesas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column: Receitas / Lucro / Contas a Receber */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          {/* Column Header */}
          <div className="p-4 bg-emerald-50/60 border-b border-emerald-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Lista de Lucro & Receitas (Entradas)</h3>
                <span className="text-[11px] text-emerald-800 font-semibold">
                  {filteredReceivables.length} disponíveis • Total: {formatCurrency(filteredReceivables.reduce((a, b) => a + b.amount, 0))}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSelectAllReceivables}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-white border border-emerald-200 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
            >
              Selecionar Todos
            </button>
          </div>

          {/* Search Box */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/40">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={receivableSearch}
                onChange={(e) => setReceivableSearch(e.target.value)}
                placeholder="Filtrar receitas por cliente ou serviço..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>

          {/* Cards List */}
          <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto p-2 space-y-1">
            {filteredReceivables.map((item) => {
              const isSelected = selectedReceivableIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => !item.reconciled && toggleReceivable(item.id)}
                  className={`p-3 rounded-2xl transition-all border flex items-start justify-between gap-3 ${
                    item.reconciled
                      ? 'bg-slate-50/60 border-slate-200 opacity-60 cursor-not-allowed'
                      : isSelected
                      ? 'bg-emerald-50/90 border-emerald-300 shadow-xs cursor-pointer'
                      : 'bg-white border-slate-100 hover:border-emerald-200 hover:bg-slate-50/60 cursor-pointer'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <button
                      type="button"
                      disabled={item.reconciled}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!item.reconciled) toggleReceivable(item.id);
                      }}
                      className="mt-0.5 text-emerald-600 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300 hover:text-emerald-400" />
                      )}
                    </button>

                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 text-xs">{item.description}</div>
                      <div className="text-[11px] text-slate-600">
                        Sacado: <strong className="text-slate-800">{item.payerName}</strong>
                      </div>
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="text-[10px] text-slate-400 font-mono">Venc: {item.dueDate}</span>
                        <span className="text-[10px] uppercase px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 font-medium">
                          {item.paymentMethod}
                        </span>
                        {item.reconciled && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-full font-bold">
                            Compensado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right whitespace-nowrap">
                    <span className="font-black text-emerald-700 text-sm block">
                      + {formatCurrency(item.amount)}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">{item.status}</span>
                  </div>
                </div>
              );
            })}

            {filteredReceivables.length === 0 && (
              <div className="p-8 text-center text-slate-400 italic text-xs">
                Nenhum título a receber disponível para conciliação.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Despesas / Custos / Contas a Pagar */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          {/* Column Header */}
          <div className="p-4 bg-rose-50/60 border-b border-rose-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-rose-600 text-white rounded-lg">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Lista de Despesas & Custos (Saídas)</h3>
                <span className="text-[11px] text-rose-800 font-semibold">
                  {filteredPayables.length} disponíveis • Total: {formatCurrency(filteredPayables.reduce((a, b) => a + b.amount, 0))}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSelectAllPayables}
              className="text-xs font-bold text-rose-700 hover:text-rose-900 bg-white border border-rose-200 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
            >
              Selecionar Todos
            </button>
          </div>

          {/* Search Box */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/40">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={payableSearch}
                onChange={(e) => setPayableSearch(e.target.value)}
                placeholder="Filtrar despesas por favorecido, combustível ou comissão..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
          </div>

          {/* Cards List */}
          <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto p-2 space-y-1">
            {filteredPayables.map((item) => {
              const isSelected = selectedPayableIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => !item.reconciled && togglePayable(item.id)}
                  className={`p-3 rounded-2xl transition-all border flex items-start justify-between gap-3 ${
                    item.reconciled
                      ? 'bg-slate-50/60 border-slate-200 opacity-60 cursor-not-allowed'
                      : isSelected
                      ? 'bg-rose-50/90 border-rose-300 shadow-xs cursor-pointer'
                      : 'bg-white border-slate-100 hover:border-rose-200 hover:bg-slate-50/60 cursor-pointer'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <button
                      type="button"
                      disabled={item.reconciled}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!item.reconciled) togglePayable(item.id);
                      }}
                      className="mt-0.5 text-rose-600 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-rose-600 fill-rose-100" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300 hover:text-rose-400" />
                      )}
                    </button>

                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 text-xs">{item.description}</div>
                      <div className="text-[11px] text-slate-600">
                        Favorecido: <strong className="text-slate-800">{item.beneficiary}</strong>
                      </div>
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="text-[10px] text-slate-400 font-mono">Venc: {item.dueDate}</span>
                        <span className="text-[10px] uppercase px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 font-medium">
                          {item.paymentMethod}
                        </span>
                        {item.reconciled && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-full font-bold">
                            Compensado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right whitespace-nowrap">
                    <span className="font-black text-rose-700 text-sm block">
                      - {formatCurrency(item.amount)}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">{item.status}</span>
                  </div>
                </div>
              );
            })}

            {filteredPayables.length === 0 && (
              <div className="p-8 text-center text-slate-400 italic text-xs">
                Nenhuma despesa ou custo disponível para conciliação.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reconciliation Batches History Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div
          onClick={() => setIsHistoryOpen(prev => !prev)}
          className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100/80 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <FileCheck className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Histórico de Encontros de Contas Realizados ({batches.length})
            </h3>
          </div>
          {isHistoryOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>

        {isHistoryOpen && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Código do Lote</th>
                  <th className="p-3">Data</th>
                  <th className="p-3 text-center">Títulos Compensados</th>
                  <th className="p-3 text-right">Total Receitas</th>
                  <th className="p-3 text-right">Total Despesas</th>
                  <th className="p-3 text-right">Saldo Compensado</th>
                  <th className="p-3">Forma Resíduo</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono font-bold text-indigo-700">#{batch.batchCode}</td>
                    <td className="p-3 text-slate-600">{batch.date}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full font-bold text-[10px]">
                        {batch.receivableItemIds.length} receitas • {batch.payableItemIds.length} despesas
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-700">
                      + {formatCurrency(batch.totalReceivable)}
                    </td>
                    <td className="p-3 text-right font-bold text-rose-700">
                      - {formatCurrency(batch.totalPayable)}
                    </td>
                    <td className="p-3 text-right font-black text-slate-900">
                      {batch.netBalance > 0
                        ? `+ ${formatCurrency(batch.netBalance)}`
                        : batch.netBalance < 0
                        ? `- ${formatCurrency(Math.abs(batch.netBalance))}`
                        : 'R$ 0,00'}
                    </td>
                    <td className="p-3 text-slate-600 text-[11px]">
                      {batch.settlementMethod === 'compensacao_total' && 'Compensação Total'}
                      {batch.settlementMethod === 'pix_diferenca' && 'PIX da Diferença'}
                      {batch.settlementMethod === 'credito_futuro' && 'Crédito Futuro'}
                      {batch.settlementMethod === 'outro' && 'Outro'}
                    </td>
                    <td className="p-3 text-center flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setViewingBatch(batch)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="Ver Detalhes do Lote"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUndoBatch(batch.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Estornar / Desfazer Encontro de Contas"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                {batches.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                      Nenhum Encontro de Contas registrado até o momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Confirmar Efetivação do Encontro de Contas */}
      {isSettlementModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-200">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Efetivar Encontro de Contas</h3>
                <p className="text-xs text-slate-400">Compensar mútuas obrigações entre receitas e despesas selecionadas.</p>
              </div>
            </div>

            {/* Reconciliation Math Box */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Receitas Selecionadas ({selectedReceivableIds.length}):</span>
                <span className="font-bold text-emerald-700">+ {formatCurrency(totalSelectedReceivable)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Despesas Selecionadas ({selectedPayableIds.length}):</span>
                <span className="font-bold text-rose-700">- {formatCurrency(totalSelectedPayable)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                <span className="font-bold text-slate-900">Saldo Residual Líquido:</span>
                <span className={`font-black ${netBalance >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {netBalance >= 0 ? `+ ${formatCurrency(netBalance)}` : `- ${formatCurrency(Math.abs(netBalance))}`}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Código do Lote</label>
                  <input
                    type="text"
                    value={batchCode}
                    onChange={(e) => setBatchCode(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Data da Liquidação</label>
                  <input
                    type="date"
                    value={batchDate}
                    onChange={(e) => setBatchDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold">Tratamento do Saldo Residual</label>
                <select
                  value={settlementMethod}
                  onChange={(e) => setSettlementMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                >
                  <option value="compensacao_total">Compensação Integral Sem Saldo Residual (Zero a Zero)</option>
                  <option value="pix_diferenca">PIX da Diferença / Saldo Residual</option>
                  <option value="credito_futuro">Lançar Diferença como Crédito/Débito Futuro</option>
                  <option value="outro">Outro Ajuste / Acordo Comercial</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold">Observações do Acordo / Termo</label>
                <textarea
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  rows={2}
                  placeholder="Ex: Acerto semanal com técnico e fornecedor solar..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSettlementModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReconciliation}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Confirmar e Compensar Títulos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ver Detalhes do Lote de Encontro de Contas */}
      {viewingBatch && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Encontro de Contas #{viewingBatch.batchCode}
                </h3>
                <p className="text-xs text-slate-400">
                  Realizado em {viewingBatch.date} por {viewingBatch.operator}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingBatch(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Summary Box */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-emerald-800 font-bold block">Receitas Compensadas</span>
                <span className="text-base font-black text-emerald-700">
                  + {formatCurrency(viewingBatch.totalReceivable)}
                </span>
                <span className="text-[10px] text-emerald-600">{viewingBatch.receivableItemIds.length} títulos</span>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                <span className="text-rose-800 font-bold block">Despesas Compensadas</span>
                <span className="text-base font-black text-rose-700">
                  - {formatCurrency(viewingBatch.totalPayable)}
                </span>
                <span className="text-[10px] text-rose-600">{viewingBatch.payableItemIds.length} títulos</span>
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                <span className="text-indigo-800 font-bold block">Saldo Residual</span>
                <span className="text-base font-black text-indigo-900">
                  {formatCurrency(viewingBatch.netBalance)}
                </span>
                <span className="text-[10px] text-indigo-600">{viewingBatch.settlementMethod}</span>
              </div>
            </div>

            {/* Item Details */}
            <div className="space-y-3 text-xs">
              <div>
                <h4 className="font-bold text-emerald-800 mb-1">Receitas Vinculadas ao Lote:</h4>
                <div className="bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-100 p-2">
                  {receivables
                    .filter(r => viewingBatch.receivableItemIds.includes(r.id))
                    .map(r => (
                      <div key={r.id} className="py-1.5 flex justify-between text-[11px]">
                        <span>{r.description} ({r.payerName})</span>
                        <span className="font-bold text-emerald-700">+ {formatCurrency(r.amount)}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-rose-800 mb-1">Despesas Vinculadas ao Lote:</h4>
                <div className="bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-100 p-2">
                  {payables
                    .filter(p => viewingBatch.payableItemIds.includes(p.id))
                    .map(p => (
                      <div key={p.id} className="py-1.5 flex justify-between text-[11px]">
                        <span>{p.description} ({p.beneficiary})</span>
                        <span className="font-bold text-rose-700">- {formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                </div>
              </div>

              {viewingBatch.notes && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 text-[11px]">
                  <strong>Observações:</strong> {viewingBatch.notes}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingBatch(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
