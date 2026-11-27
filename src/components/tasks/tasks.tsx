"use client";

import { useState } from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight, LayoutGrid, List, Pencil, Plus, Search, Trash2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMounted, useStore } from "@/lib/store";
import { addDays, dayShort, todayInLisbon } from "@/lib/dates";

type Status = "todo" | "doing" | "done";
type Priority = "low" | "medium" | "high";

type Task = {
  id: string;
  title: string;
  notes: string;
  status: Status;
  priority: Priority;
  due: string | null;
  assignee: string;
  category: string;
  createdAt: string;
  doneAt: string | null;
  checklist: { id: string; text: string; done: boolean }[];
};

const KEY = "fv.v2.tasks";
const empty = (): Task[] => [];
const uid = () => Math.random().toString(36).slice(2, 10);

const columns: { key: Status; label: string; dot: string }[] = [
  { key: "todo", label: "A fazer", dot: "bg-muted-foreground" },
  { key: "doing", label: "Em curso", dot: "bg-sky-400" },
  { key: "done", label: "Feito", dot: "bg-emerald-400" },
];
const priorities: { key: Priority; label: string; cls: string }[] = [
  { key: "high", label: "Alta", cls: "bg-red-500/15 text-red-400" },
  { key: "medium", label: "Média", cls: "bg-amber-500/15 text-amber-400" },
  { key: "low", label: "Baixa", cls: "bg-muted text-muted-foreground" },
];
const categories = ["Loja", "Anúncios", "Produto", "Criativos", "Apoio ao cliente", "Fornecedores", "Finanças", "Outro"];
const prioOrder: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

export function Tasks() {
  const mounted = useMounted();
  if (!mounted) return <div className="h-96 animate-pulse rounded-xl border border-border bg-card" />;
  return <Inner />;
}

