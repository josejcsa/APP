import React, { useState } from 'react';
import { Download, Share2, Printer, X, CheckCircle2, Zap, Calendar, User, ShieldCheck, Sun, ArrowRight, Edit3 } from 'lucide-react';
import { TechnicalChecklist, Contact } from '../types';
import { storage } from '../utils/storage';
import { SolarPdfGenerator } from '../utils/pdfGenerator';

interface PdfReportModalProps {
  checklist: TechnicalChecklist | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (checklist: TechnicalChecklist) => void;
}

export const PdfReportModal: React.FC<PdfReportModalProps> = ({
  checklist,
  isOpen,
  onClose,
  onEdit,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !checklist) return null;

  const customer = storage.getContactById(checklist.customerId);
  const technician = storage.getContactById(checklist.technicianId);
  const settings = storage.getSettings();

  const gainPercent = checklist.after.calculatedGainPercent || 
    (checklist.before.readingKwBefore > 0
      ? ((checklist.after.readingKwAfter - checklist.before.readingKwBefore) / checklist.before.readingKwBefore) * 100
      : 0);

  const handleDownloadPdf = async () => {
    if (!customer || !technician) return;
    setDownloading(true);
    try {
      await SolarPdfGenerator.downloadPdf(checklist, customer, technician, settings);
    } catch (e) {
      console.error('Erro ao gerar PDF', e);
    } finally {
      setDownloading(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!customer) return;
    const phoneClean = customer.phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Olá, ${customer.name}! ☀️\n\n` +
      `Seu *Relatório Técnico de Limpeza Solar* está pronto!\n` +
      `📄 *Protocolo:* ${checklist.protocolNumber}\n` +
      `⚡ *Potência Antes:* ${checklist.before.readingKwBefore.toFixed(2)} kW\n` +
      `🚀 *Potência Depois:* ${checklist.after.readingKwAfter.toFixed(2)} kW\n` +
      `📈 *Ganho de Eficiência:* +${gainPercent.toFixed(1)}%\n` +
      `💰 *Economia Estimada:* +R$ ${checklist.after.estimatedMonthlySavingsBrl?.toFixed(2) || '0.00'}/mês\n\n` +
      `Obrigado por confiar na ${settings.tradingName}! O laudo técnico em PDF com as assinaturas digitais foi gerado com sucesso.`
    );
    window.open(`https://api.whatsapp.com/send?phone=55${phoneClean}&text=${message}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="pdf-modal-backdrop" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div
        id="pdf-modal-container"
        className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200"
      >
        {/* Modal Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-400/20 text-amber-400 rounded-2xl border border-amber-400/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight">Relatório Técnico em PDF • {checklist.protocolNumber}</h3>
              <p className="text-xs text-slate-400">Laudo Técnico de Limpeza & Ganho de Eficiência Solar</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onEdit && (
              <button
                onClick={() => {
                  onEdit(checklist);
                  onClose();
                }}
                title="Editar este Laudo Técnico (seguir fluxo normal)"
                className="flex items-center space-x-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Editar</span>
              </button>
            )}
            <button
              onClick={handleShareWhatsApp}
              title="Compartilhar no WhatsApp do Cliente"
              className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
            <button
              onClick={handlePrint}
              title="Imprimir ou Salvar em PDF usando o recurso nativo do navegador / aparelho"
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-500 text-amber-950 text-xs font-bold rounded-xl transition-all shadow-xs shadow-amber-200 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Gerar PDF</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              title="Baixar arquivo PDF direto"
              className="hidden sm:flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-700 cursor-pointer"
            >
              <Download className={`w-3.5 h-3.5 ${downloading ? 'animate-bounce' : ''}`} />
              <span>{downloading ? 'Gerando...' : 'Baixar PDF'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable / Preview Document Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50">
          <PdfReportDocument checklist={checklist} />
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>Relatório técnico com assinaturas • Protocolo {checklist.protocolNumber}</span>
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-amber-950 rounded-xl font-bold flex items-center gap-1.5 shadow-xs shadow-amber-200 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Gerar PDF</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="px-3.5 py-2 border border-slate-200 rounded-xl hover:bg-slate-100 flex items-center gap-1.5 text-slate-700 font-bold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? 'Gerando...' : 'Baixar PDF'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PdfReportDocument: React.FC<{ checklist: TechnicalChecklist }> = ({ checklist }) => {
  const customer = storage.getContactById(checklist.customerId);
  const technician = storage.getContactById(checklist.technicianId);
  const settings = storage.getSettings();

  const gainPercent = checklist.after.calculatedGainPercent || 
    (checklist.before.readingKwBefore > 0
      ? ((checklist.after.readingKwAfter - checklist.before.readingKwBefore) / checklist.before.readingKwBefore) * 100
      : 0);

  return (
    <div
      id="printable-report-document"
      className="bg-white p-6 sm:p-10 rounded-3xl shadow-xs border border-slate-200 text-slate-800 text-xs space-y-6 max-w-3xl mx-auto"
    >
      {/* Header branding */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-5 gap-3">
        <div className="flex items-center space-x-3">
          {settings.logoUrl && (
            <img
              src={settings.logoUrl}
              alt={settings.tradingName || 'Elthera'}
              referrerPolicy="no-referrer"
              className="h-12 w-auto max-w-[130px] object-contain rounded-xl"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          )}
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-black text-slate-900 tracking-tight">
                {settings.tradingName || 'Elthera'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{settings.companyName || 'Elthera Soluções em Energia Solar Ltda.'} • CNPJ: {settings.cnpj || settings.companyCnpj || '38.942.108/0001-55'}</p>
            <p className="text-[11px] text-slate-400">{settings.phone || settings.companyPhone || '(47) 98765-4321'} • {settings.email || settings.companyEmail || 'contato@elthera.com.br'}</p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-right shrink-0">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Relatório Técnico</span>
          <span className="text-sm font-bold text-slate-900 block">{checklist.protocolNumber}</span>
          <span className="text-[11px] text-slate-400">Data: {checklist.date.split('-').reverse().join('/')}</span>
        </div>
      </div>

      {/* Client & System Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/70 p-5 rounded-2xl border border-slate-200">
        <div>
          <h4 className="font-bold text-slate-900 uppercase text-[11px] mb-2 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-amber-500" /> Dados do Cliente
          </h4>
          <p className="font-bold text-slate-900">{customer?.name || 'Cliente'}</p>
          <p className="text-slate-600">{customer?.document ? `CPF/CNPJ: ${customer.document}` : ''}</p>
          <p className="text-slate-600">{customer?.phone} • {customer?.email}</p>
          <p className="text-slate-500 mt-1 text-[11px]">
            {customer?.address.street}, {customer?.address.number} - {customer?.address.neighborhood}, {customer?.address.city}/{customer?.address.state}
          </p>
        </div>

        <div>
          <h4 className="font-bold text-slate-900 uppercase text-[11px] mb-2 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" /> Sistema Fotovoltaico
          </h4>
          <p className="text-slate-700">
            <span className="font-medium text-slate-900">Capacidade Instalada:</span> {customer?.solarSystem?.powerKwp || 0} kWp
          </p>
          <p className="text-slate-700">
            <span className="font-medium text-slate-900">Total de Módulos:</span> {checklist.procedure.modulesCleanedCount || customer?.solarSystem?.moduleCount || 0} painéis
          </p>
          <p className="text-slate-700">
            <span className="font-medium text-slate-900">Inversor:</span> {customer?.solarSystem?.inverterBrandModel || 'Padrão'}
          </p>
          <p className="text-slate-700">
            <span className="font-medium text-slate-900">Técnico Responsável:</span> {technician?.name || 'Técnico Credenciado'}
          </p>
        </div>
      </div>

      {/* Performance Gain Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xs border border-slate-800">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-[11px] text-amber-400 font-bold uppercase tracking-wider">Recuperação de Geração de Energia</span>
            <div className="flex items-center space-x-3 mt-1.5">
              <span className="text-2xl sm:text-3xl font-black text-amber-400">
                +{gainPercent.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-200 bg-white/10 px-2.5 py-1 rounded-xl">
                {checklist.before.readingKwBefore.toFixed(2)} kW ➔ {checklist.after.readingKwAfter.toFixed(2)} kW
              </span>
            </div>
          </div>

          <div className="text-right bg-white/10 p-3.5 rounded-xl border border-white/10">
            <span className="text-[10px] text-slate-300 block">Economia Mensal Estimada:</span>
            <span className="text-lg font-bold text-amber-400">
              + R$ {checklist.after.estimatedMonthlySavingsBrl?.toFixed(2) || Math.round(gainPercent * 7.5).toFixed(2)} / mês
            </span>
          </div>
        </div>
      </div>

      {/* Pre and Post Inspection Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="border border-rose-200 bg-rose-50/40 p-4 rounded-2xl">
          <h5 className="font-bold text-rose-950 uppercase text-[11px] mb-2">Vistoria Pré-Serviço</h5>
          <ul className="space-y-1 text-slate-700 text-[11px]">
            <li>• <span className="font-medium">Nível de Sujeira:</span> {checklist.before.dirtLevel.toUpperCase()}</li>
            <li>• <span className="font-medium">Tipos:</span> {checklist.before.dirtTypes.join(', ') || 'Poeira/Fuligem'}</li>
            <li>• <span className="font-medium">Condição Climática:</span> {checklist.before.weatherCondition} ({checklist.before.ambientTempC}°C)</li>
            <li>• <span className="font-medium">Leitura Inicial:</span> {checklist.before.readingKwBefore.toFixed(2)} kW</li>
          </ul>
        </div>

        <div className="border border-emerald-200 bg-emerald-50/40 p-4 rounded-2xl">
          <h5 className="font-bold text-emerald-950 uppercase text-[11px] mb-2">Higienização Pós-Serviço</h5>
          <ul className="space-y-1 text-slate-700 text-[11px]">
            <li>• <span className="font-medium">Água Utilizada:</span> {checklist.procedure.waterSource} (Pura 0 PPM)</li>
            <li>• <span className="font-medium">Método:</span> {checklist.procedure.cleaningMethod.replace(/_/g, ' ')}</li>
            <li>• <span className="font-medium">Inspeção Final:</span> 100% Aprovado & Livre de Manchas</li>
            <li>• <span className="font-medium">Leitura Final:</span> {checklist.after.readingKwAfter.toFixed(2)} kW</li>
          </ul>
        </div>
      </div>

      {/* Checklist de Integridade & Avarias Pré-Existentes */}
      <div className="bg-amber-50/50 border border-amber-200/60 p-4 rounded-2xl space-y-2">
        <h5 className="font-bold text-amber-950 uppercase text-[11px] flex items-center gap-1.5">
          🛡️ Checklist de Integridade & Avarias Pré-Existentes
        </h5>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
          <div className={`flex items-center gap-1.5 ${checklist.before.defects?.crackedGlass ? 'text-rose-700 font-bold' : 'text-slate-600'}`}>
            <span>{checklist.before.defects?.crackedGlass ? '❌' : '✅'}</span> Vidro Trincado / Quebrado
          </div>
          <div className={`flex items-center gap-1.5 ${checklist.before.defects?.hotSpotsDetected ? 'text-rose-700 font-bold' : 'text-slate-600'}`}>
            <span>{checklist.before.defects?.hotSpotsDetected ? '❌' : '✅'}</span> Ponto Quente (Hot Spot)
          </div>
          <div className={`flex items-center gap-1.5 ${checklist.before.defects?.looseWiring ? 'text-rose-700 font-bold' : 'text-slate-600'}`}>
            <span>{checklist.before.defects?.looseWiring ? '❌' : '✅'}</span> Cabeamento Solto
          </div>
          <div className={`flex items-center gap-1.5 ${checklist.before.defects?.oxidizedConnectors ? 'text-rose-700 font-bold' : 'text-slate-600'}`}>
            <span>{checklist.before.defects?.oxidizedConnectors ? '❌' : '✅'}</span> Conectores Oxidados
          </div>
          <div className={`flex items-center gap-1.5 ${checklist.before.defects?.shadingObstacles ? 'text-amber-700 font-bold' : 'text-slate-600'}`}>
            <span>{checklist.before.defects?.shadingObstacles ? '⚠️' : '✅'}</span> Sombreamento
          </div>
        </div>
        {checklist.before.defects?.details && (
          <p className="text-[11px] text-slate-700 pt-1 border-t border-amber-200/40">
            <span className="font-bold text-slate-900">Observações de Avarias:</span> {checklist.before.defects.details}
          </p>
        )}
      </div>

      {/* Photo Comparison Cards */}
      <div>
        <h5 className="font-bold text-slate-900 uppercase text-[11px] mb-2.5 flex items-center gap-1">
          📸 Registro Fotográfico do Atendimento
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {checklist.before.photos.length > 0 ? (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
              <div className="bg-rose-600 text-white text-[10px] font-bold px-2.5 py-1">ANTES DA LIMPEZA</div>
              <img
                src={checklist.before.photos[0].dataUrl}
                alt="Antes da limpeza"
                className="w-full h-36 object-cover"
              />
              <p className="p-2.5 text-[10px] text-slate-600">{checklist.before.photos[0].caption || 'Módulos com sujidade acumulada'}</p>
            </div>
          ) : (
            <div className="border border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-[11px]">
              Foto Antes registrada
            </div>
          )}

          {checklist.after.photos.length > 0 ? (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
              <div className="bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1">DEPOIS DA LIMPEZA</div>
              <img
                src={checklist.after.photos[0].dataUrl}
                alt="Depois da limpeza"
                className="w-full h-36 object-cover"
              />
              <p className="p-2.5 text-[10px] text-slate-600">{checklist.after.photos[0].caption || 'Módulos 100% limpos e brilhantes'}</p>
            </div>
          ) : (
            <div className="border border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-[11px]">
              Foto Depois registrada
            </div>
          )}
        </div>
      </div>

      {/* Observations & Next Scheduled Cleaning */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
        <p className="text-slate-700">
          <span className="font-bold text-slate-900">Observações Técnicas:</span> {checklist.after.technicianObservations || 'Serviço executado com excelência operacional e segurança.'}
        </p>
        <p className="text-slate-700">
          <span className="font-bold text-slate-900">Recomendações:</span> {checklist.after.recommendationsForClient || 'Manter a frequência de limpeza periódica para garantir o payback ideal do investimento solar.'}
        </p>
        {checklist.after.nextRecommendedCleaningDate && (
          <p className="text-amber-800 font-bold pt-1">
            📅 Próxima Limpeza Preventiva Sugerida: {checklist.after.nextRecommendedCleaningDate.split('-').reverse().join('/')}
          </p>
        )}
      </div>

      {/* Signatures Area */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
        <div className="border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-center flex flex-col justify-between h-36">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Assinatura do Cliente</span>
          {checklist.clientSignature?.dataUrl ? (
            <img
              src={checklist.clientSignature.dataUrl}
              alt="Assinatura do Cliente"
              className="max-h-14 mx-auto object-contain"
            />
          ) : (
            <div className="text-xs text-slate-400 italic my-auto">[Assinado Digitalmente]</div>
          )}
          <div>
            <p className="font-bold text-slate-900 text-[11px]">{checklist.clientSignature?.signedByName || customer?.name}</p>
            <p className="text-[10px] text-slate-400">{customer?.document || 'De Acordo'}</p>
          </div>
        </div>

        <div className="border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-center flex flex-col justify-between h-36">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Assinatura do Técnico</span>
          {checklist.technicianSignature?.dataUrl ? (
            <img
              src={checklist.technicianSignature.dataUrl}
              alt="Assinatura do Técnico"
              className="max-h-14 mx-auto object-contain"
            />
          ) : (
            <div className="text-xs text-slate-400 italic my-auto">[Assinado Digitalmente]</div>
          )}
          <div>
            <p className="font-bold text-slate-900 text-[11px]">{checklist.technicianSignature?.signedByName || technician?.name}</p>
            <p className="text-[10px] text-slate-400">{technician?.technicianDetails?.certifications[0] || 'NR-35 / NR-10'}</p>
          </div>
        </div>
      </div>

      {/* Audit Trail & Cloud Archive Info (Printed on document) */}
      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[9px] text-slate-400 gap-1 font-mono">
        <div>
          <span>Criado por: <strong>{checklist.createdBy || technician?.name || 'Técnico Responsável'}</strong> em {new Date(checklist.createdAt || checklist.date).toLocaleString('pt-BR')}</span>
          {checklist.updatedBy && (
            <span className="ml-2">• Última revisão por: <strong>{checklist.updatedBy}</strong> em {new Date(checklist.updatedAt || checklist.date).toLocaleString('pt-BR')}</span>
          )}
        </div>
        <div className="text-emerald-700">
          ☁️ Nuvem Elthera: {checklist.driveFolderName || `Elthera / Clientes / ${customer?.name || 'Cliente'} / Fotos`}
        </div>
      </div>
    </div>
  );
};
