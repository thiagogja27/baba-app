import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { db, hashPassword, verifyPassword } from './server/db.ts';
import type { User } from './server/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple token-based session store
const sessions = new Map<string, { userId: string; expiresAt: number }>();

function createSession(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  // Expires in 7 days
  sessions.set(token, {
    userId,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  return token;
}

interface AuthenticatedRequest extends Request {
  user?: User;
}

function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Não autorizado. Faça login para continuar.' });
  }

  const token = authHeader.split(' ')[1];
  const session = sessions.get(token);

  if (!session || session.expiresAt < Date.now()) {
    if (session) sessions.delete(token);
    return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
  }

  const user = db.getUserById(session.userId);
  if (!user) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Usuário não encontrado.' });
  }

  req.user = user;
  next();
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // --- SYSTEM & FIREBASE STATUS ---
  app.get('/api/system/status', (_req, res) => {
    res.json({
      firebaseConnected: db.isFirebaseConnected(),
      projectId: 'baba-aebdc',
      databaseURL: 'https://baba-aebdc-default-rtdb.firebaseio.com',
    });
  });

  // --- AUTH ROUTES ---

  // --- AUTH ROUTES (FIREBASE AUTHENTICATION NATIVE) ---
  const FIREBASE_API_KEY = "AIzaSyDU6gLdyi9rB8He_WMy2i55Tt_ZW8IpAkA";

  // Register with Firebase Auth + Realtime Database profile
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { name, email, password, role, phone, babyName, babyAge, bio, pixKey } = req.body;

      if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'Preencha nome, email, senha e perfil.' });
      }

      if (!['cliente', 'baba', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Perfil inválido. Escolha Cliente, Babá ou Administrador.' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'A senha do Firebase deve conter no mínimo 6 caracteres.' });
      }

      const normalizedEmail = email.trim().toLowerCase();

      // 1. Create in Firebase Auth
      let firebaseUid = `usr_${crypto.randomUUID().slice(0, 8)}`;
      try {
        const fbRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: normalizedEmail,
              password,
              returnSecureToken: true,
            }),
          }
        );
        const fbData = await fbRes.json();
        if (fbRes.ok && fbData.localId) {
          firebaseUid = fbData.localId;
        } else if (fbData.error?.message === 'EMAIL_EXISTS') {
          // If already exists in Firebase Auth, authenticate to get uid
          const signInRes = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: normalizedEmail,
                password,
                returnSecureToken: true,
              }),
            }
          );
          const signInData = await signInRes.json();
          if (signInRes.ok && signInData.localId) {
            firebaseUid = signInData.localId;
          } else {
            return res.status(400).json({ error: 'Este e-mail já existe no Firebase com outra senha.' });
          }
        } else if (fbData.error?.message) {
          return res.status(400).json({ error: `Erro no Firebase Auth: ${fbData.error.message}` });
        }
      } catch (fbErr: any) {
        console.warn('Erro ao conectar com Firebase Auth no registro:', fbErr);
      }

      // 2. Save profile in Database & Firebase Realtime Database
      const newUser = db.createUserWithId({
        id: firebaseUid,
        name: name.trim(),
        email: normalizedEmail,
        passwordHash: hashPassword(password),
        role,
        phone: phone || '',
        babyName: babyName || '',
        babyAge: babyAge || '',
        bio: bio || '',
        pixKey: pixKey || '',
        createdAt: new Date().toISOString(),
      });

      const token = createSession(newUser.id);
      const { passwordHash: _, ...safeUser } = newUser;

      res.status(201).json({ user: safeUser, token });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erro ao registrar usuário' });
    }
  });

  // Login via native Firebase Authentication
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Informe e-mail e senha.' });
      }

      const normalizedEmail = email.trim().toLowerCase();

      // 1. Attempt Firebase Authentication
      let fbAuthUser: { uid: string; email: string; displayName?: string } | null = null;
      let fbErrorMessage: string | null = null;

      try {
        const fbRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: normalizedEmail,
              password,
              returnSecureToken: true,
            }),
          }
        );
        const fbData = await fbRes.json();

        if (fbRes.ok && fbData.localId) {
          fbAuthUser = {
            uid: fbData.localId,
            email: fbData.email || normalizedEmail,
            displayName: fbData.displayName,
          };
        } else if (fbData.error?.message) {
          const msg = fbData.error.message;
          if (msg === 'EMAIL_NOT_FOUND') {
            fbErrorMessage = 'E-mail não encontrado no Firebase Authentication.';
          } else if (msg === 'INVALID_PASSWORD' || msg === 'INVALID_LOGIN_CREDENTIALS') {
            fbErrorMessage = 'E-mail ou senha incorretos no Firebase Authentication.';
          } else if (msg === 'USER_DISABLED') {
            fbErrorMessage = 'Este usuário foi desativado no Firebase.';
          } else if (msg === 'TOO_MANY_ATTEMPTS_TRY_LATER') {
            fbErrorMessage = 'Muitas tentativas com senha incorreta. Tente novamente mais tarde.';
          } else {
            fbErrorMessage = `Firebase Auth: ${msg}`;
          }
        }
      } catch (fbErr: any) {
        console.error('Falha de rede ao contatar Firebase Auth:', fbErr);
      }

      // 2. Check if user is authenticated via Firebase
      if (fbAuthUser) {
        // Look up user profile in database
        let user = db.getUserById(fbAuthUser.uid) || db.getUserByEmail(normalizedEmail);

        if (!user) {
          // User was created directly in Firebase Console Authentication!
          // Auto-provision their profile in Realtime Database:
          let detectedRole: 'cliente' | 'baba' | 'admin' = 'cliente';
          if (
            normalizedEmail.includes('admin') ||
            normalizedEmail === 'thiago.viaembratelgja@gmail.com'
          ) {
            detectedRole = 'admin';
          } else if (normalizedEmail.includes('baba')) {
            detectedRole = 'baba';
          }

          user = db.createUserWithId({
            id: fbAuthUser.uid,
            name: fbAuthUser.displayName || normalizedEmail.split('@')[0],
            email: normalizedEmail,
            passwordHash: hashPassword(password),
            role: detectedRole,
            phone: '',
            createdAt: new Date().toISOString(),
          });
        } else if (user.id !== fbAuthUser.uid) {
          // Align database ID with Firebase UID
          user.id = fbAuthUser.uid;
          db.updateUser(user.id, { id: fbAuthUser.uid });
        }

        const token = createSession(user.id);
        const { passwordHash: _, ...safeUser } = user;
        return res.json({ user: safeUser, token });
      }

      // 3. Fallback: local password verification if user was registered locally
      const localUser = db.getUserByEmail(normalizedEmail);
      if (localUser && verifyPassword(password, localUser.passwordHash)) {
        const token = createSession(localUser.id);
        const { passwordHash: _, ...safeUser } = localUser;
        return res.json({ user: safeUser, token });
      }

      // If neither Firebase nor local matched, return error
      return res.status(401).json({
        error: fbErrorMessage || 'E-mail ou senha incorretos no Firebase Authentication.',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erro ao processar login' });
    }
  });

  // Profile update endpoint
  app.put('/api/users/profile', authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const { name, phone, role, babyName, babyAge, bio, pixKey } = req.body;

      const updated = db.updateUser(user.id, {
        name: name !== undefined ? name : user.name,
        phone: phone !== undefined ? phone : user.phone,
        role: role !== undefined ? role : user.role,
        babyName: babyName !== undefined ? babyName : user.babyName,
        babyAge: babyAge !== undefined ? babyAge : user.babyAge,
        bio: bio !== undefined ? bio : user.bio,
        pixKey: pixKey !== undefined ? pixKey : user.pixKey,
      });

      if (!updated) return res.status(404).json({ error: 'Usuário não encontrado' });
      const { passwordHash: _, ...safeUser } = updated;
      res.json({ user: safeUser });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erro ao atualizar perfil' });
    }
  });

  // Current session user info
  app.get('/api/auth/me', authMiddleware, (req: AuthenticatedRequest, res) => {
    if (!req.user) return res.status(401).json({ error: 'Não autenticado' });
    const { passwordHash: _, ...safeUser } = req.user;
    res.json({ user: safeUser });
  });

  // --- USERS & BABYSITTERS ---

  // Get available babysitters
  app.get('/api/users/babysitters', authMiddleware, (_req, res) => {
    const babysitters = db.getBabysitters();
    res.json({ babysitters });
  });

  // --- SCHEDULES (AGENDA) ---

  // Get schedules for logged user (Cliente sees theirs, Babá sees assigned to her, Admin sees all)
  app.get('/api/schedules', authMiddleware, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const schedules = db.getSchedules({ userId: user.id, userEmail: user.email, role: user.role });
    res.json({ schedules });
  });

  // Cliente creates a new schedule request
  app.post('/api/schedules', authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'cliente' && user.role !== 'admin') {
        return res.status(403).json({ error: 'Apenas clientes podem criar agendamentos.' });
      }

      const { babysitterId, date, startTime, endTime, dailyRate, babyName, babyAge, notes } = req.body;

      if (!babysitterId || !date || dailyRate === undefined) {
        return res.status(400).json({ error: 'Preencha a babá, o dia da agenda e o valor do dia (R$).' });
      }

      const rateNum = Number(dailyRate);
      if (isNaN(rateNum) || rateNum <= 0) {
        return res.status(400).json({ error: 'O valor da diária deve ser maior que zero.' });
      }

      const schedule = db.createSchedule({
        clientId: user.id,
        babysitterId,
        date,
        startTime: startTime || '08:00',
        endTime: endTime || '17:00',
        dailyRate: rateNum,
        babyName: babyName || user.babyName || 'Bebê',
        babyAge: babyAge || user.babyAge,
        notes: notes || '',
      });

      res.status(201).json({ schedule });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Erro ao criar agendamento' });
    }
  });

  // Cliente creates multiple schedules at once
  app.post('/api/schedules/batch', authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'cliente' && user.role !== 'admin') {
        return res.status(403).json({ error: 'Apenas clientes podem criar agendamentos.' });
      }

      const { babysitterId, days, babyName, babyAge, notes } = req.body;
      if (!babysitterId || !Array.isArray(days) || days.length === 0) {
        return res.status(400).json({ error: 'Selecione a babá e pelo menos um dia para agendar.' });
      }

      const schedules = db.createBatchSchedules(
        user.id,
        babysitterId,
        days,
        { babyName, babyAge, notes }
      );

      res.status(201).json({ schedules });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Erro ao criar agendamentos em lote' });
    }
  });

  // Cliente updates schedule (ONLY allowed if NOT validated yet!)
  app.put('/api/schedules/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { date, startTime, endTime, dailyRate, babyName, babyAge, notes, applyToAllPending } = req.body;

      const schedule = db.getScheduleById(id);
      if (!schedule) {
        return res.status(404).json({ error: 'Agendamento não encontrado.' });
      }

      // Check ownership (or admin)
      if (schedule.clientId !== user.id && user.role !== 'admin') {
        return res.status(403).json({ error: 'Apenas a cliente dona do agendamento pode alterá-lo.' });
      }

      // STRICT VALIDATION LOCK RULE:
      if (schedule.status !== 'pending_validation') {
        return res.status(403).json({
          error: 'A babá já validou este dia com um OK! As alterações estão bloqueadas e não podem mais ser modificadas ou desfeitas.',
        });
      }

      const updated = db.updateSchedule(id, schedule.clientId, {
        date,
        startTime,
        endTime,
        dailyRate: dailyRate !== undefined ? Number(dailyRate) : undefined,
        babyName,
        babyAge,
        notes,
        applyToAllPending: Boolean(applyToAllPending),
      });

      res.json({ schedule: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Erro ao atualizar agendamento' });
    }
  });

  // Cliente cancels/deletes schedule (ONLY allowed before babysitter validates!)
  app.delete('/api/schedules/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;

      const schedule = db.getScheduleById(id);
      if (!schedule) {
        return res.status(404).json({ error: 'Agendamento não encontrado.' });
      }

      if (schedule.clientId !== user.id && user.role !== 'admin') {
        return res.status(403).json({ error: 'Você não tem permissão para cancelar este agendamento.' });
      }

      // STRICT VALIDATION LOCK RULE:
      if (schedule.status !== 'pending_validation') {
        return res.status(403).json({
          error: 'A babá já validou este dia com um OK! Não é mais possível cancelar ou desfazer o agendamento.',
        });
      }

      db.deleteSchedule(id, schedule.clientId);
      res.json({ success: true, message: 'Agendamento cancelado com sucesso.' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Erro ao cancelar agendamento' });
    }
  });

  // Babá valida o dia com OK (TRAVA ALTERAÇÕES PELA CLIENTE)
  app.post('/api/schedules/:id/validate', authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;

      const schedule = db.getScheduleById(id);
      if (!schedule) {
        return res.status(404).json({ error: 'Agendamento não encontrado.' });
      }

      const isMatch =
        schedule.babysitterId === user.id ||
        (schedule.babysitterEmail && schedule.babysitterEmail.toLowerCase() === user.email.toLowerCase()) ||
        schedule.babysitterName.toLowerCase() === user.name.toLowerCase() ||
        user.role === 'admin';

      if (!isMatch) {
        return res.status(403).json({ error: 'Apenas a babá solicitada pode validar este dia.' });
      }

      if (schedule.status !== 'pending_validation') {
        return res.status(400).json({ error: 'Este agendamento já foi validado ou se encontra em outro status.' });
      }

      const updated = db.validateSchedule(id, user);
      res.json({ schedule: updated, message: 'Dia validado com sucesso! Alterações da cliente bloqueadas.' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Erro ao validar agendamento' });
    }
  });

  // Babá recusa a solicitação
  app.post('/api/schedules/:id/reject', authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { reason } = req.body;

      const schedule = db.getScheduleById(id);
      if (!schedule) {
        return res.status(404).json({ error: 'Agendamento não encontrado.' });
      }

      const isMatch =
        schedule.babysitterId === user.id ||
        (schedule.babysitterEmail && schedule.babysitterEmail.toLowerCase() === user.email.toLowerCase()) ||
        schedule.babysitterName.toLowerCase() === user.name.toLowerCase() ||
        user.role === 'admin';

      if (!isMatch) {
        return res.status(403).json({ error: 'Apenas a babá solicitada pode recusar este dia.' });
      }

      if (schedule.status !== 'pending_validation') {
        return res.status(400).json({ error: 'Apenas agendamentos pendentes de validação podem ser recusados.' });
      }

      const updated = db.rejectSchedule(id, user, reason);
      res.json({ schedule: updated, message: 'Solicitação recusada com sucesso.' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Erro ao recusar agendamento' });
    }
  });

  // Cliente informa pagamento realizado após validação da babá
  app.post('/api/schedules/:id/report-payment', authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { paymentMethod, paymentNotes } = req.body;

      const schedule = db.getScheduleById(id);
      if (!schedule) {
        return res.status(404).json({ error: 'Agendamento não encontrado.' });
      }

      if (schedule.clientId !== user.id && user.role !== 'admin') {
        return res.status(403).json({ error: 'Apenas a cliente contratante pode informar o pagamento.' });
      }

      if (schedule.status !== 'validated') {
        return res.status(400).json({
          error: 'Só é possível marcar como pago após a validação com OK da babá.',
        });
      }

      const updated = db.reportPayment(id, schedule.clientId, {
        paymentMethod: paymentMethod || 'PIX',
        paymentNotes,
      });

      res.json({ schedule: updated, message: 'Pagamento informado! Aguardando confirmação da babá.' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Erro ao informar pagamento' });
    }
  });

  // Babá confirma o recebimento do pagamento
  app.post('/api/schedules/:id/confirm-payment', authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;

      const schedule = db.getScheduleById(id);
      if (!schedule) {
        return res.status(404).json({ error: 'Agendamento não encontrado.' });
      }

      if (schedule.babysitterId !== user.id && user.role !== 'admin') {
        return res.status(403).json({ error: 'Apenas a babá pode confirmar o recebimento do valor.' });
      }

      if (schedule.status !== 'payment_pending') {
        return res.status(400).json({
          error: 'A cliente ainda não informou a realização do pagamento para que possa ser confirmado.',
        });
      }

      const updated = db.confirmPayment(id, schedule.babysitterId);
      res.json({ schedule: updated, message: 'Recebimento de pagamento confirmado com sucesso!' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Erro ao confirmar pagamento' });
    }
  });

  // --- ADMIN PANEL ROUTES ---

  // Admin Metrics
  app.get('/api/admin/metrics', authMiddleware, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso restrito a administradores do sistema.' });
    }
    const metrics = db.getAdminMetrics();
    res.json({ metrics });
  });

  // Admin list all users
  app.get('/api/admin/users', authMiddleware, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso restrito a administradores do sistema.' });
    }
    const users = db.getUsers().map(({ passwordHash: _, ...safeUser }) => safeUser);
    res.json({ users });
  });

  // Admin list audit logs
  app.get('/api/admin/audit-logs', authMiddleware, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso restrito a administradores do sistema.' });
    }
    const logs = db.getAuditLogs();
    res.json({ logs });
  });

  // Admin can force delete or reset (for testing)
  app.delete('/api/admin/schedules/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso restrito a administradores.' });
    }
    const { id } = req.params;
    const schedule = db.getScheduleById(id);
    if (!schedule) return res.status(404).json({ error: 'Agendamento não encontrado' });

    db.deleteSchedule(id, schedule.clientId);
    res.json({ success: true });
  });

  // --- FRONTEND INTEGRATION ---
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BabáAgendada Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
