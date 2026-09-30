import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export type UserRole = 'cliente' | 'baba' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  phone: string;
  babyName?: string;
  babyAge?: string;
  bio?: string;
  pixKey?: string;
  createdAt: string;
}

export type ScheduleStatus =
  | 'pending_validation'        // Cliente cadastrou, aguardando OK da babá (editável/cancelável pela cliente)
  | 'validated'                 // Babá deu OK (bloqueado para edição da cliente)
  | 'payment_pending'           // Cliente informou que pagou
  | 'paid_confirmed'            // Babá confirmou o recebimento do pagamento
  | 'rejected';                 // Babá recusou o agendamento

export interface Schedule {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  babysitterId: string;
  babysitterName: string;
  babysitterEmail?: string;
  babysitterPixKey?: string;
  date: string;               // YYYY-MM-DD
  startTime: string;          // Ex: "08:00"
  endTime: string;            // Ex: "18:00"
  dailyRate: number;          // Valor do dia em R$
  babyName: string;
  babyAge?: string;
  notes: string;
  status: ScheduleStatus;
  validatedAt?: string | null;
  validatedByName?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  paymentReportedAt?: string | null;
  paymentMethod?: string | null;
  paymentNotes?: string | null;
  paymentConfirmedAt?: string | null;
  paymentConfirmedByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  scheduleId?: string;
  details: string;
}

export interface DatabaseSchema {
  users: User[];
  schedules: Schedule[];
  auditLogs: AuditLog[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Password hashing using Node built-in crypto
export function hashPassword(password: string): string {
  const salt = 'baba_agendada_salt_secure_2026';
  return crypto.scryptSync(password, salt, 32).toString('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

function getInitialData(): DatabaseSchema {
  return {
    users: [],
    schedules: [],
    auditLogs: [],
  };
}

function getFirebaseUrl(): string {
  const url = process.env.VITE_FIREBASE_DATABASE_URL || process.env.FIREBASE_DATABASE_URL || 'https://baba-aebdc-default-rtdb.firebaseio.com';
  return url.replace(/\/$/, '');
}

class Database {
  private data: DatabaseSchema;
  private firebaseConnected = false;
  private isLoaded = false;
  private loadPromise: Promise<void> | null = null;

  constructor() {
    this.data = getInitialData();
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        try {
          const raw = fs.readFileSync(DB_FILE, 'utf-8');
          this.data = JSON.parse(raw);
        } catch {
          this.data = getInitialData();
          this.saveLocal();
        }
      } else {
        this.data = getInitialData();
        this.saveLocal();
      }
    } catch {
      // In serverless environments (like Vercel), the filesystem is read-only.
      this.data = getInitialData();
    }

    // Initialize Firebase sync in the background
    this.initFirebase().catch(() => {});
  }

  public async ensureLoaded(): Promise<void> {
    if (this.isLoaded && this.data.users.length > 0) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      await this.initFirebase();
      this.isLoaded = true;
    })();

    try {
      await this.loadPromise;
    } finally {
      this.loadPromise = null;
    }
  }

  public async initFirebase() {
    try {
      const url = getFirebaseUrl();
      const res = await fetch(`${url}/.json`);
      if (res.ok) {
        const remote = await res.json();
        this.firebaseConnected = true;
        if (remote && typeof remote === 'object') {
          let updated = false;
          if (Array.isArray(remote.users) && remote.users.length > 0) {
            this.data.users = remote.users;
            updated = true;
          }
          if (Array.isArray(remote.schedules) && remote.schedules.length > 0) {
            this.data.schedules = remote.schedules;
            updated = true;
          }
          if (Array.isArray(remote.auditLogs) && remote.auditLogs.length > 0) {
            this.data.auditLogs = remote.auditLogs;
            updated = true;
          }
          if (updated) {
            this.saveLocal();
          }
        }
        console.log('Firebase Realtime Database conectado:', url);
      }
    } catch (err) {
      console.warn('Conexão com Firebase Realtime Database:', err);
    }
  }

  public isFirebaseConnected(): boolean {
    return this.firebaseConnected;
  }