function Inner() {
  const [today] = useState(todayInLisbon);
  const [tasks, setTasks] = useStore<Task[]>(KEY, empty);
  const [view, setView] = useState<"board" | "list">("board");
  const [editing, setEditing] = useState<Task | Status | null>(null);
  const [query, setQuery] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropOn, setDropOn] = useState<Status | null>(null);

  const people = [...new Set(tasks.map((t) => t.assignee).filter(Boolean))].sort();
  const filtered = tasks
    .filter((t) => !assignee || t.assignee === assignee)
    .filter((t) => !query || `${t.title} ${t.notes} ${t.category}`.toLowerCase().includes(query.toLowerCase()));
  const sorted = (list: Task[]) =>
    [...list].sort((a, b) => prioOrder[a.priority] - prioOrder[b.priority] || (a.due ?? "9999").localeCompare(b.due ?? "9999"));

  const move = (id: string, status: Status) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status, doneAt: status === "done" ? today : null } : t)));
  const remove = (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id));
  const save = (task: Task) => {
    setTasks((prev) => (prev.some((t) => t.id === task.id) ? prev.map((t) => (t.id === task.id ? task : t)) : [...prev, task]));
    setEditing(null);
  };

  const open = tasks.filter((t) => t.status !== "done");
  const overdue = open.filter((t) => t.due && t.due < today).length;
  const dueToday = open.filter((t) => t.due === today).length;
  const doneWeek = tasks.filter((t) => t.doneAt && t.doneAt >= addDays(today, -6)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Tarefas</h1>
          <p className="text-muted-foreground">O que há para fazer no negócio e quem trata de quê.</p>
        </div>
        <button onClick={() => setEditing("todo")} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
          <Plus className="size-4" /> Nova tarefa
        </button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Em aberto" value={open.length} />
        <Stat label="Atrasadas" value={overdue} tone={overdue ? "bad" : undefined} />
        <Stat label="Para hoje" value={dueToday} tone={dueToday ? "warn" : undefined} />
        <Stat label="Feitas nos últimos 7 dias" value={doneWeek} tone={doneWeek ? "good" : undefined} />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border border-border bg-card p-0.5 text-sm">
          <button onClick={() => setView("board")} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5", view === "board" ? "bg-muted font-medium" : "text-muted-foreground")}><LayoutGrid className="size-4" /> Quadro</button>
          <button onClick={() => setView("list")} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5", view === "list" ? "bg-muted font-medium" : "text-muted-foreground")}><List className="size-4" /> Lista</button>
        </div>
        <div className="flex items-center gap-2">
          {people.length > 0 && (
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm">
              <option value="">Todas as pessoas</option>
              {people.map((p) => <option key={p}>{p}</option>)}
            </select>
          )}
          <label className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm">
            <Search className="size-4 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Procurar" className="w-40 bg-transparent outline-none" />
          </label>
        </div>
      </div>

      {editing && (
        <TaskForm
          initial={typeof editing === "string" ? null : editing}
          defaultStatus={typeof editing === "string" ? editing : editing.status}
          people={people}
          today={today}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      )}

      {view === "board" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {columns.map((col) => {
            const items = sorted(filtered.filter((t) => t.status === col.key));
            return (
              <div
                key={col.key}
                onDragOver={(e) => { e.preventDefault(); setDropOn(col.key); }}
                onDragLeave={() => setDropOn(null)}
                onDrop={() => { if (dragId) move(dragId, col.key); setDragId(null); setDropOn(null); }}
                className={cn("flex min-h-64 flex-col rounded-xl border border-border bg-card/60", dropOn === col.key && "border-primary bg-primary/5")}
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="flex items-center gap-2 font-medium"><span className={cn("size-2 rounded-full", col.dot)} /> {col.label} <span className="text-muted-foreground">{items.length}</span></span>
                  <button aria-label={`Nova tarefa em ${col.label}`} onClick={() => setEditing(col.key)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><Plus className="size-4" /></button>
                </div>
                <div className="flex-1 space-y-2 px-3 pb-3">
                  {items.map((t) => (
                    <TaskCard key={t.id} t={t} today={today} onDragStart={() => setDragId(t.id)} onEdit={() => setEditing(t)} onMove={(s) => move(t.id, s)} onDelete={() => remove(t.id)} onToggleCheck={(id) => setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, checklist: x.checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)) } : x)))} />
                  ))}
                  {items.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">{col.key === "todo" && !tasks.length ? "Sem tarefas ainda." : "Arrasta tarefas para aqui."}</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                <th className="w-10" />
                {["Tarefa", "Categoria", "Prioridade", "Prazo", "Responsável", "Estado"].map((h) => <th key={h} className="px-4 py-2.5 text-left font-medium">{h}</th>)}
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">Sem tarefas.</td></tr>}
              {[...sorted(filtered.filter((t) => t.status !== "done")), ...filtered.filter((t) => t.status === "done")].map((t) => {
                const late = t.status !== "done" && t.due && t.due < today;
                return (
                  <tr key={t.id} className="group border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="pl-4">
                      <button aria-label={t.status === "done" ? "Reabrir" : "Marcar como feita"} onClick={() => move(t.id, t.status === "done" ? "todo" : "done")} className={cn("flex size-5 items-center justify-center rounded border", t.status === "done" ? "border-emerald-500 bg-emerald-500 text-white" : "border-border hover:border-primary")}>
                        {t.status === "done" && <Check className="size-3.5" />}
                      </button>
                    </td>
                    <td className={cn("px-4 py-2.5", t.status === "done" && "text-muted-foreground line-through")}>{t.title}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{t.category || "—"}</td>
                    <td className="px-4 py-2.5"><PriorityBadge p={t.priority} /></td>
                    <td className={cn("px-4 py-2.5", late && "text-red-400")}>{t.due ? (t.due === today ? "Hoje" : dayShort(t.due)) : "—"}</td>
                    <td className="px-4 py-2.5">{t.assignee || "—"}</td>
                    <td className="px-4 py-2.5">
                      <select value={t.status} onChange={(e) => move(t.id, e.target.value as Status)} className="rounded-md border border-border bg-background px-2 py-1 text-xs">
                        {columns.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                    </td>
                    <td className="whitespace-nowrap px-3 text-right">
                      <span className="invisible inline-flex gap-1 group-hover:visible">
                        <button aria-label="Editar" onClick={() => setEditing(t)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil className="size-4" /></button>
                        <button aria-label="Apagar" onClick={() => remove(t.id)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-400"><Trash2 className="size-4" /></button>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PriorityBadge({ p }: { p: Priority }) {
  const pr = priorities.find((x) => x.key === p)!;
  return <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", pr.cls)}>{pr.label}</span>;
}

function TaskCard({ t, today, onDragStart, onEdit, onMove, onDelete, onToggleCheck }: {
  t: Task;
  today: string;
  onDragStart: () => void;
  onEdit: () => void;
  onMove: (s: Status) => void;
  onDelete: () => void;
  onToggleCheck: (id: string) => void;
}) {
  const idx = columns.findIndex((c) => c.key === t.status);
  const late = t.status !== "done" && t.due && t.due < today;
  const doneItems = t.checklist.filter((c) => c.done).length;
  return (
    <div draggable onDragStart={onDragStart} className="group cursor-grab rounded-lg border border-border bg-card p-3 text-sm shadow-sm active:cursor-grabbing">
      <div className="flex items-start justify-between gap-2">
        <button onClick={onEdit} className={cn("text-left font-medium hover:text-primary", t.status === "done" && "text-muted-foreground line-through")}>{t.title}</button>
        <PriorityBadge p={t.priority} />
      </div>
      {t.notes && <p className="mt-1 line-clamp-2 text-muted-foreground">{t.notes}</p>}
      {t.checklist.length > 0 && (
        <ul className="mt-2 space-y-1">
          {t.checklist.map((c) => (
            <li key={c.id}>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={c.done} onChange={() => onToggleCheck(c.id)} className="accent-[var(--primary)]" />
                <span className={cn(c.done && "text-muted-foreground line-through")}>{c.text}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {t.category && <span className="rounded bg-muted px-1.5 py-0.5">{t.category}</span>}
        {t.due && <span className={cn("flex items-center gap-1", late && "text-red-400", t.due === today && t.status !== "done" && "text-amber-400")}><CalendarDays className="size-3" />{t.due === today ? "Hoje" : dayShort(t.due)}</span>}
        {t.assignee && <span className="flex items-center gap-1"><User className="size-3" />{t.assignee}</span>}
        {t.checklist.length > 0 && <span>{doneItems}/{t.checklist.length}</span>}
        <span className="ml-auto flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {idx > 0 && <button aria-label="Mover para trás" onClick={() => onMove(columns[idx - 1].key)} className="rounded p-1 hover:bg-muted hover:text-foreground"><ChevronLeft className="size-3.5" /></button>}
          {idx < columns.length - 1 && <button aria-label="Mover para a frente" onClick={() => onMove(columns[idx + 1].key)} className="rounded p-1 hover:bg-muted hover:text-foreground"><ChevronRight className="size-3.5" /></button>}
          <button aria-label="Apagar" onClick={onDelete} className="rounded p-1 hover:bg-muted hover:text-red-400"><Trash2 className="size-3.5" /></button>
        </span>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function TaskForm({ initial, defaultStatus, people, today, onSave, onCancel }: {
  initial: Task | null;
  defaultStatus: Status;
  people: string[];
  today: string;
  onSave: (t: Task) => void;
  onCancel: () => void;
}) {
  const [t, setT] = useState<Task>(
    initial ?? {
      id: uid(), title: "", notes: "", status: defaultStatus, priority: "medium", due: null, assignee: "",
      category: "", createdAt: today, doneAt: null, checklist: [],
    },
  );
  const [item, setItem] = useState("");
  const set = <K extends keyof Task>(k: K, v: Task[K]) => setT((x) => ({ ...x, [k]: v }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (t.title.trim()) onSave({ ...t, title: t.title.trim(), doneAt: t.status === "done" ? t.doneAt ?? today : null });
      }}
      className="space-y-4 rounded-xl border border-border bg-card p-5"
    >
      <h3 className="font-semibold">{initial ? "Editar tarefa" : "Nova tarefa"}</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm sm:col-span-2 lg:col-span-4">
          <span className="text-muted-foreground">Tarefa *</span>
          <input autoFocus value={t.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex.: testar nova coleção de verão" className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Prioridade</span>
          <select value={t.priority} onChange={(e) => set("priority", e.target.value as Priority)} className={inputCls}>
            {priorities.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Prazo</span>
          <input type="date" value={t.due ?? ""} onChange={(e) => set("due", e.target.value || null)} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Responsável</span>
          <input list="task-people" value={t.assignee} onChange={(e) => set("assignee", e.target.value)} placeholder="Nome" className={inputCls} />
          <datalist id="task-people">{people.map((p) => <option key={p} value={p} />)}</datalist>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Categoria</span>
          <select value={t.category} onChange={(e) => set("category", e.target.value)} className={inputCls}>
            <option value="">—</option>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2 lg:col-span-4">
          <span className="text-muted-foreground">Notas</span>
          <textarea rows={2} value={t.notes} onChange={(e) => set("notes", e.target.value)} className={inputCls} />
        </label>
        <div className="space-y-2 text-sm sm:col-span-2 lg:col-span-4">
          <span className="text-muted-foreground">Checklist</span>
          {t.checklist.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <input type="checkbox" checked={c.done} onChange={() => set("checklist", t.checklist.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)))} className="accent-[var(--primary)]" />
              <span className="flex-1">{c.text}</span>
              <button type="button" aria-label="Remover" onClick={() => set("checklist", t.checklist.filter((x) => x.id !== c.id))} className="text-muted-foreground hover:text-red-400"><Trash2 className="size-3.5" /></button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              value={item}
              onChange={(e) => setItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (item.trim()) { set("checklist", [...t.checklist, { id: uid(), text: item.trim(), done: false }]); setItem(""); }
                }
              }}
              placeholder="Adicionar passo e carregar Enter"
              className={inputCls}
            />
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button disabled={!t.title.trim()} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">Guardar</button>
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-muted">Cancelar</button>
      </div>
    </form>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "bad" | "warn" | "good" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", tone === "bad" && "text-red-400", tone === "warn" && "text-amber-400", tone === "good" && "text-emerald-400")}>{value}</p>
    </div>
  );
}
