// Helpers for reading <form> values with FormData
export function formData(event: Event) {
  return new FormData(event.target as HTMLFormElement);
}

export function text(fd: FormData, name: string): string {
  return String(fd.get(name) ?? "").trim();
}

export function textOrUndefined(fd: FormData, name: string): string | undefined {
  return text(fd, name) || undefined;
}

export function numberOrUndefined(fd: FormData, name: string): number | undefined {
  const s = text(fd, name);
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export function list(fd: FormData, name: string): string[] {
  return text(fd, name).split(",").map((s) => s.trim()).filter(Boolean);
}

export function capitalize(value?: string | null) {
  return value ? value[0].toUpperCase() + value.slice(1) : "";
}
