import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Header } from './components/Header';
import { ProposalsUploader } from './components/ProposalsUploader';
import { ClientProfileForm } from './components/ClientProfileForm';
import { ComparisonResult } from './components/ComparisonResult';
import { AdminPanel } from './components/AdminPanel';
import { MyComparisons } from './components/MyComparisons';
import { LoginScreen } from './components/LoginScreen';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { Footer } from './components/Footer';
import { ClientProfile, ProposalFile, ComparisonResultData } from './types';
import {
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
  Shield,
} from 'lucide-react';

function ComparadorApp() {
  const { user, loading, isAdmin } = useAuth();

  const [currentView, setCurrentView] = useState<'comparador' | 'mis-expedientes' | 'admin'>('comparador');
  const [files, setFiles] = useState<ProposalFile[]>([]);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('Iniciando análisis...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResultData | null>(null);
  const [isSavingComparison, setIsSavingComparison] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Client profile state
  const [clientProfile, setClientProfile] = useState<ClientProfile>({
    nombre: '',
    vehiculo: '',
    presupuesto: 420000,
    coberturasObligatorias: {
      colision: true,
      robo: true,
      asistenciaVial: true,
      fenomenosNaturales: true,
      vehiculoSustituto: true,
    },
    prioridades: '',
    formaPago: 'Anual de contado',
  });

  // Handler to load the 3 sample proposals from the backend
  const handleLoadSamples = async () => {
    setIsLoadingSamples(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/sample-proposals', { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Sesión no válida o expirada. Por favor vuelva a iniciar sesión.');
        }
        throw new Error('No se pudieron obtener las propuestas de ejemplo.');
      }
      const data = await res.json();
      if (data.samples && Array.isArray(data.samples)) {
        const loaded: ProposalFile[] = data.samples.map((s: any) => ({
          id: Math.random().toString(36).substring(2, 9),
          name: s.name,
          size: s.sizeBytes || 85000,
          base64: s.base64,
          isSample: true,
        }));
        setFiles(loaded);

        if (!clientProfile.nombre) {
          handleFillSampleProfile();
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error cargando las propuestas de ejemplo.');
    } finally {
      setIsLoadingSamples(false);
    }
  };

  // Prefill realistic demo client profile matching the provided documents
  const handleFillSampleProfile = () => {
    setClientProfile({
      nombre: 'Laura Solís Vargas',
      vehiculo: 'Toyota Corolla XEi 2022, uso particular',
      presupuesto: 420000,
      coberturasObligatorias: {
        colision: true,
        robo: true,
        asistenciaVial: true,
        fenomenosNaturales: true,
        vehiculoSustituto: true,
      },
      prioridades:
        'Prioridad en cobertura total ante fenómenos naturales (inundaciones) y contar con vehículo sustituto garantizado sin cobros adicionales.',
      formaPago: 'Anual de contado',
    });
  };

  // Run Gemini comparison with session validation
  const handleCompare = async () => {
    if (files.length === 0) {
      setErrorMessage('Debes subir o cargar al menos un archivo PDF de propuesta aseguradora.');
      return;
    }

    setErrorMessage(null);
    setIsComparing(true);
    setIsSaved(false);
    setAnalysisStep('Verificando firmas y documentos PDF...');

    try {
      const timer1 = setTimeout(() => {
        setAnalysisStep('Leyendo condiciones, primas y deducibles de cada aseguradora con Gemini...');
      }, 1500);

      const timer2 = setTimeout(() => {
        setAnalysisStep('Evaluando coberturas obligatorias y presupuesto del cliente...');
      }, 3500);

      const timer3 = setTimeout(() => {
        setAnalysisStep('Generando recomendación preliminar y borrador de WhatsApp...');
      }, 5500);

      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          files: files.map(f => ({ name: f.name, base64: f.base64 })),
          clientProfile,
        }),
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error('Sesión no autorizada o expirada. Por favor vuelva a iniciar sesión.');
        }
        throw new Error(errorData.error || 'Ocurrió un error al procesar las propuestas con Gemini.');
      }

      const data: ComparisonResultData = await response.json();
      setComparisonResult(data);

      // Smooth scroll to results
      setTimeout(() => {
        const resultSection = document.getElementById('seccion-resultado');
        if (resultSection) {
          resultSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
    } catch (err: any) {
      console.error('Comparison error:', err);
      setErrorMessage(err.message || 'No fue posible completar la comparación.');
    } finally {
      setIsComparing(false);
    }
  };

  // Save comparison to server JSON store
  const handleSaveComparison = async () => {
    if (!comparisonResult || !user) return;

    setIsSavingComparison(true);
    try {
      const bestProposal =
        comparisonResult.propuestas.find(p => p.semaforo === 'verde') ||
        comparisonResult.propuestas.find(p => p.semaforo === 'amarillo') ||
        comparisonResult.propuestas[0];

      const payload = {
        clientName: clientProfile.nombre || 'Cliente General',
        vehicle: clientProfile.vehiculo || 'Vehículo particular',
        budget: clientProfile.presupuesto,
        proposalsCount: files.length,
        bestInsurer: bestProposal?.aseguradora || 'No especificada',
        recommendationSummary: comparisonResult.recomendacionPreliminar,
        whatsappMessage: comparisonResult.mensajeWhatsApp,
        rawComparison: comparisonResult,
        rawProfile: clientProfile,
      };

      const res = await fetch('/api/comparaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'No se pudo guardar la comparativa en el servidor.');
      }

      setIsSaved(true);
    } catch (err: any) {
      console.error('Error saving comparison:', err);
      alert(err.message || 'Error guardando en el expediente.');
    } finally {
      setIsSavingComparison(false);
    }
  };

  const handleLoadSavedComparison = (savedRecord: any) => {
    if (savedRecord.rawComparison) {
      setComparisonResult(savedRecord.rawComparison);
    }
    if (savedRecord.rawProfile) {
      setClientProfile(savedRecord.rawProfile);
    }
    setIsSaved(true);
    setCurrentView('comparador');
    setTimeout(() => {
      const resultSection = document.getElementById('seccion-resultado');
      if (resultSection) {
        resultSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 150);
  };

  const handleReset = () => {
    setComparisonResult(null);
    setIsSaved(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold mb-4 shadow-lg animate-pulse">
          <Shield className="w-7 h-7" />
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-blue-200">
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
          <span>Iniciando sistema de seguridad...</span>
        </div>
      </div>
    );
  }

  // If not logged in, show login screen (Rule 1 & Rule 6)
  if (!user) {
    return <LoginScreen />;
  }

  // If user has debeCambiarClave, force password change before accessing the app (Rule 7)
  if (user.debeCambiarClave) {
    return <ChangePasswordModal />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-800">
      <Header currentView={currentView} onViewChange={setCurrentView} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* View 1: Administration Panel */}
        {currentView === 'admin' && isAdmin && (
          <AdminPanel />
        )}

        {/* View 2: Saved Comparisons Dossiers */}
        {currentView === 'mis-expedientes' && (
          <MyComparisons onLoadSavedComparison={handleLoadSavedComparison} />
        )}

        {/* View 3: Main Comparator */}
        {currentView === 'comparador' && (
          <>
            {/* Error notification banner */}
            {errorMessage && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-3 shadow-xs">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Atención:</p>
                  <p>{errorMessage}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-red-500 hover:text-red-700 font-bold text-xs"
                >
                  Cerrar
                </button>
              </div>
            )}

            {/* Section 1: Propuestas */}
            <ProposalsUploader
              files={files}
              onFilesChange={files => {
                setFiles(files);
                setIsSaved(false);
              }}
              onLoadSamples={handleLoadSamples}
              isLoadingSamples={isLoadingSamples}
            />

            {/* Section 2: Perfil del cliente */}
            <ClientProfileForm
              profile={clientProfile}
              onChange={prof => {
                setClientProfile(prof);
                setIsSaved(false);
              }}
              onFillSampleProfile={handleFillSampleProfile}
            />

            {/* Action Button: Comparar propuestas */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={handleCompare}
                disabled={isComparing || files.length === 0}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-[#0b2545] via-[#123e72] to-[#0b2545] hover:from-[#081d36] hover:to-[#081d36] text-white text-base sm:text-lg font-extrabold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ring-2 ring-blue-900/30 transform hover:-translate-y-0.5 active:translate-y-0"
              >
                {isComparing ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                    <span>Analizando propuestas con Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    <span>Comparar propuestas</span>
                    <ArrowRight className="w-5 h-5 text-blue-200" />
                  </>
                )}
              </button>

              {/* Loading Indicator with Step Details */}
              {isComparing && (
                <div className="mt-4 max-w-md mx-auto p-4 bg-blue-50/80 border border-blue-200/90 rounded-xl text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 text-sm font-bold text-[#0b2545]">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-700" />
                    <span>Analizando propuestas...</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    {analysisStep}
                  </p>
                  <div className="w-full bg-blue-200/60 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#0b2545] h-full rounded-full animate-pulse w-3/4" />
                  </div>
                </div>
              )}

              {files.length === 0 && (
                <p className="text-xs text-slate-400 mt-2">
                  Sube de 1 a 3 propuestas en PDF o utiliza el botón "Cargar 3 propuestas de prueba" para comenzar.
                </p>
              )}
            </div>

            {/* Section 3: Resultado */}
            {comparisonResult && (
              <div id="seccion-resultado" className="pt-6">
                <ComparisonResult
                  result={comparisonResult}
                  profile={clientProfile}
                  onReset={handleReset}
                  onSaveComparison={handleSaveComparison}
                  isSavingComparison={isSavingComparison}
                  isSaved={isSaved}
                />
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ComparadorApp />
    </AuthProvider>
  );
}
