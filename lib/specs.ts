export function parseSpecs(raw: string): Record<string, string> {
  const specs: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;
    const label = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (label && value) specs[label] = value;
  }
  return specs;
}

export function specsToText(specs: Record<string, string> | undefined | null): string {
  if (!specs) return "";
  return Object.entries(specs)
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
}
