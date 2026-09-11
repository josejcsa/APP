import React, { useState, useEffect } from 'react';
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  CloudFog,
  Wind,
  Moon,
  CloudMoon,
  ThermometerSun,
} from 'lucide-react';
import { WeatherConditionType } from '../types';

export interface WeatherConditionInfo {
  type: WeatherConditionType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
}

export const WEATHER_CONDITIONS_MAP: Record<WeatherConditionType, WeatherConditionInfo> = {
  ensolarado: {
    type: 'ensolarado',
    label: 'Ensolarado',
    description: 'Céu limpo com boa visibilidade e irradiação solar ideal',
    icon: Sun,
    colorClass: 'text-amber-500',
  },
  ceu_limpo_noite: {
    type: 'ceu_limpo_noite',
    label: 'Céu Limpo',
    description: 'Céu noturno limpo',
    icon: Moon,
    colorClass: 'text-indigo-400',
  },
  parcialmente_nublado: {
    type: 'parcialmente_nublado',
    label: 'Parc. Nublado',
    description: 'Sol com variação de nebulosidade leve',
    icon: CloudSun,
    colorClass: 'text-amber-500',
  },
  parcialmente_nublado_noite: {
    type: 'parcialmente_nublado_noite',
    label: 'Parc. Nublado',
    description: 'Nebulosidade parcial à noite',
    icon: CloudMoon,
    colorClass: 'text-indigo-400',
  },
  nublado: {
    type: 'nublado',
    label: 'Nublado',
    description: 'Céu encoberto por nuvens',
    icon: Cloud,
    colorClass: 'text-slate-400',
  },
  nevoeiro: {
    type: 'nevoeiro',
    label: 'Nevoeiro / Neblina',
    description: 'Visibilidade reduzida por neblina ou condensação matinal',
    icon: CloudFog,
    colorClass: 'text-slate-400',
  },
  garoa: {
    type: 'garoa',
    label: 'Garoa / Chuvisco',
    description: 'Precipitação leve intermitente',
    icon: CloudDrizzle,
    colorClass: 'text-sky-400',
  },
  chuva: {
    type: 'chuva',
    label: 'Chuva',
    description: 'Precipitação moderada a intensa',
    icon: CloudRain,
    colorClass: 'text-blue-500',
  },
  tempestade: {
    type: 'tempestade',
    label: 'Tempestade / Raios',
    description: 'Raios, trovoadas e instabilidade severa',
    icon: CloudLightning,
    colorClass: 'text-amber-500',
  },
  vento_forte: {
    type: 'vento_forte',
    label: 'Vento Forte',
    description: 'Rajadas de vento acima da segurança',
    icon: Wind,
    colorClass: 'text-cyan-500',
  },
  calor_extremo: {
    type: 'calor_extremo',
    label: 'Sol Forte / Calor',
    description: 'Pico de temperatura e módulos superaquecidos',
    icon: ThermometerSun,
    colorClass: 'text-orange-500',
  },
};

/**
 * Resolve a condição climática a partir de WMO weather code (Open-Meteo) ou dados de previsão
 */
