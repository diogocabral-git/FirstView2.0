import {
  LayoutDashboard, Store, FileSpreadsheet, Wallet, Rocket, Rss, TrendingUp,
  BadgeEuro, Eye, Headphones, Truck, Undo2, ShieldAlert, ListTodo, Plug,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { label: string; href: string; icon: LucideIcon; description?: string };
export type NavGroup = { label: string; items: NavItem[] };

export const navigation: NavGroup[] = [
  {
    label: "Loja",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Lojas", href: "/stores", icon: Store, description: "Lojas Shopify ligadas à plataforma." },
      { label: "Profit Sheet", href: "/profit-sheet", icon: FileSpreadsheet, description: "Lucro diário por loja: receita, COGS, anúncios e despesas." },
      { label: "Despesas", href: "/expenses", icon: Wallet, description: "Despesas fixas e variáveis (operações, equipa, pessoais, extra)." },
    ],
  },
  {
    label: "Marketing",
    items: [
      { label: "Launch Sheet", href: "/launch-sheet", icon: Rocket, description: "Planeamento e acompanhamento de lançamentos de produtos." },
      { label: "Product Feed", href: "/product-feed", icon: Rss, description: "Feed de produtos para Meta e Google." },
      { label: "Daily ROAS", href: "/daily-roas", icon: TrendingUp, description: "ROAS diário com dados da Meta Ads e Google Ads." },
      { label: "Lucro por produto", href: "/product-profit", icon: BadgeEuro, description: "Margem e lucro por produto." },
      { label: "Concorrentes", href: "/competitors", icon: Eye, description: "Acompanhamento de lojas e anúncios concorrentes." },
    ],
  },
  {
    label: "Pós-venda",
    items: [
      { label: "Apoio ao cliente", href: "/customer-support", icon: Headphones, description: "Caixa de entrada de apoio via Gmail." },
      { label: "Supply Chain", href: "/supply-chain", icon: Truck, description: "Fornecedores, encomendas e prazos de entrega." },
      { label: "Reembolsos", href: "/refunds", icon: Undo2, description: "Reembolsos sincronizados da Shopify." },
      { label: "Disputas", href: "/disputes", icon: ShieldAlert, description: "Chargebacks e disputas de pagamento." },
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
