import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  FileSpreadsheet,
  Activity,
  UserCheck,
  UserX,
  UserPlus,
  Search,
  CheckCircle2,
  Car,
  KeyRound,
  RotateCcw,
  X,
} from 'lucide-react';
import { AuthUser, SavedComparisonRecord, AuditRecord } from '../types';

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'comparisons'>('users');
  const [usersList, setUsersList] = useState<AuthUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>([]);
  const [allComparisons, setAllComparisons] = useState<SavedComparisonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New user modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'asesor' | 'administrador'>('asesor');
  const [newPassword, setNewPassword] = useState('Fundepos2026*');
  const [creatingUser, setCreatingUser] = useState(false);

  // Reset password modal state
  const [resetUser, setResetUser] = useState<AuthUser | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState('Temporal2026*');
  const [resetting, setResetting] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/usuarios', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.usuarios || []);
      }
    } catch (e) {
      console.error('Error cargando usuarios:', e);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/auditoria', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (e) {
      console.error('Error cargando auditoría:', e);
    }
  };

  const fetchComparisons = async () => {
    try {
      const res = await fetch('/api/comparaciones', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAllComparisons(data.comparaciones || []);
      }
    } catch (e) {
      console.error('Error cargando comparativas:', e);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchAuditLogs(), fetchComparisons()]);
      setLoading(false);
    };
    loadAll();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newName || !newPassword) {
      showNotification('error', 'Por favor complete todos los campos.');
      return;
    }

    setCreatingUser(true);
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          usuario: newUsername.trim().toLowerCase(),
          nombre: newName.trim(),
          rol: newRole,
          password: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showNotification('error', data.error || 'Error al crear usuario.');
        setCreatingUser(false);
        return;
      }

      showNotification('success', `Usuario "${data.usuario?.usuario}" creado exitosamente.`);
      setShowCreateModal(false);
      setNewUsername('');
      setNewName('');
      setNewPassword('Fundepos2026*');
      await fetchUsers();
      await fetchAuditLogs();
    } catch (err: any) {
      showNotification('error', err.message || 'Error al conectar con el servidor.');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleRoleChange = async (targetUser: AuthUser, newRoleVal: 'administrador' | 'asesor') => {
    try {
      const res = await fetch(`/api/usuarios/${targetUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rol: newRoleVal }),
      });

      const data = await res.json();
      if (!res.ok) {
        showNotification('error', data.error || 'Error cambiando rol.');
        return;
      }

      showNotification('success', `Rol de ${targetUser.nombre} actualizado a ${newRoleVal}.`);
      await fetchUsers();
      await fetchAuditLogs();
    } catch (err: any) {
      showNotification('error', err.message || 'Error de conexión.');
    }
  };

  const handleStatusChange = async (targetUser: AuthUser, newStatus: 'activo' | 'suspendido') => {
    try {
      const res = await fetch(`/api/usuarios/${targetUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ estado: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        showNotification('error', data.error || 'Error cambiando estado.');
        return;
      }

      showNotification('success', `Estado de ${targetUser.nombre} actualizado a ${newStatus}.`);
      await fetchUsers();
      await fetchAuditLogs();
    } catch (err: any) {
      showNotification('error', err.message || 'Error de conexión.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;

    setResetting(true);
    try {
      const res = await fetch(`/api/usuarios/${resetUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ resetPassword: resetPasswordVal }),
      });

      const data = await res.json();
      if (!res.ok) {
        showNotification('error', data.error || 'Error restableciendo contraseña.');
        setResetting(false);
        return;
      }

      showNotification('success', `Contraseña temporal establecida para ${resetUser.usuario}.`);
      setResetUser(null);
      await fetchUsers();
      await fetchAuditLogs();
    } catch (err: any) {
      showNotification('error', err.message || 'Error de conexión.');
    } finally {
      setResetting(false);
    }
  };

  const filteredUsers = usersList.filter(
    u =>
      u.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0b2545] via-[#123963] to-[#0b2545] text-white p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-400 text-[#0b2545] flex items-center justify-center font-bold shadow-md shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  Panel de Control Institucional
                </span>
                <span className="text-xs text-blue-200">Banco de Colombia</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                Administración y Gestión de Usuarios
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-[#0b2545] font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Crear Nuevo Usuario</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mt-6 border-b border-white/15">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'border-amber-400 text-amber-300 bg-white/5'
                : 'border-transparent text-blue-200 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4" />
            Usuarios y Roles ({usersList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('comparisons')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'comparisons'
                ? 'border-amber-400 text-amber-300 bg-white/5'
                : 'border-transparent text-blue-200 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Expedientes de Propuestas ({allComparisons.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'audit'
                ? 'border-amber-400 text-amber-300 bg-white/5'
                : 'border-transparent text-blue-200 hover:text-white hover:bg-white/5'
            }`}
          >
            <Activity className="w-4 h-4" />
            Bitácora de Auditoría ({auditLogs.length})
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 text-xs font-semibold flex items-center gap-2 px-6 border-b ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Tab 1: Users & Roles */}
      {activeTab === 'users' && (
        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Usuarios Registrados en el Servidor (data/usuarios.json)
              </h3>
              <p className="text-xs text-slate-500">
                Nadie puede registrarse por su cuenta. Como administrador, usted crea y gestiona cada cuenta.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por usuario o nombre..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b2545]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4">Nombre Completo</th>
                  <th className="py-3 px-4">Rol</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Clave Pendiente</th>
                  <th className="py-3 px-4">Último Ingreso</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      @{u.usuario}
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-800">
                      {u.nombre}
                    </td>

                    <td className="py-3 px-4">
                      {u.rol === 'administrador' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-purple-100 text-purple-900 border border-purple-200">
                          <Shield className="w-3 h-3 text-purple-700" />
                          Administrador
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                          <UserCheck className="w-3 h-3 text-blue-700" />
                          Asesor
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {u.estado === 'activo' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          Suspendido
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {u.debeCambiarClave ? (
                        <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                          Debe cambiarla
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Personal</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {u.ultimoAcceso ? new Date(u.ultimoAcceso).toLocaleString('es-CR') : 'Nunca'}
                    </td>

                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {/* Change Role Button */}
                      <button
                        type="button"
                        onClick={() => handleRoleChange(u, u.rol === 'administrador' ? 'asesor' : 'administrador')}
                        className="px-2 py-1 text-[11px] font-semibold rounded-md border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer text-slate-700"
                      >
                        {u.rol === 'administrador' ? 'Hacer Asesor' : 'Hacer Admin'}
                      </button>

                      {/* Suspend / Activate Button */}
                      <button
                        type="button"
                        onClick={() => handleStatusChange(u, u.estado === 'activo' ? 'suspendido' : 'activo')}
                        className={`px-2 py-1 text-[11px] font-semibold rounded-md border transition-colors cursor-pointer ${
                          u.estado === 'activo'
                            ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                            : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {u.estado === 'activo' ? 'Suspender' : 'Reactivar'}
                      </button>

                      {/* Reset Password Button */}
                      <button
                        type="button"
                        onClick={() => setResetUser(u)}
                        className="px-2 py-1 text-[11px] font-semibold rounded-md border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 transition-colors cursor-pointer"
                        title="Restablecer contraseña temporal"
                      >
                        <KeyRound className="w-3 h-3 inline mr-1" />
                        Reset Clave
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Comparisons */}
      {activeTab === 'comparisons' && (
        <div className="p-6 space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Trazabilidad de Expedientes (data/comparaciones.json)
              </h3>
              <p className="text-xs text-slate-500">
                Supervisión centralizada de todas las cotizaciones de vehículos preparadas por los asesores.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
              {allComparisons.length} registradas
            </span>
          </div>

          {allComparisons.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No hay expedientes guardados en el servidor aún.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allComparisons.map(comp => (
                <div
                  key={comp.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:shadow-md transition-all space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 block">
                        Cliente
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">{comp.clientName}</h4>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {comp.createdAt ? new Date(comp.createdAt).toLocaleDateString('es-CR') : ''}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Car className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{comp.vehicle}</span>
                    </div>
                    <div className="font-semibold text-slate-800">
                      Presupuesto: ₡ {Number(comp.budget || 0).toLocaleString('es-CR')}
                    </div>
                    <div className="text-emerald-700 font-bold text-xs">
                      Recomendada: {comp.bestInsurer}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Asesor: {comp.advisorName} (@{comp.advisorUsername})</span>
                    <span className="bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded text-[10px] font-bold">
                      {comp.proposalsCount} PDFs
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="p-6 space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Bitácora de Auditoría en Servidor (data/auditoria.json)
              </h3>
              <p className="text-xs text-slate-500">
                Registro inmutable de accesos, creación de usuarios, cambios de roles y comparativas ejecutadas.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Fecha y Hora</th>
                  <th className="py-2.5 px-4">Acción</th>
                  <th className="py-2.5 px-4">Usuario</th>
                  <th className="py-2.5 px-4">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString('es-CR') : 'N/A'}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="font-bold text-[#0b2545] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {log.accion}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-800">@{log.usuario}</td>
                    <td className="py-2.5 px-4 text-slate-600 font-sans">{log.detalle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Crear Nuevo Usuario */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-[#07192e]/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-[#0b2545] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">Crear Nuevo Usuario</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-blue-200 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre de Usuario (corto, sin espacios, minúsculas)
                </label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  placeholder="ej: jsolis o asesor_este"
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b2545]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="ej: Javier Solís Mora"
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b2545]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Rol Asignado
                </label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as any)}
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b2545]"
                >
                  <option value="asesor">Asesor (Usuario final de cotizaciones)</option>
                  <option value="administrador">Administrador (Control total y usuarios)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Contraseña Inicial Temporal
                </label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b2545] font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  El usuario estará obligado a cambiarla en su primer ingreso.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-5 py-2 bg-[#0b2545] text-white text-xs font-bold rounded-xl hover:bg-blue-900 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {creatingUser ? 'Guardando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Restablecer Contraseña */}
      {resetUser && (
        <div className="fixed inset-0 z-50 bg-[#07192e]/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-[#0b2545] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">Restablecer Contraseña</h3>
              </div>
              <button
                type="button"
                onClick={() => setResetUser(null)}
                className="text-blue-200 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-5 space-y-4">
              <p className="text-xs text-slate-600">
                Se asignará una contraseña temporal al usuario <strong>@{resetUser.usuario}</strong> y se le obligará a definir una nueva clave al ingresar.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nueva Contraseña Temporal
                </label>
                <input
                  type="text"
                  required
                  value={resetPasswordVal}
                  onChange={e => setResetPasswordVal(e.target.value)}
                  className="w-full p-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetUser(null)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="px-4 py-1.5 bg-[#0b2545] text-white text-xs font-bold rounded-xl hover:bg-blue-900 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {resetting ? 'Guardando...' : 'Confirmar Reset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
