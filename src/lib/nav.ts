import {
  LayoutDashboard, FileSpreadsheet, Wallet, Rss,
  Eye, Undo2, CreditCard, ShieldAlert, ListTodo, Plug,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { label: string; href: string; icon: LucideIcon; description?: string };
export type NavGroup = { label: string; items: NavItem[] };

export const navigation: NavGroup[] = [
  {
    label: "Loja",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Profit Sheet", href: "/profit-sheet", icon: FileSpreadsheet, description: "Lucro diário por loja: receita, COGS, anúncios e despesas." },
      { label: "Despesas", href: "/expenses", icon: Wallet, description: "Despesas fixas e variáveis (operações, equipa, pessoais, extra)." },
    ],
  },
  {
    label: "Marketing",
    items: [
      { label: "Product Feed", href: "/product-feed", icon: Rss, description: "Feed de produtos para Meta e Google." },
      { label: "Concorrentes", href: "/competitors", icon: Eye, description: "Acompanhamento de lojas e anúncios concorrentes." },
    ],
  },
  {
    label: "Pós-venda",
    items: [
      { label: "Reembolsos", href: "/refunds", icon: Undo2, description: "Reembolsos sincronizados da Shopify." },
      { label: "Chargebacks", href: "/chargebacks", icon: CreditCard, description: "Chargebacks recebidos, valores e prazos de resposta." },
      { label: "Disputas", href: "/disputes", icon: ShieldAlert, description: "Disputas de pagamento abertas e respetivo estado." },
    ],
  },
  {
    label: "Equipa",
    items: [
      { label: "Tarefas", href: "/tasks", icon: ListTodo, description: "Tarefas da equipa." },
      { label: "Integrações", href: "/integrations", icon: Plug, description: "Ligar Shopify, Meta Ads, Google Ads e Gmail." },
    ],
  },
];

export const allNavItems = navigation.flatMap((g) => g.items);

export function findNavItem(slug: string) {
  return allNavItems.find((item) => item.href === `/${slug}`);
}
