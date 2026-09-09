export type BusinessType =
  | "barber" | "salon" | "spa" | "pets" | "cafe"
  | "laundry" | "fitness" | "tattoo" | "other";

export type Vertical = {
  professionalLabel: string;
  professionalPlural: string;
  serviceLabel: string;
  servicePlural: string;
  appointmentNoun: string; // "cita" | "reserva" | "turno" | "sesión" | "pedido"
  defaultFreqDays: number;
  icon: string;
};

export const VERTICALS: Record<BusinessType, Vertical> = {
  barber:  { professionalLabel: "Barbero",     professionalPlural: "Barberos",     serviceLabel: "Servicio",    servicePlural: "Servicios",    appointmentNoun: "cita",    defaultFreqDays: 21, icon: "💈" },
  salon:   { professionalLabel: "Estilista",   professionalPlural: "Estilistas",   serviceLabel: "Servicio",    servicePlural: "Servicios",    appointmentNoun: "cita",    defaultFreqDays: 30, icon: "💇" },
  spa:     { professionalLabel: "Terapeuta",   professionalPlural: "Terapeutas",   serviceLabel: "Tratamiento", servicePlural: "Tratamientos", appointmentNoun: "cita",  defaultFreqDays: 30, icon: "💆" },
  pets:    { professionalLabel: "Groomer",     professionalPlural: "Groomers",     serviceLabel: "Servicio",    servicePlural: "Servicios",    appointmentNoun: "cita",    defaultFreqDays: 45, icon: "🐾" },
  cafe:    { professionalLabel: "Barista",     professionalPlural: "Baristas",     serviceLabel: "Producto",    servicePlural: "Productos",    appointmentNoun: "pedido",  defaultFreqDays: 7,  icon: "☕" },
  laundry: { professionalLabel: "Operario",    professionalPlural: "Operarios",    serviceLabel: "Servicio",    servicePlural: "Servicios",    appointmentNoun: "pedido",  defaultFreqDays: 14, icon: "🧺" },
  fitness: { professionalLabel: "Entrenador",  professionalPlural: "Entrenadores", serviceLabel: "Clase",       servicePlural: "Clases",       appointmentNoun: "reserva", defaultFreqDays: 7,  icon: "🏋️" },
  tattoo:  { professionalLabel: "Tatuador",    professionalPlural: "Tatuadores",   serviceLabel: "Sesión",      servicePlural: "Sesiones",     appointmentNoun: "sesión",  defaultFreqDays: 60, icon: "🖋️" },
  other:   { professionalLabel: "Profesional", professionalPlural: "Profesionales", serviceLabel: "Servicio",   servicePlural: "Servicios",    appointmentNoun: "cita",    defaultFreqDays: 30, icon: "🏢" },
};

export const BUSINESS_TYPES: { value: BusinessType; label: string; desc: string }[] = [
  { value: "barber", label: "💈 Barbería", desc: "Corte + barba" },
  { value: "salon", label: "💇 Peluquería", desc: "Corte, color, peinados" },
  { value: "spa", label: "💆 Spa / estética", desc: "Faciales y rituales" },
  { value: "pets", label: "🐾 Grooming", desc: "Baño y corte mascotas" },
  { value: "cafe", label: "☕ Cafetería", desc: "Reservas y pedidos" },
  { value: "laundry", label: "🧺 Lavandería", desc: "Pedidos recurrentes" },
  { value: "fitness", label: "🏋️ Fitness", desc: "Clases y sesiones" },
  { value: "tattoo", label: "🖋️ Tatuajes", desc: "Sesiones con cita" },
  { value: "other", label: "🏢 Otro negocio", desc: "Clientes recurrentes" },
];
