import snapshot from "@/data/snapshot.json";

export type AgentName =
  | "Grok Bot / Chief of Staff"
  | "Builder"
  | "Claude Code"
  | "Codex";

export type EntryKind = "context" | "decisions" | "handoffs";

export type BrainEntry = {
  id: string;
  kind: EntryKind;
  name: string;
  agent: string;
  summary: string;
  status: string;
  created: string;
  url: string;
  pickedUpBy?: string | null;
};

export type BrainData = {
  source: "live" | "snapshot";
  exportedAt?: string;
  notionPageUrl: string;
  notionPageTitle: string;
  entries: BrainEntry[];
  note?: string;
};

const KIND_LABEL: Record<EntryKind, string> = {
  context: "Context",
  decisions: "Decisions",
  handoffs: "Handoffs",
};

export function kindLabel(kind: EntryKind): string {
  return KIND_LABEL[kind];
}

const DEFAULT_DATABASE_IDS: Record<EntryKind, string> = {
  context: "422af6475d7981c2b255f02942d243a6",
  decisions: "422af6475d7981bd89c4ecb0c8fd6fb4",
  handoffs: "422af6475d798157aabec88ce1ebf722",
};

function envDatabaseId(kind: EntryKind): string {
  const envName = {
    context: "NOTION_CONTEXT_DATABASE_ID",
    decisions: "NOTION_DECISIONS_DATABASE_ID",
    handoffs: "NOTION_HANDOFFS_DATABASE_ID",
  }[kind];
  return process.env[envName] || DEFAULT_DATABASE_IDS[kind];
}

function textFromProperty(property: unknown): string {
  if (!property || typeof property !== "object") return "";
  const value = property as {
    type?: string;
    title?: { plain_text?: string }[];
    rich_text?: { plain_text?: string }[];
    select?: { name?: string } | null;
    status?: { name?: string } | null;
    created_time?: string;
  };
  if (value.type === "title") {
    return (value.title || []).map((part) => part.plain_text || "").join("");
  }
  if (value.type === "rich_text") {
    return (value.rich_text || []).map((part) => part.plain_text || "").join("");
  }
  if (value.type === "select") {
    return value.select?.name || "";
  }
  if (value.type === "status") {
    return value.status?.name || "";
  }
  if (value.type === "created_time") {
    return value.created_time || "";
  }
  return "";
}

type NotionPage = {
  id: string;
  url?: string;
  created_time?: string;
  properties?: Record<string, unknown>;
};

async function queryDatabase(databaseId: string, token: string): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | undefined;
  do {
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ start_cursor: cursor, page_size: 100 }),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Notion query failed with status ${response.status}`);
    }
    const payload = (await response.json()) as {
      results?: NotionPage[];
      has_more?: boolean;
      next_cursor?: string | null;
    };
    pages.push(...(payload.results || []));
    cursor = payload.has_more && payload.next_cursor ? payload.next_cursor : undefined;
  } while (cursor);
  return pages;
}

function entriesFromSnapshot(): BrainEntry[] {
  const kinds: EntryKind[] = ["context", "decisions", "handoffs"];
  const entries: BrainEntry[] = [];
  for (const kind of kinds) {
    const group = snapshot.databases[kind];
    for (const entry of group.entries) {
      entries.push({
        id: entry.id,
        kind,
        name: entry.name,
        agent: entry.agent,
        summary: entry.summary,
        status: entry.status,
        created: entry.created,
        url: entry.url,
        pickedUpBy: "pickedUpBy" in entry ? entry.pickedUpBy : null,
      });
    }
  }
  return sortEntries(entries);
}

function pageToEntry(kind: EntryKind, page: NotionPage): BrainEntry {
  const properties = page.properties || {};
  return {
    id: page.id,
    kind,
    name: textFromProperty(properties.Name),
    agent: textFromProperty(properties.Agent),
    summary: textFromProperty(properties.Summary),
    status: textFromProperty(properties.Status),
    created: textFromProperty(properties.Created) || page.created_time || "",
    url: page.url || "",
    pickedUpBy: kind === "handoffs" ? textFromProperty(properties["Picked up by"]) || null : null,
  };
}

function sortEntries(entries: BrainEntry[]): BrainEntry[] {
  const kindOrder: Record<EntryKind, number> = {
    context: 0,
    decisions: 1,
    handoffs: 2,
  };
  return [...entries].sort((a, b) => {
    const byTime = a.created.localeCompare(b.created);
    if (byTime !== 0) return byTime;
    const byKind = kindOrder[a.kind] - kindOrder[b.kind];
    if (byKind !== 0) return byKind;
    return a.name.localeCompare(b.name);
  });
}

export async function loadBrain(): Promise<BrainData> {
  const token = process.env.NOTION_TOKEN?.trim();
  const base: Omit<BrainData, "source" | "entries" | "note"> = {
    notionPageUrl: snapshot.notionPageUrl,
    notionPageTitle: snapshot.notionPageTitle,
    exportedAt: snapshot.exportedAt,
  };

  if (!token) {
    return {
      ...base,
      source: "snapshot",
      entries: entriesFromSnapshot(),
      note: "No Notion API token is set, so this board is serving a static snapshot exported from the sandbox databases at build time.",
    };
  }

  try {
    const kinds: EntryKind[] = ["context", "decisions", "handoffs"];
    const groups = await Promise.all(
      kinds.map(async (kind) => {
        const pages = await queryDatabase(envDatabaseId(kind), token);
        return pages.map((page) => pageToEntry(kind, page));
      }),
    );
    return {
      ...base,
      source: "live",
      entries: sortEntries(groups.flat()),
      note: "Live from the Agent Shared Brain (demo) Notion databases.",
    };
  } catch {
    return {
      ...base,
      source: "snapshot",
      entries: entriesFromSnapshot(),
      note: "The Notion API request failed, so this board fell back to the static snapshot. The token value was not logged.",
    };
  }
}

export function formatEastern(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}
