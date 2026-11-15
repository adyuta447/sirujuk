/** @jest-environment node */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

// User text (notes, clarifications, narratives) reaches the screen only through React, which escapes it. Raw HTML
// sinks would let stored text like <img src=x onerror=...> run, so any new one must be a deliberate, reviewed change
// that escapes on that path (QA 30 Oct, cyber security P2: also covers future CSV/PDF export code).
const SINK = /dangerouslySetInnerHTML|\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML|document\.write\(/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|jsx?)$/.test(p) ? [p] : [];
  });
}

it("has no raw HTML sink in app code", () => {
  const root = join(__dirname, "../..");
  const hits = ["app", "components", "lib", "hooks", "services", "features"]
    .flatMap((d) => files(join(root, d)))
    .filter((f) => SINK.test(readFileSync(f, "utf8")));
  expect(hits).toEqual([]);
});
