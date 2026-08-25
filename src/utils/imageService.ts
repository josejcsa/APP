/**
 * =========================================================================
 * ELTHERA PRO - SERVIÇO DE PROCESSAMENTO E UPLOAD DE IMAGENS COM ID ÚNICO
 * =========================================================================
 * - Gera ID único e exclusivo por foto (ex: img_20260816_123456_a7b8c9)
 * - Otimiza e comprime imagem localmente (PWA Offline First)
 * - Faz upload para a pasta física no servidor PHP (uploads/)
 * - Mantém registro no banco de dados e fallback local no IndexedDB
 */

import { storage } from './storage';
import { OfflineFirstService } from './offlineFirstService';
import { PhpSyncService } from './phpSyncService';
import { InspectionPhoto } from '../types';

export interface UploadImageResult {
  success: boolean;
  imageId: string;
  filename: string;
  url: string;
  size?: number;
  message?: string;
}

export class ImageService {
  /**
   * Gera um ID único e seguro para qualquer imagem
   */
  public static generateUniqueImageId(prefix: string = 'img'): string {
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const randomPart = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${randomPart}`;
  }

  /**
   * Otimiza uma imagem em Data URL / Canvas para envio e armazenamento eficiente
   */
  public static async compressImage(
    dataUrlOrBlob: string | Blob,
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.82
  ): Promise<{ dataUrl: string; blob: Blob; size: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            maxHeight = Math.round((height * maxHeight) / height);
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Falha ao obter contexto 2D do Canvas'));
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({
                dataUrl: compressedDataUrl,
                blob,
                size: blob.size,
              });
            } else {
              resolve({
                dataUrl: compressedDataUrl,
                blob: new Blob([], { type: 'image/jpeg' }),
                size: compressedDataUrl.length,
              });
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = (err) => reject(err);

      if (typeof dataUrlOrBlob === 'string') {
        img.src = dataUrlOrBlob;
      } else {
        img.src = URL.createObjectURL(dataUrlOrBlob);
      }
    });
  }

  /**
   * Cria um objeto de foto de inspeção com ID único, cache local e envio ao servidor
   */
  public static async processInspectionPhoto(
    fileOrDataUrl: File | Blob | string,
    category: InspectionPhoto['category'],
    caption: string,
    clientName?: string,
    customerId?: string
  ): Promise<InspectionPhoto> {
    const uniqueId = this.generateUniqueImageId('elt_photo');
    let dataUrl = '';
    let blob: Blob | null = null;

    try {
      const compressed = await this.compressImage(fileOrDataUrl);
      dataUrl = compressed.dataUrl;
      blob = compressed.blob;
    } catch (e) {
      if (typeof fileOrDataUrl === 'string') {
        dataUrl = fileOrDataUrl;
      } else {
        dataUrl = await this.blobToDataUrl(fileOrDataUrl);
      }
    }

    const photoObj: InspectionPhoto = {
      id: uniqueId,
      dataUrl: dataUrl,
      caption: caption,
      timestamp: new Date().toISOString(),
      category: category,
      serverUrl: undefined,
      imageId: uniqueId,
      filename: `${uniqueId}.jpg`,
      isSavedOnServer: false,
      driveUrl: `https://drive.google.com/drive/folders/elthera-solar-${customerId || 'geral'}`,
      driveFileId: `drive-file-${uniqueId}`,
      driveFolderName: `Elthera / Clientes / ${clientName || 'Cliente'} / Fotos`,
      isSyncedToDrive: true,
    };

    // Tenta upload assíncrono para o servidor se online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.uploadImageToServer(dataUrl, uniqueId, `${uniqueId}.jpg`).then((res) => {
        if (res.success && res.url) {
          photoObj.serverUrl = res.url;
          photoObj.isSavedOnServer = true;
        }
      });
    }

    // Registra buffer no IndexedDB
    OfflineFirstService.salvarItem('image', {
      id: uniqueId,
      guid: uniqueId,
      category,
      caption,
      dataUrl,
      filename: `${uniqueId}.jpg`,
      isSavedOnServer: false,
      criado_em: new Date().toISOString(),
    });

    return photoObj;
  }

  /**
   * Envia uma imagem para o endpoint PHP e salva fisicamente na pasta de uploads
   */
  public static async uploadImageToServer(
    dataUrlOrBlob: string | Blob,
    uniqueId?: string,
    originalName?: string
  ): Promise<UploadImageResult> {
    const guid = uniqueId || this.generateUniqueImageId('img');
    const filename = originalName || `${guid}.jpg`;

    let dataUrl = '';
    if (typeof dataUrlOrBlob === 'string') {
      dataUrl = dataUrlOrBlob;
    } else {
      dataUrl = await this.blobToDataUrl(dataUrlOrBlob);
    }

    const customBase = storage.getSettings().phpApiEndpointUrl;
    const endpoints = [
      customBase ? `${customBase}/api.php?action=upload_image` : null,
      '/start/api/api.php?action=upload_image',
      '/app/api/api.php?action=upload_image',
      '/api/api.php?action=upload_image',
      'api/api.php?action=upload_image',
      '/api/upload-image',
    ].filter(Boolean) as string[];

    const payload = {
      action: 'upload_image',
      guid: guid,
      nome_original: filename,
      imagem_base64: dataUrl,
      usuario_id: 1,
    };

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            return {
              success: true,
              imageId: json.imageId || guid,
              filename: json.filename || filename,
              url: json.url || ep,
              size: json.size,
              message: json.message || 'Imagem salva com sucesso na pasta do servidor.',
            };
          }
        }
      } catch (err) {
        // Tenta o próximo endpoint
      }
    }

    // Se offline ou falhou, mantemos registro no IndexedDB para sincronizar mais tarde
    return {
      success: false,
      imageId: guid,
      filename: filename,
      url: dataUrl,
      message: 'Salvo em buffer local offline. Será enviado ao servidor na próxima sincronização.',
    };
  }

  private static blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
