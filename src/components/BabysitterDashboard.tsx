import React, { useState } from 'react';
import { Schedule, User } from '../types.ts';
import { formatDateBR, formatDateWithWeekdayBR } from '../utils/date.ts';
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
} from 'lucide-react';

interface BabysitterDashboardProps {
  user: User;
  schedules: Schedule[];
  onValidateSchedule: (scheduleId: string, validateEntirePackage?: boolean) => Promise<void>;
  onRejectSchedule: (scheduleId: string, reason?: string, rejectEntirePackage?: boolean) => Promise<void>;
  onConfirmPayment: (scheduleId: string, confirmEntirePackage?: boolean) => Promise<void>;
}

export const BabysitterDashboard: React.FC<BabysitterDashboardProps> = ({
  user,
  schedules,
  onValidateSchedule,
  onRejectSchedule,
  onConfirmPayment,
}) => {
  // Confirmation Modal state (substitui window.confirm que é bloqueado em iframe)
  const [confirmModal, setConfirmModal] = useState<{
    type: 'validate' | 'reject' | 'confirm_pay';
    schedule: Schedule;
  } | null>(null);

  const [applyToPackage, setApplyToPackage] = useState(true);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Group schedules by priority action
  const pendingValidation = schedules.filter(s => s.status === 'pending_validation');
  const paymentPendingConfirmation = schedules.filter(s => s.status === 'payment_pending');
  const validatedAwaitingPayment = schedules.filter(s => s.status === 'validated');
  const paidConfirmed = schedules.filter(s => s.status === 'paid_confirmed');
  const rejectedSchedules = schedules.filter(s => s.status === 'rejected');

  const totalEarned = paidConfirmed.reduce((acc, s) => acc + s.dailyRate, 0);
  const totalPendingPayment = [...validatedAwaitingPayment, ...paymentPendingConfirmation].reduce(
    (acc, s) => acc + s.dailyRate,
    0
  );

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
              Aqui você valida as solicitações de diárias das clientes com um <strong>OK</strong>{' '}
              (travando as alterações da cliente), recusa solicitações se não tiver disponibilidade e confirma o recebimento dos pagamentos.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl">
              <span className="text-xs text-white/80 block">Já Recebido (Confirmado)</span>
              <span className="text-2xl font-black text-white">R$ {totalEarned.toFixed(2)}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl">
              <span className="text-xs text-white/80 block">A Receber</span>
              <span className="text-2xl font-black text-white">R$ {totalPendingPayment.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: SOLICITAÇÕES AGUARDANDO SEU OK OU RECUSA */}
      <div className="bg-white rounded-3xl border border-amber-200 shadow-sm overflow-hidden">
        <div className="bg-amber-50/80 p-5 border-b border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
              !
            </div>
            <div>
              <h2 className="text-base font-bold text-amber-950">
                Solicitações Aguardando Sua Resposta ({pendingValidation.length})
              </h2>
              <p className="text-xs text-amber-800">
                Você pode <strong>Dar o OK</strong> (para fixar a data e o valor) ou <strong>Recusar</strong> a solicitação.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5">
          {pendingValidation.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">
              🎉 Nenhuma solicitação pendente de validação no momento. Você está em dia!
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
                          Proposta de Pacote Fechado ({schedule.packageDaysCount} dias • R$ {schedule.packageTotal?.toFixed(2)} total)
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
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3.5 h-3.5" /> {schedule.startTime} às {schedule.endTime}
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

                  {/* Dual Action Buttons: OK vs RECUSAR */}
                  <div className="grid grid-cols-2 gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => handleOpenReject(schedule)}
                      className="w-full bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-bold py-2.5 px-3 rounded-xl text-xs border border-slate-200 hover:border-rose-200 transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <XCircle className="w-4 h-4 text-rose-500" />
                      Recusar
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenValidate(schedule)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Dar OK (Validar)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: PAGAMENTOS AGUARDANDO SUA CONFIRMAÇÃO */}
      <div className="bg-white rounded-3xl border border-blue-200 shadow-sm overflow-hidden">
        <div className="bg-blue-50/80 p-5 border-b border-blue-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-blue-950">
                Pagamentos Informados pelas Clientes ({paymentPendingConfirmation.length})
              </h2>
              <p className="text-xs text-blue-800">
                A cliente informou que realizou o pagamento. Verifique em sua conta e confirme o recebimento.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5">
          {paymentPendingConfirmation.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">
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
                        Dia do Cuidado: <strong>{formatDateWithWeekdayBR(schedule.date)}</strong>
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
                      Método Informado: <strong>{schedule.paymentMethod || 'PIX'}</strong>
                    </div>
                    {schedule.paymentNotes && (
                      <div className="text-[11px] text-slate-500 italic">
                        "{schedule.paymentNotes}"
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenConfirmPay(schedule)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmar Recebimento do Pagamento
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: DIAS JÁ VALIDADOS COM OK (AGUARDANDO O DIA OU PAGAMENTO) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Dias Validados com seu "OK" ({validatedAwaitingPayment.length})
            </h2>
            <p className="text-xs text-slate-500">
              Datas travadas contra alterações. A cliente já pode efetuar o pagamento.
            </p>
          </div>
          <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            Validação Ativa
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
                  <div className="text-[11px] text-slate-400">
                    Horário: {schedule.startTime} às {schedule.endTime}
                  </div>
                  <div className="text-[10px] text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded text-center font-medium">
                    OK confirmado • Aguardando pagamento
                  </div>
                  {schedule.isPackage && (
                    <div className="text-[10px] text-indigo-700 font-bold bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded text-center flex items-center justify-center gap-1">
                      <Package className="w-3 h-3" /> Pacote ({schedule.packageDaysCount} dias • R$ {schedule.packageTotal?.toFixed(2)})
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 4: DIAS RECUSADOS (SE HOUVER) */}
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

      {/* IN-APP CONFIRMATION MODAL (100% FUNCIONAL EM IFRAME) */}
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
                  Horário: {confirmModal.schedule.startTime} às {confirmModal.schedule.endTime}
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
                  Confirma que o valor de <strong>R$ {confirmModal.schedule.dailyRate.toFixed(2)}</strong> caiu na sua conta bancária/Pix referente aos cuidados prestados?
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
    </div>
  );
};
