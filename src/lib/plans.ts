export type PlanId = "free" | "pro" | "agencia";

export interface Plan {
  id: PlanId;
  name: string;
  price: number;        // USD
  priceARS: number;     // ARS (referencia)
  period: "mes" | "gratis";
  description: string;
  color: string;
  features: string[];
  limits: {
    historyDays: number;       // días de historial de Calendar
    coachMessages: number;     // análisis de Coach IA por mes (-1 = ilimitado)
    agents: number;            // agentes del equipo (-1 = ilimitado)
  };
  highlight?: boolean;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    priceARS: 0,
    period: "gratis",
    description: "Para conocer la herramienta",
    color: "#64748b",
    features: [
      "7 días de historial",
      "Eventos verdes automáticos",
      "Dashboard básico",
      "1 agente (vos)",
    ],
    limits: {
      historyDays: 7,
      coachMessages: 3,
      agents: 1,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 12,
    priceARS: 12000,
    period: "mes",
    description: "Para el inmobiliario que quiere escalar",
    color: "#aa0000",
    highlight: true,
    features: [
      "90 días de historial",
      "Coach IA ilimitado",
      "Análisis de tendencias",
      "Hasta 5 agentes",
      "Soporte prioritario",
    ],
    limits: {
      historyDays: 90,
      coachMessages: -1,
      agents: 5,
    },
  },
  agencia: {
    id: "agencia",
    name: "Agencia",
    price: 39,
    priceARS: 39000,
    period: "mes",
    description: "Para brokers con equipo completo",
    color: "#1e293b",
    features: [
      "Historial ilimitado",
      "Coach IA ilimitado",
      "Agentes ilimitados",
      "Dashboard del broker",
      "Reportes exportables",
      "Onboarding personalizado",
    ],
    limits: {
      historyDays: 365,
      coachMessages: -1,
      agents: -1,
    },
  },
};

export function getPlanById(id: string): Plan {
  return PLANS[id as PlanId] ?? PLANS.free;
}
