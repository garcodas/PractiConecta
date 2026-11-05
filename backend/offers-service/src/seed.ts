import { addDays, appTimeZone, todayIn } from './shared/common/index.js';
import { DEMO_IDS, type CareerCode, type Modality, type OfferStatus, type Schedule } from './shared/contracts/index.js';
import { createDataSource } from './data-source.js';
import { Offer } from './infrastructure/offer.entity.js';

const today = todayIn(appTimeZone());
const tech = { companyId: DEMO_IDS.companyTech, companyName: 'Tecnologías del Altiplano' };
const retail = { companyId: DEMO_IDS.companyRetail, companyName: 'Comercial La Ceiba' };

const offer = (
  suffix: string,
  company: { companyId: string; companyName: string },
  title: string,
  careerCode: CareerCode,
  modality: Modality,
  schedule: Schedule,
  status: OfferStatus,
  days: number,
  description: string,
) => ({
  id: `00000000-0000-4000-8000-0000000003${suffix}`,
  ...company,
  title,
  careerCode,
  modality,
  schedule,
  status,
  description,
  deadline: addDays(today, days),
  closedAt: status === 'CERRADA' ? new Date() : null,
});

const OFFERS = [
  offer('01', tech, 'Practicante de desarrollo web', 'SISTEMAS', 'HIBRIDA', 'TIEMPO_COMPLETO', 'APROBADA', 30, 'Apoya al equipo de producto construyendo funciones web con TypeScript y SQL, con mentoría semanal.'),
  offer('02', tech, 'Practicante de control de calidad', 'SISTEMAS', 'REMOTA', 'MEDIO_TIEMPO', 'APROBADA', 21, 'Diseña casos de prueba, automatiza revisiones y documenta hallazgos junto al equipo de desarrollo.'),
  offer('03', retail, 'Practicante de operaciones', 'INDUSTRIAL', 'PRESENCIAL', 'TIEMPO_COMPLETO', 'APROBADA', 25, 'Analiza procesos de bodega y propone mejoras medibles de tiempos y costos.'),
  offer('04', retail, 'Practicante de diseño de marca', 'DISENO', 'HIBRIDA', 'MEDIO_TIEMPO', 'APROBADA', 14, 'Crea piezas gráficas para campañas de temporada y mantiene la guía de marca.'),
  offer('05', retail, 'Practicante de mercadeo digital', 'MERCADOTECNIA', 'REMOTA', 'MEDIO_TIEMPO', 'APROBADA', 18, 'Planifica contenido para redes y mide resultados de campañas digitales.'),
  offer('06', retail, 'Practicante administrativo', 'ADMINISTRACION', 'PRESENCIAL', 'MEDIO_TIEMPO', 'APROBADA', 28, 'Apoya la gestión de proveedores y el seguimiento de indicadores del área.'),
  offer('07', tech, 'Practicante de análisis de datos', 'SISTEMAS', 'HIBRIDA', 'MEDIO_TIEMPO', 'PENDIENTE', 30, 'Construye tableros y limpia datos operativos para el equipo de negocio.'),
  offer('08', tech, 'Practicante de soporte técnico', 'SISTEMAS', 'PRESENCIAL', 'TIEMPO_COMPLETO', 'CERRADA', 10, 'Atiende solicitudes internas y mantiene el inventario de equipos.'),
];

const ds = createDataSource();
await ds.initialize();
await ds.createQueryBuilder().insert().into(Offer).values(OFFERS).orIgnore().execute();
await ds.destroy();
console.log('Datos de prueba de ofertas cargados');
