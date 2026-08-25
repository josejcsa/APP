import React, { useState, useEffect } from 'react';
import { History, X, Search, Filter, ShieldCheck, User, Calendar, Trash2, Edit3, PlusCircle, CheckCircle2, FileText, DollarSign, Clock } from 'lucide-react';
import { AuditLogEntry } from '../types';
import { storage } from '../utils/storage';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('todos');
  const [filterEntity, setFilterEntity] = useState<string>('todos');

  useEffect(() => {
    if (isOpen) {
      setLogs(storage.getAuditLogs());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.summary && log.summary.toLowerCase().includes(searchTerm.toLowerCase())) ||
      log.entityId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = filterAction === 'todos' || log.action === filterAction;
    const matchesEntity = filterEntity === 'todos' || log.entityType === filterEntity;

    return matchesSearch && matchesAction && matchesEntity;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'Criação':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800"><PlusCircle className="w-3 h-3" /> Criação</span>;
      case 'Edição':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800"><Edit3 className="w-3 h-3" /> Edição</span>;
      case 'Exclusão':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800"><Trash2 className="w-3 h-3" /> Exclusão</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{action}</span>;
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'checklist':
        return <FileText className="w-3.5 h-3.5 text-amber-500" />;
      case 'financial':
        return <DollarSign className="w-3.5 h-3.5 text-emerald-500" />;
      case 'appointment':
        return <Calendar className="w-3.5 h-3.5 text-blue-500" />;
      case 'contact':
        return <User className="w-3.5 h-3.5 text-purple-500" />;
      default:
        return <History className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-400/20 text-amber-400 rounded-2xl border border-amber-400/30">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight">Registro de Auditoria & Rastreabilidade</h3>
              <p className="text-xs text-slate-400">Histórico de criação, edições, revisões e exclusões com usuário e data/hora</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por usuário, protocolo ou detalhe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-400"
            >
              <option value="todos">⚡ Todas as Ações</option>
              <option value="Criação">➕ Criação</option>
              <option value="Edição">✏️ Edição / Alteração</option>
              <option value="Exclusão">🗑️ Exclusão</option>
            </select>
          </div>

          <div>
            <select
              value={filterEntity}
              onChange={(e) => setFilterEntity(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-400"
            >
              <option value="todos">📁 Todas as Áreas</option>
              <option value="checklist">📄 Checklists / Laudos</option>
              <option value="financial">💰 Financeiro</option>
              <option value="appointment">📅 Agendamentos</option>
              <option value="contact">👥 Contatos & Técnicos</option>
            </select>
          </div>
        </div>

        {/* Logs Table / List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-white">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <ShieldCheck className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">Nenhum registro de auditoria encontrado</p>
              <p className="text-xs text-slate-400">Todas as criações, edições e exclusões realizadas no aplicativo serão exibidas aqui.</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 border border-slate-200 rounded-2xl hover:border-amber-300 transition-colors bg-white space-y-2 shadow-2xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2 text-xs">
                  <div className="flex items-center space-x-2">
                    {getActionBadge(log.action)}
                    <span className="flex items-center gap-1 font-bold text-slate-800 capitalize">
                      {getEntityIcon(log.entityType)} {log.entityType}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">ID: {log.entityId}</span>
                  </div>

                  <div className="flex items-center space-x-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      <User className="w-3.5 h-3.5 text-slate-400" /> {log.user}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 font-medium">
                  {log.summary || 'Registro de atividade do sistema.'}
                </p>

                {log.details && (
                  <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl font-mono">
                    {log.details}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Total de registros rastreados: <strong>{filteredLogs.length}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
