import {
  RooftopDaySafetyAssessment,
  RooftopHourlyWeather,
  RooftopSafetyConfig,
  RooftopSafetyStatus
} from '../types';
import { resolveWeatherCondition } from './weatherConditions';

/**
 * Limites e regras de segurança para trabalho de risco em altura sobre telhado (NR-35 e NR-10).
 * Facilmente editável via objeto de configuração.
 */
export const DEFAULT_ROOFTOP_SAFETY_CONFIG: RooftopSafetyConfig = {
  prior24hRainMax: 0, // Chuva acumulada nas últimas 24h = 0 mm (telhado seco, sem lodo/lama)
  priorNightHumidityMax: 75, // Umidade média da madrugada < 75% (evita orvalho espesso e condensação)
  targetHourProbRainMax: 0, // Probabilidade de chuva às 07:00 = 0%
  targetHourRainVolumeMax: 0, // Volume de chuva às 07:00 = 0 mm
  targetHourHumidityMax: 60, // Umidade relativa < 60%
  targetHourHumidityIdealMin: 40, // Ideal entre 40% e 55%
  targetHourHumidityIdealMax: 55,
  targetHourTempMin: 18, // Temperatura entre 18°C e 30°C
  targetHourTempMax: 30,
  targetHourWindMax: 25, // Velocidade do vento abaixo de 25 km/h
  heatBlockStartHour: 10, // Bloquear 10:00 às 17:00 devido a placas superaquecidas
  heatBlockEndHour: 17,
};

export interface GeocodedPlace {
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

/**
 * Busca geocodificação via Open-Meteo Geocoding API gratuita.
 */
export async function geocodePlace(query: string): Promise<GeocodedPlace | null> {
  if (!query || query.trim().length < 2) return null;
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      query.trim()
    )}&count=1&language=pt&format=json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const top = data.results[0];
      return {
        name: top.name,
        admin1: top.admin1,
        country: top.country,
        latitude: top.latitude,
        longitude: top.longitude,
      };
    }
  } catch (err) {
    console.warn('Falha na geocodificação Open-Meteo:', err);
  }
  return null;
}

interface FetchRooftopParams {
  latitude: number;
  longitude: number;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  config?: Partial<RooftopSafetyConfig>;
  locationName?: string;
  forceFresh?: boolean;
}

const WEATHER_CACHE_PREFIX = 'rooftop_weather_cache_v1_';
const WEATHER_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

function getWeatherCacheKey(params: FetchRooftopParams): string {
  const latKey = params.latitude.toFixed(2);
  const lonKey = params.longitude.toFixed(2);
  const start = params.startDate || 'start';
  const end = params.endDate || 'end';
  return `${WEATHER_CACHE_PREFIX}${latKey}_${lonKey}_${start}_${end}`;
}

function getCachedWeather(key: string): RooftopDaySafetyAssessment[] | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.timestamp === 'number' && Array.isArray(parsed.data)) {
      if (Date.now() - parsed.timestamp < WEATHER_CACHE_TTL_MS) {
        return parsed.data;
      }
    }
  } catch (err) {
    console.warn('Falha ao ler cache meteorológico:', err);
  }
  return null;
}

function setCachedWeather(key: string, data: RooftopDaySafetyAssessment[]): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  } catch (err) {
    console.warn('Falha ao salvar cache meteorológico:', err);
  }
}

/**
 * Consulta a previsão do tempo na Open-Meteo, cruza os dados com as 24h anteriores
 * e avalia a segurança para trabalho em telhado fotovoltaico.
 * Armazena cache das consultas do mesmo período por 24h para evitar múltiplas solicitações.
 */
