export type UserRole = 'cliente' | 'baba' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  babyName?: string;
  babyAge?: string;
  bio?: string;
  pixKey?: string;
  createdAt: string;
}

export type ScheduleStatus =
  | 'pending_validation'        // Aguardando Babá dar OK
  | 'validated'                 // Babá deu OK (travado para cliente)
  | 'payment_pending'           // Cliente informou pagamento
  | 'paid_confirmed'            // Babá confirmou recebimento
  | 'rejected';                 // Babá recusou

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
  startTime: string;          // HH:mm
  endTime: string;            // HH:mm
  dailyRate: number;          // R$
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

export interface AdminMetrics {
  totalSchedules: number;
  pendingValidation: number;
  validated: number;
  paymentPending: number;
  paidConfirmed: number;
  totalValueScheduled: number;
  totalValuePaid: number;
  totalValuePendingPayment: number;
  totalClients: number;
  totalBabysitters: number;
  totalUsers: number;
}
