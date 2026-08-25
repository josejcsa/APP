import React, { useState, useEffect } from 'react';
import {
  Sun,
  LayoutDashboard,
  UserCheck,
  ClipboardCheck,
  Calendar,
  DollarSign,
  Users,
  Settings,
  Bell,
  Sparkles,
  History,
  LogOut,
  User
} from 'lucide-react';
import { SyncStatusBadge } from './SyncStatusBadge';
import { storage } from '../utils/storage';
import { CompanySettings, AuthSession, NavTabId } from '../types';

interface NavbarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenNotifications: () => void;
  onOpenSettings: () => void;
  onOpenAuditLog?: () => void;
  onLogout?: () => void;
  session?: AuthSession | null;
  unreadNotificationsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenNotifications,
  onOpenSettings,
  onOpenAuditLog,
  onLogout,
  session,
  unreadNotificationsCount,
}) => {
  const [settings, setSettings] = useState<CompanySettings>(storage.getSettings());
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setSettings(storage.getSettings());
  }, [activeTab]);

  const allNavItems = [
    { id: 'geral' as NavTabId, label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'cliente' as NavTabId, label: 'Painel por Cliente', icon: UserCheck },
    { id: 'checklist' as NavTabId, label: 'Checklist Técnico', icon: ClipboardCheck },
    { id: 'agenda' as NavTabId, label: 'Agenda & Calendar', icon: Calendar },
    { id: 'financeiro' as NavTabId, label: 'Financeiro Mensal', icon: DollarSign },
    { id: 'contatos' as NavTabId, label: 'Clientes & Técnicos', icon: Users },
  ];

  // Filter nav items based on user session permissions (allowedNavTabs)
  const navItems = allNavItems.filter((item) => {
    if (!session || !session.allowedNavTabs || session.allowedNavTabs.length === 0) {
      return true;
    }
    return session.allowedNavTabs.includes(item.id);
  });

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => onSelectTab('geral')}
          >
            {settings.logoUrl && !logoError ? (
              <img
                src={settings.logoUrl}
                alt="Elthera"
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
                className="h-10 w-auto max-w-[120px] object-contain rounded-lg transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="w-9 h-9 bg-amber-400 group-hover:bg-amber-500 rounded-xl flex items-center justify-center font-black text-amber-950 text-base shadow-xs shadow-amber-200 transition-colors">
                E
              </div>
            )}
            <div>
              <div className="flex items-center space-x-1">
                <span className="font-black text-base tracking-tighter text-slate-900">
                  ELTHERA
                </span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-md uppercase tracking-wider ml-1">
                  SOLAR
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block -mt-0.5 font-medium">
                Gestão Técnica & Limpeza Fotovoltaica
              </span>
            </div>
          </div>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-amber-50 text-amber-800 border border-amber-200/70 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? 'bg-amber-500' : 'bg-transparent'
                    }`}
                  />
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Actions: Sync Badge, Audit Log, Notifications, Settings */}
          <div className="flex items-center space-x-2">
            <SyncStatusBadge />

            {/* Audit Log Button */}
            {onOpenAuditLog && (
              <button
                type="button"
                id="btn-open-audit-log"
                onClick={onOpenAuditLog}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-transparent hover:border-slate-200 flex items-center gap-1 text-xs font-bold"
                title="Histórico de Auditoria & Modificações"
              >
                <History className="w-4 h-4 text-slate-600" />
                <span className="hidden xl:inline text-slate-700">Auditoria</span>
              </button>
            )}

            {/* Notification Bell */}
            <button
              type="button"
              id="btn-open-notifications-drawer"
              onClick={onOpenNotifications}
              className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-transparent hover:border-slate-200"
              title="Notificações Técnicas"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-amber-400 text-amber-950 font-black text-[9px] rounded-full flex items-center justify-center shadow-xs">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Settings */}
            <button
              type="button"
              id="btn-open-settings-modal"
              onClick={onOpenSettings}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-transparent hover:border-slate-200"
              title="Configurações & Google Workspace"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Logged-in User Profile & Logout */}
            {session && (
              <div className="flex items-center space-x-1 pl-2 border-l border-slate-200">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-900 leading-tight max-w-[120px] truncate">
                    {session.name}
                  </span>
                  <span className="text-[10px] text-amber-700 font-semibold uppercase">
                    {session.role === 'admin' ? 'Master' : session.isTechnician ? 'Técnico' : 'Cliente'}
                  </span>
                </div>

                {onLogout && (
                  <button
                    type="button"
                    id="btn-logout-session"
                    onClick={onLogout}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-200 cursor-pointer"
                    title={`Sair da conta (${session.name})`}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="lg:hidden flex items-center space-x-1 overflow-x-auto py-2 border-t border-slate-100 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  isActive
                    ? 'bg-amber-50 text-amber-800 border border-amber-200/70'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
