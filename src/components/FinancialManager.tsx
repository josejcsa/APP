import React, { useState } from 'react';
import {
  DollarSign,
  CreditCard,
  TrendingUp,
  Scale,
  RefreshCw
} from 'lucide-react';
import { FinancialRecord, Contact, TechnicalChecklist, ExpenseSupplyItem, Appointment } from '../types';
import { storage } from '../utils/storage';
import { FinancialOverviewTab } from './financial/FinancialOverviewTab';
import { AccountsPayableTab } from './financial/AccountsPayableTab';
import { AccountsReceivableTab } from './financial/AccountsReceivableTab';
import { AccountReconciliationTab } from './financial/AccountReconciliationTab';

type FinancialTabType = 'overview' | 'payables' | 'receivables' | 'reconciliation';

export const FinancialManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FinancialTabType>('overview');

  // Shared state
  const [financials, setFinancials] = useState<FinancialRecord[]>(storage.getFinancials());
  const [contacts, setContacts] = useState<Contact[]>(storage.getContacts());
  const [checklists, setChecklists] = useState<TechnicalChecklist[]>(storage.getChecklists());
  const [appointments, setAppointments] = useState<Appointment[]>(storage.getAppointments());
  const [expenseItems, setExpenseItems] = useState<ExpenseSupplyItem[]>(storage.getExpenseItems());
  const [payables, setPayables] = useState(storage.getAccountsPayable());
  const [receivables, setReceivables] = useState(storage.getAccountsReceivable());

  const handleRefresh = () => {
    setFinancials(storage.getFinancials());
    setContacts(storage.getContacts());
    setChecklists(storage.getChecklists());
    setAppointments(storage.getAppointments());
    setExpenseItems(storage.getExpenseItems());
    setPayables(storage.getAccountsPayable());
    setReceivables(storage.getAccountsReceivable());
  };

  // Badge counts
  const pendingPayablesCount = payables.filter(p => p.status === 'pendente' && !p.reconciled).length;
  const pendingReceivablesCount = receivables.filter(r => r.status === 'pendente' && !r.reconciled).length;

  return (
    <div className="space-y-6">
      {/* Top Main Navigation Tabs */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <nav className="flex flex-wrap items-center gap-1.5" aria-label="Abas Financeiras">
          {/* Tab 1: Painel Geral Financeiro */}
          <button
            type="button"
            id="tab-painel-geral"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-amber-400 text-amber-950 shadow-xs shadow-amber-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>1. Painel Geral Financeiro</span>
          </button>

          {/* Tab 2: Contas a Pagar */}
          <button
            type="button"
            id="tab-contas-a-pagar"
            onClick={() => setActiveTab('payables')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'payables'
                ? 'bg-rose-500 text-white shadow-xs shadow-rose-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>2. Contas a Pagar</span>
            {pendingPayablesCount > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'payables' ? 'bg-white text-rose-600' : 'bg-rose-100 text-rose-700'
                }`}
              >
                {pendingPayablesCount}
              </span>
            )}
          </button>

          {/* Tab 3: Contas a Receber */}
          <button
            type="button"
            id="tab-contas-a-receber"
            onClick={() => setActiveTab('receivables')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'receivables'
                ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>3. Contas a Receber</span>
            {pendingReceivablesCount > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'receivables' ? 'bg-white text-emerald-700' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {pendingReceivablesCount}
              </span>
            )}
          </button>

          {/* Tab 4: Encontro de Contas */}
          <button
            type="button"
            id="tab-encontro-de-contas"
            onClick={() => setActiveTab('reconciliation')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'reconciliation'
                ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>4. Encontro de Contas</span>
          </button>
        </nav>

        <button
          type="button"
          onClick={handleRefresh}
          className="flex items-center justify-center space-x-1 px-3 py-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          title="Atualizar Dados"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Atualizar</span>
        </button>
      </div>

      {/* Render Active Tab */}
      {activeTab === 'overview' && (
        <FinancialOverviewTab
          financials={financials}
          contacts={contacts}
          checklists={checklists}
          expenseItems={expenseItems}
          onRefresh={handleRefresh}
        />
      )}

      {activeTab === 'payables' && (
        <AccountsPayableTab
          contacts={contacts}
          appointments={appointments}
          checklists={checklists}
          onRefreshParent={handleRefresh}
        />
      )}

      {activeTab === 'receivables' && (
        <AccountsReceivableTab
          contacts={contacts}
          appointments={appointments}
          checklists={checklists}
          onRefreshParent={handleRefresh}
        />
      )}

      {activeTab === 'reconciliation' && (
        <AccountReconciliationTab
          onRefreshParent={handleRefresh}
        />
      )}
    </div>
  );
};
