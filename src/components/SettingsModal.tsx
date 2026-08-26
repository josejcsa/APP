import React, { useState } from 'react';
import {
  Settings,
  X,
  Building,
  DollarSign,
  Save,
  Cloud,
  HardDrive,
  RefreshCw,
  Sliders,
  Lock,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import { CompanySettings, SyncFilterStrategy } from '../types';
import { storage } from '../utils/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const currentSession = storage.getCurrentSession();
  const isAdmin = Boolean(currentSession?.isAdmin);

  const [settings, setSettings] = useState<CompanySettings>(storage.getSettings());
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isAdmin) {
      // Admin pode salvar todas as configurações
      storage.saveSettings(settings);
    } else {
      // Usuário não-admin só pode alterar as preferências de sincronização local do seu dispositivo
      const currentGlobal = storage.getSettings();
      const updatedUserPreferences: CompanySettings = {
        ...currentGlobal,
        maxLocalRecordsLimit: settings.maxLocalRecordsLimit,
        syncFilterStrategy: settings.syncFilterStrategy,
        autoDownloadRemoteData: settings.autoDownloadRemoteData,
      };
      storage.saveSettings(updatedUserPreferences);
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-xl max-w-xl w-full p-6 space-y-4 border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base tracking-tight flex items-center gap-2">
                <span>Configurações do Sistema</span>
                {isAdmin ? (
                  <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md font-extrabold border border-purple-200">
                    Acesso ADM Total
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold border border-slate-200 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Apenas Leitura
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isAdmin
                  ? 'Você tem permissão de Administrador para editar dados da empresa e tabelas.'
                  : 'Dados da empresa protegidos. Você pode ajustar suas preferências de sincronização.'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Read-only banner notice if not admin */}
        {!isAdmin && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-2 text-slate-600 text-xs">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-800">Modo de Apenas Leitura nas Configurações da Empresa</p>
              <p className="text-[11px] text-slate-500">
                Os dados fiscais, precificação e endpoints são gerenciados exclusivamente por administradores. Você pode alterar livremente os controles de sincronização e armazenamento offline abaixo.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Company Branding */}
          <div className={`space-y-3 p-4 bg-slate-50 rounded-2xl border ${!isAdmin ? 'border-slate-200 opacity-90' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-amber-500" /> Dados da Empresa & Identidade Visual
              </h4>
              {!isAdmin && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Bloqueado para edição
                </span>
              )}
            </div>

            {/* Logo field & Preview */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-3">
              <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center p-1 shrink-0 overflow-hidden">
                {settings.logoUrl ? (
                  <img
                    src={settings.logoUrl}
                    alt="Logo Preview"
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Building className="w-6 h-6 text-slate-300" />
                )}
              </div>
              <div className="flex-1 w-full">
                <label className="block text-slate-700 mb-1 font-bold">URL da Logomarca (PNG/JPG/Web)</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={settings.logoUrl || ''}
                  onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                  placeholder="https://..."
                  className={`w-full px-3 py-1.5 border rounded-xl font-mono text-[11px] ${
                    !isAdmin
                      ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-2 focus:ring-amber-400'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Nome Fantasia (Marca)</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={settings.tradingName || 'Elthera'}
                  onChange={(e) => setSettings({ ...settings, tradingName: e.target.value })}
                  className={`w-full px-3.5 py-2 border rounded-xl font-medium ${
                    !isAdmin
                      ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-900 border-slate-200 focus:ring-2 focus:ring-amber-400'
                  }`}
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Razão Social</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={settings.companyName || ''}
                  onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  className={`w-full px-3.5 py-2 border rounded-xl font-medium ${
                    !isAdmin
                      ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-900 border-slate-200 focus:ring-2 focus:ring-amber-400'
                  }`}
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1 font-bold">CNPJ</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={settings.companyCnpj || settings.cnpj || ''}
                  onChange={(e) => setSettings({ ...settings, companyCnpj: e.target.value, cnpj: e.target.value })}
                  className={`w-full px-3.5 py-2 border rounded-xl font-medium ${
                    !isAdmin
                      ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-900 border-slate-200 focus:ring-2 focus:ring-amber-400'
                  }`}
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1 font-bold">WhatsApp / Telefone</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={settings.companyPhone || settings.phone || ''}
                  onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value, phone: e.target.value })}
                  className={`w-full px-3.5 py-2 border rounded-xl font-medium ${
                    !isAdmin
                      ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-900 border-slate-200 focus:ring-2 focus:ring-amber-400'
                  }`}
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Email</label>
                <input
                  type="email"
                  disabled={!isAdmin}
                  value={settings.companyEmail || settings.email || ''}
                  onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value, email: e.target.value })}
                  className={`w-full px-3.5 py-2 border rounded-xl font-medium ${
                    !isAdmin
                      ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-900 border-slate-200 focus:ring-2 focus:ring-amber-400'
                  }`}
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Cidade / UF</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={settings.cityState || 'Navegantes - SC'}
                  onChange={(e) => setSettings({ ...settings, cityState: e.target.value })}
                  className={`w-full px-3.5 py-2 border rounded-xl font-medium ${
                    !isAdmin
                      ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-900 border-slate-200 focus:ring-2 focus:ring-amber-400'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Pricing & Energy Tariff */}
          <div className={`space-y-3 p-4 bg-slate-50 rounded-2xl border ${!isAdmin ? 'border-slate-200 opacity-90' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-amber-500" /> Precificação e Cálculo de Economia
              </h4>
              {!isAdmin && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Bloqueado para edição
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Preço por Módulo (R$)</label>
                <input
                  type="number"
                  step="0.5"
                  disabled={!isAdmin}
                  value={settings.pricePerModule}
                  onChange={(e) => setSettings({ ...settings, pricePerModule: Number(e.target.value) })}
                  className={`w-full px-3.5 py-2 border rounded-xl font-bold ${
                    !isAdmin
                      ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-900 border-slate-200 focus:ring-2 focus:ring-amber-400'
                  }`}
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Taxa Mínima Visita (R$)</label>
                <input
                  type="number"
                  disabled={!isAdmin}
                  value={settings.minServiceFee}
                  onChange={(e) => setSettings({ ...settings, minServiceFee: Number(e.target.value) })}
                  className={`w-full px-3.5 py-2 border rounded-xl font-bold ${
                    !isAdmin
                      ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-900 border-slate-200 focus:ring-2 focus:ring-amber-400'
                  }`}
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Tarifa Média Energia (R$/kWh)</label>
                <input
                  type="number"
                  step="0.05"
                  disabled={!isAdmin}
                  value={settings.kwhPriceAverage}
                  onChange={(e) => setSettings({ ...settings, kwhPriceAverage: Number(e.target.value) })}
                  className={`w-full px-3.5 py-2 border rounded-xl font-bold ${
                    !isAdmin
                      ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-900 border-slate-200 focus:ring-2 focus:ring-amber-400'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* PHP Backend & Scheduled Sync Configuration */}
          <div className={`space-y-3 p-4 bg-slate-50 rounded-2xl border ${!isAdmin ? 'border-slate-200 opacity-90' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-amber-500" /> Sincronização PHP & Banco SQL (public_html/app/api)
              </h4>
              {!isAdmin && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Bloqueado para edição
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Endpoint da API PHP</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={settings.phpApiEndpointUrl || ''}
                  onChange={(e) => setSettings({ ...settings, phpApiEndpointUrl: e.target.value })}
                  placeholder="Automático (ex: https://seusite.com.br/app/api)"
                  className={`w-full px-3 py-2 border rounded-xl font-mono text-[11px] ${
                    !isAdmin
                      ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-900 border-slate-200 focus:ring-2 focus:ring-amber-400'
                  }`}
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Deixe em branco para detecção automática da pasta /app/api</span>
              </div>
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Intervalo de Sincronização Agendada (Minutos)</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  disabled={!isAdmin}
                  value={settings.autoSyncIntervalMinutes || 5}
                  onChange={(e) => setSettings({ ...settings, autoSyncIntervalMinutes: Number(e.target.value) || 5 })}
                  className={`w-full px-3.5 py-2 border rounded-xl font-bold ${
                    !isAdmin
                      ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-900 border-slate-200 focus:ring-2 focus:ring-amber-400'
                  }`}
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Executa requisição agendada ao PHP automaticamente</span>
              </div>
            </div>
          </div>

          {/* Configuração de Armazenamento Híbrido & Limites Offline (CONTROLE DO USUÁRIO) */}
          <div className="space-y-3 p-4 bg-amber-50/60 rounded-2xl border border-amber-300">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-amber-950 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-amber-600" /> Sincronização Híbrida & Limite Local (Controle do Usuário)
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-200/80 text-amber-900 rounded-full border border-amber-300">
                Liberado para Usuário
              </span>
            </div>

            <p className="text-[11px] text-slate-600">
              O aplicativo funciona 100% offline e híbrido. Você tem total controle sobre quantos dados de outros usuários são baixados no seu aparelho para economizar memória.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-slate-800 mb-1 font-bold flex items-center justify-between">
                  <span>Limite de Registros Salvos Localmente</span>
                  <span className="text-amber-700 font-extrabold">{settings.maxLocalRecordsLimit || 50} itens</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="200"
                  step="10"
                  value={settings.maxLocalRecordsLimit || 50}
                  onChange={(e) => setSettings({ ...settings, maxLocalRecordsLimit: Number(e.target.value) })}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-[9px] text-slate-400 mt-1 font-mono">
                  <span>10 (Ultra leve)</span>
                  <span>50 (Padrão)</span>
                  <span>100</span>
                  <span>200 (Máx)</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-800 mb-1 font-bold">Critério / Ordem de Download</label>
                <select
                  value={settings.syncFilterStrategy || 'hybrid_my_and_recent'}
                  onChange={(e) => setSettings({ ...settings, syncFilterStrategy: e.target.value as SyncFilterStrategy })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-amber-400 text-xs cursor-pointer"
                >
                  <option value="hybrid_my_and_recent">Meus Registros + Mais Recentes Globais (Recomendado)</option>
                  <option value="all_recent">Todos os Mais Recentes da Empresa</option>
                  <option value="my_recent">Apenas os Meus Registros Recentes</option>
                </select>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Define quais registros o app prioriza baixar localmente</span>
              </div>
            </div>

            <div className="pt-2 border-t border-amber-200/60 flex items-center gap-2">
              <input
                type="checkbox"
                id="autoDownloadRemoteData"
                checked={settings.autoDownloadRemoteData !== false}
                onChange={(e) => setSettings({ ...settings, autoDownloadRemoteData: e.target.checked })}
                className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-400 cursor-pointer"
              />
              <label htmlFor="autoDownloadRemoteData" className="text-[11px] font-bold text-slate-800 cursor-pointer">
                Baixar e mesclar automaticamente registros criados por outros técnicos/usuários durante a sincronização
              </label>
            </div>
          </div>

          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold text-center flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Configurações salvas com sucesso!</span>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors font-medium cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-400 hover:bg-amber-500 text-amber-950 rounded-xl font-bold transition-all shadow-xs shadow-amber-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isAdmin ? 'Salvar Configurações Globais' : 'Salvar Preferências do Dispositivo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
