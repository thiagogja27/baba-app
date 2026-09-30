import React from 'react';
import { User } from '../types.ts';
import { Baby, Shield, UserCheck, Heart, LogOut } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  onOpenAuth,
}) => {
  return (
    <header className="bg-white border-b border-rose-100 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-400 flex items-center justify-center text-white shadow-sm">
              <Baby className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-800 tracking-tight">
                  Babá<span className="text-rose-500">Agendada</span>
                </span>
                <span className="hidden sm:inline-block text-[11px] font-semibold bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full border border-rose-200">
                  Agenda & Diárias
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Validação de dias, pagamentos e monitoramento
              </p>
            </div>
          </div>

          {/* Quick Demo Switcher & User Profile */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-semibold text-slate-800 leading-tight">
                    {user.name}
                  </div>
                  <div className="flex items-center justify-end gap-1.5 mt-0.5">
                    {user.role === 'cliente' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                        <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                        Cliente {user.babyName ? `(Bebê: ${user.babyName})` : ''}
                      </span>
                    )}
                    {user.role === 'baba' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <UserCheck className="w-3 h-3 text-emerald-600" />
                        Babá Profissional
                      </span>
                    )}
                    {user.role === 'admin' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                        <Shield className="w-3 h-3 text-indigo-600" />
                        Administrador
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-100"
                  title="Sair da Conta"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="bg-rose-500 hover:bg-rose-600 text-white font-medium text-sm px-4 py-2 rounded-xl shadow-xs transition-colors"
              >
                Entrar / Cadastrar
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
