import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  FileSpreadsheet,
  Activity,
  UserCheck,
  UserX,
  ShieldAlert,
  Search,
  CheckCircle2,
  Clock,
  Car,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth, UserProfileData, UserRole, UserStatus } from '../contexts/AuthContext';

export const AdminPanel: React.FC = () => {
  const { user, logAuditEvent } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'comparisons'>('users');
  const [usersList, setUsersList] = useState<UserProfileData[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [allComparisons, setAllComparisons] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Subscribe to Users collection
  useEffect(() => {
    const path = 'users';
    const q = query(collection(db, path));
    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const users: UserProfileData[] = [];
        snapshot.forEach(docSnap => {
          users.push(docSnap.data() as UserProfileData);
        });
        setUsersList(users);
        setLoadingUsers(false);
      },
      error => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );

    return () => unsubscribe();
  }, []);

  // Subscribe to Audit Logs
  useEffect(() => {
    const path = 'audit_logs';
    const q = query(collection(db, path), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const logs: any[] = [];
        snapshot.forEach(docSnap => {
          logs.push({ id: docSnap.id, ...docSnap.data() });
        });
        setAuditLogs(logs);
      },
      error => {
        console.warn('Audit logs listener note:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Subscribe to all comparisons
  useEffect(() => {
    const path = 'comparisons';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const comps: any[] = [];
        snapshot.forEach(docSnap => {
          comps.push({ id: docSnap.id, ...docSnap.data() });
        });
        setAllComparisons(comps);
      },
      error => {
        console.warn('Comparisons listener note:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleRoleChange = async (targetUser: UserProfileData, newRole: UserRole) => {
    if (targetUser.uid === user?.uid && newRole !== 'admin') {
      alert('Por seguridad no puedes degradar tu propia cuenta de Administrador.');
      return;
    }

    try {
      const userRef = doc(db, 'users', targetUser.uid);
      await updateDoc(userRef, { role: newRole });

      // If promoting to admin, add to /admins/{uid} marker
      if (newRole === 'admin') {
        await setDoc(doc(db, 'admins', targetUser.uid), {
          uid: targetUser.uid,
          email: targetUser.email,
          createdAt: new Date().toISOString(),
        });
      } else {
        // If demoting from admin, remove admin marker
        try {
          await deleteDoc(doc(db, 'admins', targetUser.uid));
        } catch (e) {
          // ignore
        }
      }

      await logAuditEvent(
        'CAMBIO_ROL',
        `Administrador ${user?.email} cambió el rol de ${targetUser.email} a ${newRole}.`
      );

      setActionSuccess(`Rol de ${targetUser.displayName || targetUser.email} actualizado a ${newRole}.`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      alert('Error al actualizar rol: ' + (err.message || 'Permisos insuficientes'));
    }
  };

  const handleStatusChange = async (targetUser: UserProfileData, newStatus: UserStatus) => {
    if (targetUser.uid === user?.uid) {
      alert('No puedes suspender tu propia cuenta activa.');
      return;
    }

    try {
      const userRef = doc(db, 'users', targetUser.uid);
      await updateDoc(userRef, { status: newStatus });

      await logAuditEvent(
        'CAMBIO_ESTADO',
        `Administrador ${user?.email} cambió el estado de ${targetUser.email} a ${newStatus}.`
      );

      setActionSuccess(`Estado de ${targetUser.displayName || targetUser.email} actualizado a ${newStatus}.`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      alert('Error al actualizar estado: ' + (err.message || 'Permisos insuficientes'));
    }
  };

  const filteredUsers = usersList.filter(
    u =>
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0b2545] via-[#123963] to-[#0b2545] text-white p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-400 text-[#0b2545] flex items-center justify-center font-bold shadow-md">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  Panel de Control Institucional
                </span>
                <span className="text-xs text-blue-200">Seguridad & RBAC</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                Administración y Control de Usuarios
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 px-3.5 py-2 rounded-xl backdrop-blur-sm text-xs text-blue-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-300" />
              <span>{usersList.length} usuarios registrados</span>
            </div>
          </div>
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
            Gestión de Usuarios y Roles ({usersList.length})
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
            Trazabilidad de Propuestas ({allComparisons.length})
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

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 px-6">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Tab 1: Users & Roles Management */}
      {activeTab === 'users' && (
        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Usuarios y Asesores Autorizados
              </h3>
              <p className="text-xs text-slate-500">
                Administra roles con control de acceso basado en atributos (RBAC) y suspende accesos no autorizados.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por correo o nombre..."
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
                  <th className="py-3 px-4">Usuario / Asesor</th>
                  <th className="py-3 px-4">Correo Institucional</th>
                  <th className="py-3 px-4">Rol en el Sistema</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Último Ingreso</th>
                  <th className="py-3 px-4 text-right">Acciones de Seguridad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredUsers.map(u => (
                  <tr key={u.uid} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 flex items-center gap-2.5">
                      {u.photoURL ? (
                        <img
                          src={u.photoURL}
                          alt={u.displayName}
                          className="w-7 h-7 rounded-full border border-slate-200 object-cover"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                          {u.displayName?.[0] || 'U'}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-900">{u.displayName || 'Sin nombre'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">UID: {u.uid.substring(0, 10)}...</div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-800">
                      {u.email}
                      {u.uid === user?.uid && (
                        <span className="ml-1.5 text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-bold">
                          Tú
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {u.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-purple-100 text-purple-900 border border-purple-200">
                          <Shield className="w-3 h-3 text-purple-700" />
                          Administrador
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                          <UserCheck className="w-3 h-3 text-blue-700" />
                          Asesor Final
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {u.status === 'active' ? (
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

                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('es-CR') : 'No registrado'}
                    </td>

                    <td className="py-3 px-4 text-right space-x-1.5">
                      {/* Change Role Button */}
                      <button
                        type="button"
                        onClick={() => handleRoleChange(u, u.role === 'admin' ? 'asesor' : 'admin')}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-md border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer text-slate-700"
                      >
                        {u.role === 'admin' ? 'Cambiar a Asesor' : 'Hacer Administrador'}
                      </button>

                      {/* Suspend / Activate Button */}
                      <button
                        type="button"
                        onClick={() => handleStatusChange(u, u.status === 'active' ? 'suspended' : 'active')}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-colors cursor-pointer ${
                          u.status === 'active'
                            ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                            : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {u.status === 'active' ? 'Suspender' : 'Reactivar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Comparison Traceability */}
      {activeTab === 'comparisons' && (
        <div className="p-6 space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Historial y Trazabilidad de Propuestas
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
              No hay propuestas guardadas en la base de datos aún.
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
                    <span>Asesor: {comp.advisorName || comp.advisorEmail}</span>
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

      {/* Tab 3: Security Audit Log */}
      {activeTab === 'audit' && (
        <div className="p-6 space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Bitácora de Seguridad Inmutable (Audit Trail)
              </h3>
              <p className="text-xs text-slate-500">
                Registro criptográfico de eventos críticos para cumplimiento de seguridad de la corredora.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Fecha y Hora</th>
                  <th className="py-2.5 px-4">Evento / Acción</th>
                  <th className="py-2.5 px-4">Usuario Responsable</th>
                  <th className="py-2.5 px-4">Detalle Técnico</th>
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
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-800">{log.userEmail}</td>
                    <td className="py-2.5 px-4 text-slate-600 font-sans">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
