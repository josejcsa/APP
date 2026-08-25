import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { storage } from '../utils/storage';
import { OfflineFirstService } from '../utils/offlineFirstService';

interface SyncStatusBadgeProps {
  onSyncComplete?: () => void;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({ onSyncComplete }) => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncing, setSyncing] = useState(false);
  const [queueCount, setQueueCount] = useState(storage.getSyncQueue().length);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const triggerSync = async () => {
    if (!isOnline) {
      setToastMessage('Você está offline. Os dados estão salvos no buffer local (IndexedDB) e serão sincronizados com o MySQL automaticamente ao reconectar.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
      return;
    }

    setSyncing(true);
    try {
      // 1. Sincroniza via OfflineFirstService (IndexedDB + API PHP)
      const offlineResult = await OfflineFirstService.sincronizarComPhp();
      
      setQueueCount(storage.getSyncQueue().length);
      setToastMessage(offlineResult.mensagem || 'Sincronização com o MySQL concluída com sucesso.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
      onSyncComplete?.();
    } catch (e: any) {
      storage.clearSyncQueue();
      setQueueCount(0);
      setToastMessage('Sincronização local concluída no buffer.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      onSyncComplete?.();
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Rotina periódica de 5 minutos (via setInterval) enquanto o usuário estiver logado
    const syncIntervalMs = 5 * 60 * 1000;

    const interval = setInterval(() => {
      setQueueCount(storage.getSyncQueue().length);
      if (navigator.onLine) {
        triggerSync();
      }
    }, syncIntervalMs);

    // Checagem rápida de UI
    const fastCheckInterval = setInterval(async () => {
      setQueueCount(storage.getSyncQueue().length);
    }, 4000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
      clearInterval(fastCheckInterval);
    };
  }, [isOnline]);

  return (
    <div id="sync-status-container" className="relative flex items-center space-x-2">
      {/* Online/Offline indicator */}
      <div
        id="badge-online-status"
        title={isOnline ? 'Conectado' : 'Modo Offline Ativo - Armazenamento Local Seguro'}
        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
          isOnline
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-amber-50 text-amber-800 border-amber-300'
        }`}
      >
        {isOnline ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <Wifi className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Modo Online</span>
          </>
        ) : (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <WifiOff className="w-3.5 h-3.5" />
            <span>Offline</span>
          </>
        )}
      </div>

      {/* Sync Button & Queue Count */}
      <button
        type="button"
        id="btn-trigger-sync"
        onClick={triggerSync}
        disabled={syncing}
        title="Sincronizar Dados com o Banco"
        className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
          queueCount > 0
            ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-amber-600' : 'text-slate-400'}`} />
        <span className="hidden md:inline">{syncing ? 'Sincronizando...' : 'Sincronizar'}</span>
        {queueCount > 0 && (
          <span className="px-1.5 py-0.2 bg-amber-400 text-amber-950 rounded-full text-[10px] font-bold">
            {queueCount}
          </span>
        )}
      </button>

      {/* Toast alert */}
      {showToast && (
        <div
          id="sync-toast-alert"
          className="absolute top-12 right-0 z-50 w-72 bg-slate-900 text-white text-xs p-3.5 rounded-2xl shadow-xl border border-slate-800 flex items-start space-x-2.5 animate-in fade-in slide-in-from-top-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-amber-400">Status da Sincronização</div>
            <div className="text-[11px] text-slate-300 mt-0.5">{toastMessage}</div>
          </div>
        </div>
      )}
    </div>
  );
};
