import React from 'react';
import { AlertCircle, ShieldAlert } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-12 border-t border-slate-200/80 bg-white/80 backdrop-blur-xs py-5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="font-medium text-slate-700">
              Borrador generado con IA. Debe ser validado por un asesor contra las condiciones reales de la póliza. No suba datos reales de clientes.
            </p>
          </div>
          <div className="text-[11px] text-slate-400 font-normal shrink-0">
            BN Corredora de Seguros · San José, Costa Rica
          </div>
        </div>
      </div>
    </footer>
  );
};
