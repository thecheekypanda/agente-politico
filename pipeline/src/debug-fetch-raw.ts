// Temporary, one-off investigation script — NOT part of the pipeline.
// Fetches a real DetalheIniciativa page and extracts every rptFases phase
// (date + event title + optional obs), in order, to design a scraper
// against the real markup instead of guessing. Delete this file once
// that's done.
export {};

const bid = process.argv[2] ?? '315892';
const url = `https://www.parlamento.pt/ActividadeParlamentar/Paginas/DetalheIniciativa.aspx?BID=${bid}`;
const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
const html = await res.text();
console.log(`status: ${res.status}, length: ${html.length}`);

const dataRe = /rptFases_ctl(\d+)_lblData" class="TextoRegular">([^<]*)</g;
const eventoRe = /rptFases_ctl(\d+)_lblEvento" class="TextoRegular-Titulo">([^<]*)</g;
const obsRe = /rptFases_ctl(\d+)_lblObs" class="TextoRegular">([^<]*(?:<b>[^<]*<\/b>[^<]*)?)</g;

const dates = new Map<string, string>();
const eventos = new Map<string, string>();
const obs = new Map<string, string>();

for (const m of html.matchAll(dataRe)) dates.set(m[1], m[2].trim());
for (const m of html.matchAll(eventoRe)) eventos.set(m[1], m[2].trim());
for (const m of html.matchAll(obsRe)) obs.set(m[1], m[2].trim());

const allCtl = [...new Set([...dates.keys(), ...eventos.keys()])].sort((a, b) => Number(a) - Number(b));
console.log(`\nfound ${allCtl.length} phases:`);
for (const ctl of allCtl) {
  console.log(`  ctl${ctl}: ${dates.get(ctl) ?? '(no date)'} — ${eventos.get(ctl) ?? '(no evento)'}${obs.has(ctl) ? ` [obs: ${obs.get(ctl)}]` : ''}`);
}
