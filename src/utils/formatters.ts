/**
 * Utilitários centralizados de formatação para moeda (BRL), números e medidas no padrão brasileiro.
 * Formato padrão: 1.234,56 (ponto para milhar, vírgula para decimais)
 */

/**
 * Formata um valor numérico para o padrão de moeda brasileiro com prefixo "R$ ".
 * Exemplo: 1250.5 -> "R$ 1.250,50"
 */
export const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Formata um valor numérico para o padrão monetário brasileiro sem o prefixo "R$".
 * Exemplo: 1250.5 -> "1.250,50"
 */
export const formatNumberBRL = (value: number | undefined | null, decimals: number = 2): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return (0).toFixed(decimals).replace('.', ',');
  }
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * Formata potência em kW com vírgula decimal.
 * Exemplo: 4.85 -> "4,85"
 */
export const formatPowerKw = (value: number | undefined | null): string => {
  return formatNumberBRL(value, 2);
};

/**
 * Formata percentual com 1 casa decimal.
 * Exemplo: 28.5 -> "+28,5%"
 */
export const formatPercentGain = (value: number | undefined | null): string => {
  const num = value || 0;
  return `+${formatNumberBRL(num, 1)}%`;
};

/**
 * Converte uma string de moeda ou número digitado em português (BRL) para number.
 * Aceita formatos como: "1.250,00", "1250,00", "1250.00", "1250", "R$ 1.250,00".
 */
export const parseCurrencyBRL = (input: string | number | undefined | null): number => {
  if (input === undefined || input === null) return 0;
  if (typeof input === 'number') return isNaN(input) ? 0 : input;

  const clean = input
    .replace(/R\$/g, '')
    .replace(/\s/g, '')
    .trim();

  if (!clean) return 0;

  if (clean.includes(',')) {
    const normalized = clean.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
  }

  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};
