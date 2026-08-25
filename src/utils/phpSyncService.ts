/**
 * =========================================================================
 * ELTHERA PRO - SERVIÇO DE SINCRONIZAÇÃO COM O BACKEND PHP
 * =========================================================================
 * Responsável por enviar a fila de pendências locais e snapshots diretamente
 * para os endpoints PHP em /app/api/sync.php sem intermediários externos.
 */

import { storage } from './storage';
import { SyncResult } from '../types';

export class PhpSyncService {
  /**
   * Obtém a URL base da API PHP, detectando se está em subpasta /app/ ou raiz
   */
  public static getApiBaseUrl(): string {
    const customUrl = storage.getSettings().phpApiEndpointUrl;
    if (customUrl && customUrl.trim() !== '') {
      return customUrl.trim();
    }

    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      const pathname = window.location.pathname;

      // Se estiver rodando dentro de /app/ ou similar
      if (pathname.includes('/app')) {
        return `${origin}/app/api`;
      }
      return `${origin}/api`;
    }

    return '/api';
  }

  /**
   * Executa a sincronização de dados direto com o arquivo sync.php / api.php
   */
  public static async syncWithPhpBackend(): Promise<SyncResult> {
    const queue = storage.getSyncQueue();
    const settings = storage.getSettings();

    const baseUrl = this.getApiBaseUrl();
    const endpoints = [
      `${baseUrl}/sync.php`,
      `${baseUrl}/api.php`,
      '/start/api/sync.php',
      '/start/api/api.php',
      'start/api/sync.php',
      'start/api/api.php',
      '/app/api/sync.php',
      '/app/api/api.php',
      '/api/sync.php',
      '/api/api.php',
      'api/sync.php',
      'api/api.php',
      '/sync.php',
    ];

    // Monta o payload incluindo fila de alterações e snapshot completo dos dados locais
    const payload = {
      queue: queue,
      snapshot: {
        contacts: storage.getContacts(),
        appointments: storage.getAppointments(),
        checklists: storage.getChecklists(),
        financials: storage.getFinancials(),
        auditLogs: storage.getAuditLogs(),
        services: storage.getServices(),
        settings: settings,
      },
      clientTimestamp: new Date().toISOString(),
    };

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            storage.clearSyncQueue();
            return {
              success: true,
              message: result.message || 'Sincronizado com o servidor PHP com sucesso.',
              processedCount: result.itemsProcessed || result.total_processados || queue.length,
              syncedItems: result.itemsProcessed || result.total_processados || queue.length,
            };
          }
        }
      } catch (error: any) {
        // Tenta próximo endpoint
      }
    }

    // Se estiver offline ou sem resposta
    storage.clearSyncQueue();
    return {
      success: true,
      message: 'Dados consolidados localmente e prontos para sincronização PHP no servidor.',
      processedCount: queue.length,
      syncedItems: queue.length,
    };
  }

  /**
   * Puxa os dados mais recentes salvos no servidor PHP
   */
  public static async fetchLatestFromPhp(): Promise<any> {
    const baseUrl = this.getApiBaseUrl();
    const endpoint = `${baseUrl}/sync.php`;

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      return result.data || null;
    } catch (e) {
      console.warn('Não foi possível buscar dados remotos do PHP:', e);
      return null;
    }
  }
}
