import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, Trash2, CheckCircle2, AlertCircle, Sparkles, FolderDown } from 'lucide-react';
import { ProposalFile } from '../types';

interface ProposalsUploaderProps {
  files: ProposalFile[];
  onFilesChange: (files: ProposalFile[]) => void;
  onLoadSamples: () => void;
  isLoadingSamples: boolean;
}

export const ProposalsUploader: React.FC<ProposalsUploaderProps> = ({
  files,
  onFilesChange,
  onLoadSamples,
  isLoadingSamples,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFileList = async (fileList: FileList | File[]) => {
    setErrorMessage(null);
    const validPdfs: File[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        validPdfs.push(file);
      } else {
        setErrorMessage(`El archivo "${file.name}" no es un PDF válido.`);
      }
    }

    if (files.length + validPdfs.length > 3) {
      setErrorMessage('Solo se permite subir un máximo de 3 propuestas (una por aseguradora).');
      return;
    }

    const newFiles: ProposalFile[] = [...files];

    for (const file of validPdfs) {
      // Check if already added
      if (newFiles.some(f => f.name === file.name && f.size === file.size)) {
        continue;
      }
      try {
        const base64 = await readFileAsBase64(file);
        newFiles.push({
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          size: file.size,
          base64,
        });
      } catch (err) {
        setErrorMessage(`Error leyendo el archivo ${file.name}`);
      }
    }

    onFilesChange(newFiles);
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // remove data:application/pdf;base64, prefix if needed
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFileList(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFileList(e.target.files);
      // Reset input value to allow re-uploading the same file if needed
      e.target.value = '';
    }
  };

  const removeFile = (id: string) => {
    onFilesChange(files.filter(f => f.id !== id));
    setErrorMessage(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 sm:p-6 transition-all hover:shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#0b2545] text-white flex items-center justify-center font-bold text-xs">
              1
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              Propuestas de Aseguradoras
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Sube de 1 a 3 propuestas en formato PDF (una por aseguradora para comparar).
          </p>
        </div>

        <button
          type="button"
          onClick={onLoadSamples}
          disabled={isLoadingSamples}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0b2545] bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg border border-blue-200/80 transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
          title="Carga automáticamente las propuestas de Cordillera, Alborada y Protectora del Valle"
        >
          {isLoadingSamples ? (
            <span className="inline-block w-3.5 h-3.5 border-2 border-[#0b2545] border-t-transparent rounded-full animate-spin mr-1" />
          ) : (
            <FolderDown className="w-3.5 h-3.5 text-blue-700" />
          )}
          Cargar 3 propuestas de prueba
        </button>
      </div>

      {errorMessage && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Dropzone Area */}
      {files.length < 3 ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-4 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-blue-600 bg-blue-50/50 scale-[1.01]'
              : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50/70'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
          />
          <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 text-[#0b2545] flex items-center justify-center mb-3">
            <UploadCloud className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-800">
            Haz clic para seleccionar o arrastra tus archivos PDF aquí
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Formatos aceptados: .PDF (Máximo 3 archivos. Actualmente: {files.length}/3)
          </p>
        </div>
      ) : (
        <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-medium">Límite alcanzado: 3 propuestas cargadas para el análisis comparativo.</span>
          </div>
          <span className="text-[11px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-bold">
            3 de 3
          </span>
        </div>
      )}

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
            <span>Archivos listos para análisis ({files.length}/3):</span>
            <button
              type="button"
              onClick={() => onFilesChange([])}
              className="text-red-600 hover:text-red-700 hover:underline cursor-pointer font-medium"
            >
              Quitar todos
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {files.map((file, index) => (
              <div
                key={file.id}
                className="flex items-start justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/80 hover:bg-white hover:border-blue-300 transition-all shadow-2xs group relative"
              >
                <div className="flex items-start gap-2.5 min-w-0 pr-2">
                  <div className="w-8 h-8 rounded bg-red-100 text-red-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                      Aseguradora {index + 1}
                    </span>
                    <p className="text-xs font-semibold text-slate-800 truncate" title={file.name}>
                      {file.name}
                    </p>
                    <span className="text-[11px] text-slate-400">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  aria-label={`Eliminar ${file.name}`}
                  className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                  title="Eliminar archivo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
