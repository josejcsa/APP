import React, { useState } from 'react';
import {
  Settings,
  X,
  Building,
  DollarSign,
  Save
} from 'lucide-react';
import { CompanySettings } from '../types';
import { storage } from '../utils/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<CompanySettings>(storage.getSettings());
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    storage.saveSettings(settings);
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
            <h3 className="font-bold text-slate-900 text-base tracking-tight">Configurações da Empresa</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Company Branding */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-amber-500" /> Dados da Empresa & Identidade Visual
            </h4>

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
                <label className="block text-slate-700 mb-1 font-bold">URL da Logomarca (PNG/JPG/Drive)</label>
                <input
                  type="text"
                  value={settings.logoUrl || ''}
                  onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-amber-400 font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Nome Fantasia (Marca)</label>
                <input
                  type="text"
                  value={settings.tradingName || 'Elthera'}
                  onChange={(e) => setSettings({ ...settings, tradingName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-amber-400 font-medium"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Razão Social</label>
                <input
                  type="text"
                  value={settings.companyName || ''}
                  onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-amber-400 font-medium"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1 font-bold">CNPJ</label>
                <input
                  type="text"
                  value={settings.companyCnpj || settings.cnpj || ''}
                  onChange={(e) => setSettings({ ...settings, companyCnpj: e.target.value, cnpj: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-amber-400 font-medium"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1 font-bold">WhatsApp / Telefone</label>
                <input
                  type="text"
                  value={settings.companyPhone || settings.phone || ''}
                  onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value, phone: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-amber-400 font-medium"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Email</label>
                <input
                  type="email"
                  value={settings.companyEmail || settings.email || ''}
                  onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value, email: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-amber-400 font-medium"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Cidade / UF</label>
                <input
                  type="text"
                  value={settings.cityState || 'Navegantes - SC'}
                  onChange={(e) => setSettings({ ...settings, cityState: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-amber-400 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Pricing & Energy Tariff */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-amber-500" /> Precificação e Cálculo de Economia
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Preço por Módulo (R$)</label>
                <input
                  type="number"
                  step="0.5"
                  value={settings.pricePerModule}
                  onChange={(e) => setSettings({ ...settings, pricePerModule: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Taxa Mínima Visita (R$)</label>
                <input
                  type="number"
                  value={settings.minServiceFee}
                  onChange={(e) => setSettings({ ...settings, minServiceFee: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Tarifa Média Energia (R$/kWh)</label>
                <input
                  type="number"
                  step="0.05"
                  value={settings.kwhPriceAverage}
                  onChange={(e) => setSettings({ ...settings, kwhPriceAverage: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>
          </div>

          {/* PHP Backend & Scheduled Sync Configuration */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-amber-500" /> Sincronização PHP & Banco SQL (public_html/app/api)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Endpoint da API PHP</label>
                <input
                  type="text"
                  value={settings.phpApiEndpointUrl || ''}
                  onChange={(e) => setSettings({ ...settings, phpApiEndpointUrl: e.target.value })}
                  placeholder="Automático (ex: https://seusite.com.br/app/api)"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-[11px] text-slate-900 focus:ring-2 focus:ring-amber-400"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Deixe em branco para detecção automática da pasta /app/api</span>
              </div>
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Intervalo de Sincronização Agendada (Minutos)</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={settings.autoSyncIntervalMinutes || 5}
                  onChange={(e) => setSettings({ ...settings, autoSyncIntervalMinutes: Number(e.target.value) || 5 })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-amber-400"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Executa requisição agendada ao PHP automaticamente</span>
              </div>
            </div>
          </div>

          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold text-center">
              Configurações salvas com sucesso!
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
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
