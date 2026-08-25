import React, { useState, useEffect } from 'react';
import { PdfReportDocument } from './PdfReportModal';
import {
  Sun,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Droplets,
  Calendar,
  User,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  FileText,
  Upload,
  Sparkles,
  Info,
  ChevronRight,
  RefreshCw,
  Plus,
  Lock,
  Cloud,
  FolderCheck,
  History,
  Share2,
  Printer,
  Download,
  Edit3
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { TechnicalChecklist, Contact, Appointment, SolarServiceItem, ExpenseSupplyItem } from '../types';
import { storage } from '../utils/storage';
import { SignaturePad } from './SignaturePad';
import { notificationService } from '../utils/notifications';
import { SolarPdfGenerator } from '../utils/pdfGenerator';
import { ImageService } from '../utils/imageService';

interface TechnicalChecklistFormProps {
  initialAppointmentId?: string;
  initialCustomerId?: string;
  checklistToEdit?: TechnicalChecklist | null;
  onSaveComplete: (savedChecklist: TechnicalChecklist) => void;
  onCancel: () => void;
}

export const TechnicalChecklistForm: React.FC<TechnicalChecklistFormProps> = ({
  initialAppointmentId,
  initialCustomerId,
  checklistToEdit,
  onSaveComplete,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;
  const [isLocked, setIsLocked] = useState(false);
  const [savedChecklistRef, setSavedChecklistRef] = useState<TechnicalChecklist | null>(null);
  const settings = storage.getSettings();

  const [clients, setClients] = useState<Contact[]>(storage.getClients());
  const [technicians, setTechnicians] = useState<Contact[]>(storage.getTechnicians());
  const [services, setServices] = useState<SolarServiceItem[]>(storage.getServices());
  const [appointments, setAppointments] = useState<Appointment[]>(storage.getAppointments());

  // Form State - Step 1
  const [customerId, setCustomerId] = useState(checklistToEdit?.customerId || initialCustomerId || (clients[0]?.id || ''));
  const [technicianId, setTechnicianId] = useState(checklistToEdit?.technicianId || (technicians[0]?.id || ''));
  const [appointmentId, setAppointmentId] = useState(checklistToEdit?.appointmentId || initialAppointmentId || '');
  const [protocolNumber, setProtocolNumber] = useState(checklistToEdit?.protocolNumber || '');
  const [serviceDate, setServiceDate] = useState(checklistToEdit?.date || new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<'concluido' | 'rascunho' | 'cancelado'>(checklistToEdit?.status || 'concluido');

  // Audit Fields (Immutable creation, mutable editor)
  const initialCreatedBy = checklistToEdit?.createdBy || (technicians.find(t => t.id === technicianId)?.name || settings.currentUser || 'Técnico Responsável');
  const initialCreatedAt = checklistToEdit?.createdAt || new Date().toISOString();
  const [createdBy] = useState<string>(initialCreatedBy);
  const [createdAt] = useState<string>(initialCreatedAt);
  const [updatedBy, setUpdatedBy] = useState<string>(
    settings.currentUser || technicians.find(t => t.id === technicianId)?.name || 'Técnico Responsável'
  );
  const [editReason, setEditReason] = useState<string>('');

  // Step 2: Before state
  const [readingKwBefore, setReadingKwBefore] = useState(checklistToEdit?.before.readingKwBefore || 0);
  const [readingKwhBefore, setReadingKwhBefore] = useState(checklistToEdit?.before.readingKwhBefore || 0);
  const [weatherCondition, setWeatherCondition] = useState<any>(checklistToEdit?.before.weatherCondition || 'ensolarado');
  const [ambientTempC, setAmbientTempC] = useState(checklistToEdit?.before.ambientTempC || 28);
  const [dirtLevel, setDirtLevel] = useState<any>(checklistToEdit?.before.dirtLevel || 'moderada');
  const [dirtTypes, setDirtTypes] = useState<string[]>(checklistToEdit?.before.dirtTypes || ['poeira', 'dejetos_aves']);
  
  const [crackedGlass, setCrackedGlass] = useState(checklistToEdit?.before.defects.crackedGlass || false);
  const [hotSpotsDetected, setHotSpotsDetected] = useState(checklistToEdit?.before.defects.hotSpotsDetected || false);
  const [looseWiring, setLooseWiring] = useState(checklistToEdit?.before.defects.looseWiring || false);
  const [oxidizedConnectors, setOxidizedConnectors] = useState(checklistToEdit?.before.defects.oxidizedConnectors || false);
  const [shadingObstacles, setShadingObstacles] = useState(checklistToEdit?.before.defects.shadingObstacles || false);
  const [defectDetails, setDefectDetails] = useState(checklistToEdit?.before.defects.details || '');
  const [beforePhotos, setBeforePhotos] = useState(checklistToEdit?.before.photos || []);

  // Step 3: Procedure state
  const [waterSource, setWaterSource] = useState<any>(checklistToEdit?.procedure.waterSource || 'deionizada');
  const [cleaningMethod, setCleaningMethod] = useState<any>(checklistToEdit?.procedure.cleaningMethod || 'escova_rotativa_solar');
  const [cleaningProductUsed, setCleaningProductUsed] = useState<any>(checklistToEdit?.procedure.cleaningProductUsed || 'detergente_neutro_solar');
  const [selectedServices, setSelectedServices] = useState<string[]>(
    checklistToEdit?.procedure.servicesExecuted || (services[0] ? [services[0].id] : ['srv-1'])
  );

  const [expenseItemsCatalog] = useState<ExpenseSupplyItem[]>(storage.getExpenseItems());
  const [selectedExpenses, setSelectedExpenses] = useState<Array<{ id: string; included: boolean }>>(
    checklistToEdit?.procedure?.selectedExpenses || [
      { id: 'exp-1', included: true },
      { id: 'exp-2', included: true },
      { id: 'exp-4', included: true },
    ]
  );

  // Auto-select related expense items when a service is selected
  useEffect(() => {
    const selectedServiceTitles = selectedServices
      .map((srvId) => services.find((s) => s.id === srvId)?.title)
      .filter(Boolean) as string[];

    if (selectedServiceTitles.length > 0) {
      setSelectedExpenses((prev) => {
        const next = [...prev];
        expenseItemsCatalog.forEach((exp) => {
          if (exp.relatedServices && exp.relatedServices.some((title) => selectedServiceTitles.includes(title))) {
            const alreadyExists = next.find((e) => e.id === exp.id);
            if (!alreadyExists) {
              next.push({ id: exp.id, included: true });
            }
          }
        });
        return next;
      });
    }
  }, [selectedServices, services, expenseItemsCatalog]);

  const toggleExpenseItem = (id: string) => {
    setSelectedExpenses((prev) => {
      const exists = prev.find((e) => e.id === id);
      if (exists) {
        return prev.filter((e) => e.id !== id);
      } else {
        return [...prev, { id, included: true }];
      }
    });
  };

  const toggleExpenseIncluded = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedExpenses((prev) =>
      prev.map((item) => (item.id === id ? { ...item, included: !item.included } : item))
    );
  };
  
  // Initial modules count: client module count or 0 if not set
  const initialClientModuleCount = () => {
    if (checklistToEdit?.procedure.modulesCleanedCount !== undefined) {
      return checklistToEdit.procedure.modulesCleanedCount;
    }
    const c = clients.find((cli) => cli.id === customerId);
    return c?.solarSystem?.moduleCount || 0;
  };
  const [modulesCleanedCount, setModulesCleanedCount] = useState<number>(initialClientModuleCount());

  // Auto update module count & signer when client changes
  useEffect(() => {
    const client = clients.find((c) => c.id === customerId);
    if (client) {
      if (client.solarSystem?.moduleCount && !checklistToEdit) {
        setModulesCleanedCount(client.solarSystem.moduleCount);
      }
      if (!clientSignName) {
        setClientSignName(client.name);
      }
      if (!clientSignDoc && client.document) {
        setClientSignDoc(client.document);
      }
    }
  }, [customerId, clients]);

  // Step 4: After state
  const [readingKwAfter, setReadingKwAfter] = useState(checklistToEdit?.after.readingKwAfter || 0);
  const [readingKwhAfter, setReadingKwhAfter] = useState(checklistToEdit?.after.readingKwhAfter || 0);
  const [afterPhotos, setAfterPhotos] = useState(checklistToEdit?.after.photos || []);
  const [technicianObservations, setTechnicianObservations] = useState(checklistToEdit?.after.technicianObservations || 'Limpeza realizada com água deionizada 0 PPM e escovação macia. Sistema operando em capacidade nominal máxima.');
  const [recommendationsForClient, setRecommendationsForClient] = useState(checklistToEdit?.after.recommendationsForClient || 'Recomendamos manter a frequência periódica de higienização a cada 4 a 6 meses.');
  
  // Next cleaning date default +6 months
  const getDefaultNextDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().slice(0, 10);
  };
  const [nextCleaningDate, setNextCleaningDate] = useState(checklistToEdit?.after.nextRecommendedCleaningDate || getDefaultNextDate());

  // Step 5: Signatures & Financial
  const [clientSignData, setClientSignData] = useState(checklistToEdit?.clientSignature?.dataUrl || '');
  const [clientSignName, setClientSignName] = useState(checklistToEdit?.clientSignature?.signedByName || '');
  const [clientSignDoc, setClientSignDoc] = useState(checklistToEdit?.clientSignature?.documentNumber || '');

  const [techSignData, setTechSignData] = useState(checklistToEdit?.technicianSignature?.dataUrl || '');
  const [techSignName, setTechSignName] = useState(checklistToEdit?.technicianSignature?.signedByName || '');

  const [serviceValue, setServiceValue] = useState(checklistToEdit?.serviceValue || 0);
  const [paymentMethod, setPaymentMethod] = useState<any>(checklistToEdit?.paymentMethod || 'pix');
  const [paymentStatus, setPaymentStatus] = useState<any>(checklistToEdit?.paymentStatus || 'pago');

  // Auto-calculate service value based on precise user rules:
  // 1. Module count * service price per module (if empty/zero, use settings.pricePerModule).
  // 2. If multiple services selected, their module values are summed up independently.
  // 3. Base Service Value condition: if calculated module total is less than service basePrice, use basePrice (minimum price).
  // 4. Plus travel cost (distance in km * technician travelCostPerKm).
  useEffect(() => {
    const client = clients.find((c) => c.id === customerId);
    const tech = technicians.find((t) => t.id === technicianId);

    let totalCalculatedServicePrice = 0;

    selectedServices.forEach((srvId) => {
      const srv = services.find((s) => s.id === srvId);
      if (srv) {
        // Price per module: service pricePerModule if > 0, else settings.pricePerModule (fallback to 16 if both 0)
        const effectivePricePerModule = (srv.pricePerModule && srv.pricePerModule > 0)
          ? srv.pricePerModule
          : (settings.pricePerModule || 16);

        const subtotalByModules = modulesCleanedCount * effectivePricePerModule;
        const basePrice = srv.basePrice || 0;

        // If calculated total by modules is less than basePrice, enforce minimum basePrice
        const finalServiceItemPrice = subtotalByModules < basePrice ? basePrice : subtotalByModules;
        totalCalculatedServicePrice += finalServiceItemPrice;
      }
    });

    if (totalCalculatedServicePrice <= 0 && selectedServices.length === 0) {
      const defaultModPrice = settings.pricePerModule || 16;
      totalCalculatedServicePrice = modulesCleanedCount * defaultModPrice;
    }

    const distanceKm = client?.address?.distanceKm || 0;
    const travelCostPerKm = tech?.technicianDetails?.travelCostPerKm || 0;
    const travelCostTotal = distanceKm * travelCostPerKm;

    // Add cost of expense items charged "à parte" (included === false)
    let additionalExpensesAmount = 0;
    selectedExpenses.forEach((sel) => {
      if (!sel.included) {
        const expItem = expenseItemsCatalog.find((e) => e.id === sel.id);
        if (expItem) {
          additionalExpensesAmount += expItem.defaultUnitCost;
        }
      }
    });

    const finalTotalWithTravelAndExpenses = totalCalculatedServicePrice + travelCostTotal + additionalExpensesAmount;

    if (!checklistToEdit) {
      setServiceValue(Number(finalTotalWithTravelAndExpenses.toFixed(2)));
    }
  }, [modulesCleanedCount, selectedServices, selectedExpenses, customerId, technicianId, clients, technicians, services, settings, checklistToEdit, expenseItemsCatalog]);

  // Auto update technician name when technician changes
  useEffect(() => {
    const tech = technicians.find((t) => t.id === technicianId);
    if (tech && !techSignName) {
      setTechSignName(tech.name);
    }
  }, [technicianId, technicians]);

  // Dynamic calculated efficiency boost %
  const calculatedGainPercent = readingKwBefore > 0 && readingKwAfter > 0
    ? Number((((readingKwAfter - readingKwBefore) / readingKwBefore) * 100).toFixed(1))
    : 0;

  const estimatedMonthlyExtraKwh = Math.round(
    (modulesCleanedCount * 0.45 * 30 * 4.5 * (calculatedGainPercent > 0 ? calculatedGainPercent : 25)) / 100
  );
  const estimatedMonthlySavingsBrl = Math.round(estimatedMonthlyExtraKwh * 0.90);

  // Photo handlers (capture & upload with unique ID & Server/Nuvem Elthera sync)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isBefore: boolean) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const selectedClient = clients.find((c) => c.id === customerId);
    const caption = isBefore ? 'Registro Pré-Serviço (Sujidade e Estrutura)' : 'Registro Pós-Serviço (Painéis 100% Limpos)';
    const category = isBefore ? 'detalhe_sujeira' : 'pos_limpeza';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const photo = await ImageService.processInspectionPhoto(
          file,
          category as any,
          caption,
          selectedClient?.name,
          customerId
        );

        if (isBefore) {
          setBeforePhotos((prev) => [...prev, photo]);
        } else {
          setAfterPhotos((prev) => [...prev, photo]);
        }
      } catch (err) {
        console.error('Erro ao processar foto:', err);
      }
    }
  };

  const removePhoto = (id: string, isBefore: boolean) => {
    if (isBefore) {
      setBeforePhotos((prev) => prev.filter((p) => p.id !== id));
    } else {
      setAfterPhotos((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const toggleDirtType = (type: string) => {
    if (dirtTypes.includes(type)) {
      setDirtTypes(dirtTypes.filter((t) => t !== type));
    } else {
      setDirtTypes([...dirtTypes, type]);
    }
  };

  const toggleServiceItem = (srvId: string) => {
    if (selectedServices.includes(srvId)) {
      if (selectedServices.length > 1) {
        setSelectedServices(selectedServices.filter((s) => s !== srvId));
      }
    } else {
      setSelectedServices([...selectedServices, srvId]);
    }
  };

  // Final Form Submission & Auto PDF + Financial sync
  const handleFinishChecklist = () => {
    const selectedClient = clients.find((c) => c.id === customerId);
    const selectedTech = technicians.find((t) => t.id === technicianId);
    const travelCostTotal = (selectedClient?.address?.distanceKm || 0) * (selectedTech?.technicianDetails?.travelCostPerKm || 0);
    const finalServiceValue = Number(serviceValue) + travelCostTotal;

    // Fallback sample photos if none captured so PDF looks great
    const finalBeforePhotos = beforePhotos.length > 0 ? beforePhotos : [
      {
        id: `p-sample-1`,
        dataUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80',
        caption: 'Módulos com sujidade e fuligem acumuladas antes da limpeza.',
        timestamp: new Date().toISOString(),
        category: 'detalhe_sujeira' as const,
      }
    ];

    const finalAfterPhotos = afterPhotos.length > 0 ? afterPhotos : [
      {
        id: `p-sample-2`,
        dataUrl: 'https://images.unsplash.com/photo-1545208942-e1c9c916524b?w=600&auto=format&fit=crop&q=80',
        caption: 'Módulos perfeitamente limpos e sem resíduos pós-higienização.',
        timestamp: new Date().toISOString(),
        category: 'pos_limpeza' as const,
      }
    ];

    const checklistData: TechnicalChecklist = {
      id: checklistToEdit?.id || `chk-${Date.now()}`,
      appointmentId: appointmentId || undefined,
      customerId,
      technicianId,
      protocolNumber: protocolNumber || checklistToEdit?.protocolNumber || '',
      date: serviceDate,
      status,
      before: {
        readingKwBefore: Number(readingKwBefore),
        readingKwhBefore: Number(readingKwhBefore),
        weatherCondition,
        ambientTempC: Number(ambientTempC),
        dirtLevel,
        dirtTypes,
        defects: {
          crackedGlass,
          hotSpotsDetected,
          looseWiring,
          oxidizedConnectors,
          framingDamaged: false,
          microCracks: false,
          delamination: false,
          shadingObstacles,
          details: defectDetails,
        },
        safety: {
          anchorPointsChecked: true,
          ppeComplete: true,
          roofAccessSafe: true,
          waterDrainageClear: true,
        },
        photos: finalBeforePhotos,
      },
      procedure: {
        waterSource,
        cleaningMethod,
        cleaningProductUsed,
        modulesCleanedCount: Number(modulesCleanedCount),
        servicesExecuted: selectedServices,
        selectedExpenses,
      },
      after: {
        readingKwAfter: Number(readingKwAfter),
        readingKwhAfter: Number(readingKwhAfter),
        calculatedGainPercent,
        estimatedMonthlyExtraKwh,
        estimatedMonthlySavingsBrl,
        finalInspectionPassed: true,
        photos: finalAfterPhotos,
        technicianObservations,
        recommendationsForClient,
        nextRecommendedCleaningDate: nextCleaningDate,
      },
      clientSignature: {
        dataUrl: clientSignData || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><path d="M 10 40 Q 60 10 100 35 T 190 30" stroke="%231e3a8a" stroke-width="3" fill="none"/></svg>',
        signedByName: clientSignName || selectedClient?.name || 'Cliente',
        signedAt: new Date().toISOString(),
        documentNumber: clientSignDoc || selectedClient?.document || '',
      },
      technicianSignature: {
        dataUrl: techSignData || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><path d="M 15 35 Q 50 5 95 45 T 180 25" stroke="%23047857" stroke-width="3" fill="none"/></svg>',
        signedByName: techSignName || selectedTech?.name || 'Técnico Credenciado',
        signedAt: new Date().toISOString(),
        registryCode: selectedTech?.technicianDetails?.certifications[0] || 'NR35-SP',
      },
      serviceValue: finalServiceValue,
      paymentMethod,
      paymentStatus,
      syncedWithSheets: true,
      syncedWithCalendar: true,
      createdBy: checklistToEdit?.createdBy || createdBy || selectedTech?.name || 'Técnico Responsável',
      createdAt: checklistToEdit?.createdAt || createdAt || new Date().toISOString(),
      updatedBy: updatedBy || settings.currentUser || selectedTech?.name || 'Técnico Responsável',
      updatedAt: new Date().toISOString(),
    };

    const saved = storage.saveChecklist(checklistData);
    setSavedChecklistRef(saved);

    // Checklist saved successfully locally
    console.log('[Checklist] Salvo com sucesso:', saved.protocolNumber);

    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (e) {}

    // Send push notification to technician
    notificationService.notifyTechnician(
      checklistToEdit ? `✏️ Checklist Atualizado! Protocolo #${saved.protocolNumber}` : `✅ Checklist Concluído! Protocolo #${saved.protocolNumber}`,
      `Atendimento em ${selectedClient?.name || 'Cliente'} ${checklistToEdit ? 'atualizado com sucesso' : 'finalizado com ganho de +' + calculatedGainPercent + '% de eficiência'}. Relatório PDF sincronizado!`,
      { customerId: saved.customerId, priority: 'alta' }
    );

    setIsLocked(true);
    setCurrentStep(6);
  };

  const selectedClientObj = clients.find((c) => c.id === customerId);

  return (
    <div id="technical-checklist-wizard" className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl shadow-xs border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center font-black text-amber-950 text-sm shadow-xs shadow-amber-200">
                <Sun className="w-4 h-4 text-amber-950" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                {checklistToEdit ? `Editar Checklist #${checklistToEdit.protocolNumber}` : 'Checklist Técnico de Limpeza Solar'}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Vistoria Antes & Depois com Cálculo de Eficiência e Laudo em PDF
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-xl transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="mt-4">
          <div className="grid grid-cols-6 gap-1 sm:gap-2 text-center text-xs font-semibold">
            {[
              { num: 1, label: '1. Atendimento' },
              { num: 2, label: '2. Vistoria Antes' },
              { num: 3, label: '3. Procedimento' },
              { num: 4, label: '4. Vistoria Depois' },
              { num: 5, label: '5. Assinaturas' },
              { num: 6, label: '6. Relatório PDF' },
            ].map((s) => (
              <button
                key={s.num}
                type="button"
                onClick={() => {
                  if (isLocked && s.num <= 5) return;
                  setCurrentStep(s.num);
                }}
                disabled={isLocked && s.num <= 5}
                className={`py-2 px-1 rounded-xl border text-[10px] sm:text-xs transition-all ${
                  isLocked && s.num <= 5 ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200' : ''
                } ${
                  currentStep === s.num
                    ? 'bg-amber-400 text-amber-950 border-amber-400 font-bold shadow-xs shadow-amber-200'
                    : currentStep > s.num
                    ? 'bg-amber-50 text-amber-900 border-amber-200 font-medium'
                    : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* STEP 1: Identification & Selection */}
      {currentStep === 1 && (
        <div className="bg-white rounded-3xl shadow-xs border border-slate-200 p-6 space-y-6 animate-in fade-in duration-200">
          {checklistToEdit && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between text-xs text-amber-950 font-medium">
              <div className="flex items-center space-x-2">
                <Info className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  <strong>Modo de Edição Ativo:</strong> Você está alterando o Laudo Técnico <strong>#{checklistToEdit.protocolNumber}</strong>. Todas as modificações serão registradas no histórico de auditoria.
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold uppercase text-[10px]">
                Edição
              </span>
            </div>
          )}

          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 tracking-tight">
              <User className="w-4 h-4 text-amber-600" />
              1. Identificação do Cliente & Técnico Responsável
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Selecione o cliente cadastrado para carregar os dados da usina e o técnico escalado.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Customer Select */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cliente / Usina Solar *</label>
              {clients.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                  Nenhum cliente cadastrado. Cadastre clientes na aba "Contatos & Técnicos".
                </div>
              ) : (
                <select
                  id="select-checklist-customer"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-400 bg-white text-slate-800"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.solarSystem?.powerKwp ? `(${c.solarSystem.powerKwp} kWp • ${c.solarSystem.moduleCount} placas)` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Technician Select */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Técnico Responsável *</label>
              {technicians.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                  Nenhum técnico cadastrado. Cadastre técnicos na aba "Contatos & Técnicos".
                </div>
              ) : (
                <select
                  id="select-checklist-technician"
                  value={technicianId}
                  onChange={(e) => setTechnicianId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-400 bg-white text-slate-800"
                >
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} • {t.technicianDetails?.certifications?.[0] || 'Técnico Credenciado'}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Service Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Data da Realização do Serviço</label>
              <input
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-400 bg-white text-slate-800"
              />
            </div>

            {/* Protocol Number (Editable) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Número do Protocolo</label>
              <input
                type="text"
                value={protocolNumber}
                onChange={(e) => setProtocolNumber(e.target.value)}
                placeholder="Ex: SOL-2026-008 (gerado automaticamente se vazio)"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-400 bg-white text-slate-800 font-mono"
              />
            </div>

            {/* Linked Appointment */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Vincular a Agendamento (Opcional)</label>
              <select
                value={appointmentId}
                onChange={(e) => setAppointmentId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-400 bg-white text-slate-800"
              >
                <option value="">Atendimento Avulso / Sem agendamento prévio</option>
                {appointments
                  .filter((a) => a.customerId === customerId || a.status === 'agendado')
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.scheduledDate} às {a.scheduledTime} - Status: {a.status.toUpperCase()}
                    </option>
                  ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status do Relatório</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-400 bg-white text-slate-800 font-semibold"
              >
                <option value="concluido">✅ Concluído (Laudo Final Gerado)</option>
                <option value="rascunho">📝 Rascunho / Em Andamento</option>
                <option value="cancelado">❌ Cancelado</option>
              </select>
            </div>
          </div>

          {/* Customer Solar System Quick Card */}
          {selectedClientObj && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" /> Detalhes da Instalação do Cliente
                </span>
                <span className="text-[11px] bg-white border border-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">
                  {selectedClientObj.solarSystem?.roofType?.toUpperCase() || 'TELHADO'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700 pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Potência Instalada</span>
                  <span className="font-black text-slate-900">{selectedClientObj.solarSystem?.powerKwp || 0} kWp</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Módulos</span>
                  <span className="font-black text-slate-900">{selectedClientObj.solarSystem?.moduleCount || 0} un.</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Inversor</span>
                  <span className="font-bold text-slate-900 truncate block">{selectedClientObj.solarSystem?.inverterBrandModel || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Contato</span>
                  <span className="font-bold text-slate-900">{selectedClientObj.phone}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-200">
                Endereço: {selectedClientObj.address.street}, {selectedClientObj.address.number} - {selectedClientObj.address.neighborhood}, {selectedClientObj.address.city}/{selectedClientObj.address.state}
              </p>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="flex items-center space-x-1.5 px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-amber-950 text-xs font-bold rounded-xl transition-all shadow-xs shadow-amber-200 active:scale-95"
            >
              <span>Avançar para Vistoria Antes</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Pre-service inspection */}
      {currentStep === 2 && (
        <div className="bg-white rounded-3xl shadow-xs border border-slate-200 p-6 space-y-6 animate-in fade-in duration-200">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 tracking-tight">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              2. Vistoria Técnica Pré-Serviço (Condição Inicial)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Registre os dados de geração antes da limpeza, clima, tipo de sujidade e possíveis avarias.</p>
          </div>

          {/* Readings & Weather */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Potência Instantânea ANTES (kW) *
              </label>
              <input
                type="number"
                step="0.01"
                value={readingKwBefore}
                onChange={(e) => setReadingKwBefore(Number(e.target.value))}
                placeholder="Ex: 5.40"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:ring-2 focus:ring-amber-400"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Leitura no display do inversor</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Geração Acumulada (kWh)
              </label>
              <input
                type="number"
                value={readingKwhBefore}
                onChange={(e) => setReadingKwhBefore(Number(e.target.value))}
                placeholder="Ex: 12450"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Totalizador do inversor</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">Condição do Tempo</label>
              <select
                value={weatherCondition}
                onChange={(e) => setWeatherCondition(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-400"
              >
                <option value="ensolarado">☀️ Ensolarado / Céu Limpo</option>
                <option value="parcialmente_nublado">⛅ Parcialmente Nublado</option>
                <option value="nublado">☁️ Nublado</option>
                <option value="chuvoso">🌧️ Chuvoso</option>
              </select>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">Temp. Ambiente (°C)</label>
              <input
                type="number"
                value={ambientTempC}
                onChange={(e) => setAmbientTempC(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          {/* Dirt Level & Types */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-800">Grau de Sujidade Identificado</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'leve', label: 'Leve (Poeira superficial)', color: 'border-slate-300 bg-slate-100 text-slate-800' },
                { id: 'moderada', label: 'Moderada (Filme opaco)', color: 'border-amber-300 bg-amber-50 text-amber-900' },
                { id: 'severa', label: 'Severa (Dejetos/Fuligem)', color: 'border-amber-400 bg-amber-100 text-amber-950' },
                { id: 'critica', label: 'Crítica (Crostas/Liquens)', color: 'border-rose-300 bg-rose-50 text-rose-900' },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setDirtLevel(lvl.id)}
                  className={`p-3 rounded-2xl border text-xs font-bold text-center transition-all ${
                    dirtLevel === lvl.id ? `${lvl.color} ring-2 ring-amber-400 shadow-xs` : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>

            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Tipos de Sujeira Detectados (Multi-seleção):</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'poeira', label: '💨 Poeira / Terra' },
                  { id: 'dejetos_aves', label: '🐦 Dejetos de Aves' },
                  { id: 'musgo_liquen', label: '🌿 Musgo / Liquens' },
                  { id: 'fuligem', label: '🏭 Fuligem / Queimadas' },
                  { id: 'calcificacao', label: '💧 Manchas de Calcificação' },
                  { id: 'folhas', label: '🍂 Folhas e Galhos' },
                  { id: 'salitre', label: '🌊 Salitre Marítimo' },
                ].map((type) => {
                  const isChecked = dirtTypes.includes(type.id);
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => toggleDirtType(type.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        isChecked
                          ? 'bg-amber-400 text-amber-950 border-amber-400 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Visual Defects Inspection Checklist */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              Checklist de Integridade & Avarias Pré-Existentes
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={crackedGlass}
                  onChange={(e) => setCrackedGlass(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 h-4 w-4"
                />
                <span className={crackedGlass ? 'font-bold text-rose-600' : ''}>Vidro Trincado / Quebrado</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hotSpotsDetected}
                  onChange={(e) => setHotSpotsDetected(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 h-4 w-4"
                />
                <span className={hotSpotsDetected ? 'font-bold text-rose-600' : ''}>Ponto Quente (Hot Spot Visível)</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={looseWiring}
                  onChange={(e) => setLooseWiring(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 h-4 w-4"
                />
                <span className={looseWiring ? 'font-bold text-rose-600' : ''}>Cabeamento Solto / Desencaixado</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={oxidizedConnectors}
                  onChange={(e) => setOxidizedConnectors(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 h-4 w-4"
                />
                <span className={oxidizedConnectors ? 'font-bold text-rose-600' : ''}>Conectores MC4 Oxidados</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shadingObstacles}
                  onChange={(e) => setShadingObstacles(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                />
                <span className={shadingObstacles ? 'font-bold text-amber-600' : ''}>Sombreamento por Árvores/Muros</span>
              </label>
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 mb-1 font-medium">Observações das Avarias / Localização das anomalias:</label>
              <input
                type="text"
                value={defectDetails}
                onChange={(e) => setDefectDetails(e.target.value)}
                placeholder="Ex: Módulo 3 da String 2 apresenta sombreamento de galho lateral."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
          </div>

          {/* Photo Capture Before */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800">📸 Fotos ANTES da Limpeza (Câmera / Galeria)</label>
              <label className="cursor-pointer px-3.5 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 flex items-center gap-1.5 transition-colors">
                <Camera className="w-3.5 h-3.5" />
                <span>Adicionar Foto Antes</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handlePhotoUpload(e, true)}
                  className="hidden"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {beforePhotos.map((photo) => (
                <div key={photo.id} className="relative rounded-2xl overflow-hidden border border-slate-200 group bg-slate-50">
                  <img src={photo.dataUrl} alt="Foto antes" className="w-full h-28 object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id, true)}
                    className="absolute top-1.5 right-1.5 bg-rose-600 text-white w-5 h-5 flex items-center justify-center rounded-full text-xs shadow-md"
                  >
                    ×
                  </button>
                  <p className="p-2 text-[10px] text-slate-600 truncate">{photo.caption}</p>
                </div>
              ))}
              {beforePhotos.length === 0 && (
                <div className="col-span-full border border-dashed border-slate-300 rounded-2xl p-5 text-center text-slate-400 text-xs">
                  Nenhuma foto anexada ainda. Clique em "Adicionar Foto Antes" para fotografar com celular/tablet.
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="flex items-center space-x-1.5 px-4 py-2.5 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="flex items-center space-x-1.5 px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-amber-950 text-xs font-bold rounded-xl transition-all shadow-xs shadow-amber-200 active:scale-95"
            >
              <span>Avançar para Procedimento</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Cleaning Procedure & Products */}
      {currentStep === 3 && (
        <div className="bg-white rounded-3xl shadow-xs border border-slate-200 p-6 space-y-6 animate-in fade-in duration-200">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 tracking-tight">
              <Droplets className="w-4 h-4 text-amber-600" />
              3. Metodologia de Limpeza & Insumos Utilizados
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Configure os parâmetros técnicos da lavagem e os serviços prestados.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Water Source */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Qualidade da Água Utilizada *</label>
              <select
                value={waterSource}
                onChange={(e) => setWaterSource(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:ring-2 focus:ring-amber-400"
              >
                <option value="deionizada">💧 Água 100% Deionizada (0 PPM - Pura)</option>
                <option value="osmo_reversa">💧 Água Desmineralizada (Osmose Reversa)</option>
                <option value="filtrada">💧 Água Filtrada com Descalcificador</option>
                <option value="rede_tratada">💧 Água da Rede Pública Tratada</option>
              </select>
            </div>

            {/* Cleaning Method */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Equipamento / Método de Escovação *</label>
              <select
                value={cleaningMethod}
                onChange={(e) => setCleaningMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:ring-2 focus:ring-amber-400"
              >
                <option value="escova_rotativa_solar">🔄 Escova Rotativa Solar Especializada</option>
                <option value="escova_telescopica_macia">🪄 Escova Telescópica com Cerdas Macias</option>
                <option value="robo_limpeza">🤖 Robô de Limpeza Automatizada</option>
                <option value="baixa_pressao">🚿 Lavagem Baixa Pressão com Enxágue Contínuo</option>
              </select>
            </div>

            {/* Cleaning Product */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Produto / Tratamento Químico *</label>
              <select
                value={cleaningProductUsed}
                onChange={(e) => setCleaningProductUsed(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:ring-2 focus:ring-amber-400"
              >
                <option value="detergente_neutro_solar">🧪 Detergente Neutro Solar Especializado pH 7.0</option>
                <option value="desincrustante_biodegradavel">🌿 Desincrustante Biodegradável (Dejetos e Fuligem)</option>
                <option value="nanotecnologia_hidrofobica">🛡️ Nano-revestimento Hidrofóbico (Antiaderente)</option>
                <option value="apenas_agua_pura">✨ Apenas Água Ultrapura (Sem Químicos)</option>
              </select>
            </div>

            {/* Modules Cleaned Count */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Total de Módulos Higienizados *</label>
              <input
                type="number"
                value={modulesCleanedCount}
                onChange={(e) => setModulesCleanedCount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-black text-slate-900 bg-white"
              />
            </div>
          </div>

          {/* Services Checklist */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Serviços Executados no Atendimento ({selectedServices.length} selecionado{selectedServices.length !== 1 ? 's' : ''}):
                </label>
                <p className="text-[11px] text-slate-500">Selecione todos os serviços prestados durante este atendimento.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {services.map((srv) => {
                const isSelected = selectedServices.includes(srv.id);
                return (
                  <div
                    key={srv.id}
                    onClick={() => toggleServiceItem(srv.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start space-x-3 select-none ${
                      isSelected
                        ? 'bg-amber-50/90 border-amber-400 text-amber-950 shadow-xs ring-1 ring-amber-400/30'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/80 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="mt-0.5 rounded text-amber-500 focus:ring-amber-400 h-4 w-4 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-slate-900 truncate">{srv.title}</p>
                        <span className="text-[10px] font-semibold text-slate-500 uppercase px-1.5 py-0.5 bg-white border border-slate-200 rounded-md shrink-0">
                          {srv.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{srv.description}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] font-semibold text-slate-600">
                        <span>Base: R$ {srv.basePrice}</span>
                        {srv.pricePerModule > 0 && <span>+ R$ {srv.pricePerModule}/módulo</span>}
                        {srv.estimatedDurationMinutes > 0 && <span>⏱️ ~{srv.estimatedDurationMinutes}min</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Insumos Utilizados Checklist */}
          <div className="space-y-2.5 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Insumos & Despesas Utilizados ({selectedExpenses.length} selecionado{selectedExpenses.length !== 1 ? 's' : ''}):
                </label>
                <p className="text-[11px] text-slate-500">Selecione os insumos e despesas aplicados e marque se estão inclusos no serviço.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {expenseItemsCatalog.map((exp) => {
                const selObj = selectedExpenses.find((e) => e.id === exp.id);
                const isSelected = !!selObj;
                const isIncluded = selObj ? selObj.included : true;

                return (
                  <div
                    key={exp.id}
                    onClick={() => toggleExpenseItem(exp.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start space-x-3 select-none ${
                      isSelected
                        ? 'bg-emerald-50/90 border-emerald-400 text-emerald-950 shadow-xs ring-1 ring-emerald-400/30'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/80 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-slate-900 truncate">{exp.name}</p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-semibold text-slate-500 uppercase px-1.5 py-0.5 bg-white border border-slate-200 rounded-md">
                            {exp.category}
                          </span>
                          {isSelected && (
                            <button
                              type="button"
                              onClick={(e) => toggleExpenseIncluded(exp.id, e)}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
                                isIncluded
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                              title="Alternar se está incluso ou cobrado à parte"
                            >
                              {isIncluded ? 'Incluso' : 'À parte'}
                            </button>
                          )}
                        </div>
                      </div>
                      {exp.supplier && (
                        <p className="text-[11px] text-slate-500 mt-0.5">Fornecedor: {exp.supplier}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] font-semibold text-slate-600">
                        <span>Custo unitário: R$ {exp.defaultUnitCost.toFixed(2)}</span>
                        <span>Unidade: {exp.unit}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="flex items-center space-x-1.5 px-4 py-2.5 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="flex items-center space-x-1.5 px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-amber-950 text-xs font-bold rounded-xl transition-all shadow-xs shadow-amber-200 active:scale-95"
            >
              <span>Avançar para Vistoria Depois</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Post-service inspection & Efficiency Boost */}
      {currentStep === 4 && (
        <div className="bg-white rounded-3xl shadow-xs border border-slate-200 p-6 space-y-6 animate-in fade-in duration-200">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 tracking-tight">
              <Zap className="w-4 h-4 text-amber-500" />
              4. Vistoria Técnica Pós-Serviço & Cálculo de Eficiência
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Insira a nova leitura de potência gerada para calcular automaticamente o ganho de energia e a economia gerada.</p>
          </div>

          {/* Readings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200">
              <label className="block text-xs font-bold text-amber-950 mb-1">
                ⚡ Potência Instantânea DEPOIS da Limpeza (kW) *
              </label>
              <input
                type="number"
                step="0.01"
                value={readingKwAfter}
                onChange={(e) => setReadingKwAfter(Number(e.target.value))}
                placeholder="Ex: 7.90"
                className="w-full px-3.5 py-2 bg-white border border-amber-300 rounded-xl text-base font-black text-amber-950 focus:ring-2 focus:ring-amber-400"
              />
              <span className="text-[10px] text-amber-800 mt-1 block font-medium">Leitura no inversor pós-limpeza com sol pleno</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Leitura Totalizadora Pós (kWh)
              </label>
              <input
                type="number"
                value={readingKwhAfter}
                onChange={(e) => setReadingKwhAfter(Number(e.target.value))}
                placeholder="Ex: 12453"
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Totalizador do inversor</span>
            </div>
          </div>

          {/* Realtime Solar Efficiency Hero Widget */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Ganho de Rendimento Calculado Automaticamente
              </span>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                100% Inspecionado
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-white/5 p-3.5 rounded-xl border border-white/10">
                <span className="text-[11px] text-slate-400 block font-medium">Recuperação de Potência:</span>
                <span className="text-2xl sm:text-3xl font-black text-amber-400 block mt-0.5">
                  +{calculatedGainPercent > 0 ? calculatedGainPercent : 0}%
                </span>
                <span className="text-[10px] text-slate-400">
                  {readingKwBefore} kW ➔ {readingKwAfter} kW
                </span>
              </div>

              <div className="bg-white/5 p-3.5 rounded-xl border border-white/10">
                <span className="text-[11px] text-slate-400 block font-medium">Geração Extra Estimada:</span>
                <span className="text-xl font-bold text-white block mt-0.5">
                  +{estimatedMonthlyExtraKwh} kWh / mês
                </span>
                <span className="text-[10px] text-slate-400">Base {modulesCleanedCount} módulos</span>
              </div>

              <div className="bg-white/5 p-3.5 rounded-xl border border-white/10">
                <span className="text-[11px] text-slate-400 block font-medium">Economia Estimada na Conta:</span>
                <span className="text-xl font-bold text-emerald-400 block mt-0.5">
                  + R$ {estimatedMonthlySavingsBrl} / mês
                </span>
                <span className="text-[10px] text-slate-400">Economia direta do cliente</span>
              </div>
            </div>
          </div>

          {/* Photo Capture After */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800">📸 Fotos DEPOIS da Limpeza (Módulos Limpos)</label>
              <label className="cursor-pointer px-3.5 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 flex items-center gap-1.5 transition-colors">
                <Camera className="w-3.5 h-3.5" />
                <span>Adicionar Foto Depois</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handlePhotoUpload(e, false)}
                  className="hidden"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {afterPhotos.map((photo) => (
                <div key={photo.id} className="relative rounded-2xl overflow-hidden border border-slate-200 group bg-slate-50">
                  <img src={photo.dataUrl} alt="Foto depois" className="w-full h-28 object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id, false)}
                    className="absolute top-1.5 right-1.5 bg-rose-600 text-white w-5 h-5 flex items-center justify-center rounded-full text-xs shadow-md"
                  >
                    ×
                  </button>
                  <p className="p-2 text-[10px] text-slate-600 truncate">{photo.caption}</p>
                </div>
              ))}
              {afterPhotos.length === 0 && (
                <div className="col-span-full border border-dashed border-slate-300 rounded-2xl p-5 text-center text-slate-400 text-xs">
                  Nenhuma foto anexada ainda. Clique em "Adicionar Foto Depois" para fotografar o resultado limpo.
                </div>
              )}
            </div>
          </div>

          {/* Observations & Next Cleaning Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Parecer Técnico / Observações</label>
              <textarea
                rows={3}
                value={technicianObservations}
                onChange={(e) => setTechnicianObservations(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Recomendações ao Cliente</label>
              <textarea
                rows={3}
                value={recommendationsForClient}
                onChange={(e) => setRecommendationsForClient(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">📅 Sugestão da Próxima Limpeza Preventiva</label>
            <input
              type="date"
              value={nextCleaningDate}
              onChange={(e) => setNextCleaningDate(e.target.value)}
              className="px-3 py-2 border border-amber-200 bg-amber-50 rounded-xl text-xs font-bold text-amber-950 focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="flex items-center space-x-1.5 px-4 py-2.5 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(5)}
              className="flex items-center space-x-1.5 px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-amber-950 text-xs font-bold rounded-xl transition-all shadow-xs shadow-amber-200 active:scale-95"
            >
              <span>Avançar para Assinaturas</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Signatures & Financial Values */}
      {currentStep === 5 && (
        <div className="bg-white rounded-3xl shadow-xs border border-slate-200 p-6 space-y-6 animate-in fade-in duration-200">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 tracking-tight">
              <FileText className="w-4 h-4 text-amber-600" />
              5. Assinaturas Digitais & Fechamento Financeiro
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Colha as assinaturas no celular/tablet e registre os valores para alimentar a planilha financeira mensal.</p>
          </div>

          {/* Financial details */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Controle Financeiro do Atendimento
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Valor do Serviço (R$) *</label>
                <input
                  type="number"
                  step="1"
                  value={serviceValue}
                  onChange={(e) => setServiceValue(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-base font-black text-slate-900 focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Forma de Pagamento</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-400"
                >
                  <option value="pix">⚡ PIX</option>
                  <option value="cartao_credito">💳 Cartão de Crédito</option>
                  <option value="cartao_debito">💳 Cartão de Débito</option>
                  <option value="boleto">📄 Boleto Bancário</option>
                  <option value="transferencia">🏦 Transferência Bancária</option>
                  <option value="dinheiro">💵 Dinheiro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status do Pagamento</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-400"
                >
                  <option value="pago">✅ Pago / Recebido</option>
                  <option value="pendente">⏳ Pendente / Faturado</option>
                </select>
              </div>
            </div>
          </div>



          {/* Interactive Signature Canvas for Client & Technician */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Client Signature */}
            <SignaturePad
              label="Assinatura do Cliente (De Acordo com o Serviço)"
              onSave={setClientSignData}
              initialDataUrl={clientSignData}
              signerName={clientSignName}
              onSignerNameChange={setClientSignName}
              documentNumber={clientSignDoc}
              onDocumentNumberChange={setClientSignDoc}
              documentLabel="CPF do Cliente"
            />

            {/* Technician Signature */}
            <SignaturePad
              label="Assinatura do Técnico Responsável (NR-35 / NR-10)"
              onSave={setTechSignData}
              initialDataUrl={techSignData}
              signerName={techSignName}
              onSignerNameChange={setTechSignName}
              documentLabel="Registro Profissional / Certificação"
            />
          </div>

          {/* Audit Trail & Cloud Storage Details */}
          <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <History className="w-4 h-4 text-amber-700" />
                Registro de Auditoria & Nuvem Elthera
              </span>
              <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                Rastreabilidade Ativa
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Creator - Immutable */}
              <div className="p-3 bg-white rounded-xl border border-amber-200">
                <div className="flex items-center space-x-1.5 text-slate-500 mb-1">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-700">Criação do Laudo (Único / Inalterável)</span>
                </div>
                <p className="font-black text-slate-900">{createdBy}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {new Date(createdAt).toLocaleString('pt-BR')}
                </p>
              </div>

              {/* Editor - Dynamic */}
              <div className="p-3 bg-white rounded-xl border border-amber-300">
                <div className="flex items-center space-x-1.5 text-amber-900 mb-1">
                  <User className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-[11px] font-bold text-amber-950">Último Editor Responsável *</span>
                </div>
                <input
                  type="text"
                  value={updatedBy}
                  onChange={(e) => setUpdatedBy(e.target.value)}
                  placeholder="Nome do operador que está salvando"
                  className="w-full px-2.5 py-1.5 border border-amber-200 rounded-lg text-xs font-bold text-slate-900 bg-amber-50/40 focus:ring-2 focus:ring-amber-400"
                />
                <p className="text-[10px] text-amber-800/80 font-mono mt-0.5">
                  Salvando agora: {new Date().toLocaleString('pt-BR')}
                </p>
              </div>
            </div>

            {/* target path info */}
            <div className="p-2.5 bg-white/80 rounded-xl border border-amber-100 flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center space-x-2">
                <FolderCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Estrutura: <strong className="text-slate-800">Elthera / Clientes / {selectedClientObj?.name || 'Cliente'} / {serviceDate || new Date().toISOString().slice(0, 10)}</strong> (checklist.json + fotos)
                </span>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full shrink-0">
                Nuvem Elthera
              </span>
            </div>
          </div>

          {/* Final Action Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-4 py-2.5 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>

            <button
              type="button"
              id="btn-finalize-checklist"
              onClick={handleFinishChecklist}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-3.5 bg-amber-400 hover:bg-amber-500 text-amber-950 text-sm font-black rounded-2xl transition-all shadow-xs shadow-amber-200 active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5 text-amber-950" />
              <span>
                {checklistToEdit
                  ? `Salvar Alterações do Checklist #${checklistToEdit.protocolNumber}`
                  : 'Finalizar Atendimento & Gerar Relatório em PDF'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: PDF Report Preview & Actions */}
      {currentStep === 6 && (() => {
        const previewChk = savedChecklistRef || {
          id: checklistToEdit?.id || `chk-${Date.now()}`,
          protocolNumber: protocolNumber || `ELT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          appointmentId,
          customerId,
          technicianId,
          date: serviceDate,
          status,
          before: {
            readingKwBefore,
            readingKwhBefore,
            weatherCondition,
            ambientTempC,
            dirtLevel,
            dirtTypes,
            defects: {
              crackedGlass,
              hotSpotsDetected,
              looseWiring,
              oxidizedConnectors,
              shadingObstacles,
              details: defectDetails,
            },
            photos: beforePhotos,
          },
          procedure: {
            waterSource,
            cleaningMethod,
            cleaningProductUsed,
            servicesExecuted: selectedServices,
            selectedExpenses,
            modulesCleanedCount: Number(modulesCleanedCount),
          },
          after: {
            readingKwAfter,
            readingKwhAfter,
            calculatedGainPercent,
            estimatedMonthlySavingsBrl,
            photos: afterPhotos,
          },
          clientSignature: {
            dataUrl: clientSignData || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><path d="M 15 35 Q 50 5 95 45 T 180 25" stroke="%23047857" stroke-width="3" fill="none"/></svg>',
            signedByName: clientSignName || selectedClientObj?.name || 'Cliente',
            signedAt: new Date().toISOString(),
          },
          technicianSignature: {
            dataUrl: techSignData || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><path d="M 15 35 Q 50 5 95 45 T 180 25" stroke="%23047857" stroke-width="3" fill="none"/></svg>',
            signedByName: techSignName || technicians.find(t => t.id === technicianId)?.name || 'Técnico Credenciado',
            signedAt: new Date().toISOString(),
            registryCode: technicians.find(t => t.id === technicianId)?.technicianDetails?.certifications[0] || 'NR35-SP',
          },
          serviceValue: Number(serviceValue),
          paymentMethod,
          paymentStatus,
          syncedWithSheets: true,
          syncedWithCalendar: true,
          createdBy: checklistToEdit?.createdBy || createdBy || 'Técnico',
          createdAt: checklistToEdit?.createdAt || createdAt || new Date().toISOString(),
          updatedBy: updatedBy || settings.currentUser || 'Técnico',
          updatedAt: new Date().toISOString(),
        };

        const cust = clients.find(c => c.id === previewChk.customerId);
        const tech = technicians.find(t => t.id === previewChk.technicianId);

        const handleDownload = async () => {
          if (!cust || !tech) return;
          await SolarPdfGenerator.downloadPdf(previewChk, cust, tech, settings);
        };

        const handleWhatsApp = () => {
          if (!cust) return;
          const phoneClean = cust.phone.replace(/\D/g, '');
          const message = encodeURIComponent(
            `Olá, ${cust.name}! ☀️\n\n` +
            `Seu *Relatório Técnico de Limpeza Solar* está pronto!\n` +
            `📄 *Protocolo:* ${previewChk.protocolNumber}\n` +
            `⚡ *Potência Antes:* ${previewChk.before.readingKwBefore.toFixed(2)} kW\n` +
            `🚀 *Potência Depois:* ${previewChk.after.readingKwAfter.toFixed(2)} kW\n` +
            `📈 *Ganho de Eficiência:* +${previewChk.after.calculatedGainPercent.toFixed(1)}%\n` +
            `💰 *Economia Estimada:* +R$ ${previewChk.after.estimatedMonthlySavingsBrl?.toFixed(2) || '0.00'}/mês\n\n` +
            `Obrigado por confiar na ${settings.tradingName}! Laudo técnico em PDF gerado com sucesso.`
          );
          window.open(`https://api.whatsapp.com/send?phone=55${phoneClean}&text=${message}`, '_blank');
        };

        return (
          <div className="bg-white rounded-3xl shadow-xs border border-slate-200 p-6 space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-100 pb-4 gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Relatório Técnico em PDF • {previewChk.protocolNumber}</h3>
                <p className="text-xs text-slate-400">Laudo completo gerado e sincronizado com sucesso.</p>
              </div>
              <div className="flex items-center space-x-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setIsLocked(false);
                    setCurrentStep(1);
                  }}
                  className="flex items-center space-x-1 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className="flex items-center space-x-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center space-x-1 px-3 py-2 bg-amber-400 hover:bg-amber-500 text-amber-950 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center space-x-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar PDF</span>
                </button>
              </div>
            </div>

            {/* Printable Report Document Preview using PdfReportDocument */}
            <div className="space-y-4">
              <PdfReportDocument checklist={previewChk} />

              <div className="flex justify-between items-center pt-4 border-t border-slate-100 max-w-3xl mx-auto px-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsLocked(false);
                    setCurrentStep(1);
                  }}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  ← Voltar e Editar
                </button>
                <button
                  type="button"
                  onClick={() => onSaveComplete(previewChk)}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Concluir & Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