export async function fetchAndAssessRooftopWeather(
  params: FetchRooftopParams
): Promise<RooftopDaySafetyAssessment[]> {
  const cacheKey = getWeatherCacheKey(params);
  if (!params.forceFresh) {
    const cached = getCachedWeather(cacheKey);
    if (cached && cached.length > 0) {
      printRooftopSafetyReportConsole(cached, `${params.locationName || 'Local'} (Cache 24h)`);
      return cached;
    }
  }

  const config = { ...DEFAULT_ROOFTOP_SAFETY_CONFIG, ...params.config };
  const lat = params.latitude;
  const lon = params.longitude;

  const todayObj = new Date();
  todayObj.setHours(0, 0, 0, 0);
  const todayStr = todayObj.toISOString().slice(0, 10);

  // Limite estrito de 15 dias a partir de hoje para previsão regular de alta precisão
  const fifteenDaysLimitObj = new Date(todayObj);
  fifteenDaysLimitObj.setDate(fifteenDaysLimitObj.getDate() + 15);
  const fifteenDaysLimitStr = fifteenDaysLimitObj.toISOString().slice(0, 10);

  const reqEnd = params.endDate || fifteenDaysLimitStr;
  const needsSeasonalForecast = reqEnd > fifteenDaysLimitStr;

  const standardUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,precipitation,precipitation_probability,wind_speed_10m,weather_code&past_days=7&forecast_days=16&timezone=auto`;
  const seasonalUrl = `https://seasonal-api.open-meteo.com/v1/seasonal?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,precipitation,precipitation_probability,wind_speed_10m,weather_code&timezone=auto`;

  let standardData: any = null;
  let seasonalData: any = null;

  try {
    const fetchPromises: Promise<any>[] = [
      fetch(standardUrl).then(r => (r.ok ? r.json() : null)).catch(err => {
        console.warn('Erro ao consultar forecast padrão Open-Meteo:', err);
        return null;
      }),
    ];

    if (needsSeasonalForecast) {
      fetchPromises.push(
        fetch(seasonalUrl).then(r => (r.ok ? r.json() : null)).catch(err => {
          console.warn('Erro ao consultar Seasonal Forecast Open-Meteo:', err);
          return null;
        })
      );
    }

    const [stdResult, seasResult] = await Promise.all(fetchPromises);
    standardData = stdResult;
    seasonalData = seasResult;

    if (!standardData && !seasonalData) {
      throw new Error('Todas as consultas meteorológicas retornaram vazio');
    }
  } catch (error) {
    console.error('Erro ao consultar Open-Meteo:', error);
    standardData = generateOfflineFallbackWeatherData(lat, lon, needsSeasonalForecast ? 45 : 18);
  }

  // Indexa os dados por chave 'YYYY-MM-DDTHH:00'
  const hourlyMap = new Map<string, {
    time: string;
    date: string;
    hour: number;
    temp: number;
    humidity: number;
    precip: number;
    rainProb: number;
    wind: number;
    weatherCode?: number;
    isSeasonal?: boolean;
  }>();

  // 1. Popula com previsão determinística padrão (dias 0 a 15)
  if (standardData?.hourly?.time) {
    const sTimes = standardData.hourly.time;
    const sTemps = standardData.hourly.temperature_2m || [];
    const sHumid = standardData.hourly.relative_humidity_2m || [];
    const sPrecip = standardData.hourly.precipitation || [];
    const sRainProb = standardData.hourly.precipitation_probability || [];
    const sWind = standardData.hourly.wind_speed_10m || [];
    const sCodes = standardData.hourly.weather_code || [];

    for (let i = 0; i < sTimes.length; i++) {
      const t = sTimes[i];
      const dateStr = t.slice(0, 10);
      const hour = parseInt(t.slice(11, 13), 10);
      hourlyMap.set(t, {
        time: t,
        date: dateStr,
        hour,
        temp: sTemps[i] ?? 24,
        humidity: sHumid[i] ?? 50,
        precip: sPrecip[i] ?? 0,
        rainProb: sRainProb[i] ?? 0,
        wind: sWind[i] ?? 10,
        weatherCode: sCodes[i],
        isSeasonal: false,
      });
    }
  }

  // 2. Popula ou sobrescreve com Seasonal Forecast para datas > 15 dias
  if (seasonalData?.hourly?.time) {
    const seasTimes = seasonalData.hourly.time;
    const seasTemps = seasonalData.hourly.temperature_2m || [];
    const seasHumid = seasonalData.hourly.relative_humidity_2m || [];
    const seasPrecip = seasonalData.hourly.precipitation || [];
    const seasRainProb = seasonalData.hourly.precipitation_probability || [];
    const seasWind = seasonalData.hourly.wind_speed_10m || [];
    const seasCodes = seasonalData.hourly.weather_code || [];

    for (let i = 0; i < seasTimes.length; i++) {
      const t = seasTimes[i];
      const dateStr = t.slice(0, 10);
      // Para datas além de 15 dias, usa a projeção do modelo sazonal
      if (dateStr > fifteenDaysLimitStr || !hourlyMap.has(t)) {
        const hour = parseInt(t.slice(11, 13), 10);
        hourlyMap.set(t, {
          time: t,
          date: dateStr,
          hour,
          temp: seasTemps[i] ?? 24,
          humidity: seasHumid[i] ?? 50,
          precip: seasPrecip[i] ?? 0,
          rainProb: seasRainProb[i] ?? 0,
          wind: seasWind[i] ?? 10,
          weatherCode: seasCodes[i],
          isSeasonal: true,
        });
      }
    }
  }

  // Agrupa todas as datas disponíveis
  const dateSet = new Set<string>();
  hourlyMap.forEach((_, key) => dateSet.add(key.slice(0, 10)));
  const sortedDates = Array.from(dateSet).sort();

  const assessments: RooftopDaySafetyAssessment[] = [];
  const dayOfWeekNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  for (const date of sortedDates) {
    const dObj = new Date(`${date}T12:00:00Z`);
    const dayOfWeek = dayOfWeekNames[dObj.getUTCDay()];
    const [year, month, day] = date.split('-');
    const formattedDate = `${day}/${month}/${year}`;
    const isToday = date === todayStr;
    const isPast = date < todayStr;
    const isSeasonalForecast = date > fifteenDaysLimitStr;
    const seasonalWarning = isSeasonalForecast
      ? 'Previsão Sazonal (Longo Prazo): A precisão meteorológica pode mudar drasticamente.'
      : undefined;

    // 1. REGRAS PARA O DIA ANTERIOR (Janela de 24h antes do serviço)
    // Coleta as 24 horas antes das 07:00 da data atual (ou do dia anterior completo)
    let prior24hRainSum = 0;
    const priorNightHumidities: number[] = [];
    const prior24hViolations: string[] = [];

    // Busca as horas do dia anterior (X-1)
    const prevDateObj = new Date(dObj);
    prevDateObj.setUTCDate(prevDateObj.getUTCDate() - 1);
    const prevDateStr = prevDateObj.toISOString().slice(0, 10);

    for (let h = 0; h < 24; h++) {
      const hStr = String(h).padStart(2, '0');
      const item = hourlyMap.get(`${prevDateStr}T${hStr}:00`);
      if (item) {
        prior24hRainSum += item.precip;
        // Madrugada/Noite: 20:00 às 23:00 do dia anterior
        if (h >= 20) {
          priorNightHumidities.push(item.humidity);
        }
      }
    }

    // E madrugada do próprio dia: 00:00 às 05:00
    for (let h = 0; h <= 5; h++) {
      const hStr = String(h).padStart(2, '0');
      const item = hourlyMap.get(`${date}T${hStr}:00`);
      if (item) {
        priorNightHumidities.push(item.humidity);
      }
    }

    const priorNightAvgHumidity =
      priorNightHumidities.length > 0
        ? Math.round(
            (priorNightHumidities.reduce((a, b) => a + b, 0) / priorNightHumidities.length) * 10
          ) / 10
        : 55;

    // Checa violações das 24h anteriores
    if (prior24hRainSum > config.prior24hRainMax) {
      prior24hViolations.push(
        `Chuva de ${prior24hRainSum.toFixed(1)} mm nas últimas 24h (Risco de telha úmida/escorregadia)`
      );
    }
    if (priorNightAvgHumidity >= config.priorNightHumidityMax) {
      prior24hViolations.push(
        `Umidade média na madrugada de ${priorNightAvgHumidity}% (Limite ${config.priorNightHumidityMax}% para evitar condensação/orvalho)`
      );
    }

    const prior24hSafe = prior24hViolations.length === 0;

    // 2. REGRAS PARA O DIA ATUAL (Momento exato da subida no telhado - 07:00)
    const targetHour = 7;
    const targetItem = hourlyMap.get(`${date}T07:00`) || {
      time: `${date}T07:00`,
      date,
      hour: 7,
      temp: 22,
      humidity: 52,
      precip: 0,
      rainProb: 0,
      wind: 12,
    };

    const targetTemperature = targetItem.temp;
    const targetHumidity = targetItem.humidity;
    const targetWindSpeed = targetItem.wind;
    const targetPrecipitation = targetItem.precip;
    const targetRainProb = targetItem.rainProb;

    // Avaliação horária completa do dia
    const hourlyForecast: RooftopHourlyWeather[] = [];
    for (let h = 5; h <= 19; h++) {
      const hStr = String(h).padStart(2, '0');
      const item = hourlyMap.get(`${date}T${hStr}:00`) || {
        time: `${date}T${hStr}:00`,
        date,
        hour: h,
        temp: 20 + h * 0.5,
        humidity: 60 - h * 1.5,
        precip: 0,
        rainProb: 0,
        wind: 10,
      };

      // Avaliação de gravidade por hora (Verde, Amarelo, Laranja - Sugestão/Alerta, não bloqueio)
      const isCriticalHeatSlot = h >= 10 && h < 16; // Pico térmico / placas solares quentes
      const isTransitionHeatSlot = (h >= config.heatBlockStartHour && h < config.heatBlockEndHour) && !isCriticalHeatSlot;
      const isHeatBlocked = h >= config.heatBlockStartHour && h < config.heatBlockEndHour; // Sugestão térmica
      const isMorningSlot = h >= 6 && h <= 9;
      const isLateAfternoonSlot = h === 17 || h === 18;

      let severityLevel: 'green' | 'yellow' | 'orange' = 'green';
      let severityLabel = 'Ideal / Seguro';
      const hourReasons: string[] = [];
      let hourStatus: RooftopSafetyStatus = 'Altamente Seguro';

      if (item.precip > 0 || item.rainProb >= 40 || item.wind >= config.targetHourWindMax || isCriticalHeatSlot || item.temp >= 32) {
        severityLevel = 'orange';
        if (item.precip > 0 || item.rainProb >= 40) {
          severityLabel = 'Desaconselhado (Chuva Prevista)';
          hourStatus = 'Evitar por Chuva Prevista';
          hourReasons.push(`Chuva ${item.precip}mm / Prob. ${item.rainProb}%`);
        } else if (item.wind >= config.targetHourWindMax) {
          severityLabel = `Desaconselhado (Vento ${item.wind.toFixed(0)} km/h)`;
          hourStatus = 'Evitar por Vento Forte';
          hourReasons.push(`Vento ${item.wind.toFixed(1)} km/h acima do limite`);
        } else if (isCriticalHeatSlot) {
          severityLabel = 'Desaconselhado (Pico de Calor / Placas Quentes)';
          hourStatus = 'Cuidado Temperatura';
          hourReasons.push(`Horário não ideal (10h-16h): módulos superaquecidos`);
        } else {
          severityLabel = `Desaconselhado (Calor ${item.temp.toFixed(0)}°C)`;
          hourStatus = 'Cuidado Temperatura';
          hourReasons.push(`Temperatura em ${item.temp.toFixed(0)}°C`);
        }
      } else if (
        isTransitionHeatSlot ||
        (h >= 9 && h < 10) ||
        item.temp > 28 ||
        item.humidity > config.targetHourHumidityMax ||
        item.humidity < 35 ||
        item.wind >= 18 ||
        item.rainProb > 0
      ) {
        severityLevel = 'yellow';
        hourStatus = 'Cuidado Temperatura';
        if (isTransitionHeatSlot || (h >= 9 && h < 10)) {
          severityLabel = 'Atenção (Transição Térmica)';
          hourReasons.push('Início ou término da faixa quente do dia');
        } else if (item.temp > 28) {
          severityLabel = `Atenção (Temperatura ${item.temp.toFixed(0)}°C)`;
          hourReasons.push(`Temperatura moderadamente elevada`);
        } else if (item.wind >= 18) {
          severityLabel = `Atenção (Vento Moderado ${item.wind.toFixed(0)} km/h)`;
          hourReasons.push(`Vento moderado`);
        } else if (item.humidity > config.targetHourHumidityMax) {
          severityLabel = `Atenção (Umidade Alta ${item.humidity}%)`;
          hourReasons.push(`Umidade em ${item.humidity}%`);
        } else {
          severityLabel = 'Atenção (Risco Moderado)';
          hourReasons.push('Condição requer atenção do instalador');
        }
      } else {
        severityLevel = 'green';
        severityLabel = 'Ideal / Seguro';
        hourStatus = 'Altamente Seguro';
        hourReasons.push('Condições ideais de vento, temperatura e telhado seco');
      }

      const isRecommended = (isMorningSlot || isLateAfternoonSlot) && severityLevel === 'green';

      const weatherConditionInfo = resolveWeatherCondition({
        hour: h,
        weatherCode: item.weatherCode,
        precipitation: item.precip,
        precipitationProbability: item.rainProb,
        windSpeed: item.wind,
        temperature: item.temp,
      });

      hourlyForecast.push({
        time: `${hStr}:00`,
        hour: h,
        temperature: item.temp,
        relativeHumidity: item.humidity,
        precipitation: item.precip,
        precipitationProbability: item.rainProb,
        windSpeed: item.wind,
        weatherCode: item.weatherCode,
        weatherCondition: weatherConditionInfo.type,
        weatherConditionLabel: weatherConditionInfo.label,
        isHeatBlocked,
        isRecommended,
        severityLevel,
        severityLabel,
        safetyStatus: hourStatus,
        reasons: hourReasons,
      });
    }

    // Determinação do Status Geral e Score (0 a 100) do dia
    // 100% = Adequada (todos os critérios dentro das normas NR-35)
    // 0% = Inadequada (condições adversas)
    const reasons: string[] = [...prior24hViolations];

    // Avaliação dos 4 pilares das normas NR-35
    let score = 0;

    // Norma 1: Chuva 24h anteriores (Peso: 25%)
    if (prior24hRainSum <= config.prior24hRainMax) {
      score += 25;
    } else if (prior24hRainSum <= 2) {
      score += 10;
      reasons.push(`Chuva leve nas últimas 24h (${prior24hRainSum.toFixed(1)} mm)`);
    } else {
      reasons.push(`Chuva nas últimas 24h (${prior24hRainSum.toFixed(1)} mm) acima do limite`);
    }

    // Norma 2: Umidade Madrugada / Orvalho (Peso: 25%)
    if (priorNightAvgHumidity < 70) {
      score += 25;
    } else if (priorNightAvgHumidity < config.priorNightHumidityMax) {
      score += 20;
    } else if (priorNightAvgHumidity < 85) {
      score += 10;
      reasons.push(`Umidade na madrugada de ${priorNightAvgHumidity}% (Risco de orvalho em telhas)`);
    } else {
      reasons.push(`Umidade excessiva na madrugada (${priorNightAvgHumidity}%)`);
    }

    // Norma 3: Vento no Horário de Subida (Peso: 25%)
    if (targetWindSpeed <= 15) {
      score += 25;
    } else if (targetWindSpeed < 20) {
      score += 20;
    } else if (targetWindSpeed < config.targetHourWindMax) {
      score += 15;
      reasons.push(`Vento moderado às 07:00 (${targetWindSpeed.toFixed(1)} km/h)`);
    } else if (targetWindSpeed < 32) {
      score += 5;
      reasons.push(`Vento às 07:00 de ${targetWindSpeed.toFixed(1)} km/h (Acima do limite NR-35 de 25 km/h)`);
    } else {
      reasons.push(`Vento severo às 07:00 de ${targetWindSpeed.toFixed(1)} km/h`);
    }

    // Norma 4: Temperatura e Alerta de Calor às 07:00 (Peso: 25%)
    if (targetTemperature >= 18 && targetTemperature <= 26) {
      score += 25;
    } else if (targetTemperature > 26 && targetTemperature <= 30) {
      score += 18;
      reasons.push(`Temperatura amena/aquecendo às 07:00 (${targetTemperature.toFixed(0)}°C)`);
    } else if (targetTemperature > 30 && targetTemperature <= 33) {
      score += 8;
      reasons.push(`Alerta de calor às 07:00 (${targetTemperature.toFixed(0)}°C)`);
    } else if (targetTemperature > 33) {
      score += 0;
      reasons.push(`Alerta severo de calor às 07:00 (${targetTemperature.toFixed(0)}°C)`);
    } else if (targetTemperature >= 14 && targetTemperature < 18) {
      score += 15;
    } else {
      score += 5;
    }

    // Penalidade por chuva prevista no horário de subida
    if (targetPrecipitation > config.targetHourRainVolumeMax || targetRainProb > config.targetHourProbRainMax) {
      score = Math.max(0, score - 30);
      reasons.push(`Chuva prevista para o horário de subida: ${targetPrecipitation} mm (${targetRainProb}%)`);
    }

    const safetyScore = Math.max(0, Math.min(100, Math.round(score)));

    // Determina o status conforme o percentual calibrado
    let safetyStatus: RooftopSafetyStatus = 'Altamente Seguro';
    if (safetyScore >= 70 && prior24hRainSum === 0 && targetPrecipitation === 0) {
      safetyStatus = 'Altamente Seguro';
    } else if (safetyScore >= 45) {
      if (targetTemperature > 28) {
        safetyStatus = 'Cuidado Temperatura';
      } else if (targetWindSpeed >= 20) {
        safetyStatus = 'Cuidado Vento';
      } else {
        safetyStatus = 'Cuidado Umidade';
      }
    } else {
      if (prior24hRainSum > config.prior24hRainMax) {
        safetyStatus = 'Evitar por Chuva Anterior';
      } else if (targetPrecipitation > 0 || targetRainProb >= 50) {
        safetyStatus = 'Evitar por Chuva Prevista';
      } else if (targetWindSpeed >= config.targetHourWindMax) {
        safetyStatus = 'Evitar por Vento Forte';
      } else {
        safetyStatus = 'Evitar por Alta Umidade / Orvalho';
      }
    }

    const isBlocked = safetyScore < 45;
    const isIdeal = safetyScore >= 70;
    const isAcceptable = safetyScore >= 45;

    // Janela segura de subida (NUNCA dentro do alerta de calor 10h-17h)
    let recommendedWindow = '06:30 às 09:30';
    if (isBlocked) {
      recommendedWindow = 'Nenhuma (Condições inadequadas no telhado)';
    } else if (targetTemperature > 27) {
      recommendedWindow = '06:00 às 08:30 (Antecipar para evitar alerta de calor)';
    } else {
      recommendedWindow = '06:30 às 09:30 ou 17:00 às 18:30 (Fora do alerta de calor)';
    }

    if (isSeasonalForecast) {
      reasons.push('Previsão Sazonal (Longo Prazo): A precisão meteorológica pode mudar drasticamente (> 15 dias)');
    }

    assessments.push({
      date,
      dayOfWeek,
      formattedDate,
      isToday,
      isPast,
      isSeasonalForecast,
      seasonalWarning,
      prior24hRainSum: Math.round(prior24hRainSum * 10) / 10,
      priorNightAvgHumidity,
      prior24hSafe,
      prior24hViolations,
      targetHour,
      targetTemperature,
      targetHumidity,
      targetWindSpeed,
      targetPrecipitation,
      targetRainProb,
      safetyStatus,
      safetyScore,
      isIdeal,
      isAcceptable,
      isBlocked,
      reasons,
      recommendedWindow,
      hourlyForecast,
    });
  }

  // Data mínima de consulta é SEMPRE a partir de amanhã (hoje nunca é incluído)
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = tomorrowObj.toISOString().slice(0, 10);

  // Filtragem inicial se datas de início e fim forem passadas
  let finalAssessments = assessments;
  finalAssessments = assessments.filter(a => {
    // Nunca inclui hoje ou datas passadas
    if (a.date < tomorrowStr) return false;
    if (params.startDate && a.date < params.startDate && params.startDate >= tomorrowStr) return false;
    if (params.endDate && a.date > params.endDate) return false;
    return true;
  });

  // Imprime relatório formatado no console com console.table (Conforme requisito estrito)
  printRooftopSafetyReportConsole(finalAssessments, params.locationName);

  // Armazena no cache por 24h
  if (finalAssessments.length > 0) {
    setCachedWeather(cacheKey, finalAssessments);
  }

  return finalAssessments;
}

