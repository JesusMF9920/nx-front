export const fmtMXN = (n: number): string =>
  "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtInt = (n: number): string => n.toLocaleString("es-MX");

export const fmtDate = (d: Date | string | number): string =>
  new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });

export const fmtDateLong = (d: Date | string | number): string =>
  new Date(d).toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "long" });
