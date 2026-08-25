import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, Calendar, AlertTriangle, Info, Zap, X, Volume2, VolumeX } from 'lucide-react';
import { storage } from '../utils/storage';
import { notificationService } from '../utils/notifications';
import { AppNotification } from '../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAppointment?: (appointmentId: string) => void;
  onSelectCustomer?: (customerId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onSelectAppointment,
  onSelectCustomer,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>(storage.getNotifications());
  const [permission, setPermission] = useState(notificationService.getPermissionStatus());

  const refreshList = () => {
    setNotifications(storage.getNotifications());
  };

  useEffect(() => {
    if (isOpen) {
      refreshList();
    }
  }, [isOpen]);

  const handleRequestPush = async () => {
    const granted = await notificationService.requestPermission();
    setPermission(granted ? 'granted' : 'denied');
    if (granted) {
      notificationService.notifyTechnician(
        '🔔 Notificações Ativadas',
        'Você receberá alertas automáticos sobre agendamentos próximos e checklists pendentes.'
      );
      refreshList();
    }
  };

  const handleMarkRead = (id: string) => {
    storage.markNotificationAsRead(id);
    refreshList();
  };

  const handleMarkAllRead = () => {
    storage.markAllNotificationsAsRead();
    refreshList();
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (!isOpen) return null;

  return (
    <div id="notification-drawer-backdrop" className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div
        id="notification-drawer-panel"
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 border-l border-slate-200"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base tracking-tight">Alertas & Notificações</h3>
              <p className="text-xs text-slate-400">{unreadCount} não lida{unreadCount === 1 ? '' : 's'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                title="Marcar todas como lidas"
                className="px-2.5 py-1 text-xs text-amber-950 hover:bg-amber-100 rounded-lg font-bold transition-colors"
              >
                Ler todas
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Push Notification Banner */}
        {permission !== 'granted' && (
          <div className="p-4 bg-amber-50/80 border-b border-amber-200 flex items-start space-x-3 text-xs text-amber-950">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Ativar Notificações no Celular/Tablet?</p>
              <p className="text-amber-800 mt-0.5">Receba alertas sonoros e push sobre serviços agendados para o técnico.</p>
              <button
                onClick={handleRequestPush}
                className="mt-2.5 px-3.5 py-1.5 bg-amber-400 text-amber-950 rounded-xl text-xs font-bold hover:bg-amber-500 transition-all shadow-xs shadow-amber-200 cursor-pointer"
              >
                Permitir Notificações
              </button>
            </div>
          </div>
        )}

        {/* List of Notifications */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Bell className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm font-bold text-slate-600">Nenhuma notificação no momento</p>
              <p className="text-xs text-slate-400 mt-1">Alertas de visitas técnicas aparecerão aqui</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const dateStr = new Date(notif.timestamp).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    handleMarkRead(notif.id);
                    if (notif.appointmentId) onSelectAppointment?.(notif.appointmentId);
                    if (notif.customerId) onSelectCustomer?.(notif.customerId);
                  }}
                  className={`pt-3 pb-2 px-3 rounded-2xl cursor-pointer transition-colors ${
                    !notif.read ? 'bg-amber-50/60 border border-amber-200' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      {notif.type === 'agendamento' ? (
                        <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                      ) : notif.type === 'pendencia' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      ) : (
                        <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                      <span className={`text-xs font-bold ${!notif.read ? 'text-slate-900' : 'text-slate-700'}`}>
                        {notif.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">{dateStr}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 pl-6 leading-relaxed">{notif.message}</p>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center space-x-1.5">
            <Volume2 className="w-3.5 h-3.5 text-amber-600" />
            <span>Alertas sonoros habilitados</span>
          </span>
          <button
            onClick={() => {
              notificationService.playAlertSound();
            }}
            className="text-[11px] text-amber-950 hover:underline font-bold"
          >
            Testar Alarme
          </button>
        </div>
      </div>
    </div>
  );
};
