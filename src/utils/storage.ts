import {
  Contact,
  SolarServiceItem,
  ExpenseSupplyItem,
  Appointment,
  TechnicalChecklist,
  FinancialRecord,
  FinancialExpense,
  AppNotification,
  CompanySettings,
  AuditLogEntry,
  AuthSession,
  NavTabId
} from '../types';
import { OfflineFirstService } from './offlineFirstService';

const STORAGE_KEYS = {
  CONTACTS: 'elthera_pro_contacts',
  SERVICES: 'elthera_pro_services',
  EXPENSE_ITEMS: 'elthera_pro_expense_items',
  APPOINTMENTS: 'elthera_pro_appointments',
  CHECKLISTS: 'elthera_pro_checklists',
  FINANCIALS: 'elthera_pro_financials',
  NOTIFICATIONS: 'elthera_pro_notifications',
  SETTINGS: 'elthera_pro_settings',
  SYNC_QUEUE: 'elthera_pro_sync_queue',
  LAST_SYNC: 'elthera_pro_last_sync',
  AUDIT_LOGS: 'elthera_audit_logs',
  AUTH_SESSION: 'elthera_auth_session',
};

export const ALL_NAV_TABS: { id: NavTabId; label: string; description: string }[] = [
  { id: 'geral', label: 'Painel Geral', description: 'Visão executiva, faturamento do mês e indicadores gerais' },
  { id: 'cliente', label: 'Painel por Cliente', description: 'Histórico, laudos concluídos, comparativo de ganho solar' },
  { id: 'checklist', label: 'Checklist Técnico', description: 'Execução de vistorias com fotos antes/depois e laudo' },
  { id: 'agenda', label: 'Agenda & Calendar', description: 'Agendamentos técnicos, horários e sincronização Google Calendar' },
  { id: 'financeiro', label: 'Financeiro Mensal', description: 'Receitas de serviços, comissões técnicas e planilha Sheets' },
  { id: 'contatos', label: 'Clientes & Técnicos', description: 'Gestão de cadastros, senhas e permissões de acesso' },
];

