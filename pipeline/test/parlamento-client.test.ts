import { describe, expect, it } from 'vitest';
import { canonicalUrlFor, verifyCanonicalUrl } from '../src/parlamento-client.js';

function htmlResponse(body: string, ok = true, status = 200): Response {
  return { ok, status, text: async () => body } as Response;
}

describe('canonicalUrlFor', () => {
  it('builds the DetalheIniciativa URL from the openAR id', () => {
    expect(canonicalUrlFor(357094)).toBe(
      'https://www.parlamento.pt/ActividadeParlamentar/Paginas/DetalheIniciativa.aspx?BID=357094',
    );
  });
});

describe('verifyCanonicalUrl', () => {
  const iniciativa = { id: 357094, titulo: 'Recomenda ao Governo a preservação do património' };

  it('returns the URL when the titulo appears verbatim on the page', async () => {
    const fetchImpl = async () =>
      htmlResponse(`<html><body><h1>Recomenda ao Governo a preservação do património</h1></body></html>`);

    const result = await verifyCanonicalUrl(iniciativa, { fetchImpl });

    expect(result).toBe(
      'https://www.parlamento.pt/ActividadeParlamentar/Paginas/DetalheIniciativa.aspx?BID=357094',
    );
  });

  it('returns null when the page does not contain the titulo', async () => {
    const fetchImpl = async () => htmlResponse('<html><body>Something unrelated</body></html>');

    const result = await verifyCanonicalUrl(iniciativa, { fetchImpl });

    expect(result).toBeNull();
  });

  it('returns null on a non-ok response instead of guessing', async () => {
    const fetchImpl = async () => htmlResponse('Not Found', false, 404);

    const result = await verifyCanonicalUrl(iniciativa, { fetchImpl });

    expect(result).toBeNull();
  });

  it('matches titulo containing "&" against a page that HTML-escapes it as &amp;', async () => {
    const amp = { id: 1, titulo: 'Comércio & Indústria' };
    const fetchImpl = async () => htmlResponse('<h1>Comércio &amp; Indústria</h1>');

    const result = await verifyCanonicalUrl(amp, { fetchImpl });

    expect(result).not.toBeNull();
  });

  it('returns null instead of throwing on a network error', async () => {
    const fetchImpl = async () => {
      throw new TypeError('fetch failed');
    };

    const result = await verifyCanonicalUrl(iniciativa, { fetchImpl });

    expect(result).toBeNull();
  });
});
