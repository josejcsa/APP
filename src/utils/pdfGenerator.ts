import jsPDF from 'jspdf';
import { TechnicalChecklist, Contact, CompanySettings } from '../types';
import { storage } from './storage';

export class SolarPdfGenerator {
  public static async generateReportPdf(
    checklist: TechnicalChecklist,
    client: Contact,
    technician: Contact,
    settings: CompanySettings = storage.getSettings()
  ): Promise<jsPDF> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
    const margin = 12;
    const contentWidth = pageWidth - margin * 2;

    const beforePhotos = (checklist.before?.photos || []).slice(0, 8);
    const afterPhotos = (checklist.after?.photos || []).slice(0, 8);
    
    let totalPages = 1;
    if (beforePhotos.length > 0) totalPages++;
    if (afterPhotos.length > 0) totalPages++;

    let currentPage = 1;

    // ==========================================
    // PAGE 1: EXACT MATCH WITH PREVIEW (PdfReportDocument)
    // ==========================================
    let y = margin;

    // --- HEADER BRANDING ---
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, y, contentWidth, 22, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(settings.tradingName || 'Elthera', margin + 6, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`${settings.companyName || 'Elthera Soluções em Energia Solar Ltda.'} • CNPJ: ${settings.cnpj || '38.942.108/0001-55'}`, margin + 6, y + 12.5);
    doc.text(`${settings.phone || '(47) 98765-4321'} • ${settings.email || 'contato@elthera.com.br'}`, margin + 6, y + 17);

    // Protocol Box (Right)
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(pageWidth - margin - 55, y + 1, 55, 19, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(217, 119, 6); // amber-600
    doc.text('RELATÓRIO TÉCNICO', pageWidth - margin - 52, y + 6.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(checklist.protocolNumber, pageWidth - margin - 52, y + 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Data: ${checklist.date.split('-').reverse().join('/')}`, pageWidth - margin - 52, y + 16.5);

    y += 25;

    // --- CLIENT & SYSTEM INFO (2 columns) ---
    const boxW = (contentWidth - 6) / 2;
    doc.setFillColor(248, 250, 252); // slate-50/70
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 25, 3, 3, 'FD');

    // Left: Client Data Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(' Dados do Cliente', margin + 5, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(client.name || 'Cliente', margin + 5, y + 10.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(client.document ? `CPF/CNPJ: ${client.document}` : '', margin + 5, y + 14.5);
    doc.text(`${client.phone || ''} • ${client.email || ''}`, margin + 5, y + 18.5);
    doc.text(`${client.address.street}, ${client.address.number} - ${client.address.neighborhood || ''}, ${client.address.city}/${client.address.state}`, margin + 5, y + 22.5);

    // Right: System Data Title
    const solar = client.solarSystem;
    const col2X = margin + boxW + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(' Sistema Fotovoltaico', col2X, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text(`Capacidade Instalada: ${solar?.powerKwp || 0} kWp`, col2X, y + 10.5);
    doc.text(`Total de Módulos: ${checklist.procedure.modulesCleanedCount || solar?.moduleCount || 0} painéis`, col2X, y + 14.5);
    doc.text(`Inversor: ${solar?.inverterBrandModel || 'Padrão'}`, col2X, y + 18.5);
    doc.text(`Técnico Responsável: ${technician.name || 'Técnico Credenciado'}`, col2X, y + 22.5);

    y += 28;

    // --- PERFORMANCE GAIN BANNER ---
    doc.setFillColor(15, 23, 42); // slate-900
    doc.roundedRect(margin, y, contentWidth, 20, 3, 3, 'FD');

    const gainPercent = checklist.after.calculatedGainPercent || 
      (checklist.before.readingKwBefore > 0
        ? ((checklist.after.readingKwAfter - checklist.before.readingKwBefore) / checklist.before.readingKwBefore) * 100
        : 0);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(251, 191, 36); // amber-400
    doc.text('RECUPERAÇÃO DE GERAÇÃO DE ENERGIA', margin + 6, y + 6);

    doc.setFont('helvetica', 'black');
    doc.setFontSize(13);
    doc.text(`+${gainPercent.toFixed(1)}%`, margin + 6, y + 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(226, 232, 240);
    doc.text(`${checklist.before.readingKwBefore.toFixed(2)} kW ➔ ${checklist.after.readingKwAfter.toFixed(2)} kW`, margin + 36, y + 15);

    const savings = checklist.after.estimatedMonthlySavingsBrl || Math.round(gainPercent * 7.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(203, 213, 225);
    doc.text('Economia Mensal Estimada:', pageWidth - margin - 6, y + 6, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(251, 191, 36);
    doc.text(`+ R$ ${savings.toFixed(2)} / mês`, pageWidth - margin - 6, y + 15, { align: 'right' });

    y += 23;

    // --- PRE & POST INSPECTION SUMMARY ---
    const halfW = (contentWidth - 6) / 2;

    // Before Box
    doc.setFillColor(254, 242, 242, 0.4); // rose-50/40
    doc.setDrawColor(254, 205, 211); // rose-200
    doc.roundedRect(margin, y, halfW, 20, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(76, 5, 25); // rose-950
    doc.text('VISTORIA PRÉ-SERVIÇO', margin + 5, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text(`• Nível de Sujeira: ${checklist.before.dirtLevel.toUpperCase()}`, margin + 5, y + 9.5);
    doc.text(`• Tipos: ${(checklist.before.dirtTypes || []).join(', ') || 'Poeira/Fuligem'}`, margin + 5, y + 13.5);
    doc.text(`• Condição Climática: ${checklist.before.weatherCondition} (${checklist.before.ambientTempC}°C)`, margin + 5, y + 17.5);

    // After Box
    doc.setFillColor(236, 253, 245, 0.4); // emerald-50/40
    doc.setDrawColor(187, 247, 208); // emerald-200
    doc.roundedRect(margin + halfW + 6, y, halfW, 20, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(2, 44, 34); // emerald-950
    doc.text('HIGIENIZAÇÃO PÓS-SERVIÇO', margin + halfW + 11, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text(`• Água Utilizada: ${checklist.procedure.waterSource} (Pura 0 PPM)`, margin + halfW + 11, y + 9.5);
    doc.text(`• Método: ${checklist.procedure.cleaningMethod.replace(/_/g, ' ')}`, margin + halfW + 11, y + 13.5);
    doc.text(`• Leitura Final: ${checklist.after.readingKwAfter.toFixed(2)} kW`, margin + halfW + 11, y + 17.5);

    y += 23;

    // --- CHECKLIST DE INTEGRIDADE & AVARIAS ---
    doc.setFillColor(254, 243, 199, 0.5); // amber-50/50
    doc.setDrawColor(253, 230, 138); // amber-200/60
    doc.roundedRect(margin, y, contentWidth, 18, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(120, 53, 15); // amber-950
    doc.text('Checklist de Integridade & Avarias Pré-Existentes', margin + 5, y + 5);

    const defs = (checklist.before.defects || {}) as any;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    const line1 = [
      `Vidro Trincado: ${defs.crackedGlass ? '❌ Sim' : '✅ OK'}`,
      `Hot Spot: ${defs.hotSpotsDetected ? '❌ Sim' : '✅ OK'}`,
      `Cabeamento: ${defs.looseWiring ? '❌ Solto' : '✅ OK'}`,
      `Conectores: ${defs.oxidizedConnectors ? '❌ Oxidados' : '✅ OK'}`
    ].join('   |   ');
    doc.text(line1, margin + 5, y + 10);

    if (defs.details) {
      doc.text(`Observações de Avarias: ${defs.details}`, margin + 5, y + 14.5);
    }

    y += 21;

    // --- PHOTOGRAPHIC PREVIEW (1 BEFORE & 1 AFTER CARD IN PAGE 1) ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('📸 Registro Fotográfico do Atendimento', margin, y);
    y += 3;

    const photoCardW = (contentWidth - 4) / 2;
    const photoCardH = 26;

    // Before photo preview box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, photoCardW, photoCardH, 2, 2, 'FD');
    doc.setFillColor(225, 29, 72); // rose-600
    doc.roundedRect(margin, y, photoCardW, 5, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text('ANTES DA LIMPEZA', margin + 3, y + 3.5);

    if (checklist.before.photos?.[0]?.dataUrl && checklist.before.photos[0].dataUrl.startsWith('data:image')) {
      try {
        doc.addImage(checklist.before.photos[0].dataUrl, 'JPEG', margin + 2, y + 6, 22, 18);
      } catch (e) {}
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(doc.splitTextToSize(checklist.before.photos?.[0]?.caption || 'Módulos com sujidade acumulada', photoCardW - 27), margin + 26, y + 9);

    // After photo preview box
    const afterBoxX = margin + photoCardW + 4;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(afterBoxX, y, photoCardW, photoCardH, 2, 2, 'FD');
    doc.setFillColor(5, 150, 105); // emerald-600
    doc.roundedRect(afterBoxX, y, photoCardW, 5, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text('DEPOIS DA LIMPEZA', afterBoxX + 3, y + 3.5);

    if (checklist.after.photos?.[0]?.dataUrl && checklist.after.photos[0].dataUrl.startsWith('data:image')) {
      try {
        doc.addImage(checklist.after.photos[0].dataUrl, 'JPEG', afterBoxX + 2, y + 6, 22, 18);
      } catch (e) {}
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(doc.splitTextToSize(checklist.after.photos?.[0]?.caption || 'Módulos 100% limpos e brilhantes', photoCardW - 27), afterBoxX + 26, y + 9);

    y += 29;

    // --- OBSERVATIONS & RECOMMENDATIONS ---
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text(`Observações Técnicas: ${checklist.after.technicianObservations || 'Serviço executado com excelência operacional e segurança.'}`, margin + 4, y + 5);
    doc.text(`Recomendações: ${checklist.after.recommendationsForClient || 'Manter limpeza periódica.'}`, margin + 4, y + 9.5);
    if (checklist.after.nextRecommendedCleaningDate) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 83, 9);
      doc.text(`📅 Próxima Limpeza Preventiva Sugerida: ${checklist.after.nextRecommendedCleaningDate.split('-').reverse().join('/')}`, margin + 4, y + 13.5);
    }

    y += 19;

    // --- SIGNATURES AREA ---
    const sigW = (contentWidth - 6) / 2;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);

    // Client Signature
    doc.roundedRect(margin, y, sigW, 24, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('ASSINATURA DO CLIENTE', margin + 4, y + 4.5);
    if (checklist.clientSignature?.dataUrl && checklist.clientSignature.dataUrl.startsWith('data:image')) {
      try {
        doc.addImage(checklist.clientSignature.dataUrl, 'PNG', margin + 8, y + 6, sigW - 16, 11);
      } catch (e) {}
    } else {
      doc.setFont('helvetica', 'italic');
      doc.text('[Assinado Digitalmente]', margin + 10, y + 13);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(checklist.clientSignature?.signedByName || client.name, margin + 4, y + 20);

    // Technician Signature
    const techSigX = margin + sigW + 6;
    doc.roundedRect(techSigX, y, sigW, 24, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('ASSINATURA DO TÉCNICO', techSigX + 4, y + 4.5);
    if (checklist.technicianSignature?.dataUrl && checklist.technicianSignature.dataUrl.startsWith('data:image')) {
      try {
        doc.addImage(checklist.technicianSignature.dataUrl, 'PNG', techSigX + 8, y + 6, sigW - 16, 11);
      } catch (e) {}
    } else {
      doc.setFont('helvetica', 'italic');
      doc.text('[Assinado Digitalmente]', techSigX + 10, y + 13);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(checklist.technicianSignature?.signedByName || technician.name, techSigX + 4, y + 20);

    // Page 1 footer
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6);
    doc.setTextColor(156, 163, 175);
    doc.text(`Protocolo ${checklist.protocolNumber} • Nuvem Elthera`, margin, 292);
    doc.text(`Página ${currentPage} / ${totalPages}`, pageWidth - margin - 15, 292);


    // ==========================================
    // PAGE 2: MOSAIC OF BEFORE PHOTOS (UP TO 8)
    // ==========================================
    if (beforePhotos.length > 0) {
      currentPage++;
      doc.addPage();
      y = margin;

      doc.setFillColor(254, 242, 242);
      doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(159, 18, 57);
      doc.text('📸 MOSAICO FOTOGRÁFICO: ANTES DA LIMPEZA', margin + 4, y + 8);

      y += 16;

      const cols = 2;
      const gridW = (contentWidth - 6) / cols;
      const gridH = 58;

      beforePhotos.forEach((photo, idx) => {
        const c = idx % cols;
        const r = Math.floor(idx / cols);
        const cellX = margin + c * (gridW + 6);
        const cellY = y + r * (gridH + 4);

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(cellX, cellY, gridW, gridH, 2, 2, 'FD');

        if (photo.dataUrl && photo.dataUrl.startsWith('data:image')) {
          try {
            doc.addImage(photo.dataUrl, 'JPEG', cellX + 3, cellY + 3, gridW - 6, 42);
          } catch (e) {}
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);
        doc.text(doc.splitTextToSize(photo.caption || `Foto Antes #${idx + 1}`, gridW - 6), cellX + 3, cellY + 49);
      });

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6);
      doc.setTextColor(156, 163, 175);
      doc.text(`Protocolo ${checklist.protocolNumber} • Registro Inicial`, margin, 292);
      doc.text(`Página ${currentPage} / ${totalPages}`, pageWidth - margin - 15, 292);
    }


    // ==========================================
    // PAGE 3: MOSAIC OF AFTER PHOTOS (UP TO 8)
    // ==========================================
    if (afterPhotos.length > 0) {
      currentPage++;
      doc.addPage();
      y = margin;

      doc.setFillColor(236, 253, 245);
      doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(6, 95, 70);
      doc.text('📸 MOSAICO FOTOGRÁFICO: DEPOIS DA LIMPEZA', margin + 4, y + 8);

      y += 16;

      const cols = 2;
      const gridW = (contentWidth - 6) / cols;
      const gridH = 58;

      afterPhotos.forEach((photo, idx) => {
        const c = idx % cols;
        const r = Math.floor(idx / cols);
        const cellX = margin + c * (gridW + 6);
        const cellY = y + r * (gridH + 4);

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(cellX, cellY, gridW, gridH, 2, 2, 'FD');

        if (photo.dataUrl && photo.dataUrl.startsWith('data:image')) {
          try {
            doc.addImage(photo.dataUrl, 'JPEG', cellX + 3, cellY + 3, gridW - 6, 42);
          } catch (e) {}
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);
        doc.text(doc.splitTextToSize(photo.caption || `Foto Depois #${idx + 1}`, gridW - 6), cellX + 3, cellY + 49);
      });

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6);
      doc.setTextColor(156, 163, 175);
      doc.text(`Protocolo ${checklist.protocolNumber} • Registro Pós-Serviço`, margin, 292);
      doc.text(`Página ${currentPage} / ${totalPages}`, pageWidth - margin - 15, 292);
    }

    return doc;
  }

  public static async downloadPdf(
    checklist: TechnicalChecklist,
    client: Contact,
    technician: Contact,
    settings: CompanySettings = storage.getSettings()
  ): Promise<void> {
    const doc = await this.generateReportPdf(checklist, client, technician, settings);
    const fileName = `Relatorio_Solar_${checklist.protocolNumber}_${client.name.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
  }

  public static async getPdfBlobUrl(
    checklist: TechnicalChecklist,
    client: Contact,
    technician: Contact,
    settings: CompanySettings = storage.getSettings()
  ): Promise<string> {
    const doc = await this.generateReportPdf(checklist, client, technician, settings);
    return doc.output('bloburl').toString();
  }
}
