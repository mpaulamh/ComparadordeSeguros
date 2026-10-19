import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  RotateCcw,
  MessageCircle,
  Award,
  Sparkles,
  Info,
  ShieldCheck,
  Printer,
  ChevronRight,
  TrendingDown,
  Building,
  BookmarkCheck,
  Bookmark,
} from 'lucide-react';
import { ComparisonResultData, ClientProfile } from '../types';

interface ComparisonResultProps {
  result: ComparisonResultData;
  profile: ClientProfile;
  onReset: () => void;
  onSaveComparison?: () => Promise<void>;
  isSavingComparison?: boolean;
  isSaved?: boolean;
}

export const ComparisonResult: React.FC<ComparisonResultProps> = ({
  result,
  profile,
  onReset,
  onSaveComparison,
  isSavingComparison,
  isSaved,
}) => {
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedRecommendation, setCopiedRecommendation] = useState(false);

  const copyToClipboard = async (text: string, type: 'message' | 'rec') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'message') {
        setCopiedMessage(true);
        setTimeout(() => setCopiedMessage(false), 2500);
      } else {
        setCopiedRecommendation(true);
        setTimeout(() => setCopiedRecommendation(false), 2500);
      }
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const printReport = () => {
    window.print();
  };

  // Define table rows strictly matching user requirements:
  // Prima anual, Cabe en presupuesto, Deducible colisión, Deducible robo, RC daños a terceros, RC lesiones,
  // Asistencia vial 24/7, Grúa, Vehículo sustituto, Fenómenos naturales, Rotura de cristales, Exclusiones destacadas, Cumple obligatorias, Semáforo
  const tableRows = [
    {
      id: 'primaAnual',
      label: 'Prima anual',
      description: 'Costo anual de contado con impuestos incluidos',
      render: (p: any) => (
        <div className="font-extrabold text-base text-slate-900 tracking-tight">
          {p.primaAnual || 'no indicado'}
        </div>
      ),
    },
    {
      id: 'cabeEnPresupuesto',
      label: 'Cabe en presupuesto',
      description: `Límite cliente: ₡ ${profile.presupuesto.toLocaleString('es-CR')}`,
      render: (p: any) => {
        const isYes = p.cabeEnPresupuesto === 'Sí';
        return (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
              isYes
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-red-100 text-red-800 border border-red-300'
            }`}
          >
            {isYes ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            {p.cabeEnPresupuesto}
          </span>
        );
      },
    },
    {
      id: 'deducibleColision',
      label: 'Deducible colisión',
      description: 'Porcentaje y monto mínimo por evento',
      render: (p: any) => (
        <span className="text-xs sm:text-sm text-slate-700 font-medium">
          {p.deducibleColision || 'no indicado'}
        </span>
      ),
    },
    {
      id: 'deducibleRobo',
      label: 'Deducible robo',
      description: 'Porcentaje sobre valor o reclamo',
      render: (p: any) => (
        <span className="text-xs sm:text-sm text-slate-700 font-medium">
          {p.deducibleRobo || 'no indicado'}
        </span>
      ),
    },
    {
      id: 'rcDanosTerceros',
      label: 'RC daños a terceros',
      description: 'Responsabilidad civil bienes materiales',
      render: (p: any) => (
        <span className="text-xs sm:text-sm text-slate-700 font-medium">
          {p.rcDanosTerceros || 'no indicado'}
        </span>
      ),
    },
    {
      id: 'rcLesiones',
      label: 'RC lesiones',
      description: 'Lesiones o muerte de personas',
      render: (p: any) => (
        <span className="text-xs sm:text-sm text-slate-700 font-medium">
          {p.rcLesiones || 'no indicado'}
        </span>
      ),
    },
    {
      id: 'asistenciaVial',
      label: 'Asistencia vial 24/7',
      description: 'Averías, cerrajería, batería, combustible',
      render: (p: any) => {
        const text = (p.asistenciaVial || '').toLowerCase();
        const hasIt = text.includes('incluid') || text.includes('sí') || text.includes('avería');
        const isNotIncluded = text.includes('no incluid') || text.includes('opcional');
        return (
          <div className="text-xs sm:text-sm">
            <span
              className={`font-semibold ${
                isNotIncluded ? 'text-red-600' : hasIt ? 'text-emerald-700' : 'text-slate-700'
              }`}
            >
              {p.asistenciaVial || 'no indicado'}
            </span>
          </div>
        );
      },
    },
    {
      id: 'grua',
      label: 'Grúa',
      description: 'Kilometraje cubierto y cantidad de eventos',
      render: (p: any) => (
        <span className="text-xs sm:text-sm text-slate-700 font-medium">
          {p.grua || 'no indicado'}
        </span>
      ),
    },
    {
      id: 'vehiculoSustituto',
      label: 'Vehículo sustituto',
      description: 'Días de auto de reemplazo en siniestro',
      render: (p: any) => {
        const text = (p.vehiculoSustituto || '').toLowerCase();
        const hasIt = text.includes('día') || text.includes('hasta') || text.includes('incluid');
        const isNot = text.includes('no incluid') || text.includes('no aplica');
        return (
          <span
            className={`inline-block text-xs sm:text-sm font-semibold ${
              isNot ? 'text-rose-600 font-medium' : hasIt ? 'text-emerald-700' : 'text-slate-700'
            }`}
          >
            {p.vehiculoSustituto || 'no indicado'}
          </span>
        );
      },
    },
    {
      id: 'fenomenosNaturales',
      label: 'Fenómenos naturales',
      description: 'Inundaciones, deslaves, caída de objetos',
      render: (p: any) => {
        const text = (p.fenomenosNaturales || '').toLowerCase();
        const isCovered =
          text.includes('suma asegurada') ||
          text.includes('cubierto') ||
          text.includes('incluid') ||
          (text.includes('sí') && !text.includes('no'));
        const isNotCovered = text.includes('no aplica') || text.includes('no cub') || text.includes('no');
        return (
          <span
            className={`text-xs sm:text-sm font-semibold ${
              isNotCovered ? 'text-rose-600' : isCovered ? 'text-emerald-700' : 'text-slate-700'
            }`}
          >
            {p.fenomenosNaturales || 'no indicado'}
          </span>
        );
      },
    },
    {
      id: 'roturaCristales',
      label: 'Rotura de cristales',
      description: 'Parabrisas, laterales y luneta',
      render: (p: any) => (
        <span className="text-xs sm:text-sm text-slate-700 font-medium">
          {p.roturaCristales || 'no indicado'}
        </span>
      ),
    },
    {
      id: 'exclusionesDestacadas',
      label: 'Exclusiones destacadas',
      description: 'Condiciones que anulan la cobertura',
      render: (p: any) => (
        <p className="text-xs text-slate-600 leading-relaxed font-normal">
          {p.exclusionesDestacadas || 'no indicado'}
        </p>
      ),
    },
    {
      id: 'cumpleObligatorias',
      label: 'Cumple obligatorias',
      description: 'Todas las marcadas por el cliente incluidas en la prima base',
      render: (p: any) => {
        const isYes = p.cumpleObligatorias === 'Sí';
        return (
          <div className="space-y-1">
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold ${
                isYes
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-rose-100 text-rose-900 border border-rose-300'
              }`}
            >
              {isYes ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {p.cumpleObligatorias}
            </span>
            {p.motivoObligatorias && (
              <p className="text-[11px] text-slate-500 font-normal leading-tight">
                {p.motivoObligatorias}
              </p>
            )}
          </div>
        );
      },
    },
    {
      id: 'semaforo',
      label: 'Semáforo',
      description: 'Verde (cabe y cumple) · Amarillo (cumple pero no cabe) · Rojo (no cumple)',
      render: (p: any) => {
        const color = (p.semaforo || '').toLowerCase();
        let bg = 'bg-slate-100 text-slate-800 border-slate-300';
        let light = 'bg-slate-400';
        let label = 'Sin definir';

        if (color === 'verde') {
          bg = 'bg-emerald-50 text-emerald-900 border-emerald-300 ring-2 ring-emerald-400/40';
          light = 'bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse';
          label = 'VERDE · Aprobada';
        } else if (color === 'amarillo') {
          bg = 'bg-amber-50 text-amber-950 border-amber-300 ring-2 ring-amber-400/40';
          light = 'bg-amber-500 shadow-sm shadow-amber-500/50';
          label = 'AMARILLO · Excede presupuesto';
        } else if (color === 'rojo') {
          bg = 'bg-rose-50 text-rose-950 border-rose-300 ring-2 ring-rose-400/40';
          light = 'bg-rose-600 shadow-sm shadow-rose-600/50';
          label = 'ROJO · No cumple obligatorias';
        }

        return (
          <div className="space-y-1.5">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-bold text-xs uppercase tracking-wide ${bg}`}
            >
              <span className={`w-3 h-3 rounded-full shrink-0 ${light}`} />
              <span>{label}</span>
            </div>
            {p.semaforoMotivo && (
              <p className="text-[11px] text-slate-600 font-normal leading-tight">
                {p.semaforoMotivo}
              </p>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-8 print:space-y-4">
      {/* Action Bar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
            3
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Resultado de la Comparativa
            </h2>
            <p className="text-xs text-slate-500">
              Análisis de {result.propuestas.length} propuestas frente al perfil de {profile.nombre || 'cliente'}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          {onSaveComparison && (
            <button
              type="button"
              onClick={onSaveComparison}
              disabled={isSavingComparison || isSaved}
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-lg transition-all cursor-pointer shadow-2xs ${
                isSaved
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-[#0b2545] text-white hover:bg-blue-900 border border-blue-900'
              } disabled:opacity-70`}
              title="Guardar esta comparativa en el expediente institucional"
            >
              {isSaved ? (
                <>
                  <BookmarkCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Guardado en expediente</span>
                </>
              ) : isSavingComparison ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-3.5 h-3.5 text-amber-300" />
                  <span>Guardar en expediente</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={printReport}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors cursor-pointer"
            title="Imprimir informe comparativo"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0b2545] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-2 rounded-lg transition-colors cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Nueva comparación
          </button>
        </div>
      </div>

      {/* Comparative Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[680px]">
            {/* Table Header: Insurer Columns */}
            <thead>
              <tr className="bg-[#0b2545] text-white">
                <th className="p-4 sm:p-5 w-1/4 sm:w-1/4 align-bottom border-r border-blue-900/60">
                  <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                    Criterio evaluado
                  </div>
                  <div className="text-base font-extrabold text-white mt-0.5">
                    Propuestas ({result.propuestas.length})
                  </div>
                </th>
                {result.propuestas.map((p, idx) => (
                  <th
                    key={idx}
                    className="p-4 sm:p-5 align-top border-r border-blue-900/40 last:border-r-0"
                    style={{ width: `${75 / result.propuestas.length}%` }}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded text-blue-200">
                        Opción {idx + 1}
                      </span>
                      <Building className="w-4 h-4 text-blue-300" />
                    </div>
                    <div className="text-base sm:text-lg font-extrabold text-white leading-tight">
                      {p.aseguradora || `Aseguradora ${idx + 1}`}
                    </div>
                    <div className="text-xs text-blue-200/90 font-medium mt-0.5 truncate" title={p.plan}>
                      {p.plan || 'Plan Auto'}
                    </div>
                    <div className="text-[10px] text-blue-300/70 truncate mt-1">
                      {p.nombreArchivo}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body with alternating zebra stripes */}
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {tableRows.map((row, rIdx) => {
                const isEven = rIdx % 2 === 0;
                const isHighlightRow = row.id === 'semaforo' || row.id === 'primaAnual' || row.id === 'cumpleObligatorias';

                return (
                  <tr
                    key={row.id}
                    className={`transition-colors hover:bg-blue-50/40 ${
                      isHighlightRow
                        ? 'bg-blue-50/30 font-semibold'
                        : isEven
                        ? 'bg-slate-50/60'
                        : 'bg-white'
                    }`}
                  >
                    <td className="p-3.5 sm:p-4 border-r border-slate-200/80 align-top">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm">
                        {row.label}
                      </div>
                      <div className="text-[11px] text-slate-500 font-normal leading-tight mt-0.5">
                        {row.description}
                      </div>
                    </td>
                    {result.propuestas.map((p, pIdx) => (
                      <td
                        key={pIdx}
                        className="p-3.5 sm:p-4 border-r border-slate-200/60 last:border-r-0 align-top"
                      >
                        {row.render(p)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend for Semáforo */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <span className="font-bold text-slate-700">Reglas del Semáforo BN:</span>
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <strong className="text-emerald-800">Verde:</strong> Cabe en presupuesto y cumple obligatorias
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <strong className="text-amber-800">Amarillo:</strong> Cumple obligatorias pero supera presupuesto
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <strong className="text-rose-800">Rojo:</strong> No cumple obligatorias
            </span>
          </div>
        </div>
      </div>

      {/* Two cards below table: Preliminary Recommendation & WhatsApp Suggested Message */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Recomendación preliminar (borrador) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/90 overflow-hidden flex flex-col justify-between">
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    Recomendación preliminar (borrador)
                  </h3>
                  <span className="text-[11px] text-slate-500 block">
                    Criterio técnico para el asesor basado en prioridades y montos
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => copyToClipboard(result.recomendacionPreliminar, 'rec')}
                className="text-xs font-semibold text-slate-600 hover:text-blue-700 flex items-center gap-1 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 cursor-pointer transition-colors"
                title="Copiar recomendación"
              >
                {copiedRecommendation ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-blue-50/60 border border-blue-200/70 rounded-xl p-4 text-slate-800 text-sm leading-relaxed whitespace-pre-line font-normal">
              {result.recomendacionPreliminar}
            </div>

            <div className="mt-4 flex items-start gap-2 text-xs text-slate-500">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p>
                Regla aplicada: Justificación de una sola propuesta en máximo 5 líneas con montos en colones, priorizando coberturas críticas y cuantificando diferencias de prima si se recomienda una opción amarilla.
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Mensaje sugerido para el cliente (WhatsApp) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/90 overflow-hidden flex flex-col justify-between">
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    Mensaje sugerido para el cliente (WhatsApp)
                  </h3>
                  <span className="text-[11px] text-slate-500 block">
                    Tono cordial, sin tecnicismos y con recomendación clara
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => copyToClipboard(result.mensajeWhatsApp, 'message')}
                className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5 px-3 py-1.5 rounded-lg shadow-2xs cursor-pointer transition-colors"
                title="Copiar mensaje para enviar por WhatsApp"
              >
                {copiedMessage ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar mensaje</span>
                  </>
                )}
              </button>
            </div>

            {/* WhatsApp Phone Mockup Bubble */}
            <div className="bg-gradient-to-b from-[#e5ddd5]/60 to-[#ece5dd]/90 p-4 rounded-xl border border-slate-200">
              <div className="bg-white rounded-lg p-3.5 shadow-xs border border-slate-100 max-w-full text-slate-800 text-sm leading-relaxed whitespace-pre-line relative font-sans">
                {result.mensajeWhatsApp}
                <div className="flex justify-end items-center gap-1 text-[10px] text-slate-400 mt-2">
                  <span>Ahora</span>
                  <Check className="w-3 h-3 text-blue-500" />
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span>Máximo 8 líneas · Sin prometer plazos de emisión</span>
              <button
                type="button"
                onClick={() => copyToClipboard(result.mensajeWhatsApp, 'message')}
                className="text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer underline flex items-center gap-1"
              >
                Copiar para WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
