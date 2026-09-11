import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sun,
  CloudRain,
  Wind,
  Droplets,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  MapPin,
  Search,
  Sparkles,
  Sliders,
  ChevronRight,
  ShieldCheck,
  Flame,
  ArrowRight,
  RefreshCw,
  Info,
  CalendarCheck2,
  RotateCcw,
  User
} from 'lucide-react';
import {
  Contact,
  RooftopDaySafetyAssessment,
  RooftopHourlyWeather,
  RooftopSafetyConfig,
  WeatherConditionType
} from '../../types';
import {
  DEFAULT_ROOFTOP_SAFETY_CONFIG,
  fetchAndAssessRooftopWeather,
  formatRooftopSafetyReportForAppointment,
  geocodePlace
} from '../../utils/rooftopWeatherService';
import { WeatherConditionIcon } from '../../utils/weatherConditions';

interface RooftopWeatherCalendarTabProps {
  clients: Contact[];
  technicians: Contact[];
  onSelectDateForAppointment: (data: {
    customerId: string;
    technicianId?: string;
    scheduledDate: string;
    scheduledTime: string;
    attachedWeatherNotes: string;
    weatherCondition?: WeatherConditionType;
    weatherCode?: number;
  }) => void;
}

const getFormattedCustomerAddress = (customer?: Contact | null): string => {
  if (!customer || !customer.address) return '';
  const addr = customer.address;
  const streetPart = addr.street
    ? `${addr.street}${addr.number ? `, ${addr.number}` : ''}${addr.neighborhood ? ` - ${addr.neighborhood}` : ''}`
    : '';
  const cityPart = addr.city ? `${addr.city}${addr.state ? ` - ${addr.state}` : ''}` : '';
  if (streetPart && cityPart) return `${streetPart}, ${cityPart}`;
  return streetPart || cityPart || '';
};