export function resolveWeatherCondition(params: {
  hour: number;
  weatherCode?: number;
  precipitation?: number;
  precipitationProbability?: number;
  windSpeed?: number;
  temperature?: number;
}): WeatherConditionInfo {
  const { hour, weatherCode, precipitation = 0, precipitationProbability = 0, windSpeed = 0, temperature = 24 } = params;
  const isNight = hour < 6 || hour >= 19;

  // 1. Caso haja WMO weather code oficial do Open-Meteo
  if (typeof weatherCode === 'number' && weatherCode >= 0) {
    if ([95, 96, 99].includes(weatherCode)) {
      return WEATHER_CONDITIONS_MAP.tempestade;
    }
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) {
      return WEATHER_CONDITIONS_MAP.chuva;
    }
    if ([51, 53, 55, 56, 57].includes(weatherCode)) {
      return WEATHER_CONDITIONS_MAP.garoa;
    }
    if ([45, 48].includes(weatherCode)) {
      return WEATHER_CONDITIONS_MAP.nevoeiro;
    }
    if (weatherCode === 3) {
      return WEATHER_CONDITIONS_MAP.nublado;
    }
    if ([1, 2].includes(weatherCode)) {
      return isNight ? WEATHER_CONDITIONS_MAP.parcialmente_nublado_noite : WEATHER_CONDITIONS_MAP.parcialmente_nublado;
    }
    if (weatherCode === 0) {
      if (isNight) return WEATHER_CONDITIONS_MAP.ceu_limpo_noite;
      if (temperature >= 32 && hour >= 10 && hour <= 16) return WEATHER_CONDITIONS_MAP.calor_extremo;
      return WEATHER_CONDITIONS_MAP.ensolarado;
    }
  }

  // 2. Fallback baseado em métricas físicas
  if (precipitation >= 1.5 || precipitationProbability >= 65) {
    return WEATHER_CONDITIONS_MAP.chuva;
  }
  if (precipitation > 0 || precipitationProbability >= 35) {
    return WEATHER_CONDITIONS_MAP.garoa;
  }
  if (windSpeed >= 25) {
    return WEATHER_CONDITIONS_MAP.vento_forte;
  }
  if (temperature >= 32 && hour >= 10 && hour <= 16) {
    return WEATHER_CONDITIONS_MAP.calor_extremo;
  }
  if (isNight) {
    return WEATHER_CONDITIONS_MAP.ceu_limpo_noite;
  }
  if (hour === 6 || hour === 7) {
    // Horário matutino fresco
    return WEATHER_CONDITIONS_MAP.ensolarado;
  }
  return WEATHER_CONDITIONS_MAP.ensolarado;
}

// Cache global em memória para previsões horárias indexadas por: `${lat.toFixed(2)},${lon.toFixed(2)}_${dateStr}_${hour}`
interface CachedHourlyWeather {
  weatherCode: number;
  temp: number;
  precip: number;
  rainProb: number;
  wind: number;
  condition: WeatherConditionType;
}

const memoryWeatherCache = new Map<string, CachedHourlyWeather>();
const activeFetchPromises = new Map<string, Promise<void>>();

// Default coordinates (Belo Horizonte / Região Central do Brasil) se não houver cliente geolocalizado
const DEFAULT_LAT = -19.92;
const DEFAULT_LON = -43.94;

/**
 * Consulta e armazena em cache o forecast horários para um local e data
 */
