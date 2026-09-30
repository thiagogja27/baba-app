import React, { useState, useMemo } from 'react';
import { Schedule, User } from '../types.ts';
import { formatDateBR, formatDateWithWeekdayBR, calculateHoursDuration } from '../utils/date.ts';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  Baby,
  Sparkles,
  Lock,
  ThumbsUp,
  CreditCard,
  XCircle,
  X,
  MessageSquare,
  Package,
  Users,
  Filter,
  Trash2,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  ListFilter,
  DollarSign,
  Eraser,
  Check,
} from 'lucide-react';

interface BabysitterDashboardProps {
  user: User;
  schedules: Schedule[];
  onValidateSchedule: (scheduleId: string, validateEntirePackage?: boolean) => Promise<void>;
  onRejectSchedule: (scheduleId: string, reason?: string, rejectEntirePackage?: boolean) => Promise<void>;
  onConfirmPayment: (scheduleId: string, confirmEntirePackage?: boolean) => Promise<void>;
  onDeleteSchedule?: (scheduleId: string) => Promise<void>;
  onClearPaidSchedules?: (clientId?: string) => Promise<void>;
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

export const BabysitterDashboard: React.FC<BabysitterDashboardProps> = ({
  user,
  schedules,
  onValidateSchedule,
  onRejectSchedule,
  onConfirmPayment,
  onDeleteSchedule,
  onClearPaidSchedules,
}) => {
  // View mode: 'list' (seções) or 'calendar' (grade mensal)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Filter by client: 'all' or specific clientId
  const [selectedClientId, setSelectedClientId] = useState<string>('all');

  // Calendar month/year navigation state
  const today = new Date();
  const [calYear, setCalYear] = useState<number>(today.getFullYear());
  const [calMonth, setCalMonth] = useState<number>(today.getMonth()); // 0-11

  // Confirmation Modal state for validate/reject/confirm_pay
  const [confirmModal, setConfirmModal] = useState<{
    type: 'validate' | 'reject' | 'confirm_pay';
    schedule: Schedule;
  } | null>(null);

  const [applyToPackage, setApplyToPackage] = useState(true);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Delete Paid confirmation modal state
  const [deletePaidModal, setDeletePaidModal] = useState<{
    type: 'single' | 'clear_all';
    schedule?: Schedule;
  } | null>(null);

  // Build unique client list for filtering
  const clientsList = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        phone: string;
        totalPaid: number;
        totalPending: number;
        schedulesCount: number;
      }
    >();

