import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Header } from './components/Header';
import { ProposalsUploader } from './components/ProposalsUploader';
import { ClientProfileForm } from './components/ClientProfileForm';
import { ComparisonResult } from './components/ComparisonResult';
import { AdminPanel } from './components/AdminPanel';
import { MyComparisons } from './components/MyComparisons';
import { Footer } from './components/Footer';
import { ClientProfile, ProposalFile, ComparisonResultData } from './types';
import { testFirestoreConnection, db, handleFirestoreError, OperationType } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import {
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
  ShieldAlert,
  Lock,
  LogIn,
  CheckCircle2,
} from 'lucide-react';

function ComparadorApp() {
  const { user, profile, isAdmin, isSuspended, signInWithGoogle, logAuditEvent } = useAuth();

  const [currentView, setCurrentView] = useState<'comparador' | 'mis-expedientes' | 'admin'>('comparador');
  const [files, setFiles] = useState<ProposalFile[]>([]);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('Iniciando análisis...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResultData | null>(null);
  const [isSavingComparison, setIsSavingComparison] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Test Firestore connection on app mount
  useEffect(() => {
    testFirestoreConnection();
  }, []);

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
      const res = await fetch('/api/sample-proposals');
      if (!res.ok) {
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

  // Run Gemini comparison with security and audit logging
  const handleCompare = async () => {
    if (isSuspended) {
      setErrorMessage('Su cuenta de asesor ha sido suspendida. Contacte al administrador del sistema.');
      return;
    }

    if (files.length === 0) {
      setErrorMessage('Debes subir o cargar al menos un archivo PDF de propuesta aseguradora.');
      return;
    }

    setErrorMessage(null);
    setIsComparing(true);
    setIsSaved(false);
    setAnalysisStep('Verificando firmas de documentos PDF...');

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
        throw new Error(errorData.error || 'Ocurrió un error al procesar las propuestas con Gemini.');
      }

      const data: ComparisonResultData = await response.json();
      setComparisonResult(data);

      if (user) {
        await logAuditEvent(
          'COMPARACION_EJECUTADA',
          `Asesor ejecutó comparativa para cliente "${clientProfile.nombre || 'Anónimo'}" (${files.length} propuestas).`
        );
      }

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

  // Save comparison to Firestore
  const handleSaveComparison = async () => {
    if (!user) {
      alert('Debes iniciar sesión para archivar esta comparativa en el expediente institucional.');
      return;
    }

    if (!comparisonResult) return;

    setIsSavingComparison(true);
    try {
      const bestProposal = comparisonResult.propuestas.find(p => p.semaforo === 'verde') ||
        comparisonResult.propuestas.find(p => p.semaforo === 'amarillo') ||
        comparisonResult.propuestas[0];

      const record = {
        userId: user.uid,
        advisorName: profile?.displayName || user.displayName || 'Asesor BN',
        advisorEmail: user.email || '',
        clientName: clientProfile.nombre || 'Cliente General',
        vehicle: clientProfile.vehiculo || 'Vehículo particular',
        budget: clientProfile.presupuesto,
        proposalsCount: files.length,
        bestInsurer: bestProposal?.aseguradora || 'No especificada',
        recommendationSummary: comparisonResult.recomendacionPreliminar,
        whatsappMessage: comparisonResult.mensajeWhatsApp,
        rawComparison: comparisonResult,
        rawProfile: clientProfile,
        createdAt: new Date().toISOString(),
      };

      const path = 'comparisons';
      await addDoc(collection(db, path), record);

      await logAuditEvent(
        'EXPEDIENTE_ARCHIVADO',
        `Comparativa guardada para ${clientProfile.nombre || 'cliente'} por ${user.email}.`
      );

      setIsSaved(true);
    } catch (err: any) {
      console.error('Error saving comparison:', err);
      handleFirestoreError(err, OperationType.WRITE, 'comparisons');
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-800">
      <Header currentView={currentView} onViewChange={setCurrentView} />

      {/* Account Suspended Alert Banner */}
      {isSuspended && (
        <div className="bg-rose-600 text-white p-3 text-center text-xs font-bold flex items-center justify-center gap-2 shadow-inner">
          <Lock className="w-4 h-4" />
          <span>
            Cuenta restringida por el Administrador. No tiene permisos para ejecutar análisis en producción.
          </span>
        </div>
      )}

      {/* Informational Banner for Guest Users */}
      {!user && (
        <div className="bg-blue-900/90 text-blue-100 px-4 py-2 text-xs flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-blue-800">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Entorno de Producción Seguro:</strong> Inicie sesión con su cuenta institucional para archivar expedientes y consultar el historial.
            </span>
          </div>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="text-amber-300 hover:text-white font-bold underline cursor-pointer shrink-0"
          >
            Iniciar sesión con Google
          </button>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* View 1: Administration Panel */}
        {currentView === 'admin' && isAdmin && (
          <AdminPanel />
        )}

        {/* View 2: Advisor Saved Comparisons Dossiers */}
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
                  <p className="font-bold">Atención de Seguridad:</p>
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
                disabled={isComparing || files.length === 0 || isSuspended}
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
                  onSaveComparison={user ? handleSaveComparison : undefined}
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