export function generateAlphanumericPassword(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function normalizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

// Master Admin Default Credentials
export const MASTER_ADMIN_USER: AuthSession = {
  id: 'usr-admin-master',
  name: 'Administrador Geral Elthera',
  phone: '(47)98863-8516',
  role: 'admin',
  allowedNavTabs: ['geral', 'cliente', 'checklist', 'agenda', 'financeiro', 'contatos'],
  loginTimestamp: new Date().toISOString(),
};

export const MASTER_ADMIN_PASSWORD = 'ELT2026A'; // 8 caracteres alfanuméricos

// Initial Company Settings
export const DEFAULT_SETTINGS: CompanySettings = {
  companyName: 'Elthera Soluções em Energia Solar Ltda.',
  tradingName: 'Elthera',
  cnpj: '38.942.108/0001-55',
  companyCnpj: '38.942.108/0001-55',
  phone: '(47) 98863-8516',
  companyPhone: '(47) 98863-8516',
  email: 'contato@elthera.com.br',
  companyEmail: 'contato@elthera.com.br',
  website: 'www.elthera.com.br',
  address: 'Rua Camboriu, 100 - centro',
  cityState: 'Navegantes - SC',
  logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSlr51BTAUix-kgKtiBBYhtH8P4vSZEMkPs-H6rqDyV7w&s=10',
  googleCalendarEnabled: true,
  googleSheetsEnabled: true,
  googleSheetId: '1cxPXrEv4TInyNjRK_GQs8-TQ5wzesG9Ho0gv8j5-w-A',
  googleCalendarId: '256f7c038eaf3761a6266660d80213727d070d59a07c26a715d6f00f1f6c0625@group.calendar.google.com',
  googleCalendarIcalUrl: 'https://calendar.google.com/calendar/ical/256f7c038eaf3761a6266660d80213727d070d59a07c26a715d6f00f1f6c0625%40group.calendar.google.com/private-27219e3eda7c4ad0193e7e6ce43decb8/basic.ics',
  currentUser: 'Tec. Almeida Jr. (Técnico)',
  autoSyncIntervalMinutes: 5,
  pricePerKwpDefault: 0.69568,
  pricePerModuleDefault: 25.0,
  pricePerModule: 25.0,
  minServiceFee: 150.0,
  kwhPriceAverage: 0.90,
};

// Initial Services - Complete Standard Catalog for Solar Maintenance & Cleaning
export const INITIAL_SERVICES: SolarServiceItem[] = [
  {
    id: 'srv-1',
    title: 'Limpeza Técnica Padrão',
    description: 'Lavagem com escovação macia telescópica e água, sem produtos abrasivos.',
    basePrice: 0,
    pricePerModule: 22,
    category: 'limpeza',
    estimatedDurationMinutes: 90,
    iconName: 'Sparkles',
  },
  {
    id: 'srv-2',
    title: 'Limpeza Pesada com Desincrustante Solar',
    description: 'Remoção intensiva de fuligem, gordura, dejetos calcificados de aves e matéria orgânica aderida.',
    basePrice: 240,
    pricePerModule: 25,
    category: 'limpeza',
    estimatedDurationMinutes: 120,
    iconName: 'Droplets',
  },
  {
    id: 'srv-3',
    title: 'Inspeção Termográfica com Termovisor / Drone',
    description: 'Varredura infravermelha com termovisor calibrado para detecção de pontos quentes (hot spots) e diodos em curto.',
    basePrice: 280,
    pricePerModule: 15,
    category: 'inspecao',
    estimatedDurationMinutes: 60,
    iconName: 'Zap',
  },
  {
    id: 'srv-4',
    title: 'Placas fotovoltaicas',
    description: 'Parte traseira: se existem danos. Células solares: delaminação, rachaduras, oxidação, bolhas, corrosão. Moldura. Proteção mecânica (vidro), Verificação isolamentos de conexão dos cabos, Caixa de conexão e diodo bypass e Curva IxV',
    basePrice: 160,
    pricePerModule: 12,
    category: 'inspecao',
    estimatedDurationMinutes: 75,
    iconName: 'Wrench',
  },
  {
    id: 'srv-5',
    title: 'Aplicação de Nano-revestimento Hidrofóbico',
    description: 'Tratamento de proteção vítrea com nanotecnologia antiaderente que reduz o acúmulo de poeira e facilita o escoamento.',
    basePrice: 320,
    pricePerModule: 30,
    category: 'revestimento',
    estimatedDurationMinutes: 100,
    iconName: 'ShieldCheck',
  },
  {
    id: 'srv-6',
    title: 'Inspeção e Limpeza do Inversor / String Box',
    description: 'Aspiração de dissipadores de calor, testes de isolamento, ventoinhas e medição de tensões Voc e correntes Isc.',
    basePrice: 190,
    pricePerModule: 10,
    category: 'inspecao',
    estimatedDurationMinutes: 60,
    iconName: 'Activity',
  },
  {
    id: 'srv-7',
    title: 'Poda e Desobstrução de Sombreamento',
    description: 'Corte controlado de galhos e remoção de interferências pontuais que geram sombreamento sobre as strings.',
    basePrice: 150,
    pricePerModule: 40,
    category: 'manutencao',
    estimatedDurationMinutes: 45,
    iconName: 'Scissors',
  },
  {
    id: 'srv-8',
    title: 'Limpeza pós-Obra',
    description: 'Removedor de concreto biodegradável. Borrifador manual. Espátula de plástico/nylon. Luvas de borracha e óculos de proteção. Mangueira de baixa pressão com água limpa',
    basePrice: 150,
    pricePerModule: 40,
    category: 'limpeza',
    estimatedDurationMinutes: 45,
    iconName: 'Scissors',
  },
];

export const INITIAL_EXPENSE_ITEMS: ExpenseSupplyItem[] = [
  {
    id: 'exp-1',
    name: 'Detergente Neutro Biodegradável',
    category: 'produto_limpeza',
    unit: 'Litro',
    defaultUnitCost: 25.00,
    supplier: 'SolarClean Distribuidora',
    notes: 'Utilizado para lavagem e remoção de poeira leve',
  },
  {
    id: 'exp-2',
    name: 'Desincrustante Ácido Especial Solar',
    category: 'produto_limpeza',
    unit: 'Litro',
    defaultUnitCost: 65.00,
    supplier: 'EcoQuímica',
    notes: 'Para remoção de dejetos calcificados e fuligem severa',
  },
  {
    id: 'exp-3',
    name: 'Água Deionizada / Osmose Reversa',
    category: 'insumo',
    unit: 'Litro',
    defaultUnitCost: 0.35,
    supplier: 'Purify Água',
    notes: 'Evita manchas minerais e calcárias nos módulos',
  },
  {
    id: 'exp-4',
    name: 'Kit EPI Completo NR-35 (Cinto + Talabarte)',
    category: 'epi',
    unit: 'Conjunto',
    defaultUnitCost: 350.00,
    supplier: 'Segurança Total',
    notes: 'Equipamento de segurança obrigatório para trabalho em altura',
  },
];

export const INITIAL_CONTACTS: Contact[] = [];
export const INITIAL_CHECKLISTS: TechnicalChecklist[] = [];
export const INITIAL_APPOINTMENTS: Appointment[] = [];
export const INITIAL_FINANCIALS: FinancialRecord[] = [];
export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

// Storage Helper Engine
class StorageService {
  private get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      if (!item) return defaultValue;
      return JSON.parse(item);
    } catch (e) {
      console.warn(`Error reading localStorage key ${key}`, e);
      return defaultValue;
    }
  }

  private set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error saving localStorage key ${key}`, e);
    }
  }

  // Initialize data and purge legacy dummy mock data
  public init(): void {
    const mockIds = new Set([
      'tech-1', 'cli-1', 'chk-1', 'apt-1', 'fin-1', 'notif-1', 'notif-2', 'notif-3'
    ]);

    const existingContacts = this.get<Contact[]>(STORAGE_KEYS.CONTACTS, []);
    const cleanContacts = existingContacts.filter((c) => !mockIds.has(c.id));
    this.set(STORAGE_KEYS.CONTACTS, cleanContacts);

    const existingAppointments = this.get<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, []);
    const cleanAppointments = existingAppointments.filter((a) => !mockIds.has(a.id));
    this.set(STORAGE_KEYS.APPOINTMENTS, cleanAppointments);

    const existingChecklists = this.get<TechnicalChecklist[]>(STORAGE_KEYS.CHECKLISTS, []);
    const cleanChecklists = existingChecklists.filter((chk) => !mockIds.has(chk.id));
    this.set(STORAGE_KEYS.CHECKLISTS, cleanChecklists);

    const existingFinancials = this.get<FinancialRecord[]>(STORAGE_KEYS.FINANCIALS, []);
    const cleanFinancials = existingFinancials.filter((f) => !mockIds.has(f.id));
    this.set(STORAGE_KEYS.FINANCIALS, cleanFinancials);

    const existingNotifs = this.get<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const cleanNotifs = existingNotifs.filter((n) => !mockIds.has(n.id));
    this.set(STORAGE_KEYS.NOTIFICATIONS, cleanNotifs);

    const storedServices = this.get<SolarServiceItem[]>(STORAGE_KEYS.SERVICES, []);
    if (!storedServices || storedServices.length <= 1) {
      this.set(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      this.set(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    } else {
      const currentSettings = this.get<CompanySettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
      if (
        !currentSettings.logoUrl ||
        currentSettings.logoUrl.includes('unsplash') ||
        currentSettings.tradingName === 'Elthera Pro'
      ) {
        this.set(STORAGE_KEYS.SETTINGS, {
          ...DEFAULT_SETTINGS,
          ...currentSettings,
          companyName: 'Elthera Soluções em Energia Solar Ltda.',
          tradingName: 'Elthera',
          logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSlr51BTAUix-kgKtiBBYhtH8P4vSZEMkPs-H6rqDyV7w&s=10',
          email: 'contato@elthera.com.br',
          companyEmail: 'contato@elthera.com.br',
          website: 'www.elthera.com.br',
        });
      }
    }
    if (!localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE)) {
      this.set(STORAGE_KEYS.SYNC_QUEUE, []);
    }
  }

  // Authentication & Session
  public getCurrentSession(): AuthSession | null {
    return this.get<AuthSession | null>(STORAGE_KEYS.AUTH_SESSION, null);
  }

  public setCurrentSession(session: AuthSession | null): void {
    this.set(STORAGE_KEYS.AUTH_SESSION, session);
  }

  public clearSession(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
  }

  public logout(): void {
    this.clearSession();
  }

  public login(phoneOrName: string, passwordInput: string): { success: boolean; session?: AuthSession; message?: string } {
    return this.authenticate(phoneOrName, passwordInput);
  }

  public authenticate(phoneOrName: string, passwordInput: string): { success: boolean; session?: AuthSession; message?: string } {
    const cleanPhoneInput = normalizePhoneNumber(phoneOrName);
    const cleanPassword = passwordInput.trim();

    if (
      (cleanPhoneInput === normalizePhoneNumber(MASTER_ADMIN_USER.phone) || phoneOrName.trim().toLowerCase() === 'admin') &&
      cleanPassword === MASTER_ADMIN_PASSWORD
    ) {
      const session = { ...MASTER_ADMIN_USER, loginTimestamp: new Date().toISOString() };
      this.setCurrentSession(session);
      this.addAuditLog({
        entityType: 'contact',
        entityId: 'admin',
        action: 'Edição',
        user: MASTER_ADMIN_USER.name,
        summary: 'Login realizado pelo Administrador Geral',
      });
      return { success: true, session };
    }

    const contacts = this.getContacts();
    const matchedContact = contacts.find((c) => {
      const contactNormalized = normalizePhoneNumber(c.phone || '');
      return contactNormalized === cleanPhoneInput && cleanPhoneInput.length >= 8;
    });

    if (!matchedContact) {
      return {
        success: false,
        message: 'Telefone não encontrado no cadastro. Verifique o número digitado ou contate o administrador.',
      };
    }

    const contactPassword = matchedContact.password || '';
    if (!contactPassword) {
      return {
        success: false,
        message: 'Este cadastro ainda não possui senha configurada. Solicite o cadastro de senha ao administrador.',
      };
    }

    if (contactPassword !== cleanPassword) {
      return {
        success: false,
        message: 'Senha incorreta. A senha é composta por 8 caracteres alfanuméricos.',
      };
    }

    const defaultTabs: NavTabId[] = matchedContact.isTechnician
      ? ['checklist', 'agenda', 'cliente']
      : ['cliente'];
    const allowedTabs = matchedContact.allowedNavTabs && matchedContact.allowedNavTabs.length > 0
      ? matchedContact.allowedNavTabs
      : defaultTabs;

    const session: AuthSession = {
      id: matchedContact.id,
      name: matchedContact.name,
      phone: matchedContact.phone,
      role: matchedContact.isTechnician ? 'technician' : 'client',
      isTechnician: matchedContact.isTechnician,
      contactId: matchedContact.id,
      allowedNavTabs: allowedTabs,
      loginTimestamp: new Date().toISOString(),
    };

    this.setCurrentSession(session);
    this.addAuditLog({
      entityType: 'contact',
      entityId: matchedContact.id,
      action: 'Edição',
      user: matchedContact.name,
      summary: `Login realizado por ${matchedContact.isTechnician ? 'Técnico' : 'Cliente'} "${matchedContact.name}"`,
    });

    return { success: true, session };
  }

  // Audit Logging Engine
  public getAuditLogs(): AuditLogEntry[] {
    return this.get<AuditLogEntry[]>(STORAGE_KEYS.AUDIT_LOGS, []);
  }

  public addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'> & { timestamp?: string; guid?: string }): AuditLogEntry {
    const logs = this.getAuditLogs();
    const settings = this.getSettings();
    const guid = entry.guid || OfflineFirstService.generateUUID();
    const newLog: AuditLogEntry = {
      ...entry,
      id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      guid,
      id_banco: null,
      sincronizado: false,
      user: entry.user || settings.currentUser || 'Administrador Elthera',
      timestamp: entry.timestamp || new Date().toISOString(),
    };
    this.set(STORAGE_KEYS.AUDIT_LOGS, [newLog, ...logs]);
    
    // Sincronização offline-first e persistência no banco
    OfflineFirstService.salvarItem('audit_log', newLog);
    this.addToSyncQueue({ type: 'audit_log', action: 'save', data: newLog });

    return newLog;
  }

  // Contacts (Clients & Technicians)
  public getContacts(): Contact[] {
    return this.get<Contact[]>(STORAGE_KEYS.CONTACTS, INITIAL_CONTACTS);
  }

  public getClients(): Contact[] {
    return this.getContacts().filter((c) => !c.isTechnician);
  }

  public getTechnicians(): Contact[] {
    return this.getContacts().filter((c) => c.isTechnician);
  }

  public getContactById(id: string): Contact | undefined {
    return this.getContacts().find((c) => c.id === id);
  }

  public setContacts(contacts: Contact[]): void {
    this.set(STORAGE_KEYS.CONTACTS, contacts);
  }

  public setChecklists(checklists: TechnicalChecklist[]): void {
    this.set(STORAGE_KEYS.CHECKLISTS, checklists);
  }

  public saveContact(contact: Contact, user?: string): Contact {
    const contacts = this.getContacts();
    const guid = contact.guid || contact.id || OfflineFirstService.generateUUID();
    const index = contacts.findIndex((c) => c.id === contact.id || c.guid === guid);
    let updatedContact: Contact;
    const settings = this.getSettings();
    const operator = user || settings.currentUser || 'Administrador Elthera';

    if (index >= 0) {
      contacts[index] = { 
        ...contact, 
        guid, 
        id: guid,
        id_banco: contact.id_banco !== undefined ? contact.id_banco : contacts[index].id_banco || null,
        sincronizado: contact.sincronizado || false,
        updatedAt: new Date().toISOString() 
      };
      updatedContact = contacts[index];
      this.set(STORAGE_KEYS.CONTACTS, contacts);
      this.addAuditLog({
        entityType: 'contact',
        entityId: updatedContact.id,
        action: 'Edição',
        user: operator,
        summary: `Cadastro de ${contact.isTechnician ? 'Técnico' : 'Cliente'} "${contact.name}" atualizado`,
      });
    } else {
      updatedContact = {
        ...contact,
        guid,
        id: guid,
        id_banco: null,
        sincronizado: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.set(STORAGE_KEYS.CONTACTS, [updatedContact, ...contacts]);
      this.addAuditLog({
        entityType: 'contact',
        entityId: updatedContact.id,
        action: 'Criação',
        user: operator,
        summary: `Novo ${contact.isTechnician ? 'Técnico' : 'Cliente'} "${contact.name}" cadastrado`,
      });
    }

    // Buffer Offline-First no IndexedDB
    OfflineFirstService.salvarItem('contact', updatedContact);
    this.addToSyncQueue({ type: 'contact', action: 'save', data: updatedContact });

    return updatedContact;
  }

  public deleteContact(id: string, user?: string, reason?: string): void {
    const contact = this.getContactById(id);
    const contacts = this.getContacts().filter((c) => c.id !== id && c.guid !== id);
    this.set(STORAGE_KEYS.CONTACTS, contacts);

    const settings = this.getSettings();
    const operator = user || settings.currentUser || 'Administrador Elthera';

    this.addAuditLog({
      entityType: 'contact',
      entityId: id,
      action: 'Exclusão',
      user: operator,
      summary: `${contact?.isTechnician ? 'Técnico' : 'Cliente'} "${contact?.name || id}" excluído do sistema. ${reason ? `Motivo: ${reason}` : ''}`,
    });

    this.addToSyncQueue({ type: 'contact', action: 'delete', data: { id, guid: contact?.guid || id, name: contact?.name } });
  }

  // Services
  public getServices(): SolarServiceItem[] {
    const list = this.get<SolarServiceItem[]>(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
    if (!list || list.length <= 1) {
      this.set(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
      return INITIAL_SERVICES;
    }
    return list;
  }

  public saveService(service: SolarServiceItem): void {
    const services = this.getServices();
    const index = services.findIndex((s) => s.id === service.id);
    if (index >= 0) {
      services[index] = service;
    } else {
      services.push({ ...service, id: service.id || `srv-${Date.now()}` });
    }
    this.set(STORAGE_KEYS.SERVICES, services);
  }

  // Expense & Supply Items (Insumos e Despesas)
  public getExpenseItems(): ExpenseSupplyItem[] {
    const list = this.get<ExpenseSupplyItem[]>(STORAGE_KEYS.EXPENSE_ITEMS, INITIAL_EXPENSE_ITEMS);
    if (!list || list.length === 0) {
      this.set(STORAGE_KEYS.EXPENSE_ITEMS, INITIAL_EXPENSE_ITEMS);
      return INITIAL_EXPENSE_ITEMS;
    }
    return list;
  }

  public saveExpenseItem(item: ExpenseSupplyItem): void {
    const items = this.getExpenseItems();
    const index = items.findIndex((i) => i.id === item.id);
    if (index >= 0) {
      items[index] = item;
    } else {
      items.push({ ...item, id: item.id || `exp-${Date.now()}` });
    }
    this.set(STORAGE_KEYS.EXPENSE_ITEMS, items);
  }

  public deleteExpenseItem(id: string, user?: string, reason?: string): void {
    const item = this.getExpenseItems().find((i) => i.id === id);
    const items = this.getExpenseItems().filter((i) => i.id !== id);
    this.set(STORAGE_KEYS.EXPENSE_ITEMS, items);

    const settings = this.getSettings();
    const operator = user || settings.currentUser || 'Administrador Elthera';

    this.addAuditLog({
      entityType: 'financial',
      entityId: id,
      action: 'Exclusão',
      user: operator,
      summary: `Insumo/Despesa "${item?.name || id}" excluído. ${reason ? `Motivo: ${reason}` : ''}`,
    });

    this.addToSyncQueue({ type: 'expenseItem', action: 'delete', data: { id, name: item?.name } });
  }

  // Appointments
  public getAppointments(): Appointment[] {
    return this.get<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
  }

  public getAppointmentById(id: string): Appointment | undefined {
    return this.getAppointments().find((a) => a.id === id || a.guid === id);
  }

  public saveAppointment(appointment: Appointment, user?: string): Appointment {
    const appointments = this.getAppointments();
    const guid = appointment.guid || appointment.id || OfflineFirstService.generateUUID();
    const index = appointments.findIndex((a) => a.id === appointment.id || a.guid === guid);
    let saved: Appointment;
    const settings = this.getSettings();
    const operator = user || settings.currentUser || 'Administrador Elthera';
    const customer = this.getContactById(appointment.customerId);

    if (index >= 0) {
      appointments[index] = { 
        ...appointment, 
        guid, 
        id: guid,
        id_banco: appointment.id_banco !== undefined ? appointment.id_banco : appointments[index].id_banco || null,
        sincronizado: appointment.sincronizado || false,
        updatedAt: new Date().toISOString() 
      };
      saved = appointments[index];
      this.set(STORAGE_KEYS.APPOINTMENTS, appointments);
      this.addAuditLog({
        entityType: 'appointment',
        entityId: saved.id,
        action: 'Edição',
        user: operator,
        summary: `Agendamento para "${customer?.name || 'Cliente'}" em ${saved.scheduledDate} atualizado (Status: ${saved.status})`,
      });
    } else {
      saved = {
        ...appointment,
        guid,
        id: guid,
        id_banco: null,
        sincronizado: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.set(STORAGE_KEYS.APPOINTMENTS, [saved, ...appointments]);
      this.addAuditLog({
        entityType: 'appointment',
        entityId: saved.id,
        action: 'Criação',
        user: operator,
        summary: `Novo agendamento criado para "${customer?.name || 'Cliente'}" na data ${saved.scheduledDate}`,
      });
    }

    // Buffer Offline-First no IndexedDB
    OfflineFirstService.salvarItem('appointment', saved);
    this.addToSyncQueue({ type: 'appointment', action: 'save', data: saved });
    return saved;
  }

  public deleteAppointment(id: string, user?: string, reason?: string): void {
    const apt = this.getAppointmentById(id);
    const customer = apt ? this.getContactById(apt.customerId) : undefined;
    const appointments = this.getAppointments().filter((a) => a.id !== id && a.guid !== id);
    this.set(STORAGE_KEYS.APPOINTMENTS, appointments);

    const settings = this.getSettings();
    const operator = user || settings.currentUser || 'Administrador Elthera';

    this.addAuditLog({
      entityType: 'appointment',
      entityId: id,
      action: 'Exclusão',
      user: operator,
      summary: `Agendamento de ${customer?.name || 'Cliente'} em ${apt?.scheduledDate || ''} excluído. ${reason ? `Motivo: ${reason}` : ''}`,
    });

    this.addToSyncQueue({ type: 'appointment', action: 'delete', data: { id, guid: apt?.guid || id } });
  }

  // Checklists (Before & After)
  public getChecklists(): TechnicalChecklist[] {
    return this.get<TechnicalChecklist[]>(STORAGE_KEYS.CHECKLISTS, INITIAL_CHECKLISTS);
  }

  public getChecklistById(id: string): TechnicalChecklist | undefined {
    return this.getChecklists().find((c) => c.id === id || c.guid === id);
  }

  public getChecklistsByCustomer(customerId: string): TechnicalChecklist[] {
    return this.getChecklists().filter((c) => c.customerId === customerId);
  }

  public saveChecklist(checklist: TechnicalChecklist, editorUser?: string): TechnicalChecklist {
    const checklists = this.getChecklists();
    const guid = checklist.guid || checklist.id || OfflineFirstService.generateUUID();
    const index = checklists.findIndex((c) => c.id === checklist.id || c.guid === guid);
    const settings = this.getSettings();
    const technician = this.getContactById(checklist.technicianId);
    const customer = this.getContactById(checklist.customerId);
    const currentUser = editorUser || settings.currentUser || technician?.name || 'Tec. Almeida Jr. (Técnico)';
    const nowISO = new Date().toISOString();

    let saved: TechnicalChecklist;

    if (index >= 0) {
      const original = checklists[index];
      const createdBy = original.createdBy || checklist.createdBy || technician?.name || 'Técnico Responsável';
      const createdAt = original.createdAt || checklist.createdAt || nowISO;
      const history = original.auditHistory || checklist.auditHistory || [];

      const newAuditEntry: AuditLogEntry = {
        id: `aud-${Date.now()}`,
        entityType: 'checklist',
        entityId: guid,
        action: 'Edição',
        user: currentUser,
        timestamp: nowISO,
        summary: `Alteração de campos do Laudo #${checklist.protocolNumber} (${checklist.status === 'concluido' ? 'Concluído' : 'Rascunho'})`,
      };

      saved = {
        ...checklist,
        guid,
        id: guid,
        id_banco: checklist.id_banco !== undefined ? checklist.id_banco : original.id_banco || null,
        sincronizado: checklist.sincronizado || false,
        createdBy,
        createdAt,
        updatedBy: currentUser,
        updatedAt: nowISO,
        auditHistory: [newAuditEntry, ...history],
      };

      checklists[index] = saved;
      this.set(STORAGE_KEYS.CHECKLISTS, checklists);
      this.addAuditLog(newAuditEntry);
    } else {
      const year = new Date().getFullYear();
      const count = checklists.length + 1;
      const protocolNumber = checklist.protocolNumber || `SOL-${year}-${String(count).padStart(4, '0')}`;
      const createdBy = checklist.createdBy || currentUser;

      const creationAuditEntry: AuditLogEntry = {
        id: `aud-${Date.now()}`,
        entityType: 'checklist',
        entityId: guid,
        action: 'Criação',
        user: createdBy,
        timestamp: nowISO,
        summary: `Criação inicial do Checklist Técnico #${protocolNumber} para ${customer?.name || 'Cliente'}`,
      };

      saved = {
        ...checklist,
        guid,
        id: guid,
        id_banco: null,
        sincronizado: false,
        protocolNumber,
        createdBy,
        createdAt: nowISO,
        updatedBy: createdBy,
        updatedAt: nowISO,
        auditHistory: [creationAuditEntry],
      };

      this.set(STORAGE_KEYS.CHECKLISTS, [saved, ...checklists]);
      this.addAuditLog(creationAuditEntry);
    }

    if (saved.appointmentId) {
      const apt = this.getAppointmentById(saved.appointmentId);
      if (apt && saved.status === 'concluido') {
        apt.status = 'concluido';
        apt.checklistId = saved.id;
        this.saveAppointment(apt, currentUser);
      }
    }

    if (saved.status === 'concluido') {
      this.syncFinancialFromChecklist(saved);
    }

    // Buffer Offline-First no IndexedDB
    OfflineFirstService.salvarItem('checklist', saved);
    this.addToSyncQueue({ type: 'checklist', action: 'save', data: saved });
    return saved;
  }

  public deleteChecklist(id: string, user?: string, reason?: string): void {
    const chk = this.getChecklistById(id);
    const customer = chk ? this.getContactById(chk.customerId) : undefined;
    const checklists = this.getChecklists().filter((c) => c.id !== id && c.guid !== id);
    this.set(STORAGE_KEYS.CHECKLISTS, checklists);

    const settings = this.getSettings();
    const operator = user || settings.currentUser || 'Administrador Elthera';

    this.addAuditLog({
      entityType: 'checklist',
      entityId: id,
      action: 'Exclusão',
      user: operator,
      summary: `Checklist Técnico #${chk?.protocolNumber || id} de "${customer?.name || 'Cliente'}" excluído. ${reason ? `Motivo: ${reason}` : ''}`,
    });

    if (chk?.appointmentId) {
      const apt = this.getAppointmentById(chk.appointmentId);
      if (apt && apt.checklistId === id) {
        apt.checklistId = undefined;
        apt.status = 'agendado';
        this.saveAppointment(apt, operator);
      }
    }

    const financials = this.getFinancials();
    const linkedFin = financials.find((f) => f.checklistId === id);
    if (linkedFin) {
      this.deleteFinancial(linkedFin.id, operator, `Checklist vinculado #${chk?.protocolNumber} foi excluído`);
    }

    this.addToSyncQueue({ type: 'checklist', action: 'delete', data: { id, guid: chk?.guid || id, protocolNumber: chk?.protocolNumber } });
  }

  // Financial Control
  public getFinancials(): FinancialRecord[] {
    return this.get<FinancialRecord[]>(STORAGE_KEYS.FINANCIALS, INITIAL_FINANCIALS);
  }

  public getFinancialById(id: string): FinancialRecord | undefined {
    return this.getFinancials().find((f) => f.id === id || f.guid === id);
  }

  public saveFinancial(record: FinancialRecord, user?: string): FinancialRecord {
    const records = this.getFinancials();
    const guid = record.guid || record.id || OfflineFirstService.generateUUID();
    const index = records.findIndex((r) => r.id === record.id || r.guid === guid);
    let saved: FinancialRecord;
    const settings = this.getSettings();
    const operator = user || settings.currentUser || 'Administrador Elthera';
    const customer = this.getContactById(record.customerId);

    if (index >= 0) {
      records[index] = { 
        ...record, 
        guid, 
        id: guid,
        id_banco: record.id_banco !== undefined ? record.id_banco : records[index].id_banco || null,
        sincronizado: record.sincronizado || false 
      };
      saved = records[index];
      this.set(STORAGE_KEYS.FINANCIALS, records);
      this.addAuditLog({
        entityType: 'financial',
        entityId: saved.id,
        action: 'Edição',
        user: operator,
        summary: `Registro Financeiro #${saved.id.slice(-6)} para "${customer?.name || 'Cliente'}" atualizado (Valor: R$ ${saved.grossAmount.toFixed(2)}, Status: ${saved.paymentStatus})`,
      });
    } else {
      saved = {
        ...record,
        guid,
        id: guid,
        id_banco: null,
        sincronizado: false,
        createdAt: new Date().toISOString(),
      };
      this.set(STORAGE_KEYS.FINANCIALS, [saved, ...records]);
      this.addAuditLog({
        entityType: 'financial',
        entityId: saved.id,
        action: 'Criação',
        user: operator,
        summary: `Novo Registro Financeiro gerado para "${customer?.name || 'Cliente'}" no valor de R$ ${saved.grossAmount.toFixed(2)}`,
      });
    }

    // Buffer Offline-First no IndexedDB
    OfflineFirstService.salvarItem('financial', saved);
    this.addToSyncQueue({ type: 'financial', action: 'save', data: saved });
    return saved;
  }

  public deleteFinancial(id: string, user?: string, reason?: string): void {
    const fin = this.getFinancialById(id);
    const customer = fin ? this.getContactById(fin.customerId) : undefined;
    const records = this.getFinancials().filter((f) => f.id !== id && f.guid !== id);
    this.set(STORAGE_KEYS.FINANCIALS, records);

    const settings = this.getSettings();
    const operator = user || settings.currentUser || 'Administrador Elthera';

    this.addAuditLog({
      entityType: 'financial',
      entityId: id,
      action: 'Exclusão',
      user: operator,
      summary: `Registro financeiro de ${customer?.name || 'Cliente'} (R$ ${fin?.grossAmount.toFixed(2) || '0.00'}) excluído. ${reason ? `Motivo: ${reason}` : ''}`,
    });

    this.addToSyncQueue({ type: 'financial', action: 'delete', data: { id, guid: fin?.guid || id } });
  }

  public syncFinancialFromChecklist(checklist: TechnicalChecklist): void {
    const existing = this.getFinancials().find((f) => f.checklistId === checklist.id || (checklist.guid && f.checklistId === checklist.guid));
    const customer = this.getContactById(checklist.customerId);
    const tech = this.getContactById(checklist.technicianId);

    const commissionPercent = tech?.technicianDetails?.commissionPercentage || 25;
    const commissionAmount = (checklist.serviceValue * commissionPercent) / 100;

    const expensesList: FinancialExpense[] = [];
    if (checklist.procedure?.selectedExpenses) {
      const allExpenseItems = this.getExpenseItems();
      checklist.procedure.selectedExpenses
        .filter((e) => e.included)
        .forEach((e) => {
          const item = allExpenseItems.find((i) => i.id === e.id);
          if (item) {
            expensesList.push({
              id: `fexp-${Date.now()}-${item.id}`,
              description: item.name,
              amount: item.defaultUnitCost,
              category: (item.category === 'insumo' ? 'material' : 'outro') as any,
              date: checklist.date,
            });
          }
        });
    }

    const monthStr = checklist.date.slice(0, 7);

    const financialData: FinancialRecord = {
      id: existing ? existing.id : OfflineFirstService.generateUUID(),
      guid: existing ? existing.guid : OfflineFirstService.generateUUID(),
      id_banco: existing ? existing.id_banco : null,
      sincronizado: false,
      checklistId: checklist.id,
      appointmentId: checklist.appointmentId,
      customerId: checklist.customerId,
      technicianId: checklist.technicianId,
      date: checklist.date,
      month: monthStr,
      serviceDescription: `Limpeza Solar #${checklist.protocolNumber} (${customer?.name || 'Cliente'})`,
      moduleCount: checklist.procedure.modulesCleanedCount || customer?.solarSystem?.moduleCount || 0,
      grossAmount: checklist.serviceValue,
      discount: 0,
      netAmount: checklist.serviceValue,
      paymentMethod: checklist.paymentMethod || 'pix',
      paymentStatus: checklist.paymentStatus || 'pendente',
      paidAt: checklist.paymentStatus === 'pendente' ? new Date().toISOString() : undefined,
      technicianCommission: commissionAmount,
      expenses: expensesList,
      notes: `Gerado automaticamente via Checklist Técnico #${checklist.protocolNumber}`,
      syncedToGoogleSheets: false,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
    };

    this.saveFinancial(financialData);
  }

  // Notifications
  public getNotifications(): AppNotification[] {
    return this.get<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  }

  public addNotification(notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>): AppNotification {
    const list = this.getNotifications();
    const newNotif: AppNotification = {
      ...notification,
      id: `notif-${Date.now()}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    this.set(STORAGE_KEYS.NOTIFICATIONS, [newNotif, ...list]);
    return newNotif;
  }

  public markNotificationAsRead(id: string): void {
    const list = this.getNotifications().map((n) => (n.id === id ? { ...n, read: true } : n));
    this.set(STORAGE_KEYS.NOTIFICATIONS, list);
  }

  public markAllNotificationsAsRead(): void {
    const list = this.getNotifications().map((n) => ({ ...n, read: true }));
    this.set(STORAGE_KEYS.NOTIFICATIONS, list);
  }

  // Settings
  public getSettings(): CompanySettings {
    const s = this.get<CompanySettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    if (!s.googleCalendarId || s.googleCalendarId === 'primary') {
      s.googleCalendarId = DEFAULT_SETTINGS.googleCalendarId;
    }
    if (!s.googleCalendarIcalUrl) {
      s.googleCalendarIcalUrl = DEFAULT_SETTINGS.googleCalendarIcalUrl;
    }
    if (!s.googleSheetId || s.googleSheetId === 'Elthera_Controle_Financeiro_2026') {
      s.googleSheetId = '1cxPXrEv4TInyNjRK_GQs8-TQ5wzesG9Ho0gv8j5-w-A';
    }
    return s;
  }

  public saveSettings(settings: CompanySettings): void {
    this.set(STORAGE_KEYS.SETTINGS, settings);
  }

  // Offline Sync Queue
  public getSyncQueue(): Array<{ type: string; action: string; data: any; timestamp: string }> {
    return this.get(STORAGE_KEYS.SYNC_QUEUE, []);
  }

  private addToSyncQueue(item: { type: string; action: string; data: any }): void {
    const queue = this.getSyncQueue();
    queue.push({ ...item, timestamp: new Date().toISOString() });
    this.set(STORAGE_KEYS.SYNC_QUEUE, queue);
  }

  public clearSyncQueue(): void {
    this.set(STORAGE_KEYS.SYNC_QUEUE, []);
    this.set(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  }

  public getLastSyncTime(): string | null {
    return localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  }
}

export function exportContactsToCsv(contacts: Contact[]) {
  const headers = ['ID/GUID', 'Nome', 'Tipo', 'Documento', 'Telefone', 'Email', 'Cidade', 'UF', 'Modulos', 'Potencia (kWp)', 'ID Banco', 'Criado Em'];
  const rows = contacts.map(c => [
    c.guid || c.id,
    `"${c.name || ''}"`,
    c.personType || 'PF',
    c.document || '',
    c.phone || '',
    c.email || '',
    c.address?.city || '',
    c.address?.state || '',
    c.solarSystem?.moduleCount || 0,
    c.solarSystem?.powerKwp || 0,
    c.id_banco || 'pendente',
    c.createdAt || ''
  ]);
  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `cadastros_elthera_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportFinancialsToCsv(financials: FinancialRecord[]) {
  const headers = ['ID/GUID', 'Cliente ID', 'Servico', 'Bruto (R$)', 'Liquido (R$)', 'Comissao Tech (R$)', 'Status', 'ID Banco', 'Mes'];
  const rows = financials.map(f => [
    f.guid || f.id,
    f.customerId,
    `"${f.serviceDescription || ''}"`,
    f.grossAmount,
    f.netAmount,
    f.technicianCommission,
    f.paymentStatus,
    f.id_banco || 'pendente',
    f.month
  ]);
  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `financeiro_elthera_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export const storage = new StorageService();
