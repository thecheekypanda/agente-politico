// Temporary, one-off investigation script — NOT part of the pipeline.
// Fetches a single iniciativa's raw (unparsed) openAR detail response so we
// can see fields IniciativaSchema currently drops (e.g. `eventos`), to
// design a timeline feature against the real shape instead of guessing.
// Delete this file once that's done.
export {};

const id = process.argv[2] ?? '356479';
const res = await fetch(`https://api.openar.pt/v1/iniciativas/${id}`, {
  headers: { Accept: 'application/json' },
});
const body = await res.json();
console.log(`status: ${res.status}`);
console.log('top-level keys:', Object.keys(body));
console.log(JSON.stringify(body, null, 2));
