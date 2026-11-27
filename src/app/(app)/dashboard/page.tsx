import { Greeting } from "@/components/dashboard/greeting";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { ExpensesCard } from "@/components/dashboard/expenses-card";
import { expenses, kpis, monthlyRevenue } from "@/lib/mock-data";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <Greeting />
        <p className="mt-1 text-muted-foreground">Veja como estão as suas lojas. (Dados de exemplo)</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <KpiCard key={k.id} {...k} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <RevenueChart data={monthlyRevenue} />
        <ExpensesCard {...expenses} />
      </section>
    </div>
  );
}
