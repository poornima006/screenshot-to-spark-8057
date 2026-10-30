import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChartNoAxesCombined, MessageSquare, ShieldCheck, UserRound, Percent, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSupportSession } from "@/components/support/SupportSession";
import { calculateEvaluation } from "@/lib/support/evaluation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SupportTickets } from "@/components/support/SupportTickets";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [
    { title: "AI Evaluation Dashboard | ShopEase" },
    { name: "description", content: "Session-based evaluation of ShopEase support questions, verified policy answers and source usage." },
    { property: "og:title", content: "ShopEase AI Evaluation Dashboard" },
    { property: "og:description", content: "Real support conversation metrics and policy source activity from the current session." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: EvaluationDashboard,
});

function EvaluationDashboard() {
  const { messages } = useSupportSession();
  const metrics = calculateEvaluation(messages);
  const stats = [
    { label: "Total questions", value: metrics.total, icon: MessageSquare },
    { label: "Policy-grounded answers", value: metrics.grounded, icon: ShieldCheck },
    { label: "Unanswered / escalated", value: metrics.unansweredOrEscalated, icon: UserRound },
    { label: "Answered with policy context", value: `${Number(metrics.groundedPercentage.toFixed(1))}%`, icon: Percent },
  ];
  return <div className="min-h-screen bg-background font-sans text-foreground">
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-lg font-extrabold text-primary-foreground">S</div>
          <span className="text-xl font-extrabold">Shop<span className="text-primary">Ease</span></span>
        </div>
        <Button variant="outline" asChild className="rounded-full"><Link to="/"><ArrowLeft />Back to chat</Link></Button>
      </div>
    </header>
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6">
      <div className="space-y-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground"><Activity className="h-3 w-3" />Session-based</span>
        <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl"><ChartNoAxesCombined className="h-6 w-6 shrink-0 text-primary" />AI Evaluation Dashboard</h1>
         <p className="text-sm text-muted-foreground">Evaluation uses the current conversation only and resets when you refresh or clear chat. Support tickets are stored separately.</p>
      </div>
       <Tabs defaultValue="evaluation">
       <TabsList aria-label="Dashboard views"><TabsTrigger value="evaluation">Evaluation</TabsTrigger><TabsTrigger value="tickets">Support Tickets</TabsTrigger></TabsList>
       <TabsContent value="tickets"><SupportTickets /></TabsContent>
       <TabsContent value="evaluation" className="space-y-8 pt-4">
      <section aria-label="Evaluation metrics" className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-lg border border-border bg-card p-5 shadow-soft">
          <div className="flex items-start justify-between gap-2"><h2 className="text-sm font-medium text-muted-foreground">{label}</h2><Icon className="h-4 w-4 shrink-0 text-primary" /></div>
          <p className="mt-3 text-3xl font-bold tabular-nums">{value}</p>
        </div>)}
      </section>
       <p className="text-xs text-muted-foreground">Context coverage = questions with a verified policy answer ÷ total questions. Pending: {metrics.pending}. Escalated means a support request was saved, not that an agent connected or was notified. A grounded answer can also be escalated.</p>
      <section aria-labelledby="sources-heading" className="border-y border-border py-6">
        <h2 id="sources-heading" className="text-lg font-bold">Policy source usage</h2>
        <p className="mt-1 text-sm text-muted-foreground">Verified sources used in answers; each source counts once per question.</p>
        <div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.sourceUsage.map((source) => <div key={source.id}>
            <div className="mb-2 flex justify-between gap-2 text-sm"><span className="font-medium">{source.title}</span><span className="tabular-nums text-muted-foreground">{source.count} {source.count === 1 ? "answer" : "answers"}</span></div>
            <meter className="h-2 w-full accent-primary" min={0} max={Math.max(metrics.total, 1)} value={source.count} aria-label={`${source.title} usage`} />
          </div>)}
        </div>
        {metrics.grounded === 0 && <p className="mt-5 text-sm text-muted-foreground">No policy sources have been used in this conversation yet.</p>}
      </section>
      <section aria-labelledby="activity-heading">
        <div className="flex items-center justify-between gap-2"><h2 id="activity-heading" className="text-lg font-bold">Recent activity</h2><span className="text-xs text-muted-foreground">Newest first · {metrics.total} questions</span></div>
        {metrics.total === 0 ? <div className="flex flex-col items-center gap-3 py-12 text-center">
          <MessageSquare className="h-8 w-8 text-muted-foreground" />
          <h3 className="font-semibold">No questions yet</h3>
          <p className="text-sm text-muted-foreground">There is no conversation activity to evaluate.</p>
          <Button asChild variant="outline"><Link to="/">Open chat<ArrowLeft /></Link></Button>
        </div> : <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[660px] text-left text-sm">
            <thead className="bg-muted text-muted-foreground"><tr>
              { ["Question", "Policy retrieved", "Retrieved source", "Result / used source"].map((label) => <th key={label} scope="col" className="px-4 py-3 font-medium">{label}</th>) }
            </tr></thead>
            <tbody className="divide-y divide-border bg-card">{metrics.activities.map((activity) => <tr key={activity.id}>
              <td className="max-w-xs break-words px-4 py-4 align-top"><span className="block">{activity.question}</span><span className="mt-1 block text-xs text-muted-foreground">{activity.time}</span></td>
              <td className="px-4 py-4 align-top">{activity.retrievedSources === null ? activity.result === "Pending" ? "Pending" : "Not reported" : activity.retrievedSources.length ? "Yes" : "No"}</td>
              <td className="max-w-[220px] px-4 py-4 align-top text-muted-foreground">{activity.retrievedSources?.map((source) => source.title).join(", ") || "—"}</td>
              <td className="px-4 py-4 align-top"><span className={activity.usedSources.length ? "font-medium text-primary" : "font-medium"}>{activity.result}</span>{activity.usedSources.length > 0 && <span className="mt-1 block text-xs text-muted-foreground">Used: {activity.usedSources.map((source) => source.title).join(", ")}</span>}</td>
            </tr>)}</tbody>
          </table>
        </div>}
      </section>
       </TabsContent>
       </Tabs>
    </main>
  </div>;
}