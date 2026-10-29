// Temporary, one-off investigation script — NOT part of the pipeline.
// Fetches a real DetalheIniciativa page and extracts the HTML around known
// timeline keywords, to design a scraper against the real markup instead
// of guessing. Delete this file once that's done.
export {};

const bid = process.argv[2] ?? '315892';
const url = `https://www.parlamento.pt/ActividadeParlamentar/Paginas/DetalheIniciativa.aspx?BID=${bid}`;
const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
const html = await res.text();
console.log(`status: ${res.status}, length: ${html.length}`);

const keywords = [
  'Entrada',
  'Admiss',
  'Baixa',
  'comiss',
  'Anúncio',
  'Anuncio',
  'arrastamento',
  'Votação',
  'Eventos',
  'eventos',
  'timeline',
];

for (const kw of keywords) {
  const idx = html.indexOf(kw);
  console.log(`\n--- first match for "${kw}": ${idx === -1 ? 'NOT FOUND' : `at ${idx}`} ---`);
  if (idx !== -1) {
    console.log(html.slice(Math.max(0, idx - 300), idx + 600));
  }
}
