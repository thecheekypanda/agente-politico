// Temporary, one-off investigation script — NOT part of the pipeline.
// The rptFases_ctlNN_lblData/lblEvento/lblObs repeater only captures part
// of the real timeline (confirmed: it misses committee-level parecer/
// arrastamento events that the user's own research notes describe). This
// dumps the raw HTML context around each timeline keyword so the real
// markup for those extra events can be seen, instead of guessing another
// regex blind. Delete this file once that's done.
export {};

const bid = process.argv[2] ?? '315892';
const url = `https://www.parlamento.pt/ActividadeParlamentar/Paginas/DetalheIniciativa.aspx?BID=${bid}`;
const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
const html = await res.text();
console.log(`status: ${res.status}, length: ${html.length}`);

const keywords = [
  'arrastamento',
  'Baixa',
  'comiss',
  'Comiss',
  'parecer',
  'Parecer',
  'Votaç',
  'Eventos',
  'rptComissao',
  'rptColunas',
];

const CONTEXT = 200;

for (const kw of keywords) {
  const indices: number[] = [];
  let idx = html.indexOf(kw);
  while (idx !== -1 && indices.length < 5) {
    indices.push(idx);
    idx = html.indexOf(kw, idx + kw.length);
  }
  console.log(`\n=== "${kw}": ${indices.length} occurrence(s) (showing up to 5) ===`);
  for (const i of indices) {
    const start = Math.max(0, i - CONTEXT);
    const end = Math.min(html.length, i + kw.length + CONTEXT);
    const snippet = html.slice(start, end).replace(/\s+/g, ' ').trim();
    console.log(`  @${i}: ...${snippet}...`);
  }
}
