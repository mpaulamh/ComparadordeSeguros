import React from 'react';
import { User, Car, DollarSign, CheckSquare, AlignLeft, CreditCard, Sparkles } from 'lucide-react';
import { ClientProfile } from '../types';

interface ClientProfileFormProps {
  profile: ClientProfile;
  onChange: (profile: ClientProfile) => void;
  onFillSampleProfile: () => void;
}

export const ClientProfileForm: React.FC<ClientProfileFormProps> = ({
  profile,
  onChange,
  onFillSampleProfile,
}) => {
  const handleTextChange = (field: keyof Omit<ClientProfile, 'coberturasObligatorias' | 'presupuesto'>, value: string) => {
    onChange({
      ...profile,
      [field]: value,
    });
  };

  const handlePresupuestoChange = (value: string) => {
    const numeric = parseInt(value.replace(/\D/g, ''), 10) || 0;
    onChange({
      ...profile,
      presupuesto: numeric,
    });
  };

  const handleCheckboxChange = (key: keyof ClientProfile['coberturasObligatorias'], checked: boolean) => {
    onChange({
      ...profile,
      coberturasObligatorias: {
        ...profile.coberturasObligatorias,
        [key]: checked,
      },
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 sm:p-6 transition-all hover:shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#0b2545] text-white flex items-center justify-center font-bold text-xs">
              2
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              Perfil del Cliente
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Información del prospecto, restricciones de presupuesto y coberturas no negociables.
          </p>
        </div>

        <button
          type="button"
          onClick={onFillSampleProfile}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg border border-blue-200/70 transition-colors shrink-0 cursor-pointer"
          title="Rellena los datos con el caso de ejemplo: Laura Solís Vargas"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Rellenar perfil de prueba
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Nombre */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Nombre del cliente
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={profile.nombre}
              onChange={e => handleTextChange('nombre', e.target.value)}
              placeholder="Ej: Laura Solís Vargas"
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50/70 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b2545] focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Vehículo y uso */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Vehículo y uso
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Car className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={profile.vehiculo}
              onChange={e => handleTextChange('vehiculo', e.target.value)}
              placeholder="Ej: Toyota Corolla XEi 2022, uso particular"
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50/70 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b2545] focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Presupuesto máximo anual (colones) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Presupuesto máximo anual (colones)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 font-bold text-sm">
              ₡
            </div>
            <input
              type="text"
              value={profile.presupuesto > 0 ? profile.presupuesto.toLocaleString('es-CR') : ''}
              onChange={e => handlePresupuestoChange(e.target.value)}
              placeholder="Ej: 420.000"
              className="w-full pl-9 pr-3 py-2 text-sm font-semibold text-slate-900 bg-slate-50/70 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b2545] focus:border-transparent transition-all"
            />
          </div>
          <div className="flex gap-1.5 mt-1.5">
            {[350000, 400000, 420000, 450000].map(val => (
              <button
                key={val}
                type="button"
                onClick={() => onChange({ ...profile, presupuesto: val })}
                className="text-[10px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
              >
                ₡{(val / 1000).toFixed(0)}k
              </button>
            ))}
          </div>
        </div>

        {/* Coberturas obligatorias (casillas) */}
        <div className="md:col-span-2 lg:col-span-3 bg-slate-50/90 rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-1.5 mb-2.5">
            <CheckSquare className="w-4 h-4 text-[#0b2545]" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Coberturas obligatorias (No negociables para el cliente)
            </span>
            <span className="text-[11px] text-slate-500 font-normal ml-2">
              (Si la propuesta no las incluye en la prima base, se marcará en Rojo)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { key: 'colision', label: 'Colisión y vuelco', desc: 'Daños directos por choque' },
              { key: 'robo', label: 'Robo total y parcial', desc: 'Pérdida por sustracción' },
              { key: 'asistenciaVial', label: 'Asistencia vial 24/7', desc: 'Grúa, batería, llantas' },
              { key: 'fenomenosNaturales', label: 'Fenómenos naturales', desc: 'Inundaciones, deslaves' },
              { key: 'vehiculoSustituto', label: 'Vehículo sustituto', desc: 'Auto de reemplazo' },
            ].map(item => {
              const isChecked = profile.coberturasObligatorias[item.key as keyof ClientProfile['coberturasObligatorias']];
              return (
                <label
                  key={item.key}
                  className={`flex flex-col p-3 rounded-lg border text-left cursor-pointer transition-all select-none ${
                    isChecked
                      ? 'bg-blue-50/80 border-[#0b2545] shadow-xs ring-1 ring-[#0b2545]'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={e =>
                        handleCheckboxChange(
                          item.key as keyof ClientProfile['coberturasObligatorias'],
                          e.target.checked
                        )
                      }
                      className="w-4 h-4 text-[#0b2545] rounded border-slate-300 focus:ring-[#0b2545]"
                    />
                    <span className="text-xs font-bold text-slate-800 leading-tight">
                      {item.label}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 pl-6">
                    {item.desc}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Prioridades (área de texto) */}
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <AlignLeft className="w-3.5 h-3.5 text-slate-400" />
            Prioridades y necesidades específicas del cliente
          </label>
          <textarea
            rows={3}
            value={profile.prioridades}
            onChange={e => handleTextChange('prioridades', e.target.value)}
            placeholder="Ej: Laura vive en una zona con riesgo de lluvias intensas y utiliza su auto a diario para el trabajo, por lo que le urge vehículo sustituto y protección total ante inundaciones."
            className="w-full p-3 text-sm bg-slate-50/70 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b2545] focus:border-transparent transition-all resize-none"
          />
        </div>

        {/* Forma de pago preferida */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
            Forma de pago preferida
          </label>
          <div className="space-y-1.5">
            <select
              value={profile.formaPago}
              onChange={e => handleTextChange('formaPago', e.target.value)}
              className="w-full p-2.5 text-sm bg-slate-50/70 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b2545] focus:border-transparent transition-all font-medium text-slate-800"
            >
              <option value="Anual de contado">Anual de contado</option>
              <option value="Mensual (cuotas)">Mensual (cuotas)</option>
              <option value="Semestral">Semestral</option>
              <option value="Trimestral">Trimestral</option>
            </select>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Se evaluarán los recargos o facilidades de financiamiento indicados en cada PDF.
          </p>
        </div>
      </div>
    </div>
  );
};
