const dateFmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function faDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

export function faNum(n: number): string {
  return n.toLocaleString("fa-IR");
}
