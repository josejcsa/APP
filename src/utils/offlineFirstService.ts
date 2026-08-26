/**
 * =========================================================================
 * ELTHERA PRO - GERENCIADOR OFFLINE-FIRST (INDEXEDDB + BUFFER OTIMIZADO)
 * =========================================================================
 * - Armazena dados no IndexedDB com fallback em buffer de memória/localStorage
 * - Atribui GUID / UUID v4 a cada registro criado
 * - Mantém id_banco como null até a sincronização
 * - Sincroniza em lote com api.php / sync.php
 * - Mapeia e atualiza o id_banco gerado pelo MySQL
 */

import { storage } from './storage';

export interface OfflineSyncItem {
  guid: string;
  id_banco: number | null;
  sincronizado: boolean;
  tipo_entidade: 'checklist' | 'appointment' | 'contact' | 'financial' | 'service' | 'settings' | 'audit_log' | 'image';
  usuario_id: number;
  dados: any;
  criado_em: string;
  atualizado_em: string;
}

const DB_NAME = 'EltheraProOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'registros_buffer';
const MAX_LOCAL_BUFFER_ITEMS = 100;

export class OfflineFirstService {
  private static dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * Gera UUID v4 universal
   */
  public static generateUUID(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Abre / Inicializa o IndexedDB
   */
  private static async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB não suportado neste ambiente'));
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'guid' });
          store.createIndex('sincronizado', 'sincronizado', { unique: false });
          store.createIndex('tipo_entidade', 'tipo_entidade', { unique: false });
          store.createIndex('atualizado_em', 'atualizado_em', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  /**
   * Salva ou atualiza um item no buffer Offline (IndexedDB e limite de 100)
   */
  public static async salvarItem<T extends { id?: string; guid?: string; id_banco?: number | null; sincronizado?: boolean }>(
    tipo: OfflineSyncItem['tipo_entidade'],
    dados: T,
    usuarioId: number = 1
  ): Promise<OfflineSyncItem> {
    const guid = dados.guid || dados.id || this.generateUUID();
    const agora = new Date().toISOString();

    const item: OfflineSyncItem = {
      guid,
      id_banco: dados.id_banco || null,
      sincronizado: dados.sincronizado || false,
      tipo_entidade: tipo,
      usuario_id: usuarioId,
      dados: { ...dados, id: guid, guid },
      criado_em: (dados as any).createdAt || agora,
      atualizado_em: agora,
    };

    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      // Aplica limite de buffer de 100 itens para performance
      await this.podarBufferAntigo();
    } catch (e) {
      console.warn('Fallback para buffer de armazenamento local:', e);
      this.salvarFallbackLocalStorage(item);
    }

    return item;
  }

  /**
   * Poda registros antigos se ultrapassar MAX_LOCAL_BUFFER_ITEMS
   */
  private static async podarBufferAntigo(): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const todos: OfflineSyncItem[] = req.result || [];
        if (todos.length > MAX_LOCAL_BUFFER_ITEMS) {
          // Ordena por data e remove os mais antigos que já foram sincronizados
          todos.sort((a, b) => new Date(a.atualizado_em).getTime() - new Date(b.atualizado_em).getTime());
          const sincronizados = todos.filter((i) => i.sincronizado);
          const removerQtd = todos.length - MAX_LOCAL_BUFFER_ITEMS;

          for (let i = 0; i < Math.min(removerQtd, sincronizados.length); i++) {
            store.delete(sincronizados[i].guid);
          }
        }
      };
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Obtém todos os itens pendentes de sincronização
   */
  public static async getPendentes(): Promise<OfflineSyncItem[]> {
    // Sincroniza pendências existentes no localStorage para o IndexedDB
    try {
      this.reconciliarLocalStorageComBuffer();
    } catch (e) {}

    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => {
          const todos: OfflineSyncItem[] = req.result || [];
          const pendentes = todos.filter((item) => !item.sincronizado);
          resolve(pendentes);
        };
        req.onerror = () => resolve(this.getPendentesLocalStorage());
      });
    } catch (e) {
      return this.getPendentesLocalStorage();
    }
  }

  /**
   * Varre registros do localStorage que ainda não têm id_banco e garante presença no buffer
   */
  private static reconciliarLocalStorageComBuffer(): void {
    try {
      const contatos = storage.getContacts();
      for (const c of contatos) {
        if (!c.id_banco || !c.sincronizado) {
          this.salvarItem('contact', c);
        }
      }

      const checklists = storage.getChecklists();
      for (const chk of checklists) {
        if (!chk.id_banco || !chk.sincronizado) {
          this.salvarItem('checklist', chk);
        }
      }

      const agendamentos = storage.getAppointments();
      for (const apt of agendamentos) {
        if (!apt.id_banco || !apt.sincronizado) {
          this.salvarItem('appointment', apt);
        }
      }

      const lancamentos = storage.getFinancials();
      for (const fin of lancamentos) {
        if (!fin.id_banco || !fin.sincronizado) {
          this.salvarItem('financial', fin);
        }
      }

      const logs = storage.getAuditLogs();
      for (const log of logs) {
        if (!log.id_banco || !log.sincronizado) {
          this.salvarItem('audit_log', log);
        }
      }
    } catch (e) {
      // Ignora erro de leitura do localStorage
    }
  }

  /**
   * Atualiza os itens com o id_banco e marca como sincronizado = true
   */
  public static async marcarComoSincronizados(
    mapeamentos: Array<{ guid: string; id_banco: number; tipo?: string; status?: string }>
  ): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      for (const map of mapeamentos) {
        const getReq = store.get(map.guid);
        getReq.onsuccess = () => {
          const item: OfflineSyncItem | undefined = getReq.result;
          if (item) {
            item.id_banco = map.id_banco;
            item.sincronizado = true;
            item.atualizado_em = new Date().toISOString();
            if (item.dados) {
              item.dados.id_banco = map.id_banco;
              item.dados.sincronizado = true;
            }
            store.put(item);
          }
        };
      }

      // Atualiza também no localStorage para manter a UI consistente
      this.atualizarLocalStorageSincronizados(mapeamentos);
    } catch (e) {
      console.warn('Erro ao atualizar status de sincronização:', e);
    }
  }

  /**
   * Atualiza flags de sincronização nos arrays locais do storage
   */
  private static atualizarLocalStorageSincronizados(
    mapeamentos: Array<{ guid: string; id_banco: number; tipo?: string }>
  ): void {
    try {
      const mapDict = new Map<string, { id_banco: number; tipo?: string }>();
      mapeamentos.forEach((m) => mapDict.set(m.guid, m));

      // Contatos
      const contatos = storage.getContacts();
      let contatosMudaram = false;
      contatos.forEach((c) => {
        const guid = c.guid || c.id;
        if (mapDict.has(guid)) {
          c.id_banco = mapDict.get(guid)!.id_banco;
          c.sincronizado = true;
          contatosMudaram = true;
        }
      });
      if (contatosMudaram) storage.setContacts(contatos);

      // Checklists
      const checklists = storage.getChecklists();
      let chkMudaram = false;
      checklists.forEach((chk) => {
        const guid = chk.guid || chk.id;
        if (mapDict.has(guid)) {
          chk.id_banco = mapDict.get(guid)!.id_banco;
          chk.sincronizado = true;
          chkMudaram = true;
        }
      });
      if (chkMudaram) storage.setChecklists(checklists);

      // Agendamentos
      const agendamentos = storage.getAppointments();
      let aptMudaram = false;
      agendamentos.forEach((apt) => {
        const guid = apt.guid || apt.id;
        if (mapDict.has(guid)) {
          apt.id_banco = mapDict.get(guid)!.id_banco;
          apt.sincronizado = true;
          aptMudaram = true;
        }
      });
      if (aptMudaram) storage.setAppointments(agendamentos);

      // Financeiro
      const lancamentos = storage.getFinancials();
      let finMudaram = false;
      lancamentos.forEach((f) => {
        const guid = f.guid || f.id;
        if (mapDict.has(guid)) {
          f.id_banco = mapDict.get(guid)!.id_banco;
          f.sincronizado = true;
          finMudaram = true;
        }
      });
      if (finMudaram) storage.setFinancials(lancamentos);
    } catch (e) {
      // Ignora erro
    }
  }

  /**
   * Envia lote de dados para api.php / sync.php ou /api/db/sync e baixa registros de outros usuários (Híbrido)
   */
  public static async sincronizarComPhp(): Promise<{
    sucesso: boolean;
    processados: number;
    baixados: number;
    mensagem: string;
  }> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return {
        sucesso: false,
        processados: 0,
        baixados: 0,
        mensagem: 'Dispositivo Offline. Dados salvos localmente no buffer.',
      };
    }

    const pendentes = await this.getPendentes();
    const settings = storage.getSettings();
    const session = storage.getCurrentSession();
    const userId = session?.id || 1;
    const maxLimit = settings.maxLocalRecordsLimit || 50;
    const strategy = settings.syncFilterStrategy || 'hybrid_my_and_recent';
    const autoDownload = settings.autoDownloadRemoteData !== false;

    // Endpoints prioritários
    const baseUrl = settings.phpApiEndpointUrl || '';
    const endpoints = [
      baseUrl ? `${baseUrl}/api.php` : null,
      baseUrl ? `${baseUrl}/sync.php` : null,
      '/api/db/sync',
      '/api/sync',
      '/start/api/api.php',
      '/start/api/sync.php',
      'start/api/api.php',
      'start/api/sync.php',
      '/app/api/api.php',
      '/app/api/sync.php',
      'app/api/api.php',
      'app/api/sync.php',
      '/api/api.php',
      '/api/sync.php',
      'api/api.php',
      'api/sync.php',
      './api/api.php',
      './api/sync.php',
      '/api.php',
    ].filter(Boolean) as string[];

    const payload = {
      lote: pendentes.map((p) => ({
        guid: p.guid,
        id: p.guid,
        usuario_id: p.usuario_id || userId,
        tipo_entidade: p.tipo_entidade,
        dados: p.dados,
        dados_json: JSON.stringify(p.dados),
      })),
      sync_options: {
        limit: maxLimit,
        strategy,
        usuario_id: userId,
      },
      usuario_id: userId,
      limit: maxLimit,
      strategy,
      timestamp: new Date().toISOString(),
    };

    let sucesso = false;
    let mapeamentoRetornado: any[] = [];
    let registrosRemotosRetornados: any[] = [];
    let mensagemServidor = '';

    for (const ep of endpoints) {
      try {
        const response = await fetch(ep, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const res = await response.json();
          if (res.success || res.mapeamento || res.registros_remotos) {
            sucesso = true;
            mapeamentoRetornado = res.mapeamento || [];
            registrosRemotosRetornados = res.registros_remotos || res.registros || [];
            mensagemServidor = res.message || 'Sincronização bidirecional concluída com sucesso.';
            break;
          }
        }
      } catch (err) {
        // Tenta próximo endpoint
      }
    }

    let totalBaixados = 0;

    if (sucesso) {
      if (mapeamentoRetornado.length > 0) {
        await this.marcarComoSincronizados(mapeamentoRetornado);
      } else if (pendentes.length > 0) {
        await this.marcarComoSincronizados(
          pendentes.map((p, idx) => ({ guid: p.guid, id_banco: idx + 100 }))
        );
      }

      // Se há dados remotos para baixar localmente
      if (autoDownload && Array.isArray(registrosRemotosRetornados) && registrosRemotosRetornados.length > 0) {
        totalBaixados = this.mesclarRegistrosRemotos(registrosRemotosRetornados, maxLimit);
      }

      storage.clearSyncQueue();
      return {
        sucesso: true,
        processados: mapeamentoRetornado.length || pendentes.length,
        baixados: totalBaixados,
        mensagem: totalBaixados > 0 
          ? `Sincronizado: ${mapeamentoRetornado.length || pendentes.length} enviados, ${totalBaixados} baixados da nuvem.`
          : mensagemServidor || 'Dados sincronizados com o banco de dados.',
      };
    }

    return {
      sucesso: false,
      processados: 0,
      baixados: 0,
      mensagem: 'Servidor indisponível. Dados mantidos em segurança no buffer offline.',
    };
  }

  /**
   * Mescla dados recebidos da nuvem com o armazenamento local, respeitando o limite configurado
   */
  public static mesclarRegistrosRemotos(registrosRemotos: any[], maxLimite: number = 50): number {
    let alteradosCount = 0;
    try {
      // 1. Agrupar registros remotos por tipo de entidade
      const contatosRemotos: any[] = [];
      const checklistsRemotos: any[] = [];
      const agendamentosRemotos: any[] = [];
      const financeiroRemoto: any[] = [];

      for (const reg of registrosRemotos) {
        const tipo = reg.tipo_entidade || reg.type;
        const dados = reg.dados || (reg.dados_json ? JSON.parse(reg.dados_json) : null);
        if (!dados) continue;

        const itemComMeta = {
          ...dados,
          guid: reg.guid || dados.guid || dados.id,
          id_banco: reg.id_banco || dados.id_banco,
          sincronizado: true,
        };

        if (tipo === 'contact') contatosRemotos.push(itemComMeta);
        else if (tipo === 'checklist') checklistsRemotos.push(itemComMeta);
        else if (tipo === 'appointment') agendamentosRemotos.push(itemComMeta);
        else if (tipo === 'financial') financeiroRemoto.push(itemComMeta);
      }

      // 2. Mesclar Contatos
      if (contatosRemotos.length > 0) {
        const contatosLocais = storage.getContacts();
        const mapContatos = new Map<string, any>();
        contatosLocais.forEach((c) => mapContatos.set(c.guid || c.id, c));

        for (const cr of contatosRemotos) {
          // Segurança: Nunca baixar ou expor o usuário master nem salvar senhas de outros usuários
          if (
            cr.guid === 'usr-admin-master' ||
            cr.id === 'usr-admin-master' ||
            cr.phone === '(47)98863-8516' ||
            cr.phone === '(47) 98863-8516'
          ) {
            continue;
          }

          // Remove senhas - senhas são exclusivas do banco de dados
          delete cr.password;
          delete cr.senha;

          const key = cr.guid || cr.id;
          if (mapContatos.has(key)) {
            const local = mapContatos.get(key);
            mapContatos.set(key, {
              ...local,
              ...cr,
              id_banco: cr.id_banco || local.id_banco,
              isAdmin: cr.isAdmin !== undefined ? Boolean(cr.isAdmin) : local.isAdmin,
              isPartner: cr.isPartner !== undefined ? Boolean(cr.isPartner) : local.isPartner,
              sincronizado: true,
            });
          } else {
            // Novo contato vindo da nuvem (sem senha exposta)
            mapContatos.set(key, {
              ...cr,
              id: cr.id || key,
              id_banco: cr.id_banco,
              isAdmin: Boolean(cr.isAdmin),
              isPartner: Boolean(cr.isPartner),
              sincronizado: true,
            });
            alteradosCount++;
          }
        }

        // Poda mantendo itens locais pendentes + os mais recentes até o limite
        const todosContatos = Array.from(mapContatos.values());
        const contatosPodados = this.podarColecaoLocal(todosContatos, maxLimite);
        storage.setContacts(contatosPodados);
      }

      // 3. Mesclar Checklists
      if (checklistsRemotos.length > 0) {
        const checklistsLocais = storage.getChecklists();
        const mapChecklists = new Map<string, any>();
        checklistsLocais.forEach((chk) => mapChecklists.set(chk.guid || chk.id, chk));

        for (const chkR of checklistsRemotos) {
          const key = chkR.guid || chkR.id;
          if (mapChecklists.has(key)) {
            const local = mapChecklists.get(key);
            mapChecklists.set(key, { ...local, ...chkR, id_banco: chkR.id_banco || local.id_banco, sincronizado: true });
          } else {
            mapChecklists.set(key, { ...chkR, id: chkR.id || key, id_banco: chkR.id_banco, sincronizado: true });
            alteradosCount++;
          }
        }

        const todosChecklists = Array.from(mapChecklists.values());
        const chkPodados = this.podarColecaoLocal(todosChecklists, maxLimite);
        storage.setChecklists(chkPodados);
      }

      // 4. Mesclar Agendamentos
      if (agendamentosRemotos.length > 0) {
        const agendamentosLocais = storage.getAppointments();
        const mapAgendamentos = new Map<string, any>();
        agendamentosLocais.forEach((apt) => mapAgendamentos.set(apt.guid || apt.id, apt));

        for (const aptR of agendamentosRemotos) {
          const key = aptR.guid || aptR.id;
          if (mapAgendamentos.has(key)) {
            const local = mapAgendamentos.get(key);
            mapAgendamentos.set(key, { ...local, ...aptR, id_banco: aptR.id_banco || local.id_banco, sincronizado: true });
          } else {
            mapAgendamentos.set(key, { ...aptR, id: aptR.id || key, id_banco: aptR.id_banco, sincronizado: true });
            alteradosCount++;
          }
        }

        const todosAgendamentos = Array.from(mapAgendamentos.values());
        const aptPodados = this.podarColecaoLocal(todosAgendamentos, maxLimite);
        storage.setAppointments(aptPodados);
      }

      // 5. Mesclar Financeiro
      if (financeiroRemoto.length > 0) {
        const financeiroLocal = storage.getFinancials();
        const mapFin = new Map<string, any>();
        financeiroLocal.forEach((f) => mapFin.set(f.guid || f.id, f));

        for (const fR of financeiroRemoto) {
          const key = fR.guid || fR.id;
          if (mapFin.has(key)) {
            const local = mapFin.get(key);
            mapFin.set(key, { ...local, ...fR, id_banco: fR.id_banco || local.id_banco, sincronizado: true });
          } else {
            mapFin.set(key, { ...fR, id: fR.id || key, id_banco: fR.id_banco, sincronizado: true });
            alteradosCount++;
          }
        }

        const todosFin = Array.from(mapFin.values());
        const finPodados = this.podarColecaoLocal(todosFin, maxLimite);
        storage.setFinancials(finPodados);
      }
    } catch (e) {
      console.warn('Erro ao mesclar registros remotos:', e);
    }

    return alteradosCount;
  }

  /**
   * Poda coleção local para respeitar o limite máximo, preservando sempre itens não-sincronizados
   */
  private static podarColecaoLocal<T extends { id_banco?: number | null; sincronizado?: boolean; createdAt?: string; updatedAt?: string; date?: string }>(
    itens: T[],
    limite: number
  ): T[] {
    if (itens.length <= limite) return itens;

    // Itens que ainda não foram sincronizados têm prioridade absoluta (nunca são descartados)
    const pendentes = itens.filter((i) => !i.sincronizado || !i.id_banco);
    const sincronizados = itens.filter((i) => i.sincronizado && i.id_banco);

    // Ordena sincronizados do mais recente para o mais antigo
    sincronizados.sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || a.date || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || b.date || 0).getTime();
      return dateB - dateA;
    });

    const espacoDisponivel = Math.max(limite - pendentes.length, 10);
    const sincronizadosMantidos = sincronizados.slice(0, espacoDisponivel);

    return [...pendentes, ...sincronizadosMantidos];
  }

  // --- MÉTODOS DE FALLBACK LOCAL STORAGE ---
  private static salvarFallbackLocalStorage(item: OfflineSyncItem): void {
    try {
      const buffer = JSON.parse(localStorage.getItem('elthera_offline_buffer') || '[]');
      const index = buffer.findIndex((b: OfflineSyncItem) => b.guid === item.guid);
      if (index >= 0) {
        buffer[index] = item;
      } else {
        buffer.push(item);
      }
      if (buffer.length > MAX_LOCAL_BUFFER_ITEMS) {
        buffer.shift();
      }
      localStorage.setItem('elthera_offline_buffer', JSON.stringify(buffer));
    } catch (e) {}
  }

  private static getPendentesLocalStorage(): OfflineSyncItem[] {
    try {
      const buffer: OfflineSyncItem[] = JSON.parse(localStorage.getItem('elthera_offline_buffer') || '[]');
      return buffer.filter((i) => !i.sincronizado);
    } catch (e) {
      return [];
    }
  }
}
