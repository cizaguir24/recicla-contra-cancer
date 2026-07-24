const NOTION_VERSION = "2025-09-03";
const NOTION_API_BASE = "https://api.notion.com/v1";

function notionHeaders() {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) throw new Error("Falta NOTION_API_KEY en el entorno");
  return {
    Authorization: `Bearer ${apiKey}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

export type NotionPage = {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: Record<string, any>;
};

export async function queryDataSource(dataSourceId: string): Promise<NotionPage[]> {
  const results: NotionPage[] = [];
  let cursor: string | undefined;

  do {
    const res = await fetch(`${NOTION_API_BASE}/data_sources/${dataSourceId}/query`, {
      method: "POST",
      headers: notionHeaders(),
      body: JSON.stringify(cursor ? { start_cursor: cursor, page_size: 100 } : { page_size: 100 }),
    });

    if (!res.ok) {
      throw new Error(`Notion query falló (${res.status}): ${await res.text()}`);
    }

    const data = await res.json();
    results.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return results;
}

export async function getPage(pageId: string): Promise<NotionPage> {
  const res = await fetch(`${NOTION_API_BASE}/pages/${pageId}`, {
    headers: notionHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Notion getPage falló (${res.status}): ${await res.text()}`);
  }

  return res.json();
}

export function getTitleText(page: NotionPage, propName: string): string {
  const prop = page.properties[propName];
  if (!prop || prop.type !== "title") return "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return prop.title.map((t: any) => t.plain_text).join("");
}

export function getRichText(page: NotionPage, propName: string): string {
  const prop = page.properties[propName];
  if (!prop || prop.type !== "rich_text") return "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return prop.rich_text.map((t: any) => t.plain_text).join("");
}

export function getSelectName(page: NotionPage, propName: string): string | null {
  const prop = page.properties[propName];
  if (!prop || prop.type !== "select") return null;
  return prop.select?.name ?? null;
}

export function getNumber(page: NotionPage, propName: string): number | null {
  const prop = page.properties[propName];
  if (!prop || prop.type !== "number") return null;
  return prop.number ?? null;
}

export function getDateStart(page: NotionPage, propName: string): string | null {
  const prop = page.properties[propName];
  if (!prop || prop.type !== "date") return null;
  return prop.date?.start ?? null;
}

export function getFormulaNumber(page: NotionPage, propName: string): number | null {
  const prop = page.properties[propName];
  if (!prop || prop.type !== "formula") return null;
  return prop.formula?.type === "number" ? (prop.formula.number ?? null) : null;
}

export function getRelationIds(page: NotionPage, propName: string): string[] {
  const prop = page.properties[propName];
  if (!prop || prop.type !== "relation") return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return prop.relation.map((r: any) => r.id);
}