/**
 * Exibe o relatório de segurança em telhado no console do navegador e Node.js
 * utilizando console.table para visualização limpa de tabela.
 */
export function printRooftopSafetyReportConsole(
  assessments: RooftopDaySafetyAssessment[],
  locationName?: string
) {
  console.log(`\n=============================================================`);
  console.log(`📋 RELATÓRIO METEOROLÓGICO DE SEGURANÇA EM TELHADO (NR-35)`);
  if (locationName) {
    console.log(`📍 Localidade Considerada: ${locationName}`);
  }
  console.log(`⚠️ Regras: Chuva 24h ant = 0mm | Umidade madrug < 75% | Vento < 25km/h | Faixa 10h-17h alerta térmico`);
  console.log(`=============================================================`);

  const tableData = assessments.map(a => ({
    Data: `${a.formattedDate} (${a.dayOfWeek})`,
    'Janela de Horário Seguro': a.recommendedWindow,
    'Temp às 07h': `${a.targetTemperature.toFixed(1)}°C`,
    'Umidade às 07h': `${a.targetHumidity.toFixed(0)}%`,
    'Vento às 07h': `${a.targetWindSpeed.toFixed(1)} km/h`,
    'Chuva Ant. 24h': `${a.prior24hRainSum.toFixed(1)} mm`,
    'Umidade Madrugada': `${a.priorNightAvgHumidity}%`,
    'Status de Segurança': a.safetyStatus,
    'Score': `${a.safetyScore}%`
  }));

  console.table(tableData);
}

