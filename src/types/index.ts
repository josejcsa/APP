export interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  distanceKm?: number; // Distance in KM from base/technician
  coordinates?: { lat: number; lng: number };
}

export interface SolarSystemInfo {
  powerKwp: number; // ex: 8.5 kWp
  moduleCount: number; // ex: 20 painéis
  inverterBrandModel: string; // ex: 'Growatt MIN 8000TL-X'
  installDate?: string;
  roofType: 'fibrocimento' | 'laje' | 'ceramica' | 'metalico' | 'solo' | 'outro';
  structureType: 'fixa' | 'rastreador' | 'inclinada_laje';
  cleaningPeriodicityMonths: number; // ex: 6 meses
  estimatedMonthlyGenerationKwh?: number;
}

export interface TechnicianDetails {
  certifications: string[]; // ex: ['NR-35 Trabalho em Altura', 'NR-10 Segurança em Eletricidade', 'NR-18']
  commissionPercentage: number; // ex: 25 (%)
  active: boolean;
  color: string; // ex: '#2563eb'
  pixKey?: string;
  vehiclePlate?: string;
  fuelPricePerLiter?: number; // ex: 6.69 (R$/l)
  carFuelEconomyKmPerLiter?: number; // ex: 10 (km/l)
  travelCostPerKm?: number; // ex: 0.67 (R$/km)
}

export type NavTabId = 'geral' | 'cliente' | 'checklist' | 'agenda' | 'financeiro' | 'contatos';

export interface AuthSession {
  id: string;
  name: string;
  phone: string;
  role: 'admin' | 'technician' | 'client';
  isTechnician?: boolean;
  isAdmin?: boolean;
  isPartner?: boolean;
  contactId?: string;
  allowedNavTabs: NavTabId[];
  loginTimestamp: string;
}

export interface BaseOfflineEntity {
  guid?: string;
  id_banco?: number | null;
  sincronizado?: boolean;
}

