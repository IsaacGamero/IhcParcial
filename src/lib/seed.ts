import type { Actividad, Actuacion, Caso, DB, Party, SyncState } from './types';

// Datos semilla FICTICIOS. Fecha de referencia: martes 12/05/2026.
let n = 0;
const id = (p: string) => `${p}${++n}`;

function party(nombre: string, rol: Party['rol'], comunidad: string, dni = '', tel = ''): Party {
  return {
    id: id('p'),
    nombre,
    rol,
    docTipo: dni ? 'DNI' : 'No lo tiene a la mano',
    docNumero: dni,
    telefono: tel,
    sinTelefono: !tel,
    comunidad,
    direccion: '',
  };
}

function caso(o: Partial<Caso> & Pick<Caso, 'codigo' | 'fechaRegistro' | 'tipo' | 'descripcion' | 'estado' | 'partes'>): Caso {
  return {
    id: id('c'),
    tipoOtro: '',
    resultado: '',
    observaciones: '',
    avances: [],
    proximaCita: null,
    evidencias: [],
    historial: [{ id: id('h'), fecha: o.fechaRegistro + 'T09:00', tipo: 'creado', texto: 'Registrado en la tableta', origen: 'tableta' }],
    sync: 'sent',
    createdAt: o.fechaRegistro + 'T09:00',
    updatedAt: o.fechaRegistro + 'T09:00',
    ...o,
  };
}

function act(o: Partial<Actuacion> & Pick<Actuacion, 'codigo' | 'fechaSolicitud' | 'tipo' | 'asunto' | 'estado' | 'participantes'>): Actuacion {
  return {
    id: id('a'),
    tipoOtro: '',
    fechaAtencion: '',
    resultado: '',
    fechaEntrega: '',
    observaciones: '',
    documentos: [],
    historial: [],
    sync: 'sent',
    createdAt: o.fechaSolicitud + 'T09:00',
    updatedAt: o.fechaSolicitud + 'T09:00',
    ...o,
  };
}

let ag = 0;
function activ(o: Partial<Actividad> & Pick<Actividad, 'titulo' | 'categoria' | 'fecha' | 'lugar'>): Actividad {
  ag++;
  return {
    id: id('g'),
    codigo: `AGE-TAB01-${o.fecha.slice(0, 4)}${o.fecha.slice(5, 7)}-${String(ag).padStart(4, '0')}`,
    horaInicio: '',
    horaFin: '',
    sinHora: !o.horaInicio,
    descripcion: '',
    estado: 'Programada',
    vinculo: null,
    creadaDesdeCaso: null,
    recordatorio: '1 día antes',
    personas: [],
    historial: [],
    sync: 'sent',
    createdAt: '2026-05-01T09:00',
    updatedAt: '2026-05-01T09:00',
    ...o,
  };
}

