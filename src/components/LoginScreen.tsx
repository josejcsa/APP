import React, { useState, useEffect } from 'react';
import {
  Phone,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  User,
  AlertCircle,
  KeyRound,
  XCircle,
  Sparkles,
  Shield,
  Briefcase
} from 'lucide-react';
import { AuthSession } from '../types';
import { storage } from '../utils/storage';

interface LoginScreenProps {
  onLoginSuccess: (session: AuthSession) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUser, setLastUser] = useState<{
    name: string;
    phone: string;
    role?: string;
    isTechnician?: boolean;
    isAdmin?: boolean;
    isPartner?: boolean;
  } | null>(null);

  const settings = storage.getSettings();

  useEffect(() => {
    const savedLast = storage.getLastLoggedUser();
    if (savedLast && savedLast.phone) {
      setLastUser(savedLast);
      // Pre-preenche o telefone do último usuário para conveniência
      setPhone(savedLast.phone);
    }
  }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 11) val = val.slice(0, 11);

    // Format phone (XX) XXXXX-XXXX
    let formatted = val;
    if (val.length > 2 && val.length <= 6) {
      formatted = `(${val.slice(0, 2)}) ${val.slice(2)}`;
    } else if (val.length > 6 && val.length <= 10) {
      formatted = `(${val.slice(0, 2)}) ${val.slice(2, 6)}-${val.slice(6)}`;
    } else if (val.length > 10) {
      formatted = `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7, 11)}`;
    }
    setPhone(formatted);
    if (errorMessage) setErrorMessage('');
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Alphanumeric, max 16 chars (standard 8)
    const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
    setPassword(val);
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    setTimeout(() => {
      const res = storage.login(phone, password);
      setIsLoading(false);

      if (res.success && res.session) {
        onLoginSuccess(res.session);
      } else {
        setErrorMessage(res.message || 'Erro ao realizar login. Verifique os dados informados.');
      }
    }, 250);
  };

  const handleSelectLastUser = () => {
    if (!lastUser) return;
    setPhone(lastUser.phone);
    setErrorMessage('');
    const passwordInput = document.getElementById('password-input');
    if (passwordInput) {
      passwordInput.focus();
    }
  };

  const handleClearLastUser = (e: React.MouseEvent) => {
    e.stopPropagation();
    storage.clearLastLoggedUser();
    setLastUser(null);
    setPhone('');
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100 relative overflow-hidden selection:bg-amber-400 selection:text-amber-950">
      {/* Decorative background glow circles */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 bg-amber-400/10 border border-amber-400/30 rounded-3xl shadow-lg shadow-amber-400/5 mb-1 backdrop-blur-sm">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="Elthera"
                referrerPolicy="no-referrer"
                className="h-12 w-auto max-w-[140px] object-contain rounded-xl"
              />
            ) : (
              <div className="w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center font-black text-amber-950 text-2xl shadow-md">
                E
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-center gap-1.5">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                ELTHERA
              </h1>
              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-amber-400 text-amber-950 rounded-md uppercase tracking-wider">
                SOLAR
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Acesso Restrito ao Sistema de Gestão Técnica & Limpeza Fotovoltaica
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20 text-slate-900 space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-600" />
              <span>Autenticação de Acesso</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Entre com seu telefone de cadastro e sua senha alfanumérica de 8 dígitos.
            </p>
          </div>

          {/* PREVIEW DO ÚLTIMO USUÁRIO LOGADO NO DISPOSITIVO */}
          {lastUser && (
            <div
              onClick={handleSelectLastUser}
              className="p-3.5 bg-amber-50/70 hover:bg-amber-50 border border-amber-200/90 rounded-2xl cursor-pointer transition-all flex items-center justify-between group shadow-xs"
              title="Clique para preencher o telefone e focar na senha"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                  {lastUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-900 text-xs truncate group-hover:text-amber-950">
                      {lastUser.name}
                    </span>
                    {lastUser.isAdmin ? (
                      <span className="text-[9px] px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded font-bold border border-purple-200">
                        ADM
                      </span>
                    ) : lastUser.isPartner ? (
                      <span className="text-[9px] px-1.5 py-0.2 bg-sky-100 text-sky-800 rounded font-bold border border-sky-200">
                        Parceiro
                      </span>
                    ) : lastUser.isTechnician ? (
                      <span className="text-[9px] px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded font-bold border border-blue-200">
                        Técnico
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-bold border border-emerald-200">
                        Cliente
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 block truncate">
                    Último acesso neste navegador • {lastUser.phone}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={handleClearLastUser}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white/80 transition-colors"
                  title="Trocar de conta / Remover lembrete deste navegador"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-800 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Acesso não autorizado</p>
                <p className="text-[11px] text-rose-700">{errorMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone Login Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Telefone (Login de Acesso) *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="(47) 98765-4321"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all outline-none"
                />
              </div>
              <span className="text-[10px] text-slate-400 block pl-1">
                Número de WhatsApp cadastrado no seu perfil.
              </span>
            </div>

            {/* Password (8-char Alphanumeric) Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  Senha Alfanumérica (8 dígitos) *
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {password.length}/8 dígitos
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Digite sua senha"
                  maxLength={16}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 tracking-wider focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer transition-colors"
                  title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <span className="text-[10px] text-slate-400 block pl-1">
                Senha de acesso fornecida pelo administrador do sistema.
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-amber-400 hover:bg-amber-500 active:scale-[0.99] text-amber-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-amber-400/20 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-amber-950 border-t-transparent rounded-full animate-spin" />
                  Verificando credenciais...
                </span>
              ) : (
                <>
                  <span>Entrar no Aplicativo</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security Footer Notice */}
        <div className="text-center space-y-1 text-[11px] text-slate-400">
          <p className="flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sistema protegido • Autenticação direta no banco de dados</span>
          </p>
          <p className="text-[10px] text-slate-500">
            © {new Date().getFullYear()} Elthera Soluções em Energia Solar Ltda.
          </p>
        </div>
      </div>
    </div>
  );
};
