import React from 'react';
import {
  Shield,
  Sparkles,
  Building2,
  LogIn,
  LogOut,
  User,
  ShieldCheck,
  FolderArchive,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  currentView: 'comparador' | 'mis-expedientes' | 'admin';
  onViewChange: (view: 'comparador' | 'mis-expedientes' | 'admin') => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onViewChange }) => {
  const { user, profile, isAdmin, isSuspended, signInWithGoogle, logout } = useAuth();

  return (
    <header className="bg-gradient-to-r from-[#0b2545] via-[#133b68] to-[#0b2545] text-white shadow-lg border-b border-blue-900/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Top row */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-900/20 text-[#0b2545] font-bold text-xl ring-2 ring-white/20 shrink-0">
              <Shield className="w-7 h-7 text-[#0b2545]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-blue-500/20 text-amber-300 border border-amber-400/30">
                  BN Corredora de Seguros
                </span>
                <span className="text-[11px] text-blue-200/80 font-medium">
                  Costa Rica
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white mt-0.5">
                Comparador de Propuestas BN
              </h1>
            </div>
          </div>

          {/* User Auth & Profile area */}
          <div className="flex items-center gap-3 self-stretch md:self-auto justify-end">
            {user ? (
              <div className="flex items-center gap-3 bg-white/10 p-1.5 pl-3 rounded-xl border border-white/10 backdrop-blur-sm">
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-xs font-bold text-white leading-none">
                      {profile?.displayName || user.displayName || 'Asesor BN'}
                    </span>
                    {isAdmin ? (
                      <span className="text-[10px] bg-amber-400 text-[#0b2545] px-1.5 py-0.2 rounded font-extrabold uppercase">
                        Admin
                      </span>
                    ) : (
                      <span className="text-[10px] bg-blue-400/30 text-blue-200 px-1.5 py-0.2 rounded font-semibold uppercase">
                        Asesor
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-blue-200/80 block leading-tight font-mono">
                    {user.email}
                  </span>
                </div>

                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Usuario'}
                    className="w-8 h-8 rounded-lg border border-white/20 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-blue-400 text-[#0b2545] flex items-center justify-center font-bold text-xs">
                    {user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}

                <button
                  type="button"
                  onClick={logout}
                  className="text-xs font-semibold text-blue-200 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors cursor-pointer"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={signInWithGoogle}
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#0b2545] bg-amber-400 hover:bg-amber-300 px-4 py-2 rounded-xl shadow-md transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Ingresar como Asesor / Administrador</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs (Comparador, Mis Expedientes, Panel Admin) */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onViewChange('comparador')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentView === 'comparador'
                  ? 'bg-white text-[#0b2545] shadow-sm'
                  : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Comparador de Propuestas</span>
            </button>

            {user && (
              <button
                type="button"
                onClick={() => onViewChange('mis-expedientes')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentView === 'mis-expedientes'
                    ? 'bg-white text-[#0b2545] shadow-sm'
                    : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <FolderArchive className="w-3.5 h-3.5" />
                <span>Mis Expedientes</span>
              </button>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={() => onViewChange('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentView === 'admin'
                    ? 'bg-amber-400 text-[#0b2545] shadow-sm'
                    : 'text-amber-300 hover:bg-white/10'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Panel de Administración (RBAC)</span>
              </button>
            )}
          </div>

          <div className="text-xs text-blue-100/90 font-normal hidden lg:block">
            Compara propuestas de seguro de automóvil en minutos. <span className="font-semibold text-white">La IA prepara, el asesor decide.</span>
          </div>
        </div>
      </div>
    </header>
  );
};