    schedules.forEach(s => {
      const existing = map.get(s.clientId) || {
        id: s.clientId,
        name: s.clientName,
        phone: s.clientPhone || '',
        totalPaid: 0,
        totalPending: 0,
        schedulesCount: 0,
      };

      existing.schedulesCount += 1;
      if (s.status === 'paid_confirmed') {
        existing.totalPaid += s.dailyRate;
      } else if (s.status === 'validated' || s.status === 'payment_pending') {
        existing.totalPending += s.dailyRate;
      }
      map.set(s.clientId, existing);
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [schedules]);

  // Schedules filtered by selected client
  const filteredSchedules = useMemo(() => {
    if (selectedClientId === 'all') return schedules;
    return schedules.filter(s => s.clientId === selectedClientId);
  }, [schedules, selectedClientId]);

  // Group schedules by priority action from filtered list
  const pendingValidation = filteredSchedules.filter(s => s.status === 'pending_validation');
  const paymentPendingConfirmation = filteredSchedules.filter(s => s.status === 'payment_pending');
  const validatedAwaitingPayment = filteredSchedules.filter(s => s.status === 'validated');
  const paidConfirmed = filteredSchedules.filter(s => s.status === 'paid_confirmed');
  const rejectedSchedules = filteredSchedules.filter(s => s.status === 'rejected');

  const totalEarned = paidConfirmed.reduce((acc, s) => acc + s.dailyRate, 0);
  const totalPendingPayment = [...validatedAwaitingPayment, ...paymentPendingConfirmation].reduce(
    (acc, s) => acc + s.dailyRate,
    0
  );

  const selectedClientInfo = clientsList.find(c => c.id === selectedClientId);

  // Calendar calculations
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay(); // 0 = Dom, 6 = Sáb
  const totalDaysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const prevMonthTotalDays = new Date(calYear, calMonth, 0).getDate();

  // Calendar month statistics
  const currentMonthSchedules = useMemo(() => {
    return filteredSchedules.filter(s => {
      const [y, m] = s.date.split('-').map(Number);
      return y === calYear && m === calMonth + 1;
    });
  }, [filteredSchedules, calYear, calMonth]);

  const monthTotalInvested = currentMonthSchedules.reduce((acc, s) => acc + s.dailyRate, 0);
  const monthEarned = currentMonthSchedules
    .filter(s => s.status === 'paid_confirmed')
    .reduce((acc, s) => acc + s.dailyRate, 0);
  const monthPending = monthTotalInvested - monthEarned;

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(prev => prev - 1);
    } else {
      setCalMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(prev => prev + 1);
    } else {
      setCalMonth(prev => prev + 1);
    }
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setCalYear(now.getFullYear());
    setCalMonth(now.getMonth());
  };

  // Actions opening modal
  const handleOpenValidate = (schedule: Schedule) => {
    setActionError(null);
    setApplyToPackage(true);
    setConfirmModal({ type: 'validate', schedule });
  };

  const handleOpenReject = (schedule: Schedule) => {
    setActionError(null);
    setRejectReason('');
    setApplyToPackage(true);
    setConfirmModal({ type: 'reject', schedule });
  };

  const handleOpenConfirmPay = (schedule: Schedule) => {
    setActionError(null);
    setApplyToPackage(true);
    setConfirmModal({ type: 'confirm_pay', schedule });
  };

  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    setActionLoading(true);
    setActionError(null);

    const isPackageAction = Boolean(confirmModal.schedule.isPackage && applyToPackage);

    try {
      if (confirmModal.type === 'validate') {
        await onValidateSchedule(confirmModal.schedule.id, isPackageAction);
      } else if (confirmModal.type === 'reject') {
        await onRejectSchedule(confirmModal.schedule.id, rejectReason.trim() || undefined, isPackageAction);
      } else if (confirmModal.type === 'confirm_pay') {
        await onConfirmPayment(confirmModal.schedule.id, isPackageAction);
      }
      setConfirmModal(null);
    } catch (err: any) {
      setActionError(err.message || 'Erro ao processar ação');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete paid handlers
  const handleOpenDeleteSinglePaid = (schedule: Schedule) => {
    setActionError(null);
    setDeletePaidModal({ type: 'single', schedule });
  };

  const handleOpenClearAllPaid = () => {
    setActionError(null);
    setDeletePaidModal({ type: 'clear_all' });
  };

  const handleConfirmDeletePaid = async () => {
    if (!deletePaidModal) return;
    setActionLoading(true);
    setActionError(null);

    try {
      if (deletePaidModal.type === 'single' && deletePaidModal.schedule) {
        if (onDeleteSchedule) {
          await onDeleteSchedule(deletePaidModal.schedule.id);
        }
      } else if (deletePaidModal.type === 'clear_all') {
        if (onClearPaidSchedules) {
          await onClearPaidSchedules(selectedClientId === 'all' ? undefined : selectedClientId);
        }
      }
      setDeletePaidModal(null);
    } catch (err: any) {
      setActionError(err.message || 'Erro ao apagar valor pago.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome & Earnings Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Painel Profissional da Babá
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Olá, {user.name}!
            </h1>
            <p className="text-white/90 text-sm leading-relaxed">
              Aqui você valida as solicitações com <strong>OK</strong>, visualiza seus agendamentos no{' '}
              <strong>calendário com dias e valores na tela</strong>, filtra por cliente e gerencia seu histórico.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl min-w-[140px]">
              <span className="text-xs text-white/80 block">
                {selectedClientId === 'all' ? 'Total Já Recebido' : 'Recebido deste Cliente'}
              </span>
              <span className="text-2xl font-black text-white">R$ {totalEarned.toFixed(2)}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl min-w-[140px]">
              <span className="text-xs text-white/80 block">
                {selectedClientId === 'all' ? 'A Receber' : 'Pendente deste Cliente'}
              </span>
              <span className="text-2xl font-black text-white">R$ {totalPendingPayment.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & VIEW TOGGLE TOOLBAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Client Filter Dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 shrink-0">
            <Filter className="w-4 h-4 text-emerald-600" />
            <span>Filtrar por Cliente:</span>
          </div>

          <div className="relative flex-1 max-w-md">
            <select
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
              className="w-full pl-3 pr-8 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white text-slate-800"
            >
              <option value="all">
                🌟 Todos os Clientes ({clientsList.length} cadastrados • Total R${' '}
                {schedules
                  .filter(s => s.status === 'paid_confirmed')
                  .reduce((acc, s) => acc + s.dailyRate, 0)
                  .toFixed(2)}{' '}
                recebidos)
              </option>
              {clientsList.map(c => (
                <option key={c.id} value={c.id}>
                  👤 {c.name} — R$ {c.totalPaid.toFixed(2)} recebidos ({c.schedulesCount} diárias)
                </option>
              ))}
            </select>
          </div>

          {selectedClientId !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedClientId('all')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors shrink-0"
              title="Limpar filtro de cliente"
            >
              <X className="w-3.5 h-3.5" /> Limpar Filtro
            </button>
          )}
        </div>

        {/* View Mode Toggle: Lista vs. Calendário */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              viewMode === 'list'
                ? 'bg-white text-emerald-700 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            Visão em Lista
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              viewMode === 'calendar'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Visão em Calendário
          </button>
        </div>
      </div>

      {/* FILTER ACTIVE BANNER */}
      {selectedClientId !== 'all' && selectedClientInfo && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="text-indigo-950">
              Exibindo apenas agendamentos da cliente: <strong>{selectedClientInfo.name}</strong>
              {selectedClientInfo.phone ? ` (${selectedClientInfo.phone})` : ''}
            </span>
          </div>
          <div className="flex items-center gap-3 font-semibold">
            <span className="text-emerald-700">
              Recebido: <strong>R$ {selectedClientInfo.totalPaid.toFixed(2)}</strong>
            </span>
            <span className="text-amber-700">
              Pendente: <strong>R$ {selectedClientInfo.totalPending.toFixed(2)}</strong>
            </span>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW MODE 1: VISÃO EM CALENDÁRIO COM DIAS E VALORES NA TELA */}
      {/* ============================================================== */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5 sm:p-6 animate-in fade-in duration-200">
          {/* Calendar Header with Navigation and Month Metrics */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800">
                  {MONTH_NAMES[calMonth]} de {calYear}
                </h2>
                <div className="text-xs text-slate-500">
                  {currentMonthSchedules.length} agendamento(s) neste mês
                </div>
              </div>
            </div>

            {/* Navigation Buttons & Month Totals */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center bg-slate-100 rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
                  title="Mês anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleCurrentMonth}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
                >
                  Mês Atual
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
                  title="Próximo mês"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Month Financial Badges */}
              <div className="flex items-center gap-2 text-xs">
                <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl font-bold text-emerald-800">
                  <span className="text-[10px] text-emerald-600 block font-normal">Já Recebido:</span>
                  R$ {monthEarned.toFixed(2)}
                </div>
                <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl font-bold text-amber-800">
                  <span className="text-[10px] text-amber-600 block font-normal">A Receber:</span>
                  R$ {monthPending.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Calendar Grid 7 Columns */}
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                {WEEKDAY_NAMES.map((wd, i) => (
                  <div key={wd} className={`py-1.5 rounded-lg ${i === 0 || i === 6 ? 'bg-rose-50/50 text-rose-600' : 'bg-slate-50'}`}>
                    {wd}
                  </div>
                ))}
              </div>

              {/* Calendar Days Matrix */}
              <div className="grid grid-cols-7 gap-2">
                {/* Previous month trailing days */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => {
                  const dayNum = prevMonthTotalDays - firstDayOfWeek + i + 1;
                  return (
                    <div
                      key={`prev-${i}`}
                      className="min-h-[105px] p-2 bg-slate-50/40 border border-slate-100 rounded-2xl opacity-40"
                    >
                      <span className="text-[11px] font-medium text-slate-400">{dayNum}</span>
                    </div>
                  );
                })}

                {/* Current month days */}
                {Array.from({ length: totalDaysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${calYear}-${pad2(calMonth + 1)}-${pad2(dayNum)}`;
                  const isToday =
                    dayNum === today.getDate() &&
                    calMonth === today.getMonth() &&
                    calYear === today.getFullYear();

                  const daySchedules = filteredSchedules.filter(s => s.date === dateStr);
                  const dayTotal = daySchedules.reduce((acc, s) => acc + s.dailyRate, 0);

                  return (
                    <div
                      key={dateStr}
                      className={`min-h-[115px] p-2 border rounded-2xl flex flex-col justify-between transition-colors ${
                        isToday
                          ? 'bg-rose-50/30 border-rose-300 ring-2 ring-rose-200'
                          : daySchedules.length > 0
                          ? 'bg-white border-slate-300 shadow-2xs hover:border-emerald-400'
                          : 'bg-white border-slate-200/80 hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Day number & total daily value */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`text-xs font-bold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                            isToday
                              ? 'bg-rose-500 text-white font-black'
                              : daySchedules.length > 0
                              ? 'bg-slate-800 text-white'
                              : 'text-slate-700'
                          }`}
                        >
                          {dayNum}
                        </span>

                        {dayTotal > 0 && (
                          <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md">
                            R$ {dayTotal.toFixed(0)}
                          </span>
                        )}
                      </div>

                      {/* Schedules list inside calendar cell */}
                      <div className="space-y-1.5 flex-1">
                        {daySchedules.map(sch => {
                          const isPending = sch.status === 'pending_validation';
                          const isValidated = sch.status === 'validated';
                          const isPaymentPending = sch.status === 'payment_pending';
                          const isPaid = sch.status === 'paid_confirmed';

                          return (
                            <button
                              key={sch.id}
                              type="button"
                              onClick={() => {
                                if (isPending) handleOpenValidate(sch);
                                else if (isPaymentPending) handleOpenConfirmPay(sch);
                                else if (isPaid) handleOpenDeleteSinglePaid(sch);
                              }}
                              className={`w-full text-left p-1.5 rounded-xl border text-[11px] transition-all hover:scale-[1.02] shadow-2xs flex flex-col gap-0.5 ${
                                isPending
                                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                                  : isValidated
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                                  : isPaymentPending
                                  ? 'bg-blue-50 border-blue-300 text-blue-950'
                                  : isPaid
                                  ? 'bg-slate-100 border-slate-300 text-slate-800'
                                  : 'bg-rose-50 border-rose-200 text-rose-800 line-through'
                              }`}
                            >
                              <div className="flex items-center justify-between font-bold">
                                <span className="truncate max-w-[85px]">{sch.clientName}</span>
                                <span className="text-emerald-700 font-extrabold shrink-0">
                                  R${sch.dailyRate.toFixed(0)}
                                </span>
                              </div>

                              <div className="text-[10px] text-slate-500 flex items-center justify-between">
                                <span className="font-medium text-slate-600">
                                  {sch.startTime}-{sch.endTime} ({calculateHoursDuration(sch.startTime, sch.endTime)})
                                </span>
                                {sch.isPackage && (
                                  <span className="text-[9px] bg-indigo-100 text-indigo-700 font-bold px-1 rounded">
                                    Pacote
                                  </span>
                                )}
                              </div>

                              <div className="text-[9px] font-semibold mt-0.5">
                                {isPending && <span className="text-amber-700">⏳ Aguarda OK</span>}
                                {isValidated && <span className="text-emerald-700">✓ Validado</span>}
                                {isPaymentPending && <span className="text-blue-700 font-bold">💳 Confirmar Pix</span>}
                                {isPaid && <span className="text-slate-600">✓ Pago</span>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Color Legend for Calendar */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <span className="font-bold text-slate-700">Legenda do Calendário:</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-400 border border-amber-500" />
              Solicitação Aguardando OK
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-400 border border-emerald-500" />
              Validado com OK (Aguardando Pagamento)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-400 border border-blue-500" />
              Pagamento Informado (Pronto para Confirmar PIX)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-300 border border-slate-400" />
              Pago & Confirmado (Concluído)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-indigo-100 text-indigo-700 font-black text-[9px] flex items-center justify-center">
                P
              </span>
              Pacote Fechado
            </span>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW MODE 2: VISÃO EM LISTA (COM SEÇÕES E HISTÓRICO PAGO)     */}
      {/* ============================================================== */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          {/* SECTION 1: SOLICITAÇÕES AGUARDANDO SEU OK OU RECUSA */}
          <div className="bg-white rounded-3xl border border-amber-200 shadow-sm overflow-hidden">
            <div className="bg-amber-50/80 p-5 border-b border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                  !
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Solicitações Aguardando seu OK ({pendingValidation.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Dê o seu OK para validar e travar o dia (impedindo a cliente de editar ou cancelar).
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5">
              {pendingValidation.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Nenhuma solicitação pendente de validação no momento.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingValidation.map(schedule => (
                    <div
                      key={schedule.id}
                      className="bg-amber-50/30 border-2 border-amber-300/80 rounded-2xl p-5 space-y-4 hover:border-amber-400 transition-colors flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        {schedule.isPackage && (
                          <div>
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-1 rounded-xl shadow-2xs">
                              <Package className="w-3.5 h-3.5 text-indigo-600" />
                              Proposta de Pacote Fechado ({schedule.packageDaysCount} dias • R${' '}
                              {schedule.packageTotal?.toFixed(2)} total)
                            </span>
                          </div>
                        )}

                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                              Nova Solicitação
                            </span>
                            <h3 className="font-bold text-slate-800 text-base mt-1">
                              {schedule.clientName}
                            </h3>
                            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                              <Phone className="w-3 h-3" /> {schedule.clientPhone || 'Sem telefone informado'}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-slate-400 block">Valor Oferecido:</span>
                            <span className="text-xl font-extrabold text-emerald-700">
                              R$ {schedule.dailyRate.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Date & details */}
                        <div className="bg-white p-3 rounded-xl border border-amber-200/60 space-y-1.5 text-xs text-slate-700 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 font-bold text-slate-900">
                              <Calendar className="w-4 h-4 text-rose-500" />
                              {formatDateWithWeekdayBR(schedule.date)}
                            </span>
                            <span className="flex items-center gap-1 text-slate-600 font-medium">
                              <Clock className="w-3.5 h-3.5 text-slate-400" /> {schedule.startTime} às {schedule.endTime} ({calculateHoursDuration(schedule.startTime, schedule.endTime)})
                            </span>
                          </div>

                          <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-slate-600">
                            <Baby className="w-3.5 h-3.5 text-rose-400" />
                            <span>
                              Bebê: <strong>{schedule.babyName}</strong>{' '}
                              {schedule.babyAge ? `(${schedule.babyAge})` : ''}
                            </span>
                          </div>

                          {schedule.notes && (
                            <p className="text-[11px] text-slate-500 italic pt-1">
                              "{schedule.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action buttons: Dar OK ou Recusar */}
                      <div className="flex items-center gap-2 pt-2 border-t border-amber-100">
                        <button
                          type="button"
                          onClick={() => handleOpenReject(schedule)}
                          className="flex-1 py-2 px-3 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center justify-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Recusar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenValidate(schedule)}
                          className="flex-2 py-2 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" /> Dar OK (Validar)
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: PAGAMENTO INFORMADO PELA CLIENTE (AGUARDANDO CONFIRMAÇÃO DA BABÁ) */}
          <div className="bg-white rounded-3xl border border-blue-200 shadow-sm overflow-hidden">
            <div className="bg-blue-50/80 p-5 border-b border-blue-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Pagamento Informado pela Cliente ({paymentPendingConfirmation.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    A cliente marcou que fez o PIX. Verifique seu extrato e confirme o recebimento para concluir.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5">
              {paymentPendingConfirmation.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Nenhum pagamento pendente de confirmação no momento.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paymentPendingConfirmation.map(schedule => (
                    <div
                      key={schedule.id}
                      className="bg-blue-50/40 border border-blue-200 rounded-2xl p-5 space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md">
                              Pagamento Informado
                            </span>
                            {schedule.isPackage && (
                              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Package className="w-3 h-3 text-indigo-600" />
                                Pacote ({schedule.packageDaysCount} dias)
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-slate-800 text-base mt-1">
                            {schedule.clientName}
                          </h3>
                          <div className="text-xs text-slate-500">
                            Dia do Cuidado: <strong>{formatDateWithWeekdayBR(schedule.date)}</strong> • Horário: <strong>{schedule.startTime} às {schedule.endTime} ({calculateHoursDuration(schedule.startTime, schedule.endTime)})</strong>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block">Valor a Receber:</span>
                          <span className="text-xl font-black text-emerald-700">
                            R$ {schedule.dailyRate.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-blue-100 text-xs text-slate-600 space-y-1">
                        <div>
                          Método: <strong>{schedule.paymentMethod || 'PIX'}</strong>
                        </div>
                        {schedule.paymentNotes && (
                          <div className="italic text-slate-500">
                            Mensagem: "{schedule.paymentNotes}"
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenConfirmPay(schedule)}
                        className="w-full py-2.5 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Confirmar Recebimento do PIX
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: DIAS VALIDADOS COM OK (AGUARDANDO PAGAMENTO) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-800">
                  Dias Validados por Você ({validatedAwaitingPayment.length})
                </h2>
              </div>
              <span className="text-xs text-slate-400">
                Aguardando a cliente realizar o pagamento
              </span>
            </div>

            <div className="p-5">
              {validatedAwaitingPayment.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Nenhum dia validado aguardando pagamento.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {validatedAwaitingPayment.map(schedule => (
                    <div
                      key={schedule.id}
                      className="p-4 bg-emerald-50/20 border border-emerald-200/80 rounded-2xl space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-emerald-900 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-emerald-600" /> {formatDateWithWeekdayBR(schedule.date)}
                        </span>
                        <span className="font-extrabold text-sm text-emerald-800">
                          R$ {schedule.dailyRate.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600">
                        Cliente: <strong>{schedule.clientName}</strong>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Horário: {schedule.startTime} às {schedule.endTime} ({calculateHoursDuration(schedule.startTime, schedule.endTime)})
                      </div>
                      <div className="text-[10px] text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded text-center font-medium">
                        OK confirmado • Aguardando pagamento
                      </div>
                      {schedule.isPackage && (
                        <div className="text-[10px] text-indigo-700 font-bold bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded text-center flex items-center justify-center gap-1">
                          <Package className="w-3 h-3" /> Pacote ({schedule.packageDaysCount} dias • R${' '}
                          {schedule.packageTotal?.toFixed(2)})
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4: HISTÓRICO DE VALORES JÁ PAGOS & OPÇÃO DE APAGAR DO HISTÓRICO */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Valores Já Pagos & Confirmados ({paidConfirmed.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Histórico de cuidados finalizados e valores recebidos na conta.
                  </p>
                </div>
              </div>

              {paidConfirmed.length > 0 && (
                <button
                  type="button"
                  onClick={handleOpenClearAllPaid}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors self-start sm:self-auto"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  {selectedClientId === 'all'
                    ? 'Limpar Todos os Pagos'
                    : 'Limpar Pagos deste Cliente'}
                </button>
              )}
            </div>

            <div className="p-5">
              {paidConfirmed.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Nenhum agendamento já pago no histórico.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {paidConfirmed.map(schedule => (
                    <div
                      key={schedule.id}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between gap-2.5 hover:bg-slate-100/50 transition-colors"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between">
                          <span className="font-bold text-xs text-slate-800 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                            {formatDateWithWeekdayBR(schedule.date)}
                          </span>
                          <span className="font-black text-sm text-emerald-700">
                            R$ {schedule.dailyRate.toFixed(2)}
                          </span>
                        </div>

                        <div className="text-xs text-slate-600">
                          Cliente: <strong>{schedule.clientName}</strong>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Bebê: {schedule.babyName} • {schedule.startTime} às {schedule.endTime} ({calculateHoursDuration(schedule.startTime, schedule.endTime)})
                        </div>

                        {schedule.isPackage && (
                          <div className="text-[10px] text-indigo-700 font-bold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded flex items-center gap-1">
                            <Package className="w-3 h-3" /> Pacote ({schedule.packageDaysCount} dias)
                          </div>
                        )}

                        <div className="text-[10px] text-slate-400">
                          Pago via {schedule.paymentMethod || 'PIX'} • Concluído
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Concluído
                        </span>

                        <button
                          type="button"
                          onClick={() => handleOpenDeleteSinglePaid(schedule)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors"
                          title="Apagar este agendamento pago do histórico"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Apagar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 5: DIAS RECUSADOS (SE HOUVER) */}
          {rejectedSchedules.length > 0 && (
            <div className="bg-white rounded-3xl border border-rose-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-rose-50/50 border-b border-rose-100 flex items-center justify-between">
                <h2 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-rose-500" />
                  Solicitações Recusadas por Você ({rejectedSchedules.length})
                </h2>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {rejectedSchedules.map(schedule => (
                  <div key={schedule.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <div className="font-bold text-slate-700">{formatDateWithWeekdayBR(schedule.date)}</div>
                    <div className="text-slate-500">Cliente: {schedule.clientName}</div>
                    {schedule.rejectionReason && (
                      <div className="text-[11px] text-rose-600 italic">
                        Motivo: "{schedule.rejectionReason}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: CONFIRMAÇÃO DE VALIDAÇÃO (OK) / RECUSA / CONFIRMAR PIX*/}
      {/* ============================================================== */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div
              className={`p-5 text-white flex items-center justify-between ${
                confirmModal.type === 'validate'
                  ? 'bg-emerald-600'
                  : confirmModal.type === 'reject'
                  ? 'bg-rose-600'
                  : 'bg-blue-600'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-base">
                {confirmModal.type === 'validate' && <ThumbsUp className="w-5 h-5" />}
                {confirmModal.type === 'reject' && <XCircle className="w-5 h-5" />}
                {confirmModal.type === 'confirm_pay' && <CreditCard className="w-5 h-5" />}
                <span>
                  {confirmModal.type === 'validate' && 'Confirmar Validação (Dar OK)'}
                  {confirmModal.type === 'reject' && 'Recusar Solicitação de Diária'}
                  {confirmModal.type === 'confirm_pay' && 'Confirmar Recebimento'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Schedule Summary Box */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between font-bold text-slate-800 text-sm">
                  <span>Dia: {formatDateWithWeekdayBR(confirmModal.schedule.date)}</span>
                  <span className="text-emerald-700">R$ {confirmModal.schedule.dailyRate.toFixed(2)}</span>
                </div>
                <div className="text-slate-600">
                  Cliente: <strong>{confirmModal.schedule.clientName}</strong>
                </div>
                <div className="text-slate-500">
                  Horário: {confirmModal.schedule.startTime} às {confirmModal.schedule.endTime} ({calculateHoursDuration(confirmModal.schedule.startTime, confirmModal.schedule.endTime)} no dia)
                </div>
                <div className="text-slate-500">
                  Bebê: {confirmModal.schedule.babyName} {confirmModal.schedule.babyAge ? `(${confirmModal.schedule.babyAge})` : ''}
                </div>
              </div>

              {/* Package Action Option */}
              {confirmModal.schedule.isPackage && (
                <div className="bg-indigo-50 border border-indigo-200/90 p-3.5 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-indigo-600" /> Pacote Fechado ({confirmModal.schedule.packageDaysCount} dias)
                    </span>
                    <span className="font-black text-indigo-900 text-sm">
                      Total R$ {confirmModal.schedule.packageTotal?.toFixed(2)}
                    </span>
                  </div>
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-indigo-900 font-medium pt-1.5 border-t border-indigo-200/60">
                    <input
                      type="checkbox"
                      checked={applyToPackage}
                      onChange={e => setApplyToPackage(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-400"
                    />
                    <div>
                      <span className="font-bold block">
                        {confirmModal.type === 'validate'
                          ? `Dar OK no Pacote Completo (${confirmModal.schedule.packageDaysCount} dias)`
                          : confirmModal.type === 'confirm_pay'
                          ? `Confirmar recebimento do Pacote Completo (R$ ${confirmModal.schedule.packageTotal?.toFixed(2)})`
                          : `Recusar o Pacote Completo (${confirmModal.schedule.packageDaysCount} dias)`}
                      </span>
                      <span className="text-[11px] text-indigo-700 block mt-0.5">
                        {confirmModal.type === 'validate'
                          ? `Valida e bloqueia todos os ${confirmModal.schedule.packageDaysCount} dias contratados neste pacote fechado.`
                          : confirmModal.type === 'confirm_pay'
                          ? `Confirma o recebimento de todas as diárias deste pacote de uma só vez.`
                          : `Recusa todas as datas desta proposta de pacote.`}
                      </span>
                    </div>
                  </label>
                </div>
              )}

              {confirmModal.type === 'validate' && (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-900 leading-relaxed">
                  <strong>Atenção:</strong> Ao dar o seu <strong>OK</strong>, este dia fica confirmado e o sistema{' '}
                  <strong>bloqueará qualquer alteração ou cancelamento</strong> por parte da cliente.
                </div>
              )}

              {confirmModal.type === 'reject' && (
                <div className="space-y-2">
                  <div className="text-xs text-slate-600">
                    A cliente será informada de que você não tem disponibilidade para esta data.
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400" /> Motivo da recusa (opcional):
                    </label>
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="Ex: Já tenho compromisso neste dia"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white"
                    />
                  </div>
                </div>
              )}

              {confirmModal.type === 'confirm_pay' && (
                <div className="text-xs text-slate-600 leading-relaxed">
                  Confirma que o valor de{' '}
                  <strong>
                    R${' '}
                    {(confirmModal.schedule.isPackage && applyToPackage
                      ? confirmModal.schedule.packageTotal || confirmModal.schedule.dailyRate
                      : confirmModal.schedule.dailyRate
                    ).toFixed(2)}
                  </strong>{' '}
                  caiu na sua conta bancária/Pix referente aos cuidados prestados?
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleConfirmAction}
                  className={`flex-1 py-2.5 px-4 text-xs font-bold text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 ${
                    confirmModal.type === 'validate'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : confirmModal.type === 'reject'
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                  }`}
                >
                  {actionLoading ? (
                    'Processando...'
                  ) : confirmModal.type === 'validate' ? (
                    <>
                      <ThumbsUp className="w-3.5 h-3.5" /> Dar OK
                    </>
                  ) : confirmModal.type === 'reject' ? (
                    <>
                      <XCircle className="w-3.5 h-3.5" /> Confirmar Recusa
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar Pix
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: CONFIRMAÇÃO PARA APAGAR VALORES JÁ PAGOS              */}
      {/* ============================================================== */}
      {deletePaidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-slate-800 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-base">
                <Trash2 className="w-5 h-5 text-rose-400" />
                <span>
                  {deletePaidModal.type === 'single'
                    ? 'Apagar Valor Pago do Histórico'
                    : 'Limpar Todos os Valores Pagos'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDeletePaidModal(null)}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-600">
              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {deletePaidModal.type === 'single' && deletePaidModal.schedule && (
                <div className="space-y-3">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                    <div className="flex justify-between font-bold text-slate-800 text-sm">
                      <span>Dia: {formatDateWithWeekdayBR(deletePaidModal.schedule.date)}</span>
                      <span className="text-emerald-700">R$ {deletePaidModal.schedule.dailyRate.toFixed(2)}</span>
                    </div>
                    <div>Cliente: <strong>{deletePaidModal.schedule.clientName}</strong></div>
                    <div>Bebê: {deletePaidModal.schedule.babyName}</div>
                  </div>
                  <p className="leading-relaxed">
                    Você já confirmou o recebimento deste valor. Ao apagá-lo, este registro sairá da listagem para deixar seu painel mais limpo e organizado.
                  </p>
                </div>
              )}

              {deletePaidModal.type === 'clear_all' && (
                <div className="space-y-3">
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 font-medium">
                    Atenção: Você está prestes a apagar <strong>{paidConfirmed.length} agendamento(s) já pago(s)</strong>{' '}
                    {selectedClientId !== 'all' ? `da cliente ${selectedClientInfo?.name}` : 'de todos os clientes'}.
                  </div>
                  <p className="leading-relaxed">
                    Todos os registros selecionados com status "Pago & Confirmado" serão removidos do histórico para limpar a tela.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setDeletePaidModal(null)}
                  className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleConfirmDeletePaid}
                  className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5"
                >
                  {actionLoading ? 'Apagando...' : 'Confirmar e Apagar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
