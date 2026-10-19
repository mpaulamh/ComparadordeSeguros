export interface CoberturasObligatorias {
  colision: boolean;
  robo: boolean;
  asistenciaVial: boolean;
  fenomenosNaturales: boolean;
  vehiculoSustituto: boolean;
}

export interface ClientProfile {
  nombre: string;
  vehiculo: string;
  presupuesto: number;
  coberturasObligatorias: CoberturasObligatorias;
  prioridades: string;
  formaPago: string;
}

export interface ProposalFile {
  id: string;
  name: string;
  size: number;
  base64: string;
  isSample?: boolean;
}

export interface InsurerComparison {
  nombreArchivo: string;
  aseguradora: string;
  plan: string;
  primaAnual: string;
  primaAnualNumero: number;
  cabeEnPresupuesto: 'Sí' | 'No';
  deducibleColision: string;
  deducibleRobo: string;
  rcDanosTerceros: string;
  rcLesiones: string;
  asistenciaVial: string;
  grua: string;
  vehiculoSustituto: string;
  fenomenosNaturales: string;
  roturaCristales: string;
  exclusionesDestacadas: string;
  cumpleObligatorias: 'Sí' | 'No';
  motivoObligatorias?: string;
  semaforo: 'verde' | 'amarillo' | 'rojo';
  semaforoMotivo?: string;
}

export interface ComparisonResultData {
  propuestas: InsurerComparison[];
  recomendacionPreliminar: string;
  mensajeWhatsApp: string;
}