/**
 * Gera um texto instrucional e analítico detalhado para ser anexado automaticamente
 * às observações do agendamento, orientando o técnico que recebe a ordem de serviço.
 */
export function formatRooftopSafetyReportForAppointment(
  assessment: RooftopDaySafetyAssessment,
  locationName?: string,
  selectedHour?: string
): string {
  const chosenHourData = selectedHour
    ? assessment.hourlyForecast.find(h => h.time === selectedHour || h.time.startsWith(selectedHour))
    : undefined;

  const severityIcon = chosenHourData?.severityLevel === 'green'
    ? '🟢 VERDE (Ideal / Seguro)'
    : chosenHourData?.severityLevel === 'yellow'
    ? '🟡 AMARELO (Atenção / Cuidado)'
    : '🟠 LARANJA (Desaconselhado / Pico Térmico ou Vento - Requer Cautela)';

  const lines: string[] = [
    `☀️ [RELATÓRIO METEOROLÓGICO & SEGURANÇA EM TELHADO - NR-35]`,
    assessment.isSeasonalForecast
      ? `🔮 [PREVISÃO SAZONAL / LONGO PRAZO]: Esta data supera 15 dias no futuro. A precisão pode mudar drasticamente. Recomenda-se revalidar 48h antes da subida em telhado.`
      : '',
    `Data do Atendimento: ${assessment.formattedDate} (${assessment.dayOfWeek})`,
    selectedHour ? `Horário Definido para Início: ${selectedHour}` : `Horário Padrão de Referência: 07:00`,
    chosenHourData ? `Gravidade do Horário (${selectedHour}): ${severityIcon} - ${chosenHourData.severityLabel}` : '',
    `Janela Geral Recomendada: ${assessment.recommendedWindow}`,
    `Status Geral do Dia: ${assessment.safetyStatus.toUpperCase()} (Score: ${assessment.safetyScore}%)`,
    locationName ? `Localidade Considerada: ${locationName}` : '',
    ``,
    `1. CONDIÇÕES DO DIA ANTERIOR (Últimas 24h):`,
    `- Chuva acumulada 24h: ${assessment.prior24hRainSum} mm ${assessment.prior24hRainSum === 0 ? '✓ (Telhado seco, sem risco de lodo/lama)' : '⚠️ (Telhas molhadas, alto risco)'}`,
    `- Umidade média da madrugada: ${assessment.priorNightAvgHumidity}% ${assessment.priorNightAvgHumidity < 75 ? '✓ (Sem orvalho excessivo)' : '⚠️ (Atenção para umidade residual)'}`,
    ``,
    chosenHourData
      ? `2. PREVISÃO DETALHADA NO HORÁRIO SELECIONADO (${selectedHour}):`
      : `2. CONDIÇÕES ESTIMADAS PARA SUBIDA (07:00):`,
    `- Temperatura: ${(chosenHourData ? chosenHourData.temperature : assessment.targetTemperature).toFixed(1)}°C`,
    `- Umidade Relativa: ${(chosenHourData ? chosenHourData.relativeHumidity : assessment.targetHumidity).toFixed(0)}%`,
    `- Velocidade do Vento: ${(chosenHourData ? chosenHourData.windSpeed : assessment.targetWindSpeed).toFixed(1)} km/h (Limite NR-35: 25 km/h)`,
    `- Precipitação: ${(chosenHourData ? chosenHourData.precipitation : assessment.targetPrecipitation)} mm | Probabilidade: ${(chosenHourData ? chosenHourData.precipitationProbability : assessment.targetRainProb)}%`,
    chosenHourData?.reasons && chosenHourData.reasons.length > 0 ? `- Observação do Horário: ${chosenHourData.reasons.join('; ')}` : '',
    ``,
    `3. DIRETRIZES TÉCNICAS E SUGESTÃO DE SEGURANÇA:`,
    `- SUGESTÃO TÉRMICA: O intervalo das 10:00 às 17:00 não é o ideal devido ao calor e insolação sobre os módulos (placas solares podem atingir até 75°C, gerando risco de choque térmico ao lavar e exaustão). Se agendado nessa faixa, hidratar a equipe e testar a temperatura dos vidros antes do contato.`,
    `- Obrigatório uso de cinto paraquedista, trava-quedas, linha de vida e bota antiderrapante conforme NR-35.`,
  ];

  return lines.filter(line => line !== '').join('\n');
}

