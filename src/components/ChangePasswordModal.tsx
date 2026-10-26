import React, { useState } from 'react';
import { KeyRound, ShieldAlert, CheckCircle2, Lock, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const ChangePasswordModal: React.FC = () => {
  const { user, cambiarClave, logout } = useAuth();
  const [nuevaClave, setNuevaClave] = useState('');
  const [confirmarClave, setConfirmarClave] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (nuevaClave.length < 8) {
      setError('La nueva contraseña debe tener como mínimo 8 caracteres.');
      return;
    }

    if (!/\d/.test(nuevaClave)) {
      setError('La nueva contraseña debe contener al menos un número.');
      return;
    }

    if (nuevaClave !== confirmarClave) {
      setError('Las contraseñas no coinciden. Por favor verifique.');
      return;
    }

    setLoading(true);
    const res = await cambiarClave(nuevaClave);
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Ocurrió un error al actualizar la contraseña.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#07192e]/85 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-[#0b2545] text-white p-6 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-amber-400 text-[#0b2545] flex items-center justify-center mb-2 shadow-md">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black tracking-tight text-white">
            Cambio de Contraseña Obligatorio
          </h2>
          <p className="text-xs text-blue-200 mt-1 max-w-xs mx-auto">
            Por política de seguridad institucional, debe definir una nueva contraseña personal antes de continuar.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-blue-700" />
              <span>Requisitos mínimos de la contraseña:</span>
            </div>
            <ul className="list-disc pl-5 text-[11px] space-y-0.5 text-blue-800">
              <li>Mínimo 8 caracteres</li>
              <li>Al menos un número (0-9)</li>
            </ul>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nueva Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={nuevaClave}
                  onChange={e => setNuevaClave(e.target.value)}
                  placeholder="Mínimo 8 caracteres con números"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b2545]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Confirmar Nueva Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={confirmarClave}
                  onChange={e => setConfirmarClave(e.target.value)}
                  placeholder="Repita la contraseña"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b2545]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-[#0b2545] to-[#123e72] hover:from-[#081d36] hover:to-[#081d36] text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Guardando nueva contraseña...</span>
                </>
              ) : (
                <span>Guardar contraseña y entrar</span>
              )}
            </button>
          </form>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar sesión y salir</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
