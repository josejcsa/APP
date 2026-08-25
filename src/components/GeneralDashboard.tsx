import React, { useState } from 'react';
import {
  Zap,
  DollarSign,
  CheckCircle2,
  Calendar,
  Users,
  TrendingUp,
  ArrowUpRight,
  Sun,
  FileText,
  Clock,
  Sparkles,
  AlertTriangle,
  Play
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import { TechnicalChecklist, Appointment, FinancialRecord, Contact } from '../types';
import { storage } from '../utils/storage';

interface GeneralDashboardProps {
  onStartNewChecklist: (appointmentId?: string, customerId?: string) => void;
  onEditChecklist?: (checklist: TechnicalChecklist) => void;
  onOpenPdfReport: (checklist: TechnicalChecklist) => void;
  onNavigateToTab: (tab: string) => void;
  onSelectCustomer: (customerId: string) => void;
}

export const GeneralDashboard: React.FC<GeneralDashboardProps> = ({
  onStartNewChecklist,
  onEditChecklist,
  onOpenPdfReport,
  onNavigateToTab,
  onSelectCustomer,
}) => {
  const checklists = storage.getChecklists();
  const appointments = storage.getAppointments();
  const financials = storage.getFinancials();
  const contacts = storage.getContacts();
  const clients = storage.getClients();
  const technicians = storage.getTechnicians();

  // Current Month calculation
  const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
  const currentMonthFinancials = financials.filter((f) => f.month === currentMonthStr);
  const currentMonthRevenue = currentMonthFinancials.reduce((acc, curr) => acc + curr.grossAmount, 0);
  const currentMonthProfit = currentMonthFinancials.reduce((acc, curr) => {
    const expensesTotal = curr.expenses?.reduce((eAcc, e) => eAcc + e.amount, 0) || 0;
    return acc + (curr.netAmount - curr.technicianCommission - expensesTotal);
  }, 0);

  // Average Solar Efficiency Gain
  const validGainChecklists = checklists.filter((c) => c.after && c.after.calculatedGainPercent > 0);
  const avgGain = validGainChecklists.length > 0
    ? (validGainChecklists.reduce((acc, curr) => acc + curr.after.calculatedGainPercent, 0) / validGainChecklists.length).toFixed(1)
    : '0.0';

  // Today's appointments
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayAppointments = appointments.filter((a) => a.scheduledDate === todayStr || a.status === 'agendado');

  // Chart Data: Last 6 months performance calculated from real data
  const getRecentMonths = () => {
    const months: { month: string; monthKey: string; faturamento: number; limpezas: number; ganhoAvg: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = d.toISOString().slice(0, 7); // YYYY-MM
      const monthLabel = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
      const monthFins = financials.filter(f => f.month === monthKey);
      const monthChks = checklists.filter(c => c.date && c.date.startsWith(monthKey));
      const rev = monthFins.reduce((acc, curr) => acc + curr.grossAmount, 0);
      const gainSum = monthChks.reduce((acc, c) => acc + (c.after?.calculatedGainPercent || 0), 0);
      const avgG = monthChks.length > 0 ? Number((gainSum / monthChks.length).toFixed(1)) : 0;
      months.push({
        month: i === 0 ? `${monthLabel} (Atual)` : monthLabel,
        monthKey,
        faturamento: rev,
        limpezas: monthChks.length || monthFins.length,
        ganhoAvg: avgG,
      });
    }
    return months;
  };
  const chartData = getRecentMonths();

  return (
    <div id="general-dashboard-container" className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center font-black text-amber-950 text-sm shadow-xs shadow-amber-200">
              <Sun className="w-4 h-4 text-amber-950 fill-amber-950" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Gestão de Manutenção Solar</h1>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Painel Geral de Operações • Bem-vindo, Administrador Central
          </p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
          <div className="flex flex-col items-end">
            <span className="text-sm font-black text-slate-900">
              R$ {currentMonthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Faturamento Mensal</span>
          </div>

          <button
            type="button"
            id="btn-quick-new-checklist"
            onClick={() => onStartNewChecklist()}
            className="bg-amber-400 hover:bg-amber-500 text-amber-950 px-4 py-2.5 rounded-xl font-bold text-xs shadow-xs shadow-amber-200 transition-all active:scale-95 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>+ Novo Checklist</span>
          </button>
        </div>
      </div>

      {/* 4-Column KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Agendados Hoje */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Agendados Hoje</div>
          <div className="text-3xl font-black text-slate-800 tracking-tight">
            {String(todayAppointments.length).padStart(2, '0')}
          </div>
          <div className="text-[10px] text-amber-600 font-bold mt-2">
            {technicians.length} Técnicos em campo
          </div>
        </div>

        {/* KPI 2: Checklists Pendentes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Checklists Pendentes</div>
          <div className="text-3xl font-black text-rose-500 tracking-tight">
            {String(appointments.filter((a) => a.status === 'agendado').length).padStart(2, '0')}
          </div>
          <div className="text-[10px] text-slate-400 font-bold mt-2">Requer assinatura & laudo</div>
        </div>

        {/* KPI 3: Relatórios Gerados */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Relatórios Gerados</div>
          <div className="text-3xl font-black text-slate-800 tracking-tight">
            {String(checklists.length).padStart(2, '0')}
          </div>
          <div className="text-[10px] text-emerald-600 font-bold mt-2">100% Sincronizados na Nuvem</div>
        </div>

        {/* KPI 4: Clientes & Ganho Solar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Ganho Médio Solar</div>
          <div className="text-3xl font-black text-slate-800 tracking-tight">
            +{avgGain}%
          </div>
          <div className="text-[10px] text-blue-600 font-bold mt-2">{clients.length} Usinas cadastradas</div>
        </div>
      </div>

      {/* Service Order Monitoring + Side Sync/Alert Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monitoring Table (2 cols on large) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-500" />
                Monitoramento de Ordens de Serviço
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 font-medium">Google Calendar</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white text-slate-400 text-[10px] uppercase font-bold border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3.5">Cliente / Local</th>
                    <th className="px-5 py-3.5">Técnico Responsável</th>
                    <th className="px-5 py-3.5">Status da OS</th>
                    <th className="px-5 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {todayAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-slate-400 text-xs">
                        Nenhum atendimento agendado para hoje.
                      </td>
                    </tr>
                  ) : (
                    todayAppointments.map((apt) => {
                      const customer = contacts.find((c) => c.id === apt.customerId);
                      const tech = contacts.find((c) => c.id === apt.technicianId);
                      const isCompleted = apt.status === 'concluido';
                      const techInitials = tech?.name
                        ? tech.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
                        : 'TC';

                      return (
                        <tr key={apt.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-slate-900">
                              <button
                                onClick={() => customer && onSelectCustomer(customer.id)}
                                className="hover:text-amber-600 text-left transition-colors"
                              >
                                {customer?.name || 'Cliente'}
                              </button>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {customer?.address ? `${customer.address.street}, ${customer.address.number}` : 'Endereço em cadastro'}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-[10px] flex items-center justify-center font-bold border border-slate-200">
                                {techInitials}
                              </div>
                              <span className="font-medium text-slate-700">{tech?.name || 'Técnico'}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${
                                isCompleted
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                                  : apt.status === 'em_andamento'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200/60'
                                  : 'bg-amber-50 text-amber-700 border-amber-200/60'
                              }`}
                            >
                              {apt.status === 'concluido'
                                ? 'Pós-Serviço'
                                : apt.status === 'em_andamento'
                                ? 'Em Limpeza'
                                : 'Agendado'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {isCompleted ? (
                              <button
                                onClick={() => {
                                  const chk = checklists.find((c) => c.appointmentId === apt.id);
                                  if (chk) onOpenPdfReport(chk);
                                }}
                                className="text-amber-600 font-bold hover:underline text-xs"
                              >
                                Relatório PDF
                              </button>
                            ) : (
                              <button
                                onClick={() => onStartNewChecklist(apt.id, apt.customerId)}
                                className="bg-amber-400 hover:bg-amber-500 text-amber-950 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shadow-xs"
                              >
                                Iniciar Checklist
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Mostrando atendimentos de hoje ({todayAppointments.length})</span>
            <button
              onClick={() => onNavigateToTab('agenda')}
              className="text-amber-600 font-bold hover:underline flex items-center gap-1"
            >
              <span>Ver agenda completa</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Side Column: Sincronização & Alert Card */}
        <div className="flex flex-col gap-6">
          {/* Sincronização Financeira */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <h3 className="font-bold text-sm text-slate-800 mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Sincronização Financeira
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                <span className="text-xs text-slate-500">Planilha de Controle</span>
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Ativo (Sheets)
                </span>
              </div>
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                <span className="text-xs text-slate-500">Histórico de Clientes</span>
                <span className="text-xs font-bold text-slate-800">100% OK</span>
              </div>
              <div className="pt-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Última Exportação</div>
                <div className="text-xs font-medium text-slate-700 truncate">
                  Relatório Mensal - EltheraPro_{currentMonthStr}.xlsx
                </div>
              </div>
            </div>
          </div>

          {/* Aviso de Técnico / High Priority Highlight Card */}
          <div className="bg-amber-400 rounded-2xl p-5 text-amber-950 flex flex-col justify-between min-h-[140px] shadow-xs shadow-amber-200">
            <div className="flex justify-between items-start">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-amber-900">
                Aviso Técnico Operacional
              </div>
              <div className="w-2 h-2 rounded-full bg-amber-950 animate-pulse"></div>
            </div>
            <p className="text-xs font-black leading-snug my-2">
              {checklists.length > 0
                ? `${technicians[0]?.name || 'Equipe técnica'} finalizou o laudo com ganho solar de +${avgGain}%. PDF pronto para envio ao cliente.`
                : 'Nenhum laudo pendente. Clique abaixo para iniciar um novo checklist operacional.'}
            </p>
            <button
              onClick={() => {
                if (checklists.length > 0) {
                  onOpenPdfReport(checklists[0]);
                } else {
                  onStartNewChecklist();
                }
              }}
              className="bg-white hover:bg-amber-50 text-amber-950 text-[10px] font-black py-1.5 px-3 rounded-full self-start transition-colors shadow-xs cursor-pointer"
            >
              {checklists.length > 0 ? 'VER ÚLTIMO LAUDO PDF' : 'NOVO CHECKLIST'}
            </button>
          </div>
        </div>
      </div>

      {/* Financial & Efficiency Performance Charts */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              Evolução do Faturamento & Limpezas Realizadas
            </h3>
            <p className="text-xs text-slate-400">Dados consolidados e integrados com a planilha Google Sheets</p>
          </div>
          <button
            onClick={() => onNavigateToTab('financeiro')}
            className="text-xs text-amber-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
          >
            <span>Ver Planilha</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value: any, name: any) => [
                  name === 'faturamento' ? `R$ ${Number(value).toFixed(2)}` : value,
                  name === 'faturamento' ? 'Faturamento Bruto' : 'Limpezas Realizadas',
                ]}
                contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
              />
              <Bar dataKey="faturamento" fill="#f59e0b" radius={[6, 6, 0, 0]} name="faturamento" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Completed Checklists Table */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-amber-500" />
              Últimos Relatórios Técnicos Concluídos
            </h3>
            <p className="text-xs text-slate-400">Acesse e faça download do laudo com fotos e assinaturas digitais</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
                <th className="p-3">Protocolo</th>
                <th className="p-3">Cliente / Usina</th>
                <th className="p-3">Data</th>
                <th className="p-3">Técnico</th>
                <th className="p-3">Potência Antes ➔ Depois</th>
                <th className="p-3">Ganho (%)</th>
                <th className="p-3">Valor (R$)</th>
                <th className="p-3 text-right">Relatório PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {checklists.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                    Nenhum relatório técnico concluído ainda. Clique em "+ Novo Checklist" para registrar o primeiro atendimento.
                  </td>
                </tr>
              ) : (
                checklists.slice(0, 5).map((chk) => {
                  const client = contacts.find((c) => c.id === chk.customerId);
                  const tech = contacts.find((c) => c.id === chk.technicianId);
                  const gain = chk.after.calculatedGainPercent || 0;

                  return (
                    <tr key={chk.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{chk.protocolNumber}</td>
                      <td className="p-3">
                        <button
                          onClick={() => onSelectCustomer(chk.customerId)}
                          className="font-bold text-slate-900 hover:text-amber-600 text-left transition-colors"
                        >
                          {client?.name || 'Cliente'}
                        </button>
                      </td>
                      <td className="p-3 text-slate-500">{chk.date.split('-').reverse().join('/')}</td>
                      <td className="p-3 text-slate-700">{tech?.name || 'Técnico'}</td>
                      <td className="p-3 font-medium text-slate-800">
                        {chk.before.readingKwBefore.toFixed(2)} kW ➔ {chk.after.readingKwAfter.toFixed(2)} kW
                      </td>
                      <td className="p-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          +{gain.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-900">
                        R$ {chk.serviceValue.toFixed(2)}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenPdfReport(chk)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-semibold transition-colors shadow-xs cursor-pointer"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Ver PDF</span>
                          </button>
                          {onEditChecklist && (
                            <button
                              type="button"
                              onClick={() => onEditChecklist(chk)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              <span>Editar</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