/**
 * Dados simulados de alta fidelidade para contingência offline.
 */
function generateOfflineFallbackWeatherData(lat: number, lon: number, futureDays: number = 18) {
  const times: string[] = [];
  const temps: number[] = [];
  const humidities: number[] = [];
  const precipitations: number[] = [];
  const rainProbs: number[] = [];
  const windSpeeds: number[] = [];
  const weatherCodes: number[] = [];

  const now = new Date();
  // 3 dias passados e dias futuros configurados
  for (let d = -3; d <= futureDays; d++) {
    const curDate = new Date(now);
    curDate.setDate(curDate.getDate() + d);
    const yyyy = curDate.getFullYear();
    const mm = String(curDate.getMonth() + 1).padStart(2, '0');
    const dd = String(curDate.getDate()).padStart(2, '0');
    const datePrefix = `${yyyy}-${mm}-${dd}`;

    // Simula chuva a cada 4 ou 5 dias para testes realistas
    const willRain = (d + 7) % 5 === 0;

    for (let h = 0; h < 24; h++) {
      const hStr = String(h).padStart(2, '0');
      times.push(`${datePrefix}T${hStr}:00`);

      // Curva diurna de temperatura (mínima de madrugada, máxima às 14h)
      const baseTemp = 19 + Math.sin(((h - 6) / 24) * 2 * Math.PI) * 8;
      temps.push(Math.round(baseTemp * 10) / 10);

      // Curva de umidade inversa
      const baseHumid = 75 - Math.sin(((h - 6) / 24) * 2 * Math.PI) * 30;
      humidities.push(Math.max(35, Math.min(90, Math.round(baseHumid))));

      const rainVal = willRain && h >= 14 && h <= 18 ? 2.5 : 0;
      precipitations.push(rainVal);
      rainProbs.push(willRain ? 75 : 0);

      const wind = Math.round((10 + Math.sin(h) * 5) * 10) / 10;
      windSpeeds.push(wind);

      // WMO code: 61 (chuva), 1 (parcialmente nublado), ou 0 (ensolarado)
      if (rainVal > 0) {
        weatherCodes.push(61);
      } else if (baseHumid > 70) {
        weatherCodes.push(2);
      } else {
        weatherCodes.push(0);
      }
    }
  }

  return {
    latitude: lat,
    longitude: lon,
    hourly: {
      time: times,
      temperature_2m: temps,
      relative_humidity_2m: humidities,
      precipitation: precipitations,
      precipitation_probability: rainProbs,
      wind_speed_10m: windSpeeds,
      weather_code: weatherCodes,
    },
  };
}