export interface Contact extends BaseOfflineEntity {
  id: string;
  name: string;
  isTechnician: boolean; // Flag to separate Client vs Technician in unified registry
  isAdmin?: boolean; // Usuário Administrador com permissões completas
  isPartner?: boolean; // Usuário Parceiro / Integrador (Informativo)
  personType: 'PF' | 'PJ';
  document: string; // CPF or CNPJ
  email: string;
  phone: string; // WhatsApp (Login identifier)
  password?: string; // 8 alphanumeric characters access password (exclusivo do banco / autenticação)
  allowedNavTabs?: NavTabId[]; // Active navbar items permissions
  address: Address;
  solarSystem?: SolarSystemInfo; // For clients
  technicianDetails?: TechnicianDetails; // For technicians
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SolarServiceItem {
  id: string;
  title: string;
  description: string;
  basePrice: number;
  pricePerModule: number;
  category: 'limpeza' | 'inspecao' | 'manutencao' | 'revestimento';
  estimatedDurationMinutes: number;
  iconName: string;
}

export interface ExpenseSupplyItem {
  id: string;
  name: string;
  category: 'insumo' | 'despesa' | 'equipamento' | 'epi' | 'produto_limpeza' | 'material' | 'outro';
  unit: string; // ex: 'Litro', 'Unidade', 'Metro', 'Kg'
  defaultUnitCost: number; // Valor padrão
  supplier?: string;
  notes?: string;
  relatedServices?: string[]; // titles of initial_services
}

export type AppointmentStatus = 'agendado' | 'em_deslocamento' | 'em_andamento' | 'concluido' | 'cancelado';

export interface Appointment extends BaseOfflineEntity {
  id: string;
  customerId: string;
  technicianId: string;
  serviceIds: string[];
  status: AppointmentStatus;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  estimatedDurationMinutes: number;
  notes?: string;
  totalAmount: number;
  googleEventId?: string;
  checklistId?: string;
  notificationSent?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionPhoto {
  id: string;
  dataUrl: string;
  serverUrl?: string;
  imageId?: string;
  filename?: string;
  isSavedOnServer?: boolean;
  caption: string;
  timestamp: string;
  category: 'panoramica' | 'detalhe_sujeira' | 'inversor' | 'avaria' | 'pos_limpeza' | 'pos_inversor';
}

export interface VisualDefects {
  crackedGlass: boolean;
  hotSpotsDetected: boolean;
  looseWiring: boolean;
  oxidizedConnectors: boolean;
  framingDamaged: boolean;
  microCracks: boolean;
  delamination: boolean;
  shadingObstacles: boolean;
  details: string;
}

export interface RoofSafety {
  anchorPointsChecked: boolean;
  ppeComplete: boolean; // EPIs completos NR-35
  roofAccessSafe: boolean;
  waterDrainageClear: boolean;
}

export interface ChecklistBefore {
  readingKwBefore: number; // Ex: 3.2 kW
  readingKwhBefore: number; // Ex: 14500 kWh acumulado
  weatherCondition: 'ensolarado' | 'parcialmente_nublado' | 'nublado' | 'chuvoso';
  ambientTempC: number;
  dirtLevel: 'leve' | 'moderada' | 'severa' | 'critica';
  dirtTypes: string[]; // ['poeira', 'dejetos_aves', 'musgo_liquen', 'fuligem', 'calcificacao', 'folhas']
  defects: VisualDefects;
  safety: RoofSafety;
  photos: InspectionPhoto[];
  initialNotes?: string;
}

export interface ChecklistProcedure {
  waterSource: 'rede_tratada' | 'deionizada' | 'osmo_reversa' | 'filtrada';
  cleaningMethod: 'baixa_pressao' | 'escova_rotativa_solar' | 'escova_telescopica_macia' | 'robo_limpeza';
  cleaningProductUsed: 'apenas_agua_pura' | 'detergente_neutro_solar' | 'desincrustante_biodegradavel' | 'nanotecnologia_hidrofobica';
  modulesCleanedCount: number;
  servicesExecuted: string[];
  selectedExpenses?: Array<{ id: string; included: boolean }>;
}

export interface ChecklistAfter {
  readingKwAfter: number; // Ex: 4.5 kW
  readingKwhAfter: number;
  calculatedGainPercent: number; // Ex: +40.6%
  estimatedMonthlyExtraKwh: number;
  estimatedMonthlySavingsBrl: number;
  finalInspectionPassed: boolean;
  photos: InspectionPhoto[];
  technicianObservations: string;
  recommendationsForClient: string;
  nextRecommendedCleaningDate: string; // YYYY-MM-DD
}

export interface DigitalSignature {
  dataUrl: string;
  signedByName: string;
  signedAt: string;
  documentNumber?: string;
  registryCode?: string;
}

export interface AuditLogEntry extends BaseOfflineEntity {
  id: string;
  entityType: 'checklist' | 'appointment' | 'contact' | 'financial' | 'settings' | 'auth';
  entityId: string;
  action: 'Criação' | 'Edição' | 'Exclusão' | 'Visualização' | 'Assinatura' | 'Sincronização';
  user: string;
  timestamp: string;
  summary?: string;
  details?: string;
}

export interface TechnicalChecklist extends BaseOfflineEntity {
  id: string;
  appointmentId?: string;
  customerId: string;
  technicianId: string;
  protocolNumber: string; // Ex: SOL-2026-0042
  date: string; // YYYY-MM-DD
  status: 'rascunho' | 'concluido' | 'cancelado';
  before: ChecklistBefore;
  procedure: ChecklistProcedure;
  after: ChecklistAfter;
  clientSignature?: DigitalSignature;
  technicianSignature?: DigitalSignature;
  serviceValue: number;
  paymentMethod: 'pix' | 'cartao_credito' | 'cartao_debito' | 'boleto' | 'dinheiro' | 'transferencia';
  paymentStatus: 'pago' | 'pendente';
  syncedWithSheets?: boolean;
  syncedWithCalendar?: boolean;
  createdBy?: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
  auditHistory?: AuditLogEntry[];
}

export interface FinancialExpense {
  id: string;
  description: string;
  amount: number;
  category: 'combustivel' | 'material' | 'comissao' | 'equipamento' | 'outro';
  date: string;
}

export interface FinancialRecord extends BaseOfflineEntity {
  id: string;
  checklistId?: string;
  appointmentId?: string;
  customerId: string;
  technicianId: string;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  serviceDescription: string;
  moduleCount: number;
  grossAmount: number;
  discount: number;
  netAmount: number;
  paymentMethod: 'pix' | 'cartao_credito' | 'cartao_debito' | 'boleto' | 'dinheiro' | 'transferencia';
  paymentStatus: 'pago' | 'pendente' | 'cancelado';
  paidAt?: string;
  technicianCommission: number;
  expenses: FinancialExpense[];
  notes?: string;
  syncedToGoogleSheets: boolean;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'agendamento' | 'pendencia' | 'lembrete' | 'sistema' | 'financeiro';
  timestamp: string;
  read: boolean;
  appointmentId?: string;
  customerId?: string;
  priority: 'baixa' | 'media' | 'alta';
}

export interface SyncResult {
  success: boolean;
  message?: string;
  syncedCalendarCount?: number;
  syncedSheetsCount?: number;
  processedCount?: number;
  syncedItems?: number;
  errors?: string[];
}

export type SyncFilterStrategy = 'all_recent' | 'my_recent' | 'hybrid_my_and_recent';

export interface CompanySettings {
  companyName: string;
  tradingName: string;
  cnpj?: string;
  companyCnpj?: string;
  phone?: string;
  companyPhone?: string;
  email?: string;
  companyEmail?: string;
  website?: string;
  address?: string;
  cityState?: string;
  logoUrl?: string;
  googleCalendarEnabled: boolean;
  googleSheetsEnabled: boolean;
  googleSheetId?: string;
  googleCalendarId?: string;
  googleCalendarIcalUrl?: string;
  currentUser?: string;
  autoSyncIntervalMinutes: number;
  phpApiEndpointUrl?: string;
  pricePerKwpDefault?: number;
  pricePerModuleDefault?: number;
  pricePerModule?: number;
  minServiceFee?: number;
  kwhPriceAverage?: number;
  maxLocalRecordsLimit?: number; // Limite de registros salvos localmente (padrão 50, até 200)
  syncFilterStrategy?: SyncFilterStrategy; // Ordem/Critério de download
  autoDownloadRemoteData?: boolean; // Se baixa automaticamente registros de outros usuários ao sincronizar
}
