import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import { QrCode, Copy, Check, Sparkles, AlertCircle } from 'lucide-react';
import {
  PixKeyType,
  generatePixPayload,
  detectPixKeyType,
  formatPixKey,
  sanitizeCategoryForPix
} from '../../utils/pixPayload';
import { formatCurrency } from '../../utils/formatters';

interface PixQrCodeSectionProps {
  initialKey?: string;
  initialKeyType?: PixKeyType;
  amount: number;
  category: string;
  beneficiaryName: string;
  beneficiaryCity?: string;
  onKeyChange?: (key: string, keyType: PixKeyType) => void;
}

export const PixQrCodeSection: React.FC<PixQrCodeSectionProps> = ({
  initialKey = '',
  initialKeyType,
  amount,
  category,
  beneficiaryName,
  beneficiaryCity = 'BRASILIA',
  onKeyChange
}) => {
  const [pixKey, setPixKey] = useState(initialKey);
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>(
    initialKeyType || (initialKey ? detectPixKeyType(initialKey) : 'email')
  );
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Sincroniza se a chave inicial mudar externamente (ex: troca de técnico vinculado)
  useEffect(() => {
    if (initialKey) {
      const cleanKey = initialKey.replace(/\s+/g, '');
      setPixKey(cleanKey);
      const detected = initialKeyType || detectPixKeyType(cleanKey);
      setPixKeyType(detected);
    }
  }, [initialKey, initialKeyType]);

  const handleKeyChange = (newKey: string) => {
    const cleanKey = newKey.replace(/\s+/g, '');
    setPixKey(cleanKey);
    const autoType = detectPixKeyType(cleanKey);
    setPixKeyType(autoType);
    if (onKeyChange) {
      onKeyChange(cleanKey, autoType);
    }
  };

  const handleTypeChange = (newType: PixKeyType) => {
    setPixKeyType(newType);
    if (onKeyChange) {
      onKeyChange(pixKey, newType);
    }
  };

  // Gera o payload oficial EMVCo sem envio de nome e estritamente sem espaços
  const pixPayload = useMemo(() => {
    const cleanKey = pixKey.replace(/\s+/g, '');
    if (!cleanKey) return '';
    return generatePixPayload({
      key: cleanKey,
      keyType: pixKeyType,
      amount: amount > 0 ? amount : 0,
      categoryDescription: category,
      txid: sanitizeCategoryForPix(category)
    });
  }, [pixKey, pixKeyType, amount, category]);

  // Gera o QR Code visual
  useEffect(() => {
    let isMounted = true;
    if (!pixPayload) {
      setQrCodeDataUrl('');
      return;
    }

    QRCode.toDataURL(pixPayload, {
      width: 220,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
      .then((url) => {
        if (isMounted) setQrCodeDataUrl(url);
      })
      .catch((err) => {
        console.error('Erro ao gerar QRCode PIX:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [pixPayload]);

  const handleCopy = () => {
    if (!pixPayload) return;
    const cleanPayload = pixPayload.replace(/\s+/g, '');
    navigator.clipboard.writeText(cleanPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const categoryBadgeLabel = sanitizeCategoryForPix(category);

  return (
    <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-700/80 shadow-md space-y-3 animate-in fade-in duration-200">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-black text-xs text-white flex items-center gap-1.5">
              <span>Pagamento Instantâneo PIX (BR Code / EMVCo)</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500 text-slate-950 font-black rounded-md uppercase">
                Bacen
              </span>
            </h4>
            <p className="text-[10px] text-slate-400">
              QR Code compacto sem espaços e sem envio de nome pessoal (padrão BACEN)
            </p>
          </div>
        </div>

        {amount > 0 && (
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Valor</span>
            <span className="text-sm font-black text-emerald-400">{formatCurrency(amount)}</span>
          </div>
        )}
      </div>

      {/* Configuração da Chave e Tipo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="sm:col-span-1">
          <label className="block text-[10px] font-bold text-slate-300 mb-1">
            Tipo de Chave PIX
          </label>
          <select
            value={pixKeyType}
            onChange={(e) => handleTypeChange(e.target.value as PixKeyType)}
            className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="email">E-mail</option>
            <option value="cpf">CPF</option>
            <option value="cnpj">CNPJ</option>
            <option value="telefone">Telefone celular</option>
            <option value="chavealeatorio">Chave Aleatória (EVP)</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[10px] font-bold text-slate-300">
              Chave PIX do Favorecido *
            </label>
            {initialKey && (
              <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> Puxado do cadastro
              </span>
            )}
          </div>
          <input
            type="text"
            value={pixKey}
            onChange={(e) => handleKeyChange(e.target.value)}
            placeholder={
              pixKeyType === 'email'
                ? 'ex: alucard.idrol@gmail.com'
                : pixKeyType === 'cpf'
                ? 'ex: 12345678900'
                : pixKeyType === 'telefone'
                ? 'ex: +5511999998888'
                : 'Chave aleatória'
            }
            className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* QR Code & Copia e Cola */}
      {pixPayload ? (
        <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-4">
          <div className="bg-white p-2.5 rounded-2xl shadow-inner shrink-0 flex items-center justify-center border-2 border-emerald-500/40">
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="QR Code PIX para pagamento da despesa"
                className="w-36 h-36 object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-36 h-36 flex items-center justify-center text-slate-400 text-xs">
                Gerando...
              </div>
            )}
          </div>

          <div className="flex-1 w-full space-y-2">
            <div className="text-xs space-y-1">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Favorecido:</span>
                <span className="font-bold text-white truncate max-w-[180px]">{beneficiaryName || 'Favorecido'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Nome no PIX:</span>
                <span className="font-semibold text-slate-300 font-mono text-[11px]">N (Não enviado)</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Categoria / TxID:</span>
                <span className="font-bold text-emerald-400 font-mono text-[11px]">{categoryBadgeLabel}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Chave PIX:</span>
                <span className="font-semibold text-slate-200 font-mono text-[11px] truncate max-w-[180px]">
                  {formatPixKey(pixKey, pixKeyType)}
                </span>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={handleCopy}
                className={`w-full py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                  copied
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/40 hover:border-emerald-400'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copia e Cola Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Código Pix Copia e Cola</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-1.5 bg-slate-950/70 border border-slate-800 rounded-lg text-[9px] text-slate-400 font-mono break-all line-clamp-2 select-all">
              {pixPayload}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center gap-2.5 text-xs text-amber-300">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Informe a Chave PIX do favorecido ou selecione um técnico com chave cadastrada para exibir o QR Code.</span>
        </div>
      )}
    </div>
  );
};