export const RooftopWeatherCalendarTab: React.FC<RooftopWeatherCalendarTabProps> = ({
  clients,
  technicians,
  onSelectDateForAppointment,
}) => {
  // Helper for tomorrow's date string (a consulta NUNCA deve ser hoje)
  const getTomorrowStr = () => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return t.toISOString().slice(0, 10);
  };
  const tomorrowStr = getTomorrowStr();

  // Selected client for location suggestion
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    clients.length > 0 ? clients[0].id : ''
  );
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>(
    technicians.length > 0 ? technicians[0].id : ''
  );

  const initialCustomer = clients.length > 0 ? clients[0] : null;
  const initialAddressText = getFormattedCustomerAddress(initialCustomer);

  // Initial Date range: strictly starts from tomorrow onwards
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() + 1); // Tomorrow
  const defaultEnd = new Date(defaultStart);
  defaultEnd.setDate(defaultEnd.getDate() + 9); // +9 days range

  const [filterStartDate, setFilterStartDate] = useState(
    defaultStart.toISOString().slice(0, 10)
  );
  const [filterEndDate, setFilterEndDate] = useState(
    defaultEnd.toISOString().slice(0, 10)
  );

  // Location considered in the query:
  // "nos campo de localidade ja deve ser preenchida com o endeco do cliente e quando nao tiver cliente deve ficar em branco."
  const [locationName, setLocationName] = useState<string>(initialAddressText);
  const [locationSearchInput, setLocationSearchInput] = useState<string>(initialAddressText);
  const [latitude, setLatitude] = useState<number | null>(
    initialCustomer?.address?.coordinates?.lat ?? (initialAddressText ? -23.5505 : null)
  );
  const [longitude, setLongitude] = useState<number | null>(
    initialCustomer?.address?.coordinates?.lng ?? (initialAddressText ? -46.6333 : null)
  );
  const [isSearchingCity, setIsSearchingCity] = useState<boolean>(false);
  const [localityFeedback, setLocalityFeedback] = useState<string | null>(null);
  const didInitialMount = useRef(false);

  // Safety Config (customizable in popup)
  const [safetyConfig, setSafetyConfig] = useState<RooftopSafetyConfig>(
    DEFAULT_ROOFTOP_SAFETY_CONFIG
  );
  const [tempConfig, setTempConfig] = useState<RooftopSafetyConfig>(
    DEFAULT_ROOFTOP_SAFETY_CONFIG
  );
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Weather results
  const [loading, setLoading] = useState(false);
  const [assessments, setAssessments] = useState<RooftopDaySafetyAssessment[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selected hour per day (default e.g. 06:00 or 07:00)
  const [selectedHourByDate, setSelectedHourByDate] = useState<Record<string, string>>({});

  // Detail Modal for a specific day
  const [inspectingDay, setInspectingDay] = useState<RooftopDaySafetyAssessment | null>(null);
  const [modalSelectedHour, setModalSelectedHour] = useState<string>('07:00');

  // Auto-expanded range state (±7 days if no good days found)
  const [isExpandedBy7Days, setIsExpandedBy7Days] = useState(false);
  const [autoExpandedNotice, setAutoExpandedNotice] = useState(false);

  // Customer registered address suggestion
  const currentCustomer = useMemo(() => {
    return clients.find(c => c.id === selectedCustomerId);
  }, [clients, selectedCustomerId]);

  const customerAddressSuggestion = useMemo(() => {
    if (!currentCustomer?.address) return null;
    const addr = currentCustomer.address;
    const city = addr.city || '';
    const state = addr.state || '';
    const street = addr.street || '';
    const full = `${street ? `${street}, ` : ''}${city}${state ? ` - ${state}` : ''}`.trim();
    return {
      text: full || `${city} - ${state}`,
      city,
      state,
      lat: addr.coordinates?.lat,
      lng: addr.coordinates?.lng,
    };
  }, [currentCustomer]);

  // Handle customer selection change: pre-fills locality with customer address, or clears if empty
  const handleCustomerChange = async (newCustomerId: string) => {
    setSelectedCustomerId(newCustomerId);
    setLocalityFeedback(null);
    if (!newCustomerId) {
      setLocationName('');
      setLocationSearchInput('');
      setLatitude(null);
      setLongitude(null);
      setAssessments([]);
      return;
    }

    const customer = clients.find(c => c.id === newCustomerId);
    const addr = getFormattedCustomerAddress(customer);
    setLocationName(addr);
    setLocationSearchInput(addr);

    if (customer?.address?.coordinates?.lat && customer?.address?.coordinates?.lng) {
      setLatitude(customer.address.coordinates.lat);
      setLongitude(customer.address.coordinates.lng);
      setLocalityFeedback(`Localidade carregada: ${addr}`);
    } else if (addr.trim()) {
      setIsSearchingCity(true);
      const query = customer?.address?.city
        ? `${customer.address.city}, ${customer.address.state || 'BR'}`
        : addr;
      const geo = await geocodePlace(query);
      setIsSearchingCity(false);
      if (geo) {
        setLatitude(geo.latitude);
        setLongitude(geo.longitude);
        const formatted = `${geo.name}${geo.admin1 ? `, ${geo.admin1}` : ''} (${geo.country || 'BR'})`;
        setLocationName(formatted);
        setLocationSearchInput(formatted);
        setLocalityFeedback(`Dados da localidade carregados: ${formatted}`);
      }
    } else {
      setLatitude(null);
      setLongitude(null);
      setAssessments([]);
    }
  };

  // On mount, if initial client has an address without coordinates, geocode it
  useEffect(() => {
    if (initialCustomer && initialAddressText && !initialCustomer.address?.coordinates) {
      const query = initialCustomer.address?.city
        ? `${initialCustomer.address.city}, ${initialCustomer.address.state || 'BR'}`
        : initialAddressText;
      geocodePlace(query).then(geo => {
        if (geo) {
          setLatitude(geo.latitude);
          setLongitude(geo.longitude);
        }
      });
    }
  }, []);

  // Apply customer address as suggestion when requested
  const handleApplyCustomerAddressSuggestion = async () => {
    if (!customerAddressSuggestion) return;
    setLocalityFeedback(null);
    if (customerAddressSuggestion.lat && customerAddressSuggestion.lng) {
      setLatitude(customerAddressSuggestion.lat);
      setLongitude(customerAddressSuggestion.lng);
      setLocationName(customerAddressSuggestion.text);
      setLocationSearchInput(customerAddressSuggestion.text);
      setLocalityFeedback(`Localidade carregada: ${customerAddressSuggestion.text}`);
    } else {
      setIsSearchingCity(true);
      const query = `${customerAddressSuggestion.city} ${customerAddressSuggestion.state}`;
      const geo = await geocodePlace(query);
      setIsSearchingCity(false);
      if (geo) {
        setLatitude(geo.latitude);
        setLongitude(geo.longitude);
        const name = `${geo.name}${geo.admin1 ? `, ${geo.admin1}` : ''} (${geo.country || 'BR'})`;
        setLocationName(name);
        setLocationSearchInput(name);
        setLocalityFeedback(`Dados da localidade carregados: ${name}`);
      }
    }
  };

  // Fetch forecast and assess safety
  const loadForecast = async (expand7Days: boolean = false) => {
    if (!locationSearchInput.trim()) {
      setAssessments([]);
      setLoading(false);
      return;
    }

    let currentLat = latitude;
    let currentLng = longitude;
    let currentLocName = locationName;

    // Se o usuário digitou uma localidade mas não clicou em buscar, resolve as coordenadas agora
    if (currentLat === null || currentLng === null) {
      setIsSearchingCity(true);
      const geo = await geocodePlace(locationSearchInput.trim());
      setIsSearchingCity(false);
      if (geo) {
        currentLat = geo.latitude;
        currentLng = geo.longitude;
        currentLocName = `${geo.name}${geo.admin1 ? `, ${geo.admin1}` : ''} (${geo.country || 'BR'})`;
        setLatitude(currentLat);
        setLongitude(currentLng);
        setLocationName(currentLocName);
        setLocationSearchInput(currentLocName);
      } else {
        setErrorMsg(`Localidade "${locationSearchInput}" não encontrada. Verifique a digitação.`);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      // Data inicial NUNCA pode ser hoje
      let start = filterStartDate < tomorrowStr ? tomorrowStr : filterStartDate;
      let end = filterEndDate;

      if (expand7Days) {
        const sObj = new Date(`${start}T00:00:00`);
        sObj.setDate(sObj.getDate() - 7);
        const sStr = sObj.toISOString().slice(0, 10);
        // Não retrocede para hoje ou antes
        start = sStr < tomorrowStr ? tomorrowStr : sStr;

        const eObj = new Date(`${filterEndDate}T00:00:00`);
        eObj.setDate(eObj.getDate() + 7);
        end = eObj.toISOString().slice(0, 10);
      }

      const results = await fetchAndAssessRooftopWeather({
        latitude: currentLat,
        longitude: currentLng,
        startDate: start,
        endDate: end,
        config: safetyConfig,
        locationName: currentLocName || locationSearchInput,
      });

      // Garantia estrita: nunca hoje nem passado
      const upcoming = results.filter(r => r.date >= tomorrowStr);

      // Check if there are any safe/ideal days in the requested period
      const hasIdealDay = upcoming.some(d => d.safetyStatus === 'Altamente Seguro');

      if (!hasIdealDay && !expand7Days) {
        // Automatically expand ±7 days as requested:
        // "se nao houver parametro bom, aumenta a sugestao em 7 dias para mais e para menos...."
        setIsExpandedBy7Days(true);
        setAutoExpandedNotice(true);
        const sObj = new Date(`${start}T00:00:00`);
        sObj.setDate(sObj.getDate() - 7);
        const expandedStart = sObj.toISOString().slice(0, 10) < tomorrowStr ? tomorrowStr : sObj.toISOString().slice(0, 10);

        const eObj = new Date(`${filterEndDate}T00:00:00`);
        eObj.setDate(eObj.getDate() + 7);
        const expandedEnd = eObj.toISOString().slice(0, 10);

        const expandedResults = await fetchAndAssessRooftopWeather({
          latitude: currentLat,
          longitude: currentLng,
          startDate: expandedStart,
          endDate: expandedEnd,
          config: safetyConfig,
          locationName: currentLocName || locationSearchInput,
        });
        setAssessments(expandedResults.filter(r => r.date >= tomorrowStr));
      } else {
        setAssessments(upcoming);
        setIsExpandedBy7Days(expand7Days);
        if (expand7Days) {
          setAutoExpandedNotice(false);
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Não foi possível carregar a previsão meteorológica no momento.');
    } finally {
      setLoading(false);
    }
  };

  // Executa apenas uma vez na montagem inicial se houver localidade inicial pronta
  useEffect(() => {
    if (!didInitialMount.current) {
      didInitialMount.current = true;
      if (latitude !== null && longitude !== null && locationSearchInput.trim()) {
        loadForecast(false);
      }
    }
  }, []);

  // Handle Geocoding Search for Locality (APENAS carrega os dados da localidade)
  const handleSearchLocality = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!locationSearchInput.trim()) return;
    setIsSearchingCity(true);
    setLocalityFeedback(null);
    const geo = await geocodePlace(locationSearchInput.trim());
    setIsSearchingCity(false);
    if (geo) {
      setLatitude(geo.latitude);
      setLongitude(geo.longitude);
      const formatted = `${geo.name}${geo.admin1 ? `, ${geo.admin1}` : ''} (${geo.country || 'BR'})`;
      setLocationName(formatted);
      setLocationSearchInput(formatted);
      setLocalityFeedback(`Dados da localidade carregados: ${formatted} (Lat: ${geo.latitude.toFixed(2)}, Lon: ${geo.longitude.toFixed(2)})`);
    } else {
      alert(`Localidade "${locationSearchInput}" não encontrada. Verifique a digitação.`);
    }
  };

  // Best day overall (Melhor Data Recomendada)
  // A sugestão deve ser SEMPRE a melhor no período exibido, com base na segurança mais adequada (score mais alto)
  // E a sugestão NUNCA pode ser dentro do alerta de calor (10h às 17h)
  const bestDay = useMemo(() => {
    if (!assessments || assessments.length === 0) return null;

    const sorted = [...assessments].sort((a, b) => {
      // 1. Maior pontuação de segurança (100% adequada a 0% inadequada) sempre vence
      if (b.safetyScore !== a.safetyScore) {
        return b.safetyScore - a.safetyScore;
      }
      // 2. Menor velocidade de vento no horário de subida
      if (a.targetWindSpeed !== b.targetWindSpeed) {
        return a.targetWindSpeed - b.targetWindSpeed;
      }
      // 3. Menor chuva 24h
      if (a.prior24hRainSum !== b.prior24hRainSum) {
        return a.prior24hRainSum - b.prior24hRainSum;
      }
      return 0;
    });

    return sorted[0] || null;
  }, [assessments]);

  // Helper para garantir que a SUGESTÃO de agendamento nunca seja dentro do alerta de calor (10h às 17h)
  const getSafeHourOutsideHeatAlert = (day: RooftopDaySafetyAssessment, requestedHour?: string): string => {
    if (requestedHour) {
      const hNum = parseInt(requestedHour.slice(0, 2), 10);
      if (hNum < 10 || hNum >= 17) {
        return requestedHour;
      }
    }

    const safeHours = day.hourlyForecast.filter(h => h.hour < 10 || h.hour >= 17);
    const greenMorning = safeHours.find(
      h => h.severityLevel === 'green' && (h.hour === 7 || h.hour === 8 || h.hour === 6)
    );
    if (greenMorning) return greenMorning.time;

    const anyGreen = safeHours.find(h => h.severityLevel === 'green');
    if (anyGreen) return anyGreen.time;

    const morningSlot = safeHours.find(h => h.hour === 7 || h.hour === 8);
    if (morningSlot) return morningSlot.time;

    return safeHours[0]?.time || '07:00';
  };

  // Handle setting selected hour for a specific day
  const handleSetDayHour = (dateStr: string, hourStr: string) => {
    setSelectedHourByDate(prev => ({
      ...prev,
      [dateStr]: hourStr,
    }));
  };

  // Handle quick scheduling from weather recommendation with chosen hour
  const handleScheduleDay = (day: RooftopDaySafetyAssessment, specificHour?: string) => {
    const chosenHour = specificHour || selectedHourByDate[day.date] || getSafeHourOutsideHeatAlert(day);
    const hourData = day.hourlyForecast.find(h => h.time === chosenHour);
    const reportText = formatRooftopSafetyReportForAppointment(day, locationName, chosenHour);
    onSelectDateForAppointment({
      customerId: selectedCustomerId,
      technicianId: selectedTechnicianId,
      scheduledDate: day.date,
      scheduledTime: chosenHour,
      attachedWeatherNotes: reportText,
      weatherCondition: hourData?.weatherCondition,
      weatherCode: hourData?.weatherCode,
    });
  };

  // Open day inspection modal
  const handleOpenInspectModal = (day: RooftopDaySafetyAssessment) => {
    setInspectingDay(day);
    const initialHour = selectedHourByDate[day.date] || getSafeHourOutsideHeatAlert(day);
    setModalSelectedHour(initialHour);
  };

  // Open config modal
  const handleOpenConfigModal = () => {
    setTempConfig({ ...safetyConfig });
    setIsConfigOpen(true);
  };

  const handleSaveConfig = () => {
    setSafetyConfig(tempConfig);
    setIsConfigOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Search Bar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-xs shadow-emerald-200">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Previsão Meteorológica & Melhores Datas
              </h2>
            </div>
            <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
              Consulta meteorológica com regras de segurança em altura (NR-35).
              A localidade detectada é a regra da previsão. O bloqueio das 10h às 17h é uma sugestão de segurança térmica com horários classificados por gravidade (Verde, Amarelo e Laranja).
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleOpenConfigModal}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              <span>Parâmetros de Segurança NR-35</span>
            </button>
          </div>
        </div>

        {/* Filter Bar: Locality (Rule) + Client (Suggestion) + Date Range */}
        <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 text-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Customer / Solar Plant Selection (Suggestion) */}
            <div className="space-y-1.5">
              <label className="block text-slate-700 font-bold flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Cliente (Localidade)</span>
                </span>
              </label>
              <select
                value={selectedCustomerId}
                onChange={e => handleCustomerChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="">-- Nenhum cliente (em branco) --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.address?.city ? `(${c.address.city}/${c.address.state || ''})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Locality (The Rule Considered in Query) */}
            <div className="space-y-1.5">
              <label className="block text-slate-700 font-bold flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Localidade Consultada (Regra)</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {latitude !== null && longitude !== null ? `${latitude.toFixed(2)}, ${longitude.toFixed(2)}` : 'Sem coordenadas'}
                </span>
              </label>
              <form onSubmit={handleSearchLocality} className="flex gap-1.5">
                <input
                  type="text"
                  value={locationSearchInput}
                  onChange={e => setLocationSearchInput(e.target.value)}
                  placeholder="Selecione um cliente ou digite a localidade..."
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-medium truncate focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <button
                  type="submit"
                  disabled={isSearchingCity || !locationSearchInput.trim()}
                  className="px-3.5 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 cursor-pointer transition-colors disabled:opacity-50 shrink-0"
                  title="Carregar apenas os dados da localidade"
                >
                  {isSearchingCity ? '...' : 'Buscar'}
                </button>
              </form>
              <p className="text-[10px] text-slate-400">
                * Carrega as coordenadas da localidade para a consulta.
              </p>
            </div>

            {/* Start Date (Always from tomorrow onwards) */}
            <div className="space-y-1.5">
              <label className="block text-slate-700 font-bold flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5 text-indigo-600" />
                <span>Data Inicial (a partir de amanhã)</span>
              </label>
              <input
                type="date"
                min={tomorrowStr}
                value={filterStartDate}
                onChange={e => {
                  const val = e.target.value;
                  setFilterStartDate(val < tomorrowStr ? tomorrowStr : val);
                }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <p className="text-[10px] text-slate-400">
                * A consulta inicia sempre a partir de amanhã.
              </p>
            </div>

            {/* End Date */}
            <div className="space-y-1.5">
              <label className="block text-slate-700 font-bold flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5 text-indigo-600" />
                <span>Data Final Desejada</span>
              </label>
              <input
                type="date"
                min={filterStartDate}
                value={filterEndDate}
                onChange={e => setFilterEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <p className="text-[10px] text-slate-400">
                * Para datas &gt; 15 dias: Seasonal Forecast (precisão pode variar drasticamente).
              </p>
            </div>
          </div>

          {/* Locality Feedback Status */}
          {localityFeedback && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center justify-between">
              <span className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                {localityFeedback}
              </span>
              <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                Localidade pronta
              </span>
            </div>
          )}

          {/* No final do formulário: Botão para Nova Consulta */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="text-slate-500 text-[11px] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">
                {locationSearchInput.trim()
                  ? `Localidade pronta: ${locationName || locationSearchInput} ${latitude !== null && longitude !== null ? `(${latitude.toFixed(2)}, ${longitude.toFixed(2)})` : ''}`
                  : 'Preencha ou selecione uma localidade para efetuar a consulta.'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setLocalityFeedback(null);
                loadForecast(false);
              }}
              disabled={loading || !locationSearchInput.trim()}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm shadow-emerald-200 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              title="Realizar nova consulta meteorológica para a localidade informada"
            >
              <Search className="w-4 h-4" />
              <span>Nova Consulta</span>
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin ml-1 text-white" />}
            </button>
          </div>
        </div>

        {/* Auto-expanded Notification Banner (as requested in prompt) */}
        {autoExpandedNotice && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-950 text-xs block">
                  Período Inicial Sem Parâmetros Ideais: Sugestão Ampliada (+/- 7 Dias)
                </span>
                <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed">
                  Não localizamos dias com condições ideais no período informado.
                  Ampliamos a busca para sugerir os melhores dias disponíveis para evitar retrabalho e riscos.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => loadForecast(false)}
                className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 text-xs font-bold rounded-xl hover:bg-amber-100 transition-colors cursor-pointer"
              >
                Voltar ao Período Restrito
              </button>
            </div>
          </div>
        )}

        {/* Best Day Spotlight Card ("Melhor Opção") */}
        {bestDay && (() => {
          const isBestIdeal = bestDay.safetyScore >= 70;
          const isBestModerate = bestDay.safetyScore >= 45 && bestDay.safetyScore < 70;
          // Sugestão NUNCA pode ser dentro do alerta de calor (10h às 17h)
          const bestDaySuggestedHour = getSafeHourOutsideHeatAlert(bestDay, selectedHourByDate[bestDay.date]);

          return (
            <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all shadow-xs ${
              isBestIdeal
                ? 'bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white border-emerald-500/40'
                : isBestModerate
                ? 'bg-gradient-to-r from-yellow-950 via-slate-900 to-slate-900 text-white border-yellow-500/40'
                : 'bg-gradient-to-r from-orange-950 via-slate-900 to-slate-900 text-white border-orange-500/40'
            }`}>
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] tracking-wider uppercase ${
                    isBestIdeal
                      ? 'bg-emerald-500 text-slate-950'
                      : isBestModerate
                      ? 'bg-yellow-400 text-slate-950'
                      : 'bg-orange-500 text-white'
                  }`}>
                    ★ MELHOR DATA RECOMENDADA
                  </span>
                  <span className="text-xs text-slate-300 font-mono">
                    {bestDay.formattedDate} ({bestDay.dayOfWeek})
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className={`text-base font-black ${
                    isBestIdeal ? 'text-emerald-400' : isBestModerate ? 'text-yellow-400' : 'text-orange-400'
                  }`}>
                    {bestDay.safetyStatus} ({bestDay.safetyScore}%)
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="flex items-center gap-1 text-slate-200">
                    <Clock className={`w-3.5 h-3.5 ${isBestIdeal ? 'text-emerald-400' : isBestModerate ? 'text-yellow-400' : 'text-orange-400'}`} />
                    Janela Sugerida: <strong>{bestDay.recommendedWindow}</strong>
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-300">
                    Temp: <strong>{bestDay.targetTemperature.toFixed(1)}°C</strong> | Vento: <strong>{bestDay.targetWindSpeed.toFixed(1)} km/h</strong> | Chuva 24h: <strong>{bestDay.prior24hRainSum} mm</strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => handleOpenInspectModal(bestDay)}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all cursor-pointer"
                >
                  Inspecionar & Escolher Horário
                </button>
                <button
                  type="button"
                  onClick={() => handleScheduleDay(bestDay, bestDaySuggestedHour)}
                  className={`flex-1 md:flex-none px-5 py-2.5 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                    isBestIdeal
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                      : isBestModerate
                      ? 'bg-yellow-400 hover:bg-yellow-300 text-slate-950'
                      : 'bg-orange-500 hover:bg-orange-400 text-white'
                  }`}
                >
                  <WeatherConditionIcon
                    condition={bestDay.hourlyForecast.find(h => h.time === bestDaySuggestedHour)?.weatherCondition}
                    weatherCode={bestDay.hourlyForecast.find(h => h.time === bestDaySuggestedHour)?.weatherCode}
                    time={bestDaySuggestedHour}
                    className="w-4 h-4"
                  />
                  <span>Agendar ({bestDaySuggestedHour})</span>
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Grid of Days */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <h3 className="font-bold text-slate-900 text-sm">
              Grade Comparativa de Datas ({assessments.length} dias analisados)
            </h3>
            {isExpandedBy7Days && (
              <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded-md border border-indigo-200">
                ±7 dias expandido
              </span>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Clique em qualquer horário para selecioná-lo para o agendamento
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-emerald-600" />
            <p className="text-xs font-semibold">
              Consultando dados meteorológicos Open-Meteo para {locationName}...
            </p>
          </div>
        )}

        {/* Error state */}
        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs">
            {errorMsg}
          </div>
        )}

        {/* Empty state when no locality */}
        {!loading && (!locationSearchInput.trim() || latitude === null) && (
          <div className="p-12 text-center text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <MapPin className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">Nenhuma localidade informada</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Selecione um cliente no filtro para carregar automaticamente seu endereço ou digite uma localidade no campo acima para consultar a previsão meteorológica.
            </p>
          </div>
        )}

        {/* Grid Cards */}
        {!loading && assessments.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
            {assessments.map(day => {
              const isIdeal = day.safetyScore >= 70;
              const isModerate = day.safetyScore >= 45 && day.safetyScore < 70;
              const activeHour = selectedHourByDate[day.date] || getSafeHourOutsideHeatAlert(day);

              return (
                <div
                  key={day.date}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                    isIdeal
                      ? 'bg-emerald-50/60 border-emerald-300 hover:border-emerald-500 hover:shadow-md'
                      : isModerate
                      ? 'bg-yellow-50/50 border-yellow-200 hover:border-yellow-400 hover:shadow-xs'
                      : 'bg-orange-50/60 border-orange-200 hover:border-orange-400 hover:shadow-xs'
                  }`}
                >
                  {/* Card Top: Date & Badge */}
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <span className="font-extrabold text-slate-900 text-xs block">
                          {day.formattedDate}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold uppercase">
                          {day.dayOfWeek}
                        </span>
                      </div>

                      {/* Score Tag: Verde, Amarelo e Laranja */}
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                          day.safetyScore >= 70
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : day.safetyScore >= 45
                            ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                            : 'bg-orange-100 text-orange-900 border-orange-300'
                        }`}
                      >
                        {day.safetyScore}%
                      </span>
                    </div>

                    {/* Status Pill */}
                    <div className="mt-2">
                      <span
                        className={`text-[10px] font-bold block truncate px-2 py-1 rounded-lg ${
                          day.safetyScore >= 70
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : day.safetyScore >= 45
                            ? 'bg-yellow-500 text-slate-950 font-bold'
                            : 'bg-orange-500 text-white font-bold'
                        }`}
                        title={day.safetyStatus}
                      >
                        {day.safetyStatus}
                      </span>
                    </div>

                    {day.isSeasonalForecast && (
                      <div className="mt-1.5 px-2 py-1 bg-purple-100/90 border border-purple-200 rounded-lg text-[9px] text-purple-900 leading-tight">
                        <span className="font-extrabold text-purple-950 block">Previsão Sazonal (&gt;15d)</span>
                        <span className="text-[8.5px] text-purple-800">A precisão pode mudar drasticamente</span>
                      </div>
                    )}
                  </div>

                  {/* Core Metrics */}
                  <div className="space-y-1 text-[11px] pt-1 border-t border-slate-200/60">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="flex items-center gap-1 text-slate-500">
                        <Sun className="w-3 h-3 text-amber-500" />
                        07:00:
                      </span>
                      <span className="font-bold text-slate-900">
                        {day.targetTemperature.toFixed(0)}°C • {day.targetHumidity.toFixed(0)}% UR
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-700">
                      <span className="flex items-center gap-1 text-slate-500">
                        <Wind className="w-3 h-3 text-sky-500" />
                        Vento:
                      </span>
                      <span className={`font-bold ${day.targetWindSpeed >= 25 ? 'text-orange-600' : 'text-slate-900'}`}>
                        {day.targetWindSpeed.toFixed(1)} km/h
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-700">
                      <span className="flex items-center gap-1 text-slate-500">
                        <CloudRain className="w-3 h-3 text-blue-500" />
                        Chuva 24h:
                      </span>
                      <span className={`font-bold ${day.prior24hRainSum > 0 ? 'text-orange-600' : 'text-emerald-700'}`}>
                        {day.prior24hRainSum.toFixed(1)} mm
                      </span>
                    </div>
                  </div>

                  {/* Hourly Quick Selector Chips: Green / Yellow / Orange */}
                  <div className="space-y-1 pt-1 border-t border-slate-200/60">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>Horários:</span>
                      <span className="font-bold text-slate-700">Sel: {activeHour}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {day.hourlyForecast
                        .filter(h => [6, 7, 8, 9, 10, 11, 14, 16, 17].includes(h.hour))
                        .map(h => {
                          const isSelected = activeHour === h.time;
                          const bgClass =
                            h.severityLevel === 'green'
                              ? isSelected
                                ? 'bg-emerald-600 text-white font-black ring-2 ring-emerald-400'
                                : 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200 border border-emerald-300'
                              : h.severityLevel === 'yellow'
                              ? isSelected
                                ? 'bg-amber-500 text-white font-black ring-2 ring-amber-400'
                                : 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
                              : isSelected
                              ? 'bg-orange-500 text-white font-black ring-2 ring-orange-400'
                              : 'bg-orange-100 text-orange-900 hover:bg-orange-200 border border-orange-300';

                          return (
                            <button
                              key={h.time}
                              type="button"
                              onClick={() => handleSetDayHour(day.date, h.time)}
                              title={`${h.time}: ${h.weatherConditionLabel || h.severityLabel} (${h.temperature.toFixed(0)}°C, Vento ${h.windSpeed.toFixed(0)} km/h)`}
                              className={`flex flex-col items-center justify-center min-w-[28px] px-1 py-1 rounded-lg text-[9px] cursor-pointer transition-all ${bgClass}`}
                            >
                              <WeatherConditionIcon
                                condition={h.weatherCondition}
                                weatherCode={h.weatherCode}
                                time={h.time}
                                className={`w-3.5 h-3.5 mb-0.5 ${isSelected ? 'text-white' : ''}`}
                                showTooltip={false}
                              />
                              <span className="leading-none font-semibold">{h.time.slice(0, 2)}h</span>
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  {/* Card Bottom CTA */}
                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenInspectModal(day)}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                    >
                      Detalhes
                    </button>

                    <button
                      type="button"
                      onClick={() => handleScheduleDay(day, activeHour)}
                      className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                        isIdeal
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : isModerate
                          ? 'bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold'
                          : 'bg-orange-500 hover:bg-orange-600 text-white font-bold'
                      }`}
                      title={`Agendar para as ${activeHour} com relatório anexado`}
                    >
                      <CalendarCheck2 className="w-3 h-3" />
                      <span>Agendar às {activeHour}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && assessments.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-xs">
            Nenhuma data disponível para o filtro selecionado a partir de amanhã.
          </div>
        )}
      </div>

      {/* POPUP MODAL: Parâmetros de Segurança */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-70 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Parâmetros de Segurança
                  </h3>
                  <p className="text-xs text-slate-500">
                    Defina os limites de segurança meteorológica para a rotina.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Chuva 24h Ant. Máx</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 font-bold text-slate-800">
                  <input
                    type="number"
                    step={0.1}
                    value={tempConfig.prior24hRainMax}
                    onChange={e => setTempConfig(prev => ({ ...prev, prior24hRainMax: Number(e.target.value) }))}
                    className="w-full focus:outline-none bg-transparent"
                  />
                  <span className="text-[10px] text-slate-400">mm</span>
                </div>
                <span className="text-[10px] text-slate-400">Padrão: 0 mm</span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Umidade Madrug. Máx</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 font-bold text-slate-800">
                  <input
                    type="number"
                    value={tempConfig.priorNightHumidityMax}
                    onChange={e => setTempConfig(prev => ({ ...prev, priorNightHumidityMax: Number(e.target.value) }))}
                    className="w-full focus:outline-none bg-transparent"
                  />
                  <span className="text-[10px] text-slate-400">%</span>
                </div>
                <span className="text-[10px] text-slate-400">Padrão: 75%</span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Vento Máximo Subida</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 font-bold text-slate-800">
                  <input
                    type="number"
                    value={tempConfig.targetHourWindMax}
                    onChange={e => setTempConfig(prev => ({ ...prev, targetHourWindMax: Number(e.target.value) }))}
                    className="w-full focus:outline-none bg-transparent"
                  />
                  <span className="text-[10px] text-slate-400">km/h</span>
                </div>
                <span className="text-[10px] text-slate-400">25 km/h</span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Umidade Máx às 07h</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 font-bold text-slate-800">
                  <input
                    type="number"
                    value={tempConfig.targetHourHumidityMax}
                    onChange={e => setTempConfig(prev => ({ ...prev, targetHourHumidityMax: Number(e.target.value) }))}
                    className="w-full focus:outline-none bg-transparent"
                  />
                  <span className="text-[10px] text-slate-400">%</span>
                </div>
                <span className="text-[10px] text-slate-400">Padrão: 60%</span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Temp. Mínima Subida</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 font-bold text-slate-800">
                  <input
                    type="number"
                    value={tempConfig.targetHourTempMin}
                    onChange={e => setTempConfig(prev => ({ ...prev, targetHourTempMin: Number(e.target.value) }))}
                    className="w-full focus:outline-none bg-transparent"
                  />
                  <span className="text-[10px] text-slate-400">°C</span>
                </div>
                <span className="text-[10px] text-slate-400">Padrão: 14°C</span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Temp. Máxima Subida</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 font-bold text-slate-800">
                  <input
                    type="number"
                    value={tempConfig.targetHourTempMax}
                    onChange={e => setTempConfig(prev => ({ ...prev, targetHourTempMax: Number(e.target.value) }))}
                    className="w-full focus:outline-none bg-transparent"
                  />
                  <span className="text-[10px] text-slate-400">°C</span>
                </div>
                <span className="text-[10px] text-slate-400">Padrão: 30°C</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 space-y-1">
              <span className="font-bold block flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                Alerta de Calor (10:00 às 17:00):
              </span>
              <p>
                As placas solares atingem temperaturas de até 75°C sob sol forte. O sistema classifica esse intervalo como sugestão de desaconselhado (Laranja), mas permite agendamento consciente com hidratação e aferição térmica prévia.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTempConfig(DEFAULT_ROOFTOP_SAFETY_CONFIG)}
                className="w-full sm:w-auto px-3.5 py-2 text-indigo-600 hover:text-indigo-800 font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Padrões</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsConfigOpen(false)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="flex-1 sm:flex-none px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Salvar & Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Day Modal (NR-35 Detailed Hourly & Safety Rules Assessment) */}
      {inspectingDay && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className={`p-2 rounded-xl text-white ${
                  inspectingDay.safetyStatus === 'Altamente Seguro' ? 'bg-emerald-600' : 'bg-amber-600'
                }`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Avaliação de Risco em Telhado: {inspectingDay.formattedDate} ({inspectingDay.dayOfWeek})
                  </h3>
                  <p className="text-xs text-slate-500">
                    {locationName} • Pontuação NR-35: <strong>{inspectingDay.safetyScore}% ({inspectingDay.safetyStatus})</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectingDay(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            {inspectingDay.isSeasonalForecast && (
              <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl flex items-start gap-2.5 text-xs text-purple-900">
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold text-purple-950">
                    Atenção: Consulta Seasonal Forecast (&gt; 15 dias no futuro)
                  </strong>
                  <p className="text-[11px] text-purple-800 mt-0.5 leading-relaxed">
                    {inspectingDay.seasonalWarning || 'Previsão de longo alcance obtida via modelos climáticos sazonais. A precisão pode mudar drasticamente com a aproximação da data. Recomenda-se revalidar a previsão 48 horas antes da subida em telhado.'}
                  </p>
                </div>
              </div>
            )}

            {/* Checklist of Mandatory Rules */}
            <div className="space-y-2.5 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Info className="w-4 h-4 text-indigo-600" />
                Critérios Técnicos NR-35 Aplicados
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                {/* Rule 1: Prior 24h rain */}
                <div className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                  inspectingDay.prior24hRainSum === 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-orange-50 border-orange-200 text-orange-950'
                }`}>
                  {inspectingDay.prior24hRainSum === 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold block">1. Chuva 24h Anteriores: {inspectingDay.prior24hRainSum} mm</span>
                    <span className="text-[10px] opacity-80">Regra: 0 mm para garantir telha seca sem risco de queda.</span>
                  </div>
                </div>

                {/* Rule 2: Prior Night Humidity */}
                <div className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                  inspectingDay.priorNightAvgHumidity < 75
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-yellow-50 border-yellow-200 text-yellow-950'
                }`}>
                  {inspectingDay.priorNightAvgHumidity < 75 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold block">2. Umidade Madrugada: {inspectingDay.priorNightAvgHumidity}%</span>
                    <span className="text-[10px] opacity-80">Regra: &lt;75% para evitar condensação e orvalho espesso.</span>
                  </div>
                </div>

                {/* Rule 3: Wind at 07:00 */}
                <div className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                  inspectingDay.targetWindSpeed < 25
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-orange-50 border-orange-200 text-orange-950'
                }`}>
                  {inspectingDay.targetWindSpeed < 25 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold block">3. Vento às 07:00: {inspectingDay.targetWindSpeed.toFixed(1)} km/h</span>
                    <span className="text-[10px] opacity-80">Regra: Abaixo de 25 km/h conforme NR-35.</span>
                  </div>
                </div>

                {/* Rule 4: Temperature at 07:00 */}
                <div className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                  inspectingDay.targetTemperature >= 18 && inspectingDay.targetTemperature <= 30
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-yellow-50 border-yellow-200 text-yellow-950'
                }`}>
                  {inspectingDay.targetTemperature >= 18 && inspectingDay.targetTemperature <= 30 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold block">4. Temperatura: {inspectingDay.targetTemperature.toFixed(1)}°C</span>
                    <span className="text-[10px] opacity-80">Regra: Faixa amena entre 18°C e 30°C.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hourly Breakdown with Green, Yellow and Orange Severity Coloring */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  Selecione o Horário de Início do Agendamento:
                </h4>
                <span className="text-[11px] font-bold text-indigo-700">
                  Horário Escolhido: {modalSelectedHour}
                </span>
              </div>

              {/* Hourly interactive cards */}
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 gap-2 overflow-x-auto p-1 text-center">
                {inspectingDay.hourlyForecast.map(h => {
                  const isSelected = modalSelectedHour === h.time;
                  const cardBg =
                    h.severityLevel === 'green'
                      ? isSelected
                        ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-400 font-black shadow-md scale-105'
                        : 'bg-emerald-50 text-emerald-950 border-emerald-300 hover:bg-emerald-100'
                      : h.severityLevel === 'yellow'
                      ? isSelected
                        ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-400 font-black shadow-md scale-105'
                        : 'bg-amber-50 text-amber-950 border-amber-300 hover:bg-amber-100'
                      : isSelected
                      ? 'bg-orange-500 text-white border-orange-600 ring-2 ring-orange-400 font-black shadow-md scale-105'
                      : 'bg-orange-50 text-orange-950 border-orange-300 hover:bg-orange-100';

                  return (
                    <button
                      key={h.time}
                      type="button"
                      onClick={() => {
                        setModalSelectedHour(h.time);
                        handleSetDayHour(inspectingDay.date, h.time);
                      }}
                      className={`p-2 rounded-xl border text-[10px] transition-all cursor-pointer text-center flex flex-col items-center justify-between ${cardBg}`}
                    >
                      <WeatherConditionIcon
                        condition={h.weatherCondition}
                        weatherCode={h.weatherCode}
                        time={h.time}
                        className={`w-4 h-4 mx-auto mb-1 ${isSelected ? 'text-white' : ''}`}
                        showTooltip={false}
                      />
                      <span className="block font-bold text-xs">{h.time}</span>
                      <span className="block font-medium">{h.temperature.toFixed(0)}°C</span>
                      <span className="block text-[9px] opacity-80">{h.windSpeed.toFixed(0)} km/h</span>
                      <span className={`block w-2.5 h-2.5 rounded-full mx-auto mt-1.5 ${
                        h.severityLevel === 'green' ? 'bg-emerald-500' : h.severityLevel === 'yellow' ? 'bg-amber-500' : 'bg-orange-500'
                      }`} />
                    </button>
                  );
                })}
              </div>

              {/* Description of Selected Hour Status */}
              {(() => {
                const hourData = inspectingDay.hourlyForecast.find(h => h.time === modalSelectedHour);
                if (!hourData) return null;
                return (
                  <div className={`p-3 rounded-2xl border text-xs space-y-1 ${
                    hourData.severityLevel === 'green'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : hourData.severityLevel === 'yellow'
                      ? 'bg-amber-50 border-amber-200 text-amber-950'
                      : 'bg-orange-50 border-orange-200 text-orange-950'
                  }`}>
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5">
                        <WeatherConditionIcon
                          condition={hourData.weatherCondition}
                          weatherCode={hourData.weatherCode}
                          time={hourData.time}
                          className="w-4 h-4"
                        />
                        <span>Horário Selecionado: {modalSelectedHour} ({hourData.weatherConditionLabel || hourData.severityLabel})</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className={`w-3.5 h-3.5 rounded-full ${hourData.severityLevel === 'green' ? 'bg-emerald-500' : hourData.severityLevel === 'yellow' ? 'bg-amber-500' : 'bg-orange-500'}`} />
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      {hourData.severityLevel === 'green' && 'Horário recomendado: baixa insolação, ventos amenos e ausência de chuva. Condições excelentes para segurança em altura.'}
                      {hourData.severityLevel === 'yellow' && 'Horário com temperatura ou vento moderados. Agendamento permitido com atenção ao ritmo de trabalho.'}
                      {hourData.severityLevel === 'orange' && 'Atenção: faixa com maior insolação (módulos solares aquecidos) ou velocidade de vento elevada. O agendamento é permitido, mas redobre a hidratação e faça verificação térmica das placas.'}
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInspectingDay(null)}
                className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={() => {
                  handleScheduleDay(inspectingDay, modalSelectedHour);
                  setInspectingDay(null);
                }}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <CalendarCheck2 className="w-4 h-4" />
                <span>Agendar Atendimento às {modalSelectedHour}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
