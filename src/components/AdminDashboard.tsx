import React, { useState, useEffect } from 'react';
import { api } from '../api.ts';
import { Schedule, User, AdminMetrics, AuditLog } from '../types.ts';
import {
  Shield,
  Calendar,
  DollarSign,
  Users,
  CheckCircle2,
  Clock,
  Search,
  Lock,
  ArrowUpDown,
  FileText,
  Activity,
  Baby,
  RefreshCw,
} from 'lucide-react';

interface AdminDashboardProps {
  currentUser: User;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = () => {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'schedules' | 'users' | 'logs'>('schedules');

  // Filters for schedules
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mRes, sRes, uRes, lRes] = await Promise.all([
        api.getAdminMetrics(),
        api.getSchedules(),
        api.getAdminUsers(),
        api.getAdminAuditLogs(),
      ]);
      setMetrics(mRes.metrics);
      setSchedules(sRes.schedules);
      setUsers(uRes.users);
      setLogs(lRes.logs);
    } catch (err) {
      console.error('Erro ao carregar dados do admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredSchedules = schedules.filter(s => {
    const matchesSearch =
      s.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.babysitterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.babyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.date.includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 bg-indigo-500/30 border border-indigo-400/30 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-indigo-200">
              <Shield className="w-3.5 h-3.5 text-indigo-300" />
              Painel de Monitoramento Administrativo
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Visão Geral de Agendamentos & Pagamentos
            </h1>
            <p className="text-indigo-200 text-xs sm:text-sm max-w-xl">
              Monitore todas as solicitações, validações com OK das babás, transações financeiras e
              usuários cadastrados no banco de dados.
            </p>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="self-start md:self-auto inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Dados
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
              <span>Total Diárias</span>
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="text-xl font-bold text-slate-800 mt-1">{metrics.totalSchedules}</div>
            <div className="text-[10px] text-slate-400">agendamentos</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
              <span>Valor Agendado</span>
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-xl font-bold text-slate-800 mt-1">
              R$ {metrics.totalValueScheduled.toFixed(0)}
            </div>
            <div className="text-[10px] text-slate-400">volume total</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
            <div className="text-[11px] font-semibold text-emerald-800 flex items-center justify-between">
              <span>Total Pago</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-emerald-700 mt-1">
              R$ {metrics.totalValuePaid.toFixed(0)}
            </div>
            <div className="text-[10px] text-emerald-600 font-medium">confirmados pela babá</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-2xs">
            <div className="text-[11px] font-semibold text-amber-800 flex items-center justify-between">
              <span>Pendente OK</span>
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-xl font-bold text-amber-700 mt-1">{metrics.pendingValidation}</div>
            <div className="text-[10px] text-amber-700 font-medium">aguarda babá</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-2xs">
            <div className="text-[11px] font-semibold text-blue-800 flex items-center justify-between">
              <span>Pendente Confirmação</span>
              <DollarSign className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-xl font-bold text-blue-700 mt-1">{metrics.paymentPending}</div>
            <div className="text-[10px] text-blue-700 font-medium">pago pela cliente</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
              <span>Usuários BD</span>
              <Users className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="text-xl font-bold text-slate-800 mt-1">{metrics.totalUsers}</div>
            <div className="text-[10px] text-slate-400">
              {metrics.totalClients} clientes • {metrics.totalBabysitters} babás
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="flex border-b border-slate-200 px-6 pt-4 gap-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('schedules')}
            className={`pb-4 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'schedules'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Todos os Agendamentos ({schedules.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-4 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'users'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            Usuários Cadastrados ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-4 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'logs'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Activity className="w-4 h-4" />
            Auditoria & Logs em Tempo Real ({logs.length})
          </button>
        </div>

        {/* TAB 1: SCHEDULES MONITORING */}
        {activeTab === 'schedules' && (
          <div className="p-6 space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, babá, bebê..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                <span className="text-xs text-slate-400 font-medium">Filtrar:</span>
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'pending_validation', label: 'Pendente OK' },
                  { id: 'validated', label: 'Validado' },
                  { id: 'payment_pending', label: 'Pago (Aguardando Conf.)' },
                  { id: 'paid_confirmed', label: 'Quitado' },
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => setStatusFilter(s.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      statusFilter === s.id
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Schedules Table */}
            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Dia & Horário</th>
                    <th className="py-3 px-4">Cliente / Contato</th>
                    <th className="py-3 px-4">Babá Designada</th>
                    <th className="py-3 px-4">Bebê</th>
                    <th className="py-3 px-4">Valor Diária</th>
                    <th className="py-3 px-4">Status & Validação</th>
                    <th className="py-3 px-4">Pagamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSchedules.map(schedule => {
                    const isPending = schedule.status === 'pending_validation';
                    const isValidated = schedule.status === 'validated';
                    const isPaymentPending = schedule.status === 'payment_pending';
                    const isPaid = schedule.status === 'paid_confirmed';

                    return (
                      <tr key={schedule.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                            {schedule.date}
                          </div>
                          <div className="text-[11px] text-slate-400 font-normal">
                            {schedule.startTime} - {schedule.endTime}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{schedule.clientName}</div>
                          <div className="text-[11px] text-slate-400">{schedule.clientPhone}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{schedule.babysitterName}</div>
                          {schedule.babysitterPixKey && (
                            <div className="text-[10px] text-emerald-700 font-mono">
                              Pix: {schedule.babysitterPixKey}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-700">{schedule.babyName}</div>
                          {schedule.babyAge && (
                            <div className="text-[10px] text-slate-400">{schedule.babyAge}</div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-extrabold text-slate-900 text-sm">
                          R$ {schedule.dailyRate.toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4">
                          {isPending && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Aguardando OK Babá
                            </span>
                          )}
                          {isValidated && (
                            <div>
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                                <Lock className="w-3 h-3 text-emerald-700" />
                                Validado (OK)
                              </span>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                por {schedule.validatedByName}
                              </div>
                            </div>
                          )}
                          {isPaymentPending && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md">
                              Pagamento Informado
                            </span>
                          )}
                          {isPaid && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Quitado & Confirmado
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {isPaid ? (
                            <div className="text-[11px]">
                              <span className="font-semibold text-emerald-700 block">
                                Pago via {schedule.paymentMethod}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Confirmado por {schedule.paymentConfirmedByName}
                              </span>
                            </div>
                          ) : isPaymentPending ? (
                            <div className="text-[11px]">
                              <span className="font-semibold text-blue-700">
                                Via {schedule.paymentMethod}
                              </span>
                              <div className="text-[10px] text-slate-400">
                                Aguarda OK da babá
                              </div>
                            </div>
                          ) : isValidated ? (
                            <span className="text-[11px] text-amber-700 font-medium">
                              Aguardando Pagamento da Cliente
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: REGISTERED USERS IN DATABASE */}
        {activeTab === 'users' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Usuários Registrados no Banco de Dados
                </h3>
                <p className="text-xs text-slate-500">
                  Contas armazenadas persistentemente no backend
                </p>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Nome</th>
                    <th className="py-3 px-4">Perfil</th>
                    <th className="py-3 px-4">E-mail</th>
                    <th className="py-3 px-4">Telefone</th>
                    <th className="py-3 px-4">Dados Específicos</th>
                    <th className="py-3 px-4">Data Cadastro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800">{u.name}</td>
                      <td className="py-3 px-4">
                        {u.role === 'cliente' && (
                          <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                            Cliente (Mãe/Pai)
                          </span>
                        )}
                        {u.role === 'baba' && (
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                            Babá
                          </span>
                        )}
                        {u.role === 'admin' && (
                          <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                            Administrador
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{u.email}</td>
                      <td className="py-3 px-4 text-slate-600">{u.phone || '—'}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {u.role === 'cliente' && u.babyName && (
                          <span className="text-slate-700">
                            Bebê: <strong>{u.babyName}</strong> {u.babyAge ? `(${u.babyAge})` : ''}
                          </span>
                        )}
                        {u.role === 'baba' && u.pixKey && (
                          <span className="text-emerald-700 font-mono text-[11px]">
                            Pix: {u.pixKey}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: AUDIT LOGS */}
        {activeTab === 'logs' && (
          <div className="p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Trilha de Auditoria & Registro de Atividades
              </h3>
              <p className="text-xs text-slate-500">
                Histórico imutável de todas as validações, agendamentos e transações de pagamento
              </p>
            </div>

            <div className="space-y-2.5">
              {logs.map(log => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 flex items-start gap-3 text-xs"
                >
                  <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        {log.userName} ({log.userRole.toUpperCase()})
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="text-slate-600 mt-0.5">{log.details}</div>
                    <div className="text-[10px] font-mono text-indigo-600 mt-1 font-semibold">
                      [{log.action}]
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
