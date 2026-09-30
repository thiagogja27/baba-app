import React, { useState } from 'react';
import { Schedule } from '../types.ts';
import { formatDateWithWeekdayBR, calculateHoursDuration } from '../utils/date.ts';
import { DollarSign, CheckCircle2, Copy, Check, Calendar, AlertCircle, Package, Clock } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: Schedule | null;
  onConfirmPayment: (
    scheduleId: string,
    paymentMethod: string,
    notes: string,
    payEntirePackage?: boolean
  ) => Promise<void>;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  schedule,
  onConfirmPayment,
}) => {
  const [method, setMethod] = useState('PIX');
  const [notes, setNotes] = useState('');
  const [payEntirePackage, setPayEntirePackage] = useState(true);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !schedule) return null;

  const handleCopyPix = () => {
    if (schedule.babysitterPixKey) {
      navigator.clipboard.writeText(schedule.babysitterPixKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onConfirmPayment(schedule.id, method, notes, Boolean(schedule.isPackage && payEntirePackage));
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao informar pagamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Informar Pagamento</h3>
              <p className="text-white/80 text-xs">
                Registre o pagamento realizado para a babá
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-full text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Details summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
            {schedule.isPackage && (
              <div className="bg-indigo-50 border border-indigo-200/80 p-3 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-indigo-600" /> Pacote Fechado ({schedule.packageDaysCount} dias)
                  </span>
                  <span className="font-black text-indigo-950 text-sm">
                    R$ {schedule.packageTotal?.toFixed(2)}
                  </span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-indigo-800 font-medium pt-1 border-t border-indigo-200/60">
                  <input
                    type="checkbox"
                    checked={payEntirePackage}
                    onChange={e => setPayEntirePackage(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-400"
                  />
                  <span>Informar pagamento do <strong>Pacote Completo</strong> (todos os {schedule.packageDaysCount} dias)</span>
                </label>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-200 pb-2">
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar className="w-4 h-4 text-slate-400" />
                Dia do Cuidado:
              </span>
              <strong className="text-slate-800 font-semibold">{formatDateWithWeekdayBR(schedule.date)}</strong>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-200 pb-2">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-4 h-4 text-slate-400" />
                Horário & Duração:
              </span>
              <strong className="text-slate-800 font-semibold">
                {schedule.startTime} às {schedule.endTime} ({calculateHoursDuration(schedule.startTime, schedule.endTime)})
              </strong>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-200 pb-2">
              <span>Babá Contratada:</span>
              <strong className="text-slate-800 font-semibold">{schedule.babysitterName}</strong>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-semibold text-slate-700">
                {schedule.isPackage && payEntirePackage ? 'Valor Total do Pacote:' : 'Valor da Diária:'}
              </span>
              <span className="text-xl font-extrabold text-emerald-700">
                R$ {(schedule.isPackage && payEntirePackage ? (schedule.packageTotal || schedule.dailyRate) : schedule.dailyRate).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Babysitter PIX Key */}
          {schedule.babysitterPixKey && (
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-3.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                <span>Chave PIX da Babá ({schedule.babysitterName}):</span>
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="flex items-center gap-1 text-[11px] bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 px-2 py-0.5 rounded-lg transition-colors font-medium shadow-2xs"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copiar Chave
                    </>
                  )}
                </button>
              </div>
              <div className="font-mono text-xs font-semibold text-slate-800 bg-white p-2 rounded-xl border border-emerald-100 select-all break-all">
                {schedule.babysitterPixKey}
              </div>
            </div>
          )}

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Forma de Pagamento Utilizada
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['PIX', 'Transferência', 'Dinheiro'].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                    method === m
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Notes / Proof info */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observações / Comprovante (opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Pix realizado do banco Nubank às 14:20. Comprovante enviado via WhatsApp."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-blue-900 text-[11px] leading-relaxed">
            <strong>Próximo passo:</strong> Ao confirmar aqui, o status do agendamento passará para
            "Pagamento Informado". A babá receberá o aviso para confirmar na conta dela e liberar o
            recibo definitivo.
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-2 py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'Confirmando...' : 'Confirmar Pagamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
