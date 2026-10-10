import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

// Guard: code-execution and raw-HTML sinks must never enter the frontend source.
const FORBIDDEN: [string, RegExp][] = [
  ["eval()", /\beval\s*\(/],
  ["new Function", /new\s+Function\b/],
  ["child_process", /child_process/],
  ["dangerouslySetInnerHTML", /dangerouslySetInnerHTML/],
  ["innerHTML/outerHTML", /\b(inner|outer)HTML\b/],
  ["document.write", /document\.write/],
  ["insertAdjacentHTML", /insertAdjacentHTML/],
  ["string timer", /set(Timeout|Interval)\(\s*["'`]/],
  ["NEXT_PUBLIC secret", /NEXT_PUBLIC_\w*(TOKEN|SECRET|KEY)/],
];
const SKIP = new Set(["node_modules", ".next", "tests", "coverage", "public"]);

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return /\.(ts|tsx|js|mjs)$/.test(name) && !name.endsWith(".d.ts") ? [p] : [];
  });
}

describe("frontend security guard", () => {
  const sources = files(process.cwd()).filter((f) => !/(jest\.(config|setup)|tsbuildinfo)/.test(f));

  it("scans source files", () => expect(sources.length).toBeGreaterThan(20));

  it.each(FORBIDDEN)("has no %s", (_name, pattern) => {
    const hits = sources.filter((f) => pattern.test(readFileSync(f, "utf8")));
    expect(hits).toEqual([]);
  });
});
