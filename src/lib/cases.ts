// Configuração das páginas de Reembolsos, Chargebacks e Disputas (mesmo componente, campos diferentes).

export type Tone = "neutral" | "warning" | "good" | "bad";

export type CaseField = {
  key: string;
  label: string;
  type: "text" | "money" | "date" | "select" | "url" | "textarea";
  options?: string[];
  required?: boolean;
  inTable?: boolean;
  placeholder?: string;
};

export type CaseStatus = { key: string; label: string; tone: Tone; open: boolean; won?: boolean; lost?: boolean };

export type CaseConfig = {
  kind: "refunds" | "chargebacks" | "disputes";
  storageKey: string;
  title: string;
  subtitle: string;
  item: string; // "reembolso"
  newLabel: string;
  fields: CaseField[];
  statuses: CaseStatus[];
  deadlineField?: string;
  feeField?: string;
  /** Taxa sobre a receita bruta da Profit Sheet (ex.: taxa de reembolso). */
  rateLabel?: string;
  /** Mostrar taxa de vitória (disputas e chargebacks). */
  winRate?: boolean;
};

export type CaseRecord = {
  id: string;
  date: string;
  amount: number;
  status: string;
  [key: string]: string | number | null;
};

const platforms = ["Shopify Payments", "PayPal", "Stripe", "Klarna", "Outro"];

export const caseConfigs: Record<CaseConfig["kind"], CaseConfig> = {
  refunds: {
    kind: "refunds",
    storageKey: "fv.v2.refunds",
    title: "Reembolsos",
    subtitle: "Pedidos de reembolso, o motivo e em que ponto estão.",
    item: "reembolso",
    newLabel: "Novo reembolso",
    rateLabel: "Taxa de reembolso",
    fields: [
      { key: "order", label: "Encomenda", type: "text", required: true, inTable: true, placeholder: "#1234" },
      { key: "customer", label: "Cliente", type: "text", inTable: true, placeholder: "Nome ou email" },
      { key: "product", label: "Produto", type: "text", inTable: true },
      {
        key: "reason", label: "Motivo", type: "select", required: true, inTable: true,
        options: ["Não recebido", "Atraso na entrega", "Tamanho errado", "Defeito / danificado", "Não corresponde à descrição", "Mudou de ideias", "Outro"],
      },
      { key: "type", label: "Tipo", type: "select", inTable: true, options: ["Total", "Parcial", "Troca"] },
      { key: "notes", label: "Notas", type: "textarea" },
    ],
    statuses: [
      { key: "requested", label: "Pedido", tone: "warning", open: true },
      { key: "approved", label: "Aprovado", tone: "neutral", open: true },
      { key: "refunded", label: "Reembolsado", tone: "good", open: false },
      { key: "rejected", label: "Recusado", tone: "bad", open: false },
    ],
  },
  chargebacks: {
    kind: "chargebacks",
    storageKey: "fv.v2.chargebacks",
    title: "Chargebacks",
    subtitle: "Chargebacks recebidos, prazos para enviar provas e resultado.",
    item: "chargeback",
    newLabel: "Novo chargeback",
    deadlineField: "dueDate",
    feeField: "fee",
    rateLabel: "Taxa de chargeback",
    winRate: true,
    fields: [
      { key: "order", label: "Encomenda", type: "text", required: true, inTable: true, placeholder: "#1234" },
      { key: "platform", label: "Plataforma", type: "select", inTable: true, options: platforms },
      {
        key: "reason", label: "Motivo", type: "select", required: true, inTable: true,
        options: ["Fraude", "Produto não recebido", "Não corresponde à descrição", "Cobrança duplicada", "Subscrição cancelada", "Não reconhecido", "Outro"],
      },
      { key: "fee", label: "Taxa de chargeback", type: "money", inTable: true, placeholder: "15" },
      { key: "dueDate", label: "Prazo para provas", type: "date", inTable: true },
      { key: "tracking", label: "Tracking / provas", type: "url", placeholder: "Link do tracking ou das provas" },
      { key: "notes", label: "Notas", type: "textarea" },
    ],
    statuses: [
      { key: "needs_response", label: "Precisa de resposta", tone: "warning", open: true },
      { key: "submitted", label: "Provas enviadas", tone: "neutral", open: true },
      { key: "won", label: "Ganho", tone: "good", open: false, won: true },
      { key: "lost", label: "Perdido", tone: "bad", open: false, lost: true },
      { key: "accepted", label: "Aceite", tone: "bad", open: false, lost: true },
    ],
  },
  disputes: {
    kind: "disputes",
    storageKey: "fv.v2.disputes",
    title: "Disputas",
    subtitle: "Disputas e pedidos de informação abertos nas plataformas de pagamento.",
    item: "disputa",
    newLabel: "Nova disputa",
    deadlineField: "dueDate",
    winRate: true,
    fields: [
      { key: "order", label: "Encomenda", type: "text", required: true, inTable: true, placeholder: "#1234" },
      { key: "platform", label: "Plataforma", type: "select", required: true, inTable: true, options: platforms },
      {
        key: "reason", label: "Tipo", type: "select", required: true, inTable: true,
        options: ["Pedido de informação", "Item não recebido", "Não corresponde à descrição", "Não autorizado", "Outro"],
      },
      { key: "dueDate", label: "Prazo de resposta", type: "date", inTable: true },
      { key: "link", label: "Link da disputa", type: "url" },
      { key: "notes", label: "Notas", type: "textarea" },
    ],
    statuses: [
      { key: "open", label: "Aberta", tone: "warning", open: true },
      { key: "waiting", label: "À espera do cliente", tone: "neutral", open: true },
      { key: "escalated", label: "Escalada", tone: "bad", open: true },
      { key: "won", label: "Resolvida a favor", tone: "good", open: false, won: true },
      { key: "lost", label: "Perdida", tone: "bad", open: false, lost: true },
    ],
  },
};
