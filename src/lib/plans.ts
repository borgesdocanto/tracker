export type PlanId = "free" | "individual" | "teams";

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  priceARS: number;
  period: "mes" | "gratis";
  description: string;
  badge?: string;
  features: string[];
  limits: {
    historyDays: number;
    coachMessages: number;
    agents: number;
    weeklyEmail: boolean;
    teamsAccess: boolean;
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
    description: "7 días completos para que vivas la experiencia",
    badge: "7 días gratis",
    features: [
      "Sync completo con Google Calendar",
      "Insta Coach ilimitado",
      "Dashboard de productividad",
      "Informe semanal por email",
      "Todo desbloqueado por 7 días",
    ],
    limits: { historyDays: -1, coachMessages: -1, agents: -1, weeklyEmail: true, teamsAccess: false },
  },
  individual: {
    id: "individual",
    name: "Individual",
    price: 7,
    priceARS: 7000,
    period: "mes",
    description: "Para el inmobiliario que quiere escalar",
    highlight: true,
    features: [
      "Todo del plan Free para siempre",
      "Insta Coach ilimitado",
      "Historial completo sin límite",
      "Informe semanal personalizado",
      "Soporte prioritario",
    ],
    limits: { historyDays: -1, coachMessages: -1, agents: -1, weeklyEmail: true, teamsAccess: false },
  },
  teams: {
    id: "teams",
    name: "Teams",
    price: 50,
    priceARS: 50000,
    period: "mes",
    description: "Para brokers con equipo — hasta 10 agentes",
    badge: "Ahorrás USD 20/mes vs 10 individuales",
    features: [
      "Todo del plan Individual",
      "Hasta 10 agentes incluidos",
      "Dashboard unificado del broker",
      "Invitación de agentes por email",
      "Informe semanal de todo el equipo",
      "Agentes adicionales a USD 7/mes c/u",
    ],
    limits: { historyDays: -1, coachMessages: -1, agents: 10, weeklyEmail: true, teamsAccess: true },
  },
};

export function getPlanById(id: string): Plan {
  return PLANS[id as PlanId] ?? PLANS.free;
}

export function isVipEmail(email: string): boolean {
  return email.toLowerCase().endsWith("@galas.com.ar");
}
