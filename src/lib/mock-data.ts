// Dados de exemplo. Serão substituídos por consultas ao Supabase
// quando as integrações estiverem ligadas.

export const kpis = [
  { id: "revenue", label: "Receita líquida", value: 11091, format: "currency", delta: 3.3, deltaLabel: "+€357 vs 27 dias anteriores" },
  { id: "roas", label: "ROAS", value: 2.0, format: "multiplier", delta: -0.11, deltaLabel: "€5.583 em anúncios" },
  { id: "profit", label: "Lucro", value: 628, format: "currency", delta: -58.0, deltaLabel: "−€866 vs 27 dias anteriores" },
  { id: "margin", label: "Margem", value: 5.7, format: "percent", delta: -8.3, deltaLabel: "lucro sobre receita líquida" },
] as const;

export const monthlyRevenue = [
  { month: "Jul", revenue: 3200, profit: 410 },
  { month: "Ago", revenue: 4800, profit: 690 },
  { month: "Set", revenue: 7400, profit: 1120 },
  { month: "Out", revenue: 12600, profit: 1494 },
  { month: "Nov", revenue: 11091, profit: 628 },
];

export const expenses = {
  total: 1188,
  categories: [
    { label: "Operações", value: 1188 },
    { label: "Equipa", value: 0 },
    { label: "Pessoais", value: 0 },
    { label: "Extra", value: 0 },
  ],
  budget: 2000,
};
