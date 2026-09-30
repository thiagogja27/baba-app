import { User, Schedule, AdminMetrics, AuditLog } from './types.ts';

const TOKEN_KEY = 'baba_agendada_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  let data: any = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(
        'Endpoint da API não encontrado (404). Verifique se o deploy na Vercel foi concluído com as novas rotas.'
      );
    }
    throw new Error(data.error || 'Ocorreu um erro na requisição.');
  }

  return data as T;
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const res = await request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(res.token);
    return res;
  },

  async register(payload: {
    name: string;
    email: string;
    password: string;
    role: 'cliente' | 'baba' | 'admin';
    phone: string;
    babyName?: string;
    babyAge?: string;
    bio?: string;
    pixKey?: string;
  }): Promise<{ user: User; token: string }> {
    const res = await request<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setStoredToken(res.token);
    return res;
  },

  async quickLogin(role: 'cliente' | 'baba' | 'admin'): Promise<{ user: User; token: string }> {
    const res = await request<{ user: User; token: string }>('/api/auth/quick-login', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
    setStoredToken(res.token);
    return res;
  },

  async getMe(): Promise<{ user: User }> {
    return request<{ user: User }>('/api/auth/me');
  },

  logout(): void {
    setStoredToken(null);
  },

  // Babysitters
  async getBabysitters(): Promise<{ babysitters: User[] }> {
    return request<{ babysitters: User[] }>('/api/users/babysitters');
  },

  // Schedules
  async getSchedules(): Promise<{ schedules: Schedule[] }> {
    return request<{ schedules: Schedule[] }>('/api/schedules');
  },

  async createSchedule(data: {
    babysitterId: string;
    date: string;
    startTime: string;
    endTime: string;
    dailyRate: number;
    babyName: string;
    babyAge?: string;
    notes?: string;
  }): Promise<{ schedule: Schedule }> {
    return request<{ schedule: Schedule }>('/api/schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async createBatchSchedules(data: {
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
  }): Promise<{ schedules: Schedule[] }> {
    return request<{ schedules: Schedule[] }>('/api/schedules/batch', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateSchedule(
    id: string,
    data: {
      date?: string;
      startTime?: string;
      endTime?: string;
      dailyRate?: number;
      babyName?: string;
      babyAge?: string;
      notes?: string;
      applyToAllPending?: boolean;
    }
  ): Promise<{ schedule: Schedule }> {
    return request<{ schedule: Schedule }>(`/api/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteSchedule(id: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(`/api/schedules/${id}`, {
      method: 'DELETE',
    });
  },

  async clearPaidSchedules(clientId?: string): Promise<{ success: boolean; removedCount: number; message: string }> {
    return request<{ success: boolean; removedCount: number; message: string }>('/api/schedules/clear-paid', {
      method: 'POST',
      body: JSON.stringify({ clientId }),
    });
  },

  // Babá valida o dia (dar OK) ou valida o pacote completo
  async validateSchedule(id: string, validateEntirePackage = false): Promise<{ schedule: Schedule; message: string }> {
    return request<{ schedule: Schedule; message: string }>(`/api/schedules/${id}/validate`, {
      method: 'POST',
      body: JSON.stringify({ validateEntirePackage }),
    });
  },

  // Babá recusa a solicitação ou recusa o pacote completo
  async rejectSchedule(
    id: string,
    reason?: string,
    rejectEntirePackage = false
  ): Promise<{ schedule: Schedule; message: string }> {
    return request<{ schedule: Schedule; message: string }>(`/api/schedules/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason, rejectEntirePackage }),
    });
  },

  // Cliente informa pagamento realizado (opcionalmente do pacote completo)
  async reportPayment(
    id: string,
    payload: { paymentMethod?: string; paymentNotes?: string; payEntirePackage?: boolean }
  ): Promise<{ schedule: Schedule; message: string }> {
    return request<{ schedule: Schedule; message: string }>(`/api/schedules/${id}/report-payment`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Babá confirma o recebimento do pagamento (opcionalmente do pacote completo)
  async confirmPayment(id: string, confirmEntirePackage = false): Promise<{ schedule: Schedule; message: string }> {
    return request<{ schedule: Schedule; message: string }>(`/api/schedules/${id}/confirm-payment`, {
      method: 'POST',
      body: JSON.stringify({ confirmEntirePackage }),
    });
  },

  // Admin
  async getAdminMetrics(): Promise<{ metrics: AdminMetrics }> {
    return request<{ metrics: AdminMetrics }>('/api/admin/metrics');
  },

  async getAdminUsers(): Promise<{ users: User[] }> {
    return request<{ users: User[] }>('/api/admin/users');
  },

  async getAdminAuditLogs(): Promise<{ logs: AuditLog[] }> {
    return request<{ logs: AuditLog[] }>('/api/admin/audit-logs');
  },
};
