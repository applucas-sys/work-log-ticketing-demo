export const M = 60_000;
export const H = 3_600_000;
export const D = 86_400_000;

const nf = new Intl.NumberFormat("id-ID");

export const rp = (n: number) => "Rp " + nf.format(Math.round(n || 0));
export const formatNumber = (n: number) => nf.format(n);

export function ago(t: number, now: number): string {
  const d = now - t;
  if (d < M) return "baru saja";
  if (d < H) return Math.round(d / M) + " mnt lalu";
  if (d < D) return Math.round(d / H) + " jam lalu";
  return Math.round(d / D) + " hari lalu";
}

export function dur(ms: number): string {
  ms = Math.abs(ms);
  if (ms < H) return Math.max(1, Math.round(ms / M)) + " mnt";
  if (ms < D) {
    const t = Math.round(ms / M);
    const h = Math.floor(t / 60);
    const m = t % 60;
    return h + "j" + (m ? " " + m + "m" : "");
  }
  const th = Math.round(ms / H);
  const d = Math.floor(th / 24);
  const h = th % 24;
  return d + " hari" + (h ? " " + h + "j" : "");
}

export const fmtDateTime = (t: number) =>
  new Date(t).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });
