/**
 * Utilitário para geração e validação de Payload Pix no padrão BR Code / EMVCo
 * do Banco Central do Brasil (BACEN), em estrita conformidade com o:
 * "Manual do BR Code: QR Codes para iniciação de pagamentos no SPB" (BACEN, a partir da Página 11).
 *
 * Referência: https://www.bcb.gov.br/content/estabilidadefinanceira/ativosdosite/Manual%20do%20BR%20Code.pdf
 * 
 * Especificações adotadas (Tabela 1 e Seção 2.1/2.2):
 * - ID 00: Payload Format Indicator = "01" (Mandatório, valor fixo "000201")
 * - ID 01: Point of Initiation Method = "11" (estático) ou omitido (Opcional)
 * - ID 26: Merchant Account Information - PIX (Mandatório)
 *   - Subcampo 00: GUI = "br.gov.bcb.pix" (Mandatório, fixo 14 chars)
 *   - Subcampo 01: Chave Pix (Mandatório para QR estático, até 77 chars, sem espaços)
 *   - Subcampo 02: Info adicional / Descrição da transação (Opcional, até 25 chars, sem espaços)
 * - ID 52: Merchant Category Code = "0000" (Mandatório, 4 dígitos)
 * - ID 53: Transaction Currency = "986" (Mandatório, ISO 4217 para Real brasileiro BRL, 3 dígitos)
 * - ID 54: Transaction Amount = Valor com ponto decimal e 2 casas (ex: 20000.00, sem espaços)
 * - ID 58: Country Code = "BR" (Mandatório, fixo "5802BR")
 * - ID 59: Merchant Name = Nome do recebedor (Mandatório pelo EMVCo; preenchido com "N" para não expor nome e evitar espaços)
 * - ID 60: Merchant City = Cidade do recebedor (Mandatório pelo EMVCo; preenchido com "C" para evitar espaços)
 * - ID 62: Additional Data Field Template
 *   - Subcampo 05: Reference Label / TxID (Alfanumérico estrito [0-9A-Za-z], até 25 chars; se ausente, valor BACEN "***")
 * - ID 63: CRC16 (Mandatório, polinômio 0x1021, valor inicial 0xFFFF, 4 dígitos hexadecimais maiúsculos)
 */

export type PixKeyType = 'cpf' | 'cnpj' | 'telefone' | 'email' | 'chavealeatorio';

export interface PixPayloadParams {
  /** Chave PIX (CPF, CNPJ, telefone com DDI/DDD, e-mail ou chave aleatória EVP) */
  key: string;
  /** Tipo da chave Pix (detectado automaticamente se não informado) */
  keyType?: PixKeyType;
  /** Valor da despesa/transação em reais (opcional, se > 0 gera tag 54) */
  amount?: number;
  /** Nome do beneficiário (por padrão não enviado, utiliza "N" para cumprir EMVCo sem expor dados e sem espaços) */
  beneficiaryName?: string;
  /** Cidade do beneficiário (por padrão "C" para cumprir EMVCo sem espaços) */
  beneficiaryCity?: string;
  /** Categoria da conta / descrição da despesa (usada no TxID alfanumérico sem espaços) */
  categoryDescription?: string;
  /** Identificador da transação (TxID alfanumérico até 25 chars; padrão BACEN '***' se omitido) */
  txid?: string;
  /** Se verdadeiro, também inclui o subcampo 02 na tag 26 com a descrição (até 25 caracteres) */
  includeDescriptionInTag26?: boolean;
}

/**
 * Remove acentos, caracteres especiais e todos os espaços em branco,
 * garantindo conformidade com formato URL e regras alfanuméricas do BACEN.
 */
export function sanitizeAsciiNoSpaces(text: string, maxLength = 25): string {
  if (!text) return '';
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '') // aceita estritamente alfanumérico [a-zA-Z0-9]
    .replace(/\s+/g, '');
  return normalized.slice(0, maxLength);
}

/**
 * Formata um campo TLV (Tag-Length-Value) do padrão EMVCo:
 * ID (2 dígitos) + Tamanho do valor (2 dígitos) + Valor limpo sem espaços
 */
export function formatTLV(id: string, value: string): string {
  const cleanVal = value.replace(/\s+/g, '');
  const lenStr = cleanVal.length.toString().padStart(2, '0');
  return `${id}${lenStr}${cleanVal}`;
}

/**
 * Calcula o CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF, sem reflexão)
 * conforme especificado no Manual do BR Code do Banco Central (Página 11 / ISO/IEC 13239).
 */
export function calculatePixCRC16(payload: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Detecta automaticamente o tipo da chave PIX a partir do formato dos dados.
 */
export function detectPixKeyType(rawKey: string): PixKeyType {
  const trimmed = rawKey.replace(/\s+/g, '');
  if (!trimmed) return 'chavealeatorio';

  // E-mail (contém @ e .)
  if (trimmed.includes('@') && trimmed.includes('.')) {
    return 'email';
  }

  // Chave Aleatória (UUID padrão v4: 8-4-4-4-12 caracteres hexadecimais)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(trimmed)) {
    return 'chavealeatorio';
  }

  // Apenas dígitos numéricos
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 11) {
    if (trimmed.startsWith('+55') || trimmed.includes('(') || trimmed.includes(')')) {
      return 'telefone';
    }
    return 'cpf';
  }

  if (digits.length === 14) {
    return 'cnpj';
  }

  if (digits.length >= 10 && (digits.length === 12 || digits.length === 13 || trimmed.startsWith('+'))) {
    return 'telefone';
  }

  return 'chavealeatorio';
}

/**
 * Normaliza a chave Pix de acordo com as regras do BACEN:
 * - CPF: 11 dígitos numéricos
 * - CNPJ: 14 dígitos numéricos
 * - Telefone: padrão internacional E.164 (+55 + DDD + número)
 * - E-mail: minúsculo, até 77 chars
 * - Chave aleatória: UUID sem espaços
 */
export function formatPixKey(rawKey: string, type: PixKeyType): string {
  const trimmed = rawKey.replace(/\s+/g, '');
  switch (type) {
    case 'cpf':
    case 'cnpj':
      return trimmed.replace(/\D/g, '');
    case 'telefone': {
      const digits = trimmed.replace(/\D/g, '');
      if (digits.startsWith('55')) {
        return `+${digits}`;
      }
      return `+55${digits}`;
    }
    case 'email':
      return trimmed.toLowerCase().slice(0, 77);
    case 'chavealeatorio':
    default:
      return trimmed.slice(0, 77);
  }
}

/**
 * Sanitiza a categoria para inclusão no TxID/identificador do PIX
 * em estrita conformidade com caracteres alfanuméricos [0-9a-zA-Z] e sem espaços.
 */
export function sanitizeCategoryForPix(category: string): string {
  const map: Record<string, string> = {
    combustivel_rota: 'CombustivelRota',
    comissao_tecnico: 'ComissaoTecnico',
    insumo_estoque: 'InsumoEstoque',
    alimentacao: 'AlimentacaoRota',
    ferramenta_epi: 'FerramentaEPI',
    manutencao: 'Manutencao',
    imposto: 'ImpostoTaxa',
    outro: 'Outro',
  };

  if (map[category]) {
    return map[category];
  }

  const cleaned = sanitizeAsciiNoSpaces(category, 25);
  return cleaned || 'Despesa';
}

/**
 * Gera a string completa de payload do PIX (Pix Copia e Cola / BR Code)
 * segundo as instruções do Banco Central do Brasil a partir da página 11 do Manual do BR Code:
 *
 * 1. Não envia o nome pessoal (usa o identificador mínimo EMVCo 'N' para cumprir a obrigatoriedade da tag 59)
 * 2. Remove absolutamente todos os espaços em branco (formato URL/EMVCo estrito)
 * 3. Cidade padrão "C" (tag 60)
 * 4. Valor formatado com ponto decimal e duas casas (tag 54)
 * 5. TxID alfanumérico seguro até 25 caracteres (tag 62/05)
 * 6. CRC16 calculado no final (tag 63/04)
 */
export function generatePixPayload(params: PixPayloadParams): string {
  const {
    key,
    keyType = detectPixKeyType(key),
    amount = 0,
    categoryDescription = 'Despesa',
    txid,
    includeDescriptionInTag26 = false,
  } = params;

  const formattedKey = formatPixKey(key, keyType).replace(/\s+/g, '');
  if (!formattedKey) return '';

  // 00 - Payload Format Indicator (Fixo: "01", tamanho 02 -> "000201")
  let payload = formatTLV('00', '01');

  // 26 - Merchant Account Information - PIX (Página 11 do Manual do BR Code)
  // Subcampo 00: GUI "br.gov.bcb.pix" (14 chars)
  // Subcampo 01: Chave Pix
  // Subcampo 02: Descrição opcional (até 25 chars)
  const gui = formatTLV('00', 'br.gov.bcb.pix');
  const keyTLV = formatTLV('01', formattedKey);
  let merchantAccountInfo = `${gui}${keyTLV}`;

  if (includeDescriptionInTag26 && categoryDescription) {
    const cleanDesc = sanitizeAsciiNoSpaces(categoryDescription, 25);
    if (cleanDesc) {
      merchantAccountInfo += formatTLV('02', cleanDesc);
    }
  }

  payload += formatTLV('26', merchantAccountInfo);

  // 52 - Merchant Category Code (Fixo: "0000")
  payload += formatTLV('52', '0000');

  // 53 - Transaction Currency (Fixo: "986" - Real brasileiro BRL conforme ISO 4217)
  payload += formatTLV('53', '986');

  // 54 - Transaction Amount (Valor formatado com 2 casas decimais e separador ponto, ex: 20000.00)
  if (amount > 0) {
    const formattedAmount = amount.toFixed(2);
    payload += formatTLV('54', formattedAmount);
  }

  // 58 - Country Code (Fixo: "BR")
  payload += formatTLV('58', 'BR');

  // 59 - Merchant Name: Conforme solicitação do usuário, não envia o nome e não possui espaços.
  // Utiliza "N" (1 caractere) para satisfazer a obrigatoriedade da especificação EMVCo (ID 59) sem expor dados pessoais.
  payload += formatTLV('59', 'N');

  // 60 - Merchant City: Fixo "C" (1 caractere sem espaços) para satisfazer o campo obrigatório da norma EMVCo.
  payload += formatTLV('60', 'C');

  // 62 - Additional Data Field Template (Página 11 do Manual do BR Code):
  // Subcampo 05: Reference Label / TxID.
  // Conforme o BACEN: "Para o Pix estático, caso o recebedor não queira definir um identificador para a transação,
  // deve-se utilizar o valor '***'". Aqui utilizamos a categoria sanitizada (ou TxID informado) ou '***'.
  const rawTxid = txid || sanitizeCategoryForPix(categoryDescription);
  const cleanTxid = sanitizeAsciiNoSpaces(rawTxid, 25) || '***';
  const txidTLV = formatTLV('05', cleanTxid);
  payload += formatTLV('62', txidTLV);

  // 63 - CRC16 (Tag "63" + length "04" + 4 caracteres hexadecimais em maiúsculas)
  const payloadBeforeCRC = `${payload}6304`;
  const crc = calculatePixCRC16(payloadBeforeCRC);

  // Garante a ausência total de espaços em branco (formato URL/EMVCo estrito)
  return `${payloadBeforeCRC}${crc}`.replace(/\s+/g, '');
}

/**
 * Valida se um payload PIX gerado cumpre a estrutura formal do Manual do BR Code.
 */
export function validatePixPayload(payload: string): { isValid: boolean; error?: string } {
  if (!payload) return { isValid: false, error: 'Payload vazio' };
  if (/\s/.test(payload)) return { isValid: false, error: 'Payload contém espaços em branco proibidos' };
  if (!payload.startsWith('000201')) return { isValid: false, error: 'Não inicia com 000201' };
  if (!payload.includes('br.gov.bcb.pix')) return { isValid: false, error: 'Não contém GUI br.gov.bcb.pix' };
  if (!payload.includes('6304')) return { isValid: false, error: 'Não contém tag CRC16 6304' };

  const crcIndex = payload.lastIndexOf('6304');
  const payloadBeforeCRC = payload.slice(0, crcIndex + 4);
  const expectedCRC = payload.slice(crcIndex + 4);
  const calculatedCRC = calculatePixCRC16(payloadBeforeCRC);

  if (expectedCRC.toUpperCase() !== calculatedCRC.toUpperCase()) {
    return { isValid: false, error: `CRC inválido: esperado ${expectedCRC}, calculado ${calculatedCRC}` };
  }

  return { isValid: true };
}
