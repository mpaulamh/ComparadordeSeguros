import React, { useState, useEffect } from 'react';
import {
  FileText,
  Car,
  ChevronRight,
  Trash2,
  Building,
} from 'lucide-react';
import { SavedComparisonRecord } from '../types';

interface MyComparisonsProps {
  onLoadSavedComparison: (comparison: any) => void;
}

export const MyComparisons: React.FC<MyComparisonsProps> = ({ onLoadSavedComparison }) => {
  const [comparisons, setComparisons] = useState<SavedComparisonRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComparisons = async () => {
    try {
      const res = await fetch('/api/comparaciones', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setComparisons(data.comparaciones || []);
      }
    } catch (err) {
      console.error('Error al obtener comparaciones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparisons();
  }, []);

  const handleDelete = async (id: string, clientName: string) => {
    if (!confirm(`¿Deseas eliminar el expediente de la comparación para ${clientName}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/comparaciones/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setComparisons(prev => prev.filter(c => c.id !== id));
      } else {
        const err = await res.json();
        alert(err.error || 'No se pudo eliminar el expediente.');
      }
    } catch (err: any) {
      console.error('Error eliminando comparación:', err);
      alert('Error al conectar con el servidor.');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0b2545] flex items-center justify-center font-bold">
            <FileText className="w-5 h-5 text-blue-800" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Mis Expedientes Guardados
            </h3>
            <p className="text-xs text-slate-500">
              Consulta y recupera análisis de cotizaciones previas almacenadas en el servidor institucional.
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg self-start sm:self-auto">
          {comparisons.length} expedientes
        </span>
      </div>

      {loading ? (
        <div className="text-center py-10 text-xs text-slate-400">
          Cargando tus expedientes...
        </div>
      ) : comparisons.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-600">
            Aún no has guardado ninguna comparativa.
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Realiza un análisis en el comparador y presiona "Guardar en expediente" para archivarlo aquí.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {comparisons.map(comp => (
            <div
              key={comp.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-blue-300 hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                      Cliente
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 leading-snug">
                      {comp.clientName}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(comp.id, comp.clientName)}
                    className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                    title="Eliminar expediente"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-2 text-xs text-slate-600 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{comp.vehicle}</span>
                  </div>
                  <div className="font-semibold text-slate-800">
                    Presupuesto: ₡ {Number(comp.budget || 0).toLocaleString('es-CR')}
                  </div>
                  <div className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                    <Building className="w-3.5 h-3.5" />
                    <span>Recomendación: {comp.bestInsurer}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">
                  {comp.createdAt ? new Date(comp.createdAt).toLocaleDateString('es-CR') : ''}
                </span>

                <button
                  type="button"
                  onClick={() => onLoadSavedComparison(comp)}
                  className="inline-flex items-center gap-1 font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
                >
                  <span>Ver análisis</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
