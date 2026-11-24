import { formatEastern, kindLabel, loadBrain, type BrainEntry, type EntryKind } from "@/lib/brain";

export const dynamic = "force-dynamic";

function agentClass(agent: string): string {
  if (agent.startsWith("Grok")) return "agent-grok";
  if (agent.startsWith("Builder")) return "agent-builder";
  if (agent.startsWith("Claude")) return "agent-claude";
  if (agent.startsWith("Codex")) return "agent-codex";
  return "";
}

function countByKind(entries: BrainEntry[], kind: EntryKind): number {
  return entries.filter((entry) => entry.kind === kind).length;
}

export default async function Page() {
  const brain = await loadBrain();
  const pickedUp = brain.entries.find(
    (entry) => entry.kind === "handoffs" && entry.pickedUpBy,
  );
  const sourceLabel = brain.source === "live" ? "Live from Notion" : "Snapshot";

  return (
    <main className="page">
      <p className="kicker">Harbor Lights · sandbox demo</p>
      <h1>Shared Brain Switchboard</h1>
      <p className="lede">
        A shared Notion memory that more than one agent can read and write. You do
        the thinking. Notion does the remembering. A later agent can pick up where
        the last one left off.
      </p>

      <div className="meta">
        <span className={`badge ${brain.source}`}>{sourceLabel}</span>
        {brain.exportedAt ? (
          <span className="badge">Exported {formatEastern(brain.exportedAt)}</span>
        ) : null}
      </div>
      {brain.note ? <p className="note">{brain.note}</p> : null}

      <div className="counts">
        <div className="count">
          <div className="n">{countByKind(brain.entries, "context")}</div>
          <div className="l">Context</div>
        </div>
        <div className="count">
          <div className="n">{countByKind(brain.entries, "decisions")}</div>
          <div className="l">Decisions</div>
        </div>
        <div className="count">
          <div className="n">{countByKind(brain.entries, "handoffs")}</div>
          <div className="l">Handoffs</div>
        </div>
      </div>

      {pickedUp ? (
        <section className="pickup">
          <h2>Handoff pickup</h2>
          <p>
            <strong>{pickedUp.agent}</strong>
            <span className="arrow">→</span>
            <strong>{pickedUp.pickedUpBy}</strong>
          </p>
          <p className="detail">
            {pickedUp.agent} wrote “{pickedUp.name}”. {pickedUp.pickedUpBy} read
            that row through the Notion connector and marked it picked up. The
            round trip is real, not staged in the board alone.
          </p>
        </section>
      ) : null}

      <section className="section">
        <h2>Timeline</h2>
        <div className="timeline">
          {brain.entries.map((entry) => (
            <article className="row" key={entry.id}>
              <div className="when">{formatEastern(entry.created)}</div>
              <div className="card">
                <div className="chips">
                  <span className={`chip ${entry.kind}`}>{kindLabel(entry.kind)}</span>
                  <span className={`chip ${agentClass(entry.agent)}`}>{entry.agent}</span>
                  <span className="chip">{entry.status}</span>
                </div>
                <h3>
                  <a href={entry.url} target="_blank" rel="noreferrer">
                    {entry.name}
                  </a>
                </h3>
                <p>{entry.summary}</p>
                {entry.kind === "handoffs" && entry.pickedUpBy ? (
                  <div className="pickup-line">Picked up by {entry.pickedUpBy}</div>
                ) : null}
                {entry.kind === "handoffs" && !entry.pickedUpBy ? (
                  <div className="open-line">Still open</div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer>
        Source page:{" "}
        <a href={brain.notionPageUrl} target="_blank" rel="noreferrer">
          {brain.notionPageTitle}
        </a>
        . Sample content only. This preview is not a production deploy.
      </footer>
    </main>
  );
}