export async function prefetchWeatherForDate(dateStr: string, lat?: number, lon?: number): Promise<void> {
  const targetLat = lat || DEFAULT_LAT;
  const targetLon = lon || DEFAULT_LON;
  const cacheKey = `${targetLat.toFixed(2)},${targetLon.toFixed(2)}_${dateStr}`;

  // Verifica se já temos as horas desse dia em cache
  if (memoryWeatherCache.has(`${cacheKey}_07`)) {
    return;
  }

  if (activeFetchPromises.has(cacheKey)) {
    return activeFetchPromises.get(cacheKey);
  }

  const fetchPromise = (async () => {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${targetLat}&longitude=${targetLon}&hourly=temperature_2m,relative_humidity_2m,precipitation,precipitation_probability,wind_speed_10m,weather_code&forecast_days=16&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (data?.hourly?.time) {
        const times = data.hourly.time;
        const codes = data.hourly.weather_code || [];
        const temps = data.hourly.temperature_2m || [];
        const precips = data.hourly.precipitation || [];
        const rainProbs = data.hourly.precipitation_probability || [];
        const winds = data.hourly.wind_speed_10m || [];

        for (let i = 0; i < times.length; i++) {
          const t = times[i]; // "2026-09-12T07:00"
          const d = t.slice(0, 10);
          const h = parseInt(t.slice(11, 13), 10);
          const hPadded = String(h).padStart(2, '0');
          const code = codes[i] ?? 0;
          const temp = temps[i] ?? 24;
          const precip = precips[i] ?? 0;
          const rainProb = rainProbs[i] ?? 0;
          const wind = winds[i] ?? 10;

          const cond = resolveWeatherCondition({
            hour: h,
            weatherCode: code,
            precipitation: precip,
            precipitationProbability: rainProb,
            windSpeed: wind,
            temperature: temp,
          });

          const hourKey = `${targetLat.toFixed(2)},${targetLon.toFixed(2)}_${d}_${hPadded}`;
          memoryWeatherCache.set(hourKey, {
            weatherCode: code,
            temp,
            precip,
            rainProb,
            wind,
            condition: cond.type,
          });
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar prefetch de clima:', err);
    } finally {
      activeFetchPromises.delete(cacheKey);
    }
  })();

  activeFetchPromises.set(cacheKey, fetchPromise);
  return fetchPromise;
}

/**
 * Hook para obter a condição do tempo para uma data e hora, mesmo sem abrir a aba de tempo antes
 */
export function useWeatherCondition(params: {
  date?: string;
  time?: string;
  initialCondition?: WeatherConditionType;
  initialWeatherCode?: number;
  lat?: number;
  lng?: number;
}) {
  const { date, time, initialCondition, initialWeatherCode, lat, lng } = params;

  // Extrai a hora
  const hourNum = time ? parseInt(time.slice(0, 2), 10) : 7;
  const hourStr = String(isNaN(hourNum) ? 7 : hourNum).padStart(2, '0');
  const targetLat = lat || DEFAULT_LAT;
  const targetLon = lng || DEFAULT_LON;
  const cacheKey = date ? `${targetLat.toFixed(2)},${targetLon.toFixed(2)}_${date}_${hourStr}` : '';

  const [conditionInfo, setConditionInfo] = useState<WeatherConditionInfo>(() => {
    if (initialCondition && WEATHER_CONDITIONS_MAP[initialCondition]) {
      return WEATHER_CONDITIONS_MAP[initialCondition];
    }
    if (cacheKey && memoryWeatherCache.has(cacheKey)) {
      const cached = memoryWeatherCache.get(cacheKey)!;
      return WEATHER_CONDITIONS_MAP[cached.condition] || WEATHER_CONDITIONS_MAP.ensolarado;
    }
    return resolveWeatherCondition({
      hour: hourNum,
      weatherCode: initialWeatherCode,
    });
  });

  useEffect(() => {
    if (initialCondition && WEATHER_CONDITIONS_MAP[initialCondition]) {
      setConditionInfo(WEATHER_CONDITIONS_MAP[initialCondition]);
      return;
    }

    if (!date) return;

    if (cacheKey && memoryWeatherCache.has(cacheKey)) {
      const cached = memoryWeatherCache.get(cacheKey)!;
      setConditionInfo(WEATHER_CONDITIONS_MAP[cached.condition] || WEATHER_CONDITIONS_MAP.ensolarado);
      return;
    }

    // Tenta carregar os dados em background
    let isCancelled = false;
    prefetchWeatherForDate(date, targetLat, targetLon).then(() => {
      if (isCancelled) return;
      if (cacheKey && memoryWeatherCache.has(cacheKey)) {
        const cached = memoryWeatherCache.get(cacheKey)!;
        setConditionInfo(WEATHER_CONDITIONS_MAP[cached.condition] || WEATHER_CONDITIONS_MAP.ensolarado);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [date, hourStr, targetLat, targetLon, initialCondition]);

  return conditionInfo;
}

/**
 * Componente que renderiza o ícone de condição climática
 */
export const WeatherConditionIcon: React.FC<{
  condition?: WeatherConditionType;
  weatherCode?: number;
  date?: string;
  time?: string;
  lat?: number;
  lng?: number;
  className?: string;
  showTooltip?: boolean;
}> = ({
  condition,
  weatherCode,
  date,
  time,
  lat,
  lng,
  className = 'w-3.5 h-3.5',
  showTooltip = true,
}) => {
  const cond = useWeatherCondition({
    date,
    time,
    initialCondition: condition,
    initialWeatherCode: weatherCode,
    lat,
    lng,
  });

  const IconComponent = cond.icon;

  return (
    <span
      className="inline-flex items-center justify-center shrink-0"
      title={showTooltip ? `${cond.label}: ${cond.description}` : undefined}
    >
      <IconComponent className={`${className} ${cond.colorClass}`} />
    </span>
  );
};
