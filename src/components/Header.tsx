import React from 'react';
import {
  Shield,
  Sparkles,
  LogOut,
  User,
  ShieldCheck,
  FolderArchive,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  currentView: 'comparador' | 'mis-expedientes' | 'admin';
  onViewChange: (view: 'comparador' | 'mis-expedientes' | 'admin') => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onViewChange }) => {
  const { user, isAdmin, logout } = useAuth();

  return (
    <header className="bg-gradient-to-r from-[#0b2545] via-[#133b68] to-[#0b2545] text-white shadow-lg border-b border-blue-900/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        {/* Top row */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-md text-[#0b2545] font-bold text-xl ring-2 ring-white/20 shrink-0">
              <Shield className="w-6 h-6 text-[#0b2545]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold tracking-wider uppercase px-2.5 py-0.5 rounded bg-blue-500/20 text-amber-300 border border-amber-400/30">
                  Banco de Colombia
                </span>
                <span className="text-[11px] text-blue-200/80 font-medium">
                  Costa Rica
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5">
                Comparador de Propuestas BC
              </h1>
            </div>
          </div>

          {/* Connected User Profile & Mandatory Logout button (Rule 8) */}
          {user && (
            <div className="flex items-center gap-3 self-stretch md:self-auto justify-end bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 backdrop-blur-sm">
              <div className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-xs font-bold text-white leading-tight">
                    {user.nombre}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-black uppercase tracking-wider ${
                      isAdmin
                        ? 'bg-amber-400 text-[#0b2545]'
                        : 'bg-blue-400/30 text-blue-200'
                    }`}
                  >
                    {user.rol}
                  </span>
                </div>
                <div className="text-[11px] text-blue-200/80 font-mono">
                  @{user.usuario}
                </div>
              </div>

              <div className="w-8 h-8 rounded-lg bg-blue-400 text-[#0b2545] flex items-center justify-center font-bold text-xs shrink-0">
                <User className="w-4 h-4" />
              </div>

              {/* Botón Cerrar sesión visible en todas las pantallas */}
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-red-600/80 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs shrink-0 ml-1"
                title="Cerrar sesión del sistema"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          )}
        </div>

        {/* Navigation Tabs (Comparador, Mis Expedientes, Panel Admin) */}
        {user && (
          <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                  <span>Panel de Administración</span>
                </button>
              )}
            </div>

            <div className="text-xs text-blue-100/90 font-normal hidden lg:block">
              Compara propuestas de seguro de automóvil en minutos. <span className="font-semibold text-white">La IA prepara, el asesor decide.</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
