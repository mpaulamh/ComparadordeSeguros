import React, { useState } from 'react';
import { Shield, Lock, User, AlertCircle, Eye, EyeOff, Building2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUser = usuario.trim();
    if (!cleanUser || !password) {
      setErrorMessage('Por favor ingrese su usuario y contraseña.');
      return;
    }

    setLoading(true);
    const res = await login(cleanUser, password);
    setLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || 'usuario o contraseña incorrectos');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#07192e] via-[#0b2545] to-[#123963] flex flex-col justify-center items-center p-4 sm:p-6 text-slate-800">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-blue-900/20 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-[#0b2545] text-white p-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-radial from-blue-600/10 to-transparent pointer-events-none" />
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-lg text-[#0b2545] mb-3">
            <Shield className="w-8 h-8" />
          </div>

          <div className="inline-block text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/20 text-amber-300 border border-amber-400/30 mb-1">
            Banco de Colombia
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">
            Comparador de Propuestas BC
          </h1>
          <p className="text-xs text-blue-200 mt-1 max-w-xs mx-auto">
            Acceso institucional exclusivo para personal autorizado de correduría.
          </p>
        </div>

        {/* Form Container */}
        <div className="p-6 sm:p-8 space-y-5">
          {errorMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 border ${
                errorMessage.toLowerCase().includes('suspendido')
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="font-semibold leading-relaxed">
                {errorMessage}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Usuario */}
            <div>
              <label
                htmlFor="usuario-input"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="usuario-input"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck="false"
                  value={usuario}
                  onChange={e => setUsuario(e.target.value)}
                  placeholder="Ej: admin o asesor1"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b2545] focus:border-transparent transition-all font-medium text-slate-800"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password-input"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Contraseña
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b2545] focus:border-transparent transition-all font-medium text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Botón Entrar */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#0b2545] via-[#123e72] to-[#0b2545] hover:from-[#081d36] hover:to-[#081d36] text-white font-extrabold text-sm rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verificando credenciales...</span>
                  </>
                ) : (
                  <span>Entrar</span>
                )}
              </button>
            </div>
          </form>

          {/* Security Notice */}
          <div className="pt-4 border-t border-slate-100 text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Gestión de acceso controlada por el servidor</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              No existe registro público. Las cuentas y accesos son creados y administrados exclusivamente por el administrador del Banco de Colombia.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