  private saveLocal() {
    try {
      const tmp = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmp, DB_FILE);
    } catch {
      // Ignore read-only filesystem errors on Vercel/serverless
    }
  }

  private save() {
    this.saveLocal();
    this.syncToFirebase().catch(() => {});
  }

  private async syncToFirebase() {
    try {
      const url = getFirebaseUrl();
      const res = await fetch(`${url}/.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          users: this.data.users,
          schedules: this.data.schedules,
          auditLogs: this.data.auditLogs,
          lastSync: new Date().toISOString(),
          projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'baba-aebdc',
        }),
      });
      if (res.ok) {
        this.firebaseConnected = true;
      }
    } catch (err) {
      console.error('Falha ao sincronizar com Firebase Realtime Database:', err);
    }
  }

  // Users
  getUsers(): User[] {
    return this.data.users;
  }

  getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  createUser(userData: Omit<User, 'id' | 'createdAt'>): User {
    const newUser: User = {
      ...userData,
      id: `usr_${crypto.randomUUID().slice(0, 8)}`,
      createdAt: new Date().toISOString(),
    };
    this.data.users.push(newUser);
    this.save();

    this.addAuditLog({
      userId: newUser.id,
      userName: newUser.name,
      userRole: newUser.role,
      action: 'USUARIO_CADASTRADO',
      details: `Novo cadastro realizado no perfil: ${newUser.role.toUpperCase()}`,
    });

    return newUser;
  }

  createUserWithId(userData: User): User {
    const existingIndex = this.data.users.findIndex(
      u => u.id === userData.id || u.email.toLowerCase() === userData.email.toLowerCase()
    );
    if (existingIndex >= 0) {
      this.data.users[existingIndex] = {
        ...this.data.users[existingIndex],
        ...userData,
      };
      this.save();
      return this.data.users[existingIndex];
    }

    this.data.users.push(userData);
    this.save();

    this.addAuditLog({
      userId: userData.id,
      userName: userData.name,
      userRole: userData.role,
      action: 'USUARIO_FIREBASE_CONECTADO',
      details: `Usuário autenticado via Firebase Auth no perfil: ${userData.role.toUpperCase()}`,
    });

    return userData;
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const user = this.getUserById(id);
    if (!user) return undefined;
    Object.assign(user, updates);
    this.save();
    return user;
  }

  getBabysitters(): Omit<User, 'passwordHash'>[] {
    return this.data.users
      .filter(u => u.role === 'baba')
      .map(({ passwordHash: _, ...rest }) => rest);
  }

  // Schedules
  getSchedules(filter?: { userId?: string; userEmail?: string; role?: UserRole }): Schedule[] {
    let list = [...this.data.schedules];
    if (filter && filter.userId && filter.role) {
      if (filter.role === 'cliente') {
        list = list.filter(s => s.clientId === filter.userId || (filter.userEmail && s.clientPhone === filter.userEmail));
      } else if (filter.role === 'baba') {
        list = list.filter(
          s =>
            s.babysitterId === filter.userId ||
            (filter.userEmail && s.babysitterEmail === filter.userEmail)
        );
      }
      // If admin, returns all
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  getScheduleById(id: string): Schedule | undefined {
    return this.data.schedules.find(s => s.id === id);
  }

  createSchedule(scheduleData: {
    clientId: string;
    babysitterId: string;
    date: string;
    startTime: string;
    endTime: string;
    dailyRate: number;
    babyName: string;
    babyAge?: string;
    notes: string;
  }): Schedule {
    const client = this.getUserById(scheduleData.clientId);
    const babysitter = this.getUserById(scheduleData.babysitterId);

    if (!client) throw new Error('Cliente não encontrado');
    if (!babysitter) throw new Error('Babá não encontrada');

    const newSchedule: Schedule = {
      id: `sch_${crypto.randomUUID().slice(0, 8)}`,
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      babysitterId: babysitter.id,
      babysitterName: babysitter.name,
      babysitterPixKey: babysitter.pixKey,
      date: scheduleData.date,
      startTime: scheduleData.startTime || '08:00',
      endTime: scheduleData.endTime || '17:00',
      dailyRate: Number(scheduleData.dailyRate) || 0,
      babyName: scheduleData.babyName || client.babyName || 'Bebê',
      babyAge: scheduleData.babyAge || client.babyAge || '',
      notes: scheduleData.notes || '',
      status: 'pending_validation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.schedules.unshift(newSchedule);
    this.save();

    this.addAuditLog({
      userId: client.id,
      userName: client.name,
      userRole: 'cliente',
      scheduleId: newSchedule.id,
      action: 'AGENDAMENTO_CRIADO',
      details: `Solicitou diária com ${babysitter.name} para o dia ${newSchedule.date} no valor de R$ ${newSchedule.dailyRate.toFixed(2)}`,
    });

    return newSchedule;
  }

  createBatchSchedules(
    clientId: string,
    babysitterId: string,
    days: {
      date: string;
      startTime: string;
      endTime: string;
      dailyRate: number;
    }[],
    common: {
      babyName?: string;
      babyAge?: string;
      notes?: string;
    }
  ): Schedule[] {
    const client = this.getUserById(clientId);
    const babysitter = this.getUserById(babysitterId);
    if (!client) throw new Error('Cliente não encontrado');
    if (!babysitter) throw new Error('Babá não encontrada');

    const created: Schedule[] = [];
    for (const d of days) {
      const newSchedule: Schedule = {
        id: `sch_${crypto.randomUUID().slice(0, 8)}`,
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        babysitterId: babysitter.id,
        babysitterName: babysitter.name,
        babysitterEmail: babysitter.email,
        babysitterPixKey: babysitter.pixKey,
        date: d.date,
        startTime: d.startTime || '08:00',
        endTime: d.endTime || '17:00',
        dailyRate: Number(d.dailyRate) || 0,
        babyName: common.babyName || client.babyName || 'Bebê',
        babyAge: common.babyAge || client.babyAge || '',
        notes: common.notes || '',
        status: 'pending_validation',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.data.schedules.unshift(newSchedule);
      created.push(newSchedule);
    }

    this.save();

    this.addAuditLog({
      userId: client.id,
      userName: client.name,
      userRole: 'cliente',
      action: 'AGENDAMENTO_LOTE_CRIADO',
      details: `Solicitou ${days.length} dias com a babá ${babysitter.name}.`,
    });

    return created;
  }

  updateSchedule(
    id: string,
    clientId: string,
    updateData: {
      date?: string;
      startTime?: string;
      endTime?: string;
      dailyRate?: number;
      babyName?: string;
      babyAge?: string;
      notes?: string;
      applyToAllPending?: boolean;
    }
  ): Schedule {
    const schedule = this.getScheduleById(id);
    if (!schedule) throw new Error('Agendamento não encontrado');

    if (schedule.clientId !== clientId) {
      throw new Error('Você só pode alterar seus próprios agendamentos');
    }

    // REGRA DE NEGÓCIO ESSENCIAL:
    // Se a babá já deu OK (status != pending_validation), a cliente NÃO pode alterar!
    if (schedule.status !== 'pending_validation') {
      throw new Error(
        'Este agendamento já foi validado pela babá com OK! As alterações estão bloqueadas e não podem mais ser desfeitas.'
      );
    }

    if (updateData.date) schedule.date = updateData.date;
    if (updateData.startTime) schedule.startTime = updateData.startTime;
    if (updateData.endTime) schedule.endTime = updateData.endTime;
    if (updateData.dailyRate !== undefined) schedule.dailyRate = Number(updateData.dailyRate);
    if (updateData.babyName) schedule.babyName = updateData.babyName;
    if (updateData.babyAge !== undefined) schedule.babyAge = updateData.babyAge;
    if (updateData.notes !== undefined) schedule.notes = updateData.notes;
    schedule.updatedAt = new Date().toISOString();

    // Se o cliente marcou "Mesmo para todos os dias" ou applyToAllPending:
    if (updateData.applyToAllPending) {
      const otherPending = this.data.schedules.filter(
        s =>
          s.id !== id &&
          s.clientId === clientId &&
          s.babysitterId === schedule.babysitterId &&
          s.status === 'pending_validation'
      );

      for (const other of otherPending) {
        if (updateData.startTime) other.startTime = updateData.startTime;
        if (updateData.endTime) other.endTime = updateData.endTime;
        if (updateData.dailyRate !== undefined) other.dailyRate = Number(updateData.dailyRate);
        if (updateData.babyName) other.babyName = updateData.babyName;
        if (updateData.babyAge !== undefined) other.babyAge = updateData.babyAge;
        if (updateData.notes !== undefined) other.notes = updateData.notes;
        other.updatedAt = new Date().toISOString();
      }

      this.addAuditLog({
        userId: clientId,
        userName: schedule.clientName,
        userRole: 'cliente',
        scheduleId: schedule.id,
        action: 'AGENDAMENTO_LOTE_ATUALIZADO',
        details: `Aplicou mesmo horário (${schedule.startTime}-${schedule.endTime}) e valor (R$ ${schedule.dailyRate.toFixed(2)}) para ${otherPending.length + 1} dias pendentes com a babá.`,
      });
    } else {
      this.addAuditLog({
        userId: clientId,
        userName: schedule.clientName,
        userRole: 'cliente',
        scheduleId: schedule.id,
        action: 'AGENDAMENTO_ALTERADO',
        details: `Alterou detalhes antes da validação da babá: Data ${schedule.date}, Valor R$ ${schedule.dailyRate.toFixed(2)}`,
      });
    }

    this.save();
    return schedule;
  }

  deleteSchedule(id: string, clientId: string): boolean {
    const schedule = this.getScheduleById(id);
    if (!schedule) throw new Error('Agendamento não encontrado');

    if (schedule.clientId !== clientId) {
      throw new Error('Você só pode excluir seus próprios agendamentos');
    }

    // REGRA DE NEGÓCIO: Se já validado, não pode excluir/desfazer!
    if (schedule.status !== 'pending_validation') {
      throw new Error(
        'Este agendamento já foi validado pela babá! Não é mais permitido cancelar ou excluir.'
      );
    }

    this.data.schedules = this.data.schedules.filter(s => s.id !== id);
    this.save();

    this.addAuditLog({
      userId: clientId,
      userName: schedule.clientName,
      userRole: 'cliente',
      scheduleId: id,
      action: 'AGENDAMENTO_EXCLUIDO',
      details: `Cancelou/excluiu agendamento do dia ${schedule.date}`,
    });

    return true;
  }

  // A babá valida o dia com OK (trava alterações pela cliente)
  validateSchedule(id: string, babysitterUser: User): Schedule {
    const schedule = this.getScheduleById(id);
    if (!schedule) throw new Error('Agendamento não encontrado');

    const isMatch =
      schedule.babysitterId === babysitterUser.id ||
      (schedule.babysitterEmail && schedule.babysitterEmail.toLowerCase() === babysitterUser.email.toLowerCase()) ||
      schedule.babysitterName.toLowerCase() === babysitterUser.name.toLowerCase() ||
      babysitterUser.role === 'admin';

    if (!isMatch) {
      throw new Error('Apenas a babá solicitada pode validar este dia');
    }

    if (schedule.status !== 'pending_validation') {
      throw new Error('Este agendamento já foi validado ou se encontra em outro status');
    }

    schedule.babysitterId = babysitterUser.id;
    schedule.status = 'validated';
    schedule.validatedAt = new Date().toISOString();
    schedule.validatedByName = babysitterUser.name;
    schedule.updatedAt = new Date().toISOString();

    this.save();

    this.addAuditLog({
      userId: babysitterUser.id,
      userName: babysitterUser.name,
      userRole: 'baba',
      scheduleId: schedule.id,
      action: 'AGENDAMENTO_VALIDADO_BABA',
      details: `Babá deu OK no agendamento do dia ${schedule.date} (R$ ${schedule.dailyRate.toFixed(2)}). As alterações da cliente foram bloqueadas com sucesso.`,
    });

    return schedule;
  }

  // A babá recusa a solicitação
  rejectSchedule(id: string, babysitterUser: User, reason?: string): Schedule {
    const schedule = this.getScheduleById(id);
    if (!schedule) throw new Error('Agendamento não encontrado');

    const isMatch =
      schedule.babysitterId === babysitterUser.id ||
      (schedule.babysitterEmail && schedule.babysitterEmail.toLowerCase() === babysitterUser.email.toLowerCase()) ||
      schedule.babysitterName.toLowerCase() === babysitterUser.name.toLowerCase() ||
      babysitterUser.role === 'admin';

    if (!isMatch) {
      throw new Error('Apenas a babá solicitada pode recusar este dia');
    }

    if (schedule.status !== 'pending_validation') {
      throw new Error('Apenas agendamentos pendentes podem ser recusados');
    }

    schedule.babysitterId = babysitterUser.id;
    schedule.status = 'rejected';
    schedule.rejectedAt = new Date().toISOString();
    schedule.rejectionReason = reason || 'Indisponibilidade de horário';
    schedule.updatedAt = new Date().toISOString();

    this.save();

    this.addAuditLog({
      userId: babysitterUser.id,
      userName: babysitterUser.name,
      userRole: 'baba',
      scheduleId: schedule.id,
      action: 'AGENDAMENTO_RECUSADO_BABA',
      details: `Babá recusou a solicitação para o dia ${schedule.date}. Motivo: ${schedule.rejectionReason}`,
    });

    return schedule;
  }

  // Cliente coloca como pago após validação
  reportPayment(
    id: string,
    clientId: string,
    paymentDetails: { paymentMethod?: string; paymentNotes?: string }
  ): Schedule {
    const schedule = this.getScheduleById(id);
    if (!schedule) throw new Error('Agendamento não encontrado');

    if (schedule.clientId !== clientId) {
      throw new Error('Apenas a cliente solicitante pode informar o pagamento');
    }

    if (schedule.status !== 'validated') {
      throw new Error(
        'Só é possível informar pagamento para agendamentos que já foram validados pela babá!'
      );
    }

    schedule.status = 'payment_pending';
    schedule.paymentReportedAt = new Date().toISOString();
    schedule.paymentMethod = paymentDetails.paymentMethod || 'PIX';
    schedule.paymentNotes = paymentDetails.paymentNotes || 'Pagamento informado pela cliente';
    schedule.updatedAt = new Date().toISOString();

    this.save();

    this.addAuditLog({
      userId: clientId,
      userName: schedule.clientName,
      userRole: 'cliente',
      scheduleId: schedule.id,
      action: 'PAGAMENTO_INFORMADO_CLIENTE',
      details: `Cliente marcou como pago via ${schedule.paymentMethod} (R$ ${schedule.dailyRate.toFixed(2)}). Aguardando confirmação da babá.`,
    });

    return schedule;
  }

  // Babá confirma o recebimento do pagamento
  confirmPayment(id: string, babysitterId: string): Schedule {
    const schedule = this.getScheduleById(id);
    if (!schedule) throw new Error('Agendamento não encontrado');

    if (schedule.babysitterId !== babysitterId) {
      throw new Error('Apenas a babá do agendamento pode confirmar o recebimento do pagamento');
    }

    if (schedule.status !== 'payment_pending') {
      throw new Error('O pagamento ainda não foi informado pela cliente para ser confirmado');
    }

    const babysitter = this.getUserById(babysitterId);
    schedule.status = 'paid_confirmed';
    schedule.paymentConfirmedAt = new Date().toISOString();
    schedule.paymentConfirmedByName = babysitter ? babysitter.name : 'Babá';
    schedule.updatedAt = new Date().toISOString();

    this.save();

    this.addAuditLog({
      userId: babysitterId,
      userName: schedule.paymentConfirmedByName,
      userRole: 'baba',
      scheduleId: schedule.id,
      action: 'PAGAMENTO_CONFIRMADO_BABA',
      details: `Babá confirmou o recebimento integral de R$ ${schedule.dailyRate.toFixed(2)} referente ao dia ${schedule.date}. Ciclo concluído com sucesso.`,
    });

    return schedule;
  }

  // Audit Logs
  addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): void {
    const newLog: AuditLog = {
      ...log,
      id: `log_${crypto.randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(newLog);
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs.pop();
    }
    this.save();
  }

  getAuditLogs(): AuditLog[] {
    return this.data.auditLogs;
  }

  // Admin Metrics
  getAdminMetrics() {
    const schedules = this.data.schedules;
    const users = this.data.users;

    const totalSchedules = schedules.length;
    const pendingValidation = schedules.filter(s => s.status === 'pending_validation').length;
    const validated = schedules.filter(s => s.status === 'validated').length;
    const paymentPending = schedules.filter(s => s.status === 'payment_pending').length;
    const paidConfirmed = schedules.filter(s => s.status === 'paid_confirmed').length;

    const totalValueScheduled = schedules.reduce((acc, s) => acc + (s.dailyRate || 0), 0);
    const totalValuePaid = schedules
      .filter(s => s.status === 'paid_confirmed')
      .reduce((acc, s) => acc + (s.dailyRate || 0), 0);
    const totalValuePendingPayment = schedules
      .filter(s => s.status === 'validated' || s.status === 'payment_pending')
      .reduce((acc, s) => acc + (s.dailyRate || 0), 0);

    const totalClients = users.filter(u => u.role === 'cliente').length;
    const totalBabysitters = users.filter(u => u.role === 'baba').length;

    return {
      totalSchedules,
      pendingValidation,
      validated,
      paymentPending,
      paidConfirmed,
      totalValueScheduled,
      totalValuePaid,
      totalValuePendingPayment,
      totalClients,
      totalBabysitters,
      totalUsers: users.length,
    };
  }
}

export const db = new Database();