export function buildSeed(kind: 'base' | 'mixed' = 'base'): DB {
  n = 0;
  ag = 0;

  // ---- Casos: los 3 estados y un caso por cada criterio de "Requiere atención" ----
  const cVencida = caso({
    codigo: 'JZ04-TAB01-202604-0007',
    fechaRegistro: '2026-04-22',
    tipo: 'Problemas entre vecinos',
    descripcion: 'Discusión por el turno de riego del canal compartido.',
    estado: 'En conciliación',
    partes: [party('Pedro Quispe Huanca', 'Solicitante', 'Canchacucho', '41236587', '987654321'), party('Rosa Mamani Ccori', 'Invitado', 'Canchacucho')],
    avances: [{ id: id('v'), fecha: '2026-04-30', texto: 'Primera reunión: las partes aceptan conversar.', evidencias: [], nuevoEstado: 'En conciliación' }],
    proximaCita: '2026-05-08T10:00',
  });
  const cHoy = caso({
    codigo: 'JZ04-TAB01-202605-0009',
    fechaRegistro: '2026-05-04',
    tipo: 'Deudas y pagos',
    descripcion: 'Préstamo de S/ 800 no devuelto en la fecha acordada.',
    estado: 'En trámite',
    partes: [party('Lucía Ramos Tito', 'Solicitante', 'Huayllay', '43218765'), party('Hugo Paucar Rojas', 'Invitado', 'Huayllay')],
    avances: [{ id: id('v'), fecha: '2026-05-06', texto: 'Se citó a las partes.', evidencias: [] }],
    proximaCita: '2026-05-12T11:00',
  });
  const cSinAvance = caso({
    codigo: 'JZ04-TAB01-202604-0005',
    fechaRegistro: '2026-04-20',
    tipo: 'Daños a cultivos, animales o cosas',
    descripcion: 'Ovejas del vecino ingresaron al sembrío de papa.',
    estado: 'En trámite',
    partes: [party('Andrés Quispe Soto', 'Solicitante', 'Yurajhuanca', '40981234'), party('Julia Soto Vargas', 'Invitado', 'Yurajhuanca')],
    avances: [{ id: id('v'), fecha: '2026-04-24', texto: 'Visita al terreno: daño en 3 surcos.', evidencias: [{ id: id('e'), tipo: 'referencia', texto: 'Acta en cuaderno 2, folio 40' }] }],
  });
  const cConcluido = caso({
    codigo: 'JZ04-TAB01-202604-0004',
    fechaRegistro: '2026-04-10',
    tipo: 'Insultos o peleas leves',
    descripcion: 'Insultos en la feria dominical.',
    estado: 'Concluido',
    resultado: 'Disculpas mutuas y compromiso de no reincidir.',
    partes: [party('Marco Ccahuana Poma', 'Solicitante', 'San Pedro'), party('Elena Poma Rivas', 'Invitado', 'San Pedro')],
    avances: [{ id: id('v'), fecha: '2026-04-17', texto: 'Acuerdo firmado por ambas partes.', nuevoEstado: 'Concluido', resultado: 'Disculpas mutuas y compromiso de no reincidir.', evidencias: [] }],
  });
  const cProxima = caso({
    codigo: 'JZ04-TAB01-202605-0011',
    fechaRegistro: '2026-05-07',
    tipo: 'Pensión de alimentos',
    descripcion: 'Madre solicita apoyo económico para su hijo de 6 años.',
    estado: 'En conciliación',
    partes: [party('Carmen Huamán Leiva', 'Solicitante', 'Huayllay', '45672310', '965432187'), party('José Leiva Arias', 'Invitado', 'Chipipata')],
    avances: [{ id: id('v'), fecha: '2026-05-11', texto: 'Primera audiencia; se proponen montos.', nuevoEstado: 'En conciliación', evidencias: [] }],
    proximaCita: '2026-05-13T09:00',
  });
  const cNormal = caso({
    codigo: 'JZ04-TAB01-202605-0012',
    fechaRegistro: '2026-05-08',
    tipo: 'Problemas entre vecinos',
    descripcion: 'Cerco colocado sobre el camino de paso.',
    estado: 'En trámite',
    partes: [party('Teodoro Rivas Chuco', 'Solicitante', 'Chipipata', '42001199')],
    avances: [{ id: id('v'), fecha: '2026-05-10', texto: 'Se revisó el croquis del terreno.', evidencias: [] }],
    proximaCita: '2026-05-19T10:00',
  });
  const cBorrador = caso({
    codigo: 'JZ04-TAB01-202605-0010',
    fechaRegistro: '2026-05-06',
    tipo: 'Deudas y pagos',
    descripcion: 'Pago pendiente por venta de una vaca.',
    estado: 'En trámite',
    partes: [],
    avances: [],
  });

  // ---- Actuaciones: 3 estados de atención y un borrador. María Condori = persona repetida ----
  const maria = party('María Condori Huamán', 'Solicitante', 'Huayllay', '47851236', '912345678');
  const actuaciones: Actuacion[] = [
    act({
      codigo: 'NOT-TAB01-202604-0003',
      fechaSolicitud: '2026-04-28',
      tipo: 'Constancia de que vive en un lugar',
      asunto: 'Constancia para trámite de programa social.',
      estado: 'Concluida',
      fechaAtencion: '2026-04-28',
      resultado: 'Se entregó constancia domiciliaria n.° 12.',
      fechaEntrega: '2026-04-29',
      participantes: [maria],
    }),
    act({
      codigo: 'NOT-TAB01-202605-0004',
      fechaSolicitud: '2026-05-05',
      tipo: 'Certificar una firma',
      asunto: 'Firma en contrato de alquiler de terreno.',
      estado: 'Atendida',
      fechaAtencion: '2026-05-06',
      participantes: [party('Felipe Tito Quispe', 'Solicitante', 'San Pedro', '40127788')],
    }),
    act({
      codigo: 'NOT-TAB01-202605-0005',
      fechaSolicitud: '2026-05-11',
      tipo: 'Constancia de que una persona sigue con vida',
      asunto: 'Para cobro de pensión.',
      estado: 'Pendiente',
      participantes: [party('Aurelio Chuco Ramos', 'Solicitante', 'Yurajhuanca', '06543219'), party('Nilda Ramos Chuco', 'Declarante', 'Yurajhuanca')],
    }),
    act({
      codigo: 'NOT-TAB01-202605-0006',
      fechaSolicitud: '2026-05-11',
      tipo: 'Certificar una copia de documento',
      asunto: 'Copia de partida de nacimiento.',
      estado: 'Pendiente',
      participantes: [],
    }),
  ];

  // ---- Agenda: semana del 11 al 17/05 con las 4 categorías y los 3 estados ----
  const actividades: Actividad[] = [
    activ({ titulo: 'Audiencia de conciliación', categoria: 'Audiencia', fecha: '2026-05-08', horaInicio: '10:00', horaFin: '11:00', lugar: 'Canchacucho', vinculo: { tipo: 'caso', id: cVencida.id }, creadaDesdeCaso: cVencida.id, personas: ['Pedro Quispe Huanca', 'Rosa Mamani Ccori'] }),
    activ({ titulo: 'Audiencia de conciliación', categoria: 'Audiencia', fecha: '2026-05-11', horaInicio: '10:00', horaFin: '11:00', lugar: 'Huayllay', estado: 'Realizada', vinculo: { tipo: 'caso', id: cProxima.id }, creadaDesdeCaso: cProxima.id, personas: ['Carmen Huamán Leiva', 'José Leiva Arias'] }),
    activ({ titulo: 'Audiencia de conciliación', categoria: 'Audiencia', fecha: '2026-05-12', horaInicio: '11:00', horaFin: '12:00', lugar: 'Huayllay', vinculo: { tipo: 'caso', id: cHoy.id }, creadaDesdeCaso: cHoy.id, personas: ['Lucía Ramos Tito', 'Hugo Paucar Rojas'] }),
    activ({ titulo: 'Entrega de constancia', categoria: 'Otra', fecha: '2026-05-12', horaInicio: '15:00', horaFin: '15:30', lugar: 'Huayllay', vinculo: { tipo: 'actuacion', id: actuaciones[1].id }, personas: ['Felipe Tito Quispe'] }),
    activ({ titulo: 'Audiencia de alimentos', categoria: 'Audiencia', fecha: '2026-05-13', horaInicio: '09:00', horaFin: '10:00', lugar: 'Huayllay', vinculo: { tipo: 'caso', id: cProxima.id }, creadaDesdeCaso: cProxima.id, personas: ['Carmen Huamán Leiva', 'José Leiva Arias'] }),
    activ({ titulo: 'Visita a Canchacucho', categoria: 'Visita a comunidad', fecha: '2026-05-13', horaInicio: '14:00', horaFin: '16:00', lugar: 'Canchacucho', descripcion: 'Revisar el canal de riego.' }),
    activ({ titulo: 'Reunión con el alcalde', categoria: 'Reunión', fecha: '2026-05-14', horaInicio: '10:00', horaFin: '11:00', lugar: 'San Pedro', estado: 'Cancelada' }),
    activ({ titulo: 'Visita a Huayllay', categoria: 'Visita a comunidad', fecha: '2026-05-14', horaInicio: '15:00', horaFin: '16:30', lugar: 'Huayllay' }),
    activ({ titulo: 'Reunión con rondas campesinas', categoria: 'Reunión', fecha: '2026-05-15', horaInicio: '09:00', horaFin: '10:30', lugar: 'Yurajhuanca' }),
    activ({ titulo: 'Audiencia por camino de paso', categoria: 'Audiencia', fecha: '2026-05-19', horaInicio: '10:00', horaFin: '11:00', lugar: 'Chipipata', vinculo: { tipo: 'caso', id: cNormal.id }, creadaDesdeCaso: cNormal.id, personas: ['Teodoro Rivas Chuco'] }),
    activ({ titulo: 'Entrega de actas', categoria: 'Otra', fecha: '2026-05-21', lugar: 'Sede Huayllay' }),
    ...['08:00', '09:30', '11:00', '14:00', '16:00'].map((h, i) =>
      activ({ titulo: ['Audiencia', 'Reunión vecinal', 'Visita a Chipipata', 'Audiencia', 'Reunión de jueces'][i], categoria: (['Audiencia', 'Reunión', 'Visita a comunidad', 'Audiencia', 'Reunión'] as const)[i], fecha: '2026-05-22', horaInicio: h, horaFin: h.replace(/^(\d\d)/, (m) => String(Number(m) + 1).padStart(2, '0')), lugar: ['Huayllay', 'San Pedro', 'Chipipata', 'Huayllay', 'Sede Huayllay'][i] }),
    ),
    activ({ titulo: 'Borrador de visita', categoria: 'Visita a comunidad', fecha: '2026-05-27', lugar: '' }),
    activ({ titulo: 'Audiencia de deudas', categoria: 'Audiencia', fecha: '2026-05-04', horaInicio: '10:00', horaFin: '11:00', lugar: 'Huayllay', estado: 'Realizada' }),
  ];

  const cases = [cVencida, cHoy, cSinAvance, cConcluido, cProxima, cNormal, cBorrador];

  // Semilla "mixed": registros en la tableta sin enviar desde hace 5 días (recordatorio 3.5).
  const mixed = kind === 'mixed';
  if (mixed) {
    const local: SyncState = 'local';
    cNormal.sync = local;
    cBorrador.sync = local;
    actuaciones[3].sync = local;
    actividades[actividades.length - 2].sync = local;
    cHoy.sync = 'review';
  }

  const snapshot = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
  const serverCases = snapshot(cases.filter((c) => c.sync === 'sent'));

  return {
    version: 1,
    cases,
    actuaciones,
    actividades,
    drafts: {},
    meta: {
      pin: '1234',
      onboarded: false,
      fontSize: 'normal',
      lastSentAt: mixed ? '2026-05-07T18:40' : '2026-05-11T18:40',
      counters: { caso: 12, actuacion: 6, actividad: ag },
      juzgado: '04',
      tableta: '01',
      attentionDays: 15,
    },
    syncRun: null,
    server: {
      cases: serverCases,
      actuaciones: snapshot(actuaciones.filter((a) => a.sync === 'sent')),
      actividades: snapshot(actividades.filter((a) => a.sync === 'sent')),
      lastTabletSendAt: mixed ? '2026-05-07T18:40' : '2026-05-11T18:40',
      pcEdits: [],
    },
  };
}
