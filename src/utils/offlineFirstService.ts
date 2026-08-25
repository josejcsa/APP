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
   * Atualiza os itens com o id_banco e marca como sincronizado = true
   */
  public static async marcarComoSincronizados(
    mapeamentos: Array<{ guid: string; id_banco: number; status?: string }>
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
    } catch (e) {
      console.warn('Erro ao atualizar status de sincronização:', e);
    }
  }

  /**
   * Envia lote de dados para api.php / sync.php
   */
  public static async sincronizarComPhp(): Promise<{
    sucesso: boolean;
    processados: number;
    mensagem: string;
  }> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return {
        sucesso: false,
        processados: 0,
        mensagem: 'Dispositivo Offline. Dados salvos localmente no buffer.',
      };
    }

    const pendentes = await this.getPendentes();
    if (pendentes.length === 0) {
      return {
        sucesso: true,
        processados: 0,
        mensagem: 'Nenhum registro pendente para sincronização.',
      };
    }

    // Endpoints prioritários
    const baseUrl = storage.getSettings().phpApiEndpointUrl || '';
    const endpoints = [
      baseUrl ? `${baseUrl}/api.php` : null,
      baseUrl ? `${baseUrl}/sync.php` : null,
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
        usuario_id: p.usuario_id || 1,
        tipo_entidade: p.tipo_entidade,
        dados_json: JSON.stringify(p.dados),
      })),
      timestamp: new Date().toISOString(),
    };

    let sucesso = false;
    let mapeamentoRetornado: any[] = [];
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
          if (res.success || res.mapeamento) {
            sucesso = true;
            mapeamentoRetornado = res.mapeamento || [];
            mensagemServidor = res.message || 'Sincronizado com sucesso com o banco MySQL';
            break;
          }
        }
      } catch (err) {
        // Tenta próximo endpoint
      }
    }

    if (sucesso && mapeamentoRetornado.length > 0) {
      await this.marcarComoSincronizados(mapeamentoRetornado);
      storage.clearSyncQueue();
      return {
        sucesso: true,
        processados: mapeamentoRetornado.length,
        mensagem: mensagemServidor,
      };
    } else if (sucesso) {
      // Se não enviou mapeamento detalhado, marca os pendentes como sincronizados
      await this.marcarComoSincronizados(
        pendentes.map((p, idx) => ({ guid: p.guid, id_banco: idx + 100 }))
      );
      storage.clearSyncQueue();
      return {
        sucesso: true,
        processados: pendentes.length,
        mensagem: 'Lote consolidado no servidor PHP.',
      };
    }

    return {
      sucesso: false,
      processados: 0,
      mensagem: 'Servidor PHP indisponível. Dados mantidos em segurança no buffer offline.',
    };
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
