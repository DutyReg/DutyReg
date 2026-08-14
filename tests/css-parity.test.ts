import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "..");
const cssPath = join(repoRoot, "app", "globals.css");
const css = readFileSync(cssPath, "utf8");

function blockVars(selector: string): Map<string, string> {
  const match = css.match(new RegExp(`${selector}\\s*\\{([\\s\\S]*?)\\}`));
  if (!match) throw new Error(`Block ${selector} not found`);
  const vars = new Map<string, string>();
  for (const line of match[1].split("\n")) {
    const m = line.match(/^\s*--([\w-]+):\s*(#[0-9a-fA-F]{3,8}|[^;]+);/);
    if (m) vars.set(m[1], m[2].trim());
  }
  return vars;
}

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function contrast(fg: string, bg: string): number {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

function listTsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listTsxFiles(full));
    else if (entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

describe("theme token parity", () => {
  it("defines the same variables in :root and .dark", () => {
    const light = blockVars(":root");
    const dark = blockVars("\\.dark");
    expect([...dark.keys()].sort()).toEqual([...light.keys()].sort());
  });

  it("keeps --present and --absent strong values readable under white text in both modes", () => {
    for (const selector of [":root", "\\.dark"]) {
      const vars = blockVars(selector);
      expect(contrast(vars.get("present")!, "#ffffff")).toBeGreaterThanOrEqual(3);
      expect(contrast(vars.get("absent")!, "#ffffff")).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps ink readable in both modes", () => {
    const light = blockVars(":root");
    const dark = blockVars("\\.dark");
    expect(contrast(light.get("ink")!, light.get("background")!)).toBeGreaterThanOrEqual(7);
    expect(contrast(dark.get("ink")!, dark.get("background")!)).toBeGreaterThanOrEqual(7);
  });

  it("keeps inverse button text readable against its surface in both modes", () => {
    const light = blockVars(":root");
    const dark = blockVars("\\.dark");
    expect(contrast(light.get("inverse-text")!, light.get("ink")!)).toBeGreaterThanOrEqual(7);
    expect(contrast(dark.get("inverse-text")!, "#ffffff")).toBeGreaterThanOrEqual(7);
  });
});

describe("no amber leakage in components", () => {
  const appDir = join(repoRoot, "app");
  const libDir = join(repoRoot, "lib");
  const files = listTsxFiles(join(repoRoot, "components"))
    .filter((f) => !f.endsWith("logo.tsx"))
    .concat(listTsxFiles(appDir), listTsxFiles(libDir));

  it.each(files)("%s has no amber utility classes", (file) => {
    const content = readFileSync(file, "utf8");
    expect(content).not.toMatch(/amber-/);
  });

  it("keeps raw bg-white out of the light theme surfaces", () => {
    for (const file of listTsxFiles(join(repoRoot, "components")).concat(listTsxFiles(appDir))) {
      const content = readFileSync(file, "utf8");
      if (content.includes("bg-white")) {
        expect(content).toMatch(/dark:bg-[^\s"]+/);
      }
    }
  });
});
