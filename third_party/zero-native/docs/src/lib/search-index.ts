import { allDocsPages } from "./docs-navigation";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type IndexEntry = {
  title: string;
  href: string;
  content: string;
};

let cached: IndexEntry[] | null = null;

export async function getSearchIndex(): Promise<IndexEntry[]> {
  if (cached) return cached;

  const entries: IndexEntry[] = await Promise.all(
    allDocsPages.map(async (item) => ({
      title: item.name,
      href: item.href,
      content: await pageContent(item.href, item.name),
    })),
  );

  cached = entries;
  return entries;
}

async function pageContent(href: string, fallback: string): Promise<string> {
  const relative = href === "/" ? "page.mdx" : path.join(href.slice(1), "page.mdx");
  const filePath = path.join(process.cwd(), "src", "app", relative);
  try {
    const source = await readFile(filePath, "utf8");
    return stripMdx(source);
  } catch {
    return fallback;
  }
}

function stripMdx(source: string): string {
  return source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#*_`[\](){}>-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
