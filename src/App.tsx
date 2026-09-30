import React, { useState, useEffect, useCallback } from 'react';
import { api, getStoredToken } from './api.ts';
import { User, Schedule } from './types.ts';
import { Navbar } from './components/Navbar.tsx';
import { LoginModal } from './components/LoginModal.tsx';
import { ClientDashboard } from './components/ClientDashboard.tsx';
import { BabysitterDashboard } from './components/BabysitterDashboard.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { ScheduleModal } from './components/ScheduleModal.tsx';
import { PaymentModal } from './components/PaymentModal.tsx';
import { CheckCircle2, AlertCircle, Baby } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [babysitters, setBabysitters] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleToEdit, setScheduleToEdit] = useState<Schedule | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [scheduleForPayment, setScheduleForPayment] = useState<Schedule | null>(null);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const loadData = useCallback(async () => {
    try {
      const [schedulesRes, babysittersRes] = await Promise.all([
        api.getSchedules(),
        api.getBabysitters(),
      ]);
      setSchedules(schedulesRes.schedules);
      setBabysitters(babysittersRes.babysitters);
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
    }
  }, []);

  // Check auth
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      try {
        const token = getStoredToken();
        if (token) {
          const res = await api.getMe();
          setCurrentUser(res.user);
          await loadData();
        } else {
          setIsAuthModalOpen(true);
        }
      } catch (err) {
        setIsAuthModalOpen(true);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [loadData]);

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setIsAuthModalOpen(true);
  };

  // Schedule CRUD - Batch Create
  const handleSaveBatchSchedule = async (data: {
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
    isPackage?: boolean;
    packageTotal?: number;
  }) => {
    await api.createBatchSchedules(data);
    if (data.isPackage && data.packageTotal) {
      showToast(
        `Pacote de ${data.days.length} dias no valor único de R$ ${data.packageTotal.toFixed(2)} enviado! Aguardando o OK da babá.`,
        'success'
      );
    } else {
      showToast(
        `${data.days.length} dia(s) agendados com sucesso! Aguardando o OK da babá.`,
        'success'
      );
    }
    setScheduleToEdit(null);
    await loadData();
  };

  // Schedule CRUD - Single Edit
  const handleSaveSingleSchedule = async (data: {
    babysitterId: string;
    date: string;
    startTime: string;
    endTime: string;
    dailyRate: number;
    babyName: string;
    babyAge?: string;
    notes?: string;
    applyToAllPending?: boolean;
  }) => {
    if (scheduleToEdit) {
      await api.updateSchedule(scheduleToEdit.id, data);
      if (data.applyToAllPending) {
        showToast('Horário e valor aplicados com sucesso para todos os dias pendentes!', 'success');
      } else {
        showToast('Agendamento atualizado com sucesso!', 'success');
      }
    }
    setScheduleToEdit(null);
    await loadData();
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      await api.deleteSchedule(scheduleId);
      showToast('Agendamento removido com sucesso.');
      await loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Babá valida o dia ou pacote
  const handleValidateSchedule = async (scheduleId: string, validateEntirePackage = false) => {
    try {
      await api.validateSchedule(scheduleId, validateEntirePackage);
      showToast(
        validateEntirePackage
          ? 'Pacote completo validado com OK! Alterações da cliente foram bloqueadas.'
          : 'Dia validado com OK! As alterações da cliente foram bloqueadas.'
      );
      await loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Babá recusa o dia ou pacote
  const handleRejectSchedule = async (scheduleId: string, reason?: string, rejectEntirePackage = false) => {
    try {
      await api.rejectSchedule(scheduleId, reason, rejectEntirePackage);
      showToast(
        rejectEntirePackage
          ? 'Proposta do pacote recusada com sucesso.'
          : 'Solicitação de diária recusada.'
      );
      await loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Cliente informa pagamento
  const handleConfirmReportPayment = async (
    scheduleId: string,
    method: string,
    notes: string,
    payEntirePackage = false
  ) => {
    try {
      await api.reportPayment(scheduleId, {
        paymentMethod: method,
        paymentNotes: notes,
        payEntirePackage,
      });
      showToast(
        payEntirePackage
          ? 'Pagamento do pacote completo informado! Aguardando a babá confirmar.'
          : 'Pagamento informado! Aguardando a babá confirmar na conta.'
      );
      await loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Babá confirma recebimento do pagamento
  const handleConfirmPaymentReceived = async (scheduleId: string, confirmEntirePackage = false) => {
    try {
      await api.confirmPayment(scheduleId, confirmEntirePackage);
      showToast(
        confirmEntirePackage
          ? 'Recebimento do pacote completo confirmado com sucesso!'
          : 'Recebimento do pagamento confirmado com sucesso!'
      );
      await loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Limpar histórico de pagamentos recebidos (Babá)
  const handleClearPaidSchedules = async (clientId?: string) => {
    try {
      const res = await api.clearPaidSchedules(clientId);
      showToast(res.message || 'Valores já pagos apagados com sucesso!', 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-xs font-semibold ${
              toast.type === 'success'
                ? 'bg-slate-900 text-white border-slate-800'
                : 'bg-rose-600 text-white border-rose-700'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-white shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header / Navbar */}
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {loading && !currentUser ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-500 text-xs font-medium">Carregando dados da aplicação...</p>
          </div>
        ) : !currentUser ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs max-w-md mx-auto">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-3xl mx-auto flex items-center justify-center mb-4">
              <Baby className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Bem-vindo ao BabáAgendada</h2>
            <p className="text-xs text-slate-500 mb-6">
              Faça login ou cadastre-se para gerenciar sua agenda de cuidados, valores e validações.
            </p>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all text-xs"
            >
              Entrar ou Cadastrar
            </button>
          </div>
        ) : (
          <>
            {currentUser.role === 'cliente' && (
              <ClientDashboard
                user={currentUser}
                schedules={schedules}
                babysitters={babysitters}
                onOpenNewSchedule={() => {
                  setScheduleToEdit(null);
                  setIsScheduleModalOpen(true);
                }}
                onEditSchedule={schedule => {
                  setScheduleToEdit(schedule);
                  setIsScheduleModalOpen(true);
                }}
                onDeleteSchedule={handleDeleteSchedule}
                onOpenPaymentModal={schedule => {
                  setScheduleForPayment(schedule);
                  setIsPaymentModalOpen(true);
                }}
              />
            )}

            {currentUser.role === 'baba' && (
              <BabysitterDashboard
                user={currentUser}
                schedules={schedules}
                onValidateSchedule={handleValidateSchedule}
                onRejectSchedule={handleRejectSchedule}
                onConfirmPayment={handleConfirmPaymentReceived}
                onDeleteSchedule={handleDeleteSchedule}
                onClearPaidSchedules={handleClearPaidSchedules}
              />
            )}

            {currentUser.role === 'admin' && (
              <AdminDashboard currentUser={currentUser} />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">BabáAgendada</span>
            <span>• Banco de Dados Integrado & Validações com Bloqueio de Alterações</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Regra de Negócio: após validação da babá (OK), edições são travadas e somente pagamento/confirmação são aceitos.
          </div>
        </div>
      </footer>

      {/* Modals */}
      <LoginModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={user => {
          setCurrentUser(user);
          loadData();
          showToast(`Bem-vindo, ${user.name}!`);
        }}
      />

      {currentUser && (
        <ScheduleModal
          isOpen={isScheduleModalOpen}
          onClose={() => {
            setIsScheduleModalOpen(false);
            setScheduleToEdit(null);
          }}
          onSubmitBatch={handleSaveBatchSchedule}
          onSubmitSingle={handleSaveSingleSchedule}
          babysitters={babysitters}
          scheduleToEdit={scheduleToEdit}
          clientUser={currentUser}
        />
      )}

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setScheduleForPayment(null);
        }}
        schedule={scheduleForPayment}
        onConfirmPayment={handleConfirmReportPayment}
      />
    </div>
  );
}
