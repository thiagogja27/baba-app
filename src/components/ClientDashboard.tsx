import React, { useState } from 'react';
import { Schedule, User } from '../types.ts';
import { formatDateBR, formatDateWithWeekdayBR } from '../utils/date.ts';
import {
  Calendar,
  Clock,
  DollarSign,
  Plus,
  Lock,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Baby,
  Info,
} from 'lucide-react';

interface ClientDashboardProps {
  user: User;
  schedules: Schedule[];
  babysitters: User[];
  onOpenNewSchedule: () => void;
  onEditSchedule: (schedule: Schedule) => void;
  onDeleteSchedule: (scheduleId: string) => Promise<void>;
  onOpenPaymentModal: (schedule: Schedule) => void;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({
  user,
  schedules,
  babysitters,
  onOpenNewSchedule,
  onEditSchedule,
  onDeleteSchedule,
  onOpenPaymentModal,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'validated' | 'payment_pending' | 'paid'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [scheduleToCancel, setScheduleToCancel] = useState<Schedule | null>(null);

  const filteredSchedules = schedules.filter(s => {
    if (filter === 'pending') return s.status === 'pending_validation';
    if (filter === 'validated') return s.status === 'validated';
    if (filter === 'payment_pending') return s.status === 'payment_pending';
    if (filter === 'paid') return s.status === 'paid_confirmed';
    return true;
  });

  const totalScheduled = schedules.reduce((acc, s) => acc + s.dailyRate, 0);
  const totalPaid = schedules
    .filter(s => s.status === 'paid_confirmed')
    .reduce((acc, s) => acc + s.dailyRate, 0);
  const totalToPay = schedules
    .filter(s => s.status === 'validated')
    .reduce((acc, s) => acc + s.dailyRate, 0);

  const handleConfirmCancel = async () => {
    if (!scheduleToCancel) return;
    setDeletingId(scheduleToCancel.id);
    try {
      await onDeleteSchedule(scheduleToCancel.id);
      setScheduleToCancel(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome & Action Banner */}
      <div className="bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold">
              <Baby className="w-3.5 h-3.5" />
              Espaço da Família {user.babyName ? `• Cuidado do(a) ${user.babyName}` : ''}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Olá, {user.name}!
            </h1>
            <p className="text-white/90 text-sm leading-relaxed">
              Defina os dias e os valores das diárias que você precisa de uma babá para cuidar do
              seu bebê. Após a babá validar com um <strong>OK</strong>, a data e o valor ficam
              fixados com segurança.
            </p>
          </div>

          <div className="shrink-0">
            <button
              onClick={onOpenNewSchedule}
              className="w-full sm:w-auto bg-white hover:bg-rose-50 text-rose-600 font-bold px-6 py-3.5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 text-sm"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              Agendar Novo Dia com Babá
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span>Total de Dias</span>
            <Calendar className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-800">{schedules.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Dias solicitados</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span>Aguardando Validação</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600">
            {schedules.filter(s => s.status === 'pending_validation').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Editáveis por você</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span>Prontos para Pagar</span>
            <CreditCard className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-600">
            R$ {totalToPay.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {schedules.filter(s => s.status === 'validated').length} dia(s) validados
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span>Total Pago e Confirmado</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700">
            R$ {totalPaid.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Diárias quitadas</div>
        </div>
      </div>

      {/* Rules Notice */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-600">
        <Info className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-slate-800">Como funciona o fluxo de agendamento:</strong>
          <span className="ml-1">
            Enquanto o status for <em>"Aguardando Validação"</em>, você tem liberdade total para alterar
            datas e valores. Assim que a babá der o <strong>OK</strong>, o dia é confirmado e as
            alterações são <strong>travadas</strong>. A partir desse momento, sua única ação será
            informar o pagamento para a babá confirmar o recebimento.
          </span>
        </div>
      </div>

      {/* Schedule List Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header & Filter Tabs */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Sua Agenda de Cuidados</h2>
            <p className="text-xs text-slate-500">
              Gerencie seus pedidos, acompanhe as validações das babás e realize pagamentos
            </p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'pending', label: 'Pendentes de OK' },
              { id: 'validated', label: 'Validados (A Pagar)' },
              { id: 'payment_pending', label: 'Pagamento Informado' },
              { id: 'paid', label: 'Concluídos' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  filter === tab.id
                    ? 'bg-rose-500 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {filteredSchedules.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 bg-rose-50 text-rose-400 rounded-3xl mx-auto flex items-center justify-center mb-3">
                <Calendar className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">Nenhum agendamento encontrado</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                {filter === 'all'
                  ? 'Você ainda não cadastrou nenhum dia com a babá. Comece agora escolhendo a data e o valor da diária!'
                  : 'Nenhum agendamento nesta categoria no momento.'}
              </p>
              {filter === 'all' && (
                <button
                  onClick={onOpenNewSchedule}
                  className="inline-flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" /> Cadastrar Primeiro Dia
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSchedules.map(schedule => {
                const isValidated = schedule.status === 'validated';
                const isPending = schedule.status === 'pending_validation';
                const isPaymentPending = schedule.status === 'payment_pending';
                const isPaid = schedule.status === 'paid_confirmed';

                return (
                  <div
                    key={schedule.id}
                    className={`rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                      isValidated
                        ? 'border-emerald-300 bg-emerald-50/20 ring-1 ring-emerald-200'
                        : isPaid
                        ? 'border-slate-200 bg-slate-50/50'
                        : isPaymentPending
                        ? 'border-blue-200 bg-blue-50/20'
                        : 'border-amber-200 bg-amber-50/20'
                    }`}
                  >
                    <div>
                      {/* Status Badge & Value Header */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-lg border border-amber-200">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            Aguardando Validação da Babá
                          </span>
                        )}

                        {isValidated && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Validado pela Babá (OK)
                          </span>
                        )}

                        {isPaymentPending && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-800 bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            Pagamento Informado
                          </span>
                        )}

                        {isPaid && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Pago & Confirmado
                          </span>
                        )}

                        {schedule.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-800 bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-300">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                            Recusado pela Babá
                          </span>
                        )}

                        {/* Daily Rate */}
                        <div className="text-right">
                          <span className="text-xs text-slate-400 font-medium mr-1">Diária:</span>
                          <span className="text-base font-extrabold text-slate-800">
                            R$ {schedule.dailyRate.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Main Info */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
                          <Calendar className="w-4 h-4 text-rose-500" />
                          <span>{formatDateWithWeekdayBR(schedule.date)}</span>
                          <span className="text-xs font-normal text-slate-500 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {schedule.startTime} às {schedule.endTime}
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 flex items-center justify-between bg-white/80 p-2.5 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Babá Solicitada:</span>
                            <strong className="text-slate-800 font-semibold">
                              {schedule.babysitterName}
                            </strong>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 block text-[10px]">Bebê:</span>
                            <span className="font-medium text-slate-700">
                              {schedule.babyName} {schedule.babyAge ? `(${schedule.babyAge})` : ''}
                            </span>
                          </div>
                        </div>

                        {schedule.notes && (
                          <div className="text-xs text-slate-600 bg-white/60 p-2 rounded-lg border border-slate-100 italic">
                            "{schedule.notes}"
                          </div>
                        )}
                      </div>

                      {/* Business Rules Warnings */}
                      {isPending && (
                        <div className="mb-4 bg-amber-50/80 border border-amber-200/60 rounded-xl p-2.5 text-[11px] text-amber-800 flex items-start gap-1.5">
                          <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>
                            A babá ainda não deu o OK. Você pode alterar a data, horários e valores
                            ou cancelar a qualquer momento.
                          </span>
                        </div>
                      )}

                      {isValidated && (
                        <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-[11px] text-emerald-900 flex items-start gap-2">
                          <Lock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                          <div>
                            <strong>Alterações Bloqueadas:</strong> A babá deu o OK neste dia. A data
                            e o valor estão travados. Você agora pode realizar o pagamento e
                            informá-la.
                          </div>
                        </div>
                      )}

                      {isPaymentPending && (
                        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-[11px] text-blue-900 flex items-start gap-2">
                          <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <div>
                            <strong>Pagamento registrado via {schedule.paymentMethod}:</strong>{' '}
                            Aguardando a confirmação do recebimento pela babá ({schedule.babysitterName}).
                          </div>
                        </div>
                      )}

                      {isPaid && (
                        <div className="mb-4 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[11px] text-slate-600 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            Recebimento confirmado por {schedule.paymentConfirmedByName || 'Babá'}.
                            Ciclo finalizado.
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Area */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      {isPending ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onEditSchedule(schedule)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Editar Dados
                          </button>
                          <button
                            type="button"
                            onClick={() => setScheduleToCancel(schedule)}
                            className="inline-flex items-center justify-center gap-1 text-xs font-semibold py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Cancelar
                          </button>
                        </>
                      ) : schedule.status === 'rejected' ? (
                        <button
                          type="button"
                          onClick={() => setScheduleToCancel(schedule)}
                          className="w-full text-center py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Excluir Solicitação Recusada
                        </button>
                      ) : isValidated ? (
                        <div className="w-full flex flex-col gap-2">
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Edição desativada
                            </span>
                            <span>Validado em: {new Date(schedule.validatedAt || '').toLocaleDateString('pt-BR')}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onOpenPaymentModal(schedule)}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
                          >
                            <CreditCard className="w-4 h-4" />
                            Informar Pagamento Realizado
                          </button>
                        </div>
                      ) : isPaymentPending ? (
                        <div className="w-full text-center py-1 text-xs text-blue-700 font-semibold bg-blue-50/50 rounded-xl border border-blue-100">
                          Aguardando Babá confirmar na conta
                        </div>
                      ) : (
                        <div className="w-full text-center py-1 text-xs text-emerald-700 font-semibold bg-emerald-50 rounded-xl border border-emerald-100">
                          ✓ Concluído com Sucesso
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* In-App Cancel Modal (substitui window.confirm) */}
      {scheduleToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-sm overflow-hidden p-6 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">
                {scheduleToCancel.status === 'rejected' ? 'Remover Agendamento?' : 'Cancelar Agendamento?'}
              </h3>
              <p className="text-xs text-slate-500">
                Deseja realmente remover o agendamento do dia{' '}
                <strong>{formatDateBR(scheduleToCancel.date)}</strong> (R$ {scheduleToCancel.dailyRate.toFixed(2)})?
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={deletingId !== null}
                onClick={() => setScheduleToCancel(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={deletingId !== null}
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-50 rounded-xl shadow-md transition-colors"
              >
                {deletingId ? 'Processando...' : 'Sim, Remover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
