import React, { useState, useEffect } from 'react';
import { Schedule, User } from '../types.ts';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Baby,
  UserCheck,
  AlertTriangle,
  Trash2,
  Sliders,
  Check,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

export interface DayItem {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  dailyRate: number;
}

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitBatch: (data: {
    babysitterId: string;
    days: {
      date: string;
      startTime: string;
      endTime: string;
      dailyRate: number;
    }[];
    babyName: string;
    babyAge?: string;
    notes?: string;
  }) => Promise<void>;
  onSubmitSingle?: (data: {
    babysitterId: string;
    date: string;
    startTime: string;
    endTime: string;
    dailyRate: number;
    babyName: string;
    babyAge?: string;
    notes?: string;
    applyToAllPending?: boolean;
  }) => Promise<void>;
  babysitters: User[];
  scheduleToEdit?: Schedule | null;
  clientUser: User;
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const pad2 = (n: number) => n.toString().padStart(2, '0');

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  onSubmitBatch,
  onSubmitSingle,
  babysitters,
  scheduleToEdit,
  clientUser,
}) => {
  const [babysitterId, setBabysitterId] = useState('');
  const [babyName, setBabyName] = useState('');
  const [babyAge, setBabyAge] = useState('');
  const [notes, setNotes] = useState('');

  // Mode: "same" (mesmo horário e valor para todos) or "individual" (personalizado por dia)
  const [timeMode, setTimeMode] = useState<'same' | 'individual'>('same');

  // Calendar Selection Style: "individual" (clicar nos dias) or "range" (período de check-in a check-out)
  const [calendarMode, setCalendarMode] = useState<'individual' | 'range'>('individual');
  const [rangeStart, setRangeStart] = useState<string | null>(null);

  // Global settings for "same" mode
  const [commonStartTime, setCommonStartTime] = useState('08:00');
  const [commonEndTime, setCommonEndTime] = useState('17:00');
  const [commonDailyRate, setCommonDailyRate] = useState<number | string>(180);

  // List of selected days
  const [days, setDays] = useState<DayItem[]>([]);

  // Current calendar view navigation (Month & Year)
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;

  const [viewYear, setViewYear] = useState<number>(today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth()); // 0-11

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (scheduleToEdit) {
      setBabysitterId(scheduleToEdit.babysitterId);
      setBabyName(scheduleToEdit.babyName);
      setBabyAge(scheduleToEdit.babyAge || '');
      setNotes(scheduleToEdit.notes || '');
      setDays([
        {
          id: 'edit_day',
          date: scheduleToEdit.date,
          startTime: scheduleToEdit.startTime || '08:00',
          endTime: scheduleToEdit.endTime || '17:00',
          dailyRate: scheduleToEdit.dailyRate,
        },
      ]);
      setCommonStartTime(scheduleToEdit.startTime || '08:00');
      setCommonEndTime(scheduleToEdit.endTime || '17:00');
      setCommonDailyRate(scheduleToEdit.dailyRate);

      // Focus calendar on schedule date
      try {
        const [y, m] = scheduleToEdit.date.split('-').map(Number);
        setViewYear(y);
        setViewMonth(m - 1);
      } catch {}
    } else {
      // Default to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = `${tomorrow.getFullYear()}-${pad2(tomorrow.getMonth() + 1)}-${pad2(tomorrow.getDate())}`;

      setBabyName(clientUser.babyName || '');
      setBabyAge(clientUser.babyAge || '');
      setNotes('');
      setCommonStartTime('08:00');
      setCommonEndTime('17:00');
      setCommonDailyRate(180);
      setTimeMode('same');
      setCalendarMode('individual');
      setRangeStart(null);

      setViewYear(today.getFullYear());
      setViewMonth(today.getMonth());

      setDays([
        {
          id: `day_${Date.now()}_1`,
          date: tomorrowStr,
          startTime: '08:00',
          endTime: '17:00',
          dailyRate: 180,
        },
      ]);

      if (babysitters.length > 0) {
        setBabysitterId(babysitters[0].id);
      }
    }
  }, [scheduleToEdit, isOpen, clientUser, babysitters]);

  if (!isOpen) return null;

  // Calendar month navigation
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(prev => prev - 1);
      setViewMonth(11);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(prev => prev + 1);
      setViewMonth(0);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  // Determine if previous month navigation should be disabled (cannot go before current month)
  const isPrevMonthDisabled =
    viewYear < today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth <= today.getMonth());

  // Hotel-style Day Click
  const handleDayClick = (dateStr: string) => {
    if (dateStr < todayStr) return; // Cannot select past dates

    if (scheduleToEdit) {
      // In edit mode, change the single day
      setDays([
        {
          id: 'edit_day',
          date: dateStr,
          startTime: commonStartTime,
          endTime: commonEndTime,
          dailyRate: Number(commonDailyRate) || 180,
        },
      ]);
      return;
    }

    if (calendarMode === 'range') {
      if (!rangeStart) {
        // First click: sets range start
        setRangeStart(dateStr);
        setDays([
          {
            id: `day_${Date.now()}_1`,
            date: dateStr,
            startTime: commonStartTime,
            endTime: commonEndTime,
            dailyRate: Number(commonDailyRate) || 180,
          },
        ]);
      } else {
        // Second click: sets range end and populates all dates between
        let start = rangeStart;
        let end = dateStr;
        if (start > end) {
          [start, end] = [end, start];
        }

        const [sy, sm, sd] = start.split('-').map(Number);
        const [ey, em, ed] = end.split('-').map(Number);

        const curDate = new Date(sy, sm - 1, sd);
        const endDate = new Date(ey, em - 1, ed);

        const newDays: DayItem[] = [];
        let counter = 1;
        while (curDate <= endDate) {
          const dStr = `${curDate.getFullYear()}-${pad2(curDate.getMonth() + 1)}-${pad2(curDate.getDate())}`;
          newDays.push({
            id: `day_${Date.now()}_${counter++}`,
            date: dStr,
            startTime: commonStartTime,
            endTime: commonEndTime,
            dailyRate: Number(commonDailyRate) || 180,
          });
          curDate.setDate(curDate.getDate() + 1);
        }

        setDays(newDays);
        setRangeStart(null);
      }
    } else {
      // Individual toggle mode: click to add or remove!
      const exists = days.some(d => d.date === dateStr);
      if (exists) {
        if (days.length <= 1) {
          setError('Mantenha pelo menos um dia selecionado no calendário.');
          return;
        }
        setError(null);
        setDays(prev => prev.filter(d => d.date !== dateStr));
      } else {
        setError(null);
        const newDay: DayItem = {
          id: `day_${Date.now()}_${Math.random()}`,
          date: dateStr,
          startTime: commonStartTime,
          endTime: commonEndTime,
          dailyRate: Number(commonDailyRate) || 180,
        };
        setDays(prev => [...prev, newDay].sort((a, b) => a.date.localeCompare(b.date)));
      }
    }
  };

  const handleRemoveDate = (id: string) => {
    if (days.length <= 1 && !scheduleToEdit) {
      setError('Mantenha pelo menos um dia selecionado.');
      return;
    }
    setDays(prev => prev.filter(d => d.id !== id));
  };

  // Quick Preset Handlers
  const handleQuickAddDays = (count: number) => {
    const newAdded: DayItem[] = [];
    const baseDate = new Date(today);

    for (let i = 1; i <= count; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      const str = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      newAdded.push({
        id: `day_${Date.now()}_${i}`,
        date: str,
        startTime: commonStartTime,
        endTime: commonEndTime,
        dailyRate: Number(commonDailyRate) || 180,
      });
    }

    setDays(newAdded);
    setError(null);
  };

  const handleSelectWeekends = () => {
    // Select remaining weekends in the currently viewed month
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    const newAdded: DayItem[] = [];

    for (let day = 1; day <= totalDays; day++) {
      const dStr = `${viewYear}-${pad2(viewMonth + 1)}-${pad2(day)}`;
      if (dStr >= todayStr) {
        const dObj = new Date(viewYear, viewMonth, day);
        const dayOfWeek = dObj.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          // Saturday or Sunday
          newAdded.push({
            id: `day_${Date.now()}_${day}`,
            date: dStr,
            startTime: commonStartTime,
            endTime: commonEndTime,
            dailyRate: Number(commonDailyRate) || 180,
          });
        }
      }
    }

    if (newAdded.length > 0) {
      setDays(newAdded);
      setError(null);
    } else {
      setError('Não há finais de semana futuros restantes neste mês.');
    }
  };

  // Update day item fields (when in individual mode)
  const updateDayField = (id: string, field: keyof DayItem, value: any) => {
    setDays(prev =>
      prev.map(d => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  // When common values change in "same" mode, update all days
  const handleCommonTimeChange = (start: string, end: string, rate: number | string) => {
    setCommonStartTime(start);
    setCommonEndTime(end);
    setCommonDailyRate(rate);

    const numRate = Number(rate) || 0;
    setDays(prev =>
      prev.map(d => ({
        ...d,
        startTime: start,
        endTime: end,
        dailyRate: numRate > 0 ? numRate : d.dailyRate,
      }))
    );
  };

  const totalInvestment = days.reduce(
    (acc, d) => acc + (timeMode === 'same' ? Number(commonDailyRate) || 0 : Number(d.dailyRate) || 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!babysitterId) {
      setError('Por favor, selecione uma babá cadastrada.');
      return;
    }

    if (days.length === 0) {
      setError('Selecione pelo menos um dia no calendário.');
      return;
    }

    // Validate rates
    for (const d of days) {
      const rate = timeMode === 'same' ? Number(commonDailyRate) : Number(d.dailyRate);
      if (isNaN(rate) || rate <= 0) {
        setError(`O valor da diária para o dia ${d.date} deve ser maior que zero.`);
        return;
      }
    }

    setLoading(true);
    try {
      if (scheduleToEdit && onSubmitSingle) {
        const target = days[0];
        await onSubmitSingle({
          babysitterId,
          date: target.date,
          startTime: timeMode === 'same' ? commonStartTime : target.startTime,
          endTime: timeMode === 'same' ? commonEndTime : target.endTime,
          dailyRate: timeMode === 'same' ? Number(commonDailyRate) : Number(target.dailyRate),
          babyName: babyName || clientUser.babyName || 'Bebê',
          babyAge,
          notes,
          applyToAllPending: timeMode === 'same',
        });
      } else {
        const payloadDays = days.map(d => ({
          date: d.date,
          startTime: timeMode === 'same' ? commonStartTime : d.startTime,
          endTime: timeMode === 'same' ? commonEndTime : d.endTime,
          dailyRate: timeMode === 'same' ? Number(commonDailyRate) : Number(d.dailyRate),
        }));

        await onSubmitBatch({
          babysitterId,
          days: payloadDays,
          babyName: babyName || clientUser.babyName || 'Bebê',
          babyAge,
          notes,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar agendamento.');
    } finally {
      setLoading(false);
    }
  };

  const selectedBabysitter = babysitters.find(b => b.id === babysitterId);

  // Helper formatting Brazilian day of week
  const formatWeekday = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  // Generate Calendar Grid for currently viewed month
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Dom, 6 = Sáb
  const totalDaysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const selectedDatesSet = new Set(days.map(d => d.date));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-200 max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                {scheduleToEdit ? 'Editar Dia Agendado' : 'Agendar Dias com a Babá'}
              </h3>
              <p className="text-white/90 text-xs flex items-center gap-1.5 mt-0.5">
                <Sparkles className="w-3.5 h-3.5" />
                Selecione as datas direto no calendário mensal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors text-xl leading-none"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2 text-rose-800 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Validation Rule Banner */}
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3 text-amber-900 text-xs flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center shrink-0 font-bold text-[10px]">
              !
            </div>
            <div className="leading-relaxed">
              <strong className="font-semibold">Regra de Validação:</strong> Ao enviar, a babá
              analisa os dias e dá o <strong>OK</strong>. Quando ela der OK, as datas e valores ficam{' '}
              <strong>travados</strong> contra alterações.
            </div>
          </div>

          {/* Babysitter Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-rose-500" />
              Selecione a Babá
            </label>
            {babysitters.length === 0 ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                Nenhuma babá cadastrada no sistema. Cadastre uma conta com o perfil "Babá" para selecioná-la.
              </div>
            ) : (
              <select
                value={babysitterId}
                onChange={e => setBabysitterId(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white font-medium"
              >
                {babysitters.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} — {b.phone || 'Sem telefone'} {b.bio ? `(${b.bio.slice(0, 35)}...)` : ''}
                  </option>
                ))}
              </select>
            )}
            {selectedBabysitter && (
              <div className="mt-1.5 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center justify-between">
                <span>Contato: <strong>{selectedBabysitter.phone || 'Não informado'}</strong></span>
                {selectedBabysitter.pixKey && (
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 font-medium">
                    Chave Pix: {selectedBabysitter.pixKey}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* HOTEL-STYLE CALENDAR SELECTOR */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-3xl p-4 sm:p-5 space-y-4 shadow-2xs">
            {/* Top Bar: Title & Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CalendarIcon className="w-4 h-4 text-rose-500" />
                  Calendário Mensal de Diárias
                </div>
                <div className="text-[11px] text-slate-500">
                  {calendarMode === 'individual'
                    ? 'Clique nos dias desejados para marcar ou desmarcar'
                    : rangeStart
                    ? `Data inicial: ${formatWeekday(rangeStart)}. Agora clique no último dia!`
                    : 'Clique na data inicial e depois na data final'}
                </div>
              </div>

              {!scheduleToEdit && (
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs self-start sm:self-auto text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setCalendarMode('individual');
                      setRangeStart(null);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      calendarMode === 'individual'
                        ? 'bg-rose-500 text-white font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🖱️ Clicar nos Dias
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCalendarMode('range');
                      setRangeStart(null);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      calendarMode === 'range'
                        ? 'bg-rose-500 text-white font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📅 Intervalo (De... Até)
                  </button>
                </div>
              )}
            </div>

            {/* Quick Presets Bar */}
            {!scheduleToEdit && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                <span className="text-slate-400 font-medium mr-1">Atalhos rápidos:</span>
                <button
                  type="button"
                  onClick={() => handleQuickAddDays(3)}
                  className="px-2.5 py-1 bg-white border border-slate-200 hover:border-rose-300 hover:text-rose-600 rounded-lg shadow-2xs transition-colors"
                >
                  +3 Dias Seguidos
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAddDays(5)}
                  className="px-2.5 py-1 bg-white border border-slate-200 hover:border-rose-300 hover:text-rose-600 rounded-lg shadow-2xs transition-colors"
                >
                  +5 Dias (Seg a Sex)
                </button>
                <button
                  type="button"
                  onClick={handleSelectWeekends}
                  className="px-2.5 py-1 bg-white border border-slate-200 hover:border-rose-300 hover:text-rose-600 rounded-lg shadow-2xs transition-colors"
                >
                  Finais de Semana do Mês
                </button>
                {days.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      // Keep only tomorrow to maintain at least 1 day
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      const tStr = `${tomorrow.getFullYear()}-${pad2(tomorrow.getMonth() + 1)}-${pad2(tomorrow.getDate())}`;
                      setDays([
                        {
                          id: `day_${Date.now()}`,
                          date: tStr,
                          startTime: commonStartTime,
                          endTime: commonEndTime,
                          dailyRate: Number(commonDailyRate) || 180,
                        },
                      ]);
                      setRangeStart(null);
                    }}
                    className="px-2 py-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors ml-auto flex items-center gap-1"
                    title="Redefinir seleção"
                  >
                    <RotateCcw className="w-3 h-3" /> Limpar
                  </button>
                )}
              </div>
            )}

            {/* Calendar Box */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-3 px-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  disabled={isPrevMonthDisabled}
                  className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Mês anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="text-center">
                  <span className="font-extrabold text-sm sm:text-base text-slate-800 tracking-tight">
                    {MONTH_NAMES[viewMonth]} {viewYear}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  aria-label="Próximo mês"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {WEEKDAY_NAMES.map((w, idx) => (
                  <div
                    key={w}
                    className={`text-[11px] font-bold py-1 ${
                      idx === 0 || idx === 6 ? 'text-rose-500' : 'text-slate-400'
                    }`}
                  >
                    {w}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty slots before first day */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty_${i}`} className="h-9 sm:h-11" />
                ))}

                {/* Month Days */}
                {Array.from({ length: totalDaysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${viewYear}-${pad2(viewMonth + 1)}-${pad2(dayNum)}`;
                  const isPast = dateStr < todayStr;
                  const isToday = dateStr === todayStr;
                  const isSelected = selectedDatesSet.has(dateStr);
                  const isRangeStart = rangeStart === dateStr;

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      disabled={isPast}
                      onClick={() => handleDayClick(dateStr)}
                      className={`h-9 sm:h-11 rounded-xl flex flex-col items-center justify-center text-xs sm:text-sm font-semibold transition-all relative select-none ${
                        isPast
                          ? 'text-slate-300 opacity-40 cursor-not-allowed bg-slate-50/50'
                          : isSelected || isRangeStart
                          ? 'bg-gradient-to-tr from-rose-500 to-rose-600 text-white font-bold shadow-md shadow-rose-500/20 scale-[1.02] ring-2 ring-rose-200'
                          : 'text-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:font-bold'
                      }`}
                    >
                      <span>{dayNum}</span>

                      {/* Small visual indicators */}
                      {isToday && !isSelected && (
                        <span className="w-1 h-1 rounded-full bg-amber-500 mt-0.5" />
                      )}
                      {(isSelected || isRangeStart) && (
                        <span className="text-[9px] font-bold leading-none mt-0.5 opacity-90">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Days Pills Summary */}
            <div className="pt-1">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  {days.length} {days.length === 1 ? 'diária selecionada' : 'diárias selecionadas'}:
                </span>
                <span className="text-[11px] text-slate-400">
                  Clique no ✕ para desmarcar qualquer data
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {days.map(d => (
                  <span
                    key={d.id}
                    className="inline-flex items-center gap-1.5 bg-white border border-rose-200 text-rose-800 text-xs px-2.5 py-1 rounded-xl shadow-2xs"
                  >
                    <CalendarIcon className="w-3 h-3 text-rose-500" />
                    <strong>{formatWeekday(d.date)}</strong> ({d.date.split('-').slice(1).reverse().join('/')})
                    {days.length > 1 && !scheduleToEdit && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDate(d.id)}
                        className="text-rose-400 hover:text-rose-700 hover:bg-rose-50 p-0.5 rounded-full transition-colors ml-0.5"
                        title="Remover data"
                      >
                        ✕
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* TIME & RATE CONFIGURATION */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-slate-600" />
                Horários e Valores das Diárias:
              </label>

              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-[11px] font-semibold self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setTimeMode('same')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    timeMode === 'same'
                      ? 'bg-white text-rose-600 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {scheduleToEdit ? 'Replicar para todos os dias' : 'Mesmo para todos os dias'}
                </button>
                <button
                  type="button"
                  onClick={() => setTimeMode('individual')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    timeMode === 'individual'
                      ? 'bg-white text-rose-600 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {scheduleToEdit ? 'Apenas este dia' : 'Personalizar por data'}
                </button>
              </div>
            </div>

            {/* OPTION A: SAME HOURS & RATE FOR ALL DAYS */}
            {timeMode === 'same' ? (
              <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4 space-y-3">
                <div className="text-[11px] text-rose-800 font-medium flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  {scheduleToEdit ? (
                    <span>
                      <strong>Replicar para todos:</strong> Ao salvar, este horário e valor serão aplicados{' '}
                      <strong>a todos os seus dias pendentes</strong> com esta babá!
                    </span>
                  ) : (
                    <span>
                      Horários e valor aplicados para todos os {days.length} dia(s) selecionados no calendário:
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> Início
                    </label>
                    <input
                      type="time"
                      value={commonStartTime}
                      onChange={e =>
                        handleCommonTimeChange(e.target.value, commonEndTime, commonDailyRate)
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-400 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> Término
                    </label>
                    <input
                      type="time"
                      value={commonEndTime}
                      onChange={e =>
                        handleCommonTimeChange(commonStartTime, e.target.value, commonDailyRate)
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-400 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Valor Diária (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={commonDailyRate}
                      onChange={e =>
                        handleCommonTimeChange(commonStartTime, commonEndTime, e.target.value)
                      }
                      placeholder="180.00"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-400 font-bold text-emerald-700"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* OPTION B: INDIVIDUAL ADJUSTMENT FOR EACH DAY */
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                <div className="text-[11px] text-slate-500 italic mb-1">
                  Ajuste horários ou valores diferentes para cada dia selecionado:
                </div>
                {days.map(d => (
                  <div
                    key={d.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-3"
                  >
                    <div className="sm:w-36 shrink-0">
                      <div className="font-bold text-xs text-slate-800">
                        {formatWeekday(d.date)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{d.date}</div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 flex-1">
                      <div>
                        <span className="block text-[10px] text-slate-400 mb-0.5">Início</span>
                        <input
                          type="time"
                          value={d.startTime}
                          onChange={e => updateDayField(d.id, 'startTime', e.target.value)}
                          className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-400"
                        />
                      </div>

                      <div>
                        <span className="block text-[10px] text-slate-400 mb-0.5">Término</span>
                        <input
                          type="time"
                          value={d.endTime}
                          onChange={e => updateDayField(d.id, 'endTime', e.target.value)}
                          className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-400"
                        />
                      </div>

                      <div>
                        <span className="block text-[10px] text-slate-400 mb-0.5">Valor (R$)</span>
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          value={d.dailyRate}
                          onChange={e => updateDayField(d.id, 'dailyRate', Number(e.target.value))}
                          className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-400 font-bold text-emerald-700"
                        />
                      </div>
                    </div>

                    {days.length > 1 && !scheduleToEdit && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDate(d.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors self-center"
                        title="Remover dia"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total investment summary */}
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="text-xs text-emerald-900">
              <span className="font-bold">Resumo do Agendamento:</span>
              <div className="text-[11px] text-emerald-700 mt-0.5">
                {days.length} diária(s) selecionada(s)
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-emerald-600 block uppercase font-bold tracking-wider">
                Investimento Total
              </span>
              <span className="text-xl font-black text-emerald-800">
                R$ {totalInvestment.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Baby Info */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Baby className="w-3.5 h-3.5 text-rose-400" />
                Nome do Bebê
              </label>
              <input
                type="text"
                value={babyName}
                onChange={e => setBabyName(e.target.value)}
                placeholder="Ex: Bernardo"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Idade / Meses
              </label>
              <input
                type="text"
                value={babyAge}
                onChange={e => setBabyAge(e.target.value)}
                placeholder="Ex: 1 ano e 2 meses"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white font-medium"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observações & Orientações para a Babá
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Almoço às 12h, soneca às 13h30. Remédio caso tenha febre..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white font-medium"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || days.length === 0}
              className="flex-2 py-2.5 px-4 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-50 rounded-xl shadow-md shadow-rose-500/25 transition-all flex items-center justify-center gap-1.5"
            >
              {loading
                ? 'Enviando...'
                : scheduleToEdit
                ? timeMode === 'same'
                  ? 'Salvar e Replicar para Todos os Dias'
                  : 'Atualizar Apenas Este Dia'
                : `Enviar ${days.length} Dia(s) para a Babá`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
