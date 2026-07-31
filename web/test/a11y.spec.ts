import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Scoped to what backlog 4.5 actually asks for — WCAG 2.1 AA — not
// axe-core's broader best-practice ruleset, to avoid churn on things that
// aren't a numbered success criterion.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa'];

test.describe('accessibility', () => {
  test('methodology page has no WCAG 2.1 AA violations', async ({ page }) => {
    await page.goto('/methodology');

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });

  test('review page (signed out) has no WCAG 2.1 AA violations', async ({ page }) => {
    await page.goto('/review');
    await expect(page.locator('#signed-out')).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });

  test('digest homepage, including an expanded drill-down with a split coalition vote, has no WCAG 2.1 AA violations', async ({
    page,
  }) => {
    // A coalition (AD = PSD + CDS-PP) that split on a vote — the exact
    // scenario backlog 4.2 built to never merge into one fabricated
    // position — so the a11y scan covers the fully-rendered detail panel,
    // not just the empty page shell.
    await page.route('**/rest/v1/public_digest**', (route) =>
      route.fulfill({
        json: [
          {
            verdict_id: 1,
            iniciativa_id: 100,
            titulo: 'Recomenda ao Governo medidas de apoio à habitação',
            tipo_desc: 'Projeto de Resolução',
            canonical_url: 'https://parlamento.pt/x',
            party_label: 'AD',
            party_name: 'AD — Coligação PSD/CDS',
            topic: 'Habitação',
            label: 'aligned',
            week_start: '2026-07-27',
            reviewed_at: '2026-07-28T00:00:00Z',
            numero: '123/XVII',
            data_entrada: '2026-07-27',
            citation_page_number: 5,
            quoted_passage: 'Medidas para a habitação e arrendamento acessível.',
            rationale: 'A iniciativa concretiza a medida do programa.',
            program_source_url: 'https://ad2025.pt/pdf/programa-eleitoral.pdf',
            ar_siglas: ['PSD', 'CDS-PP'],
          },
        ],
      }),
    );
    await page.route('**/rest/v1/votacoes**', (route) =>
      route.fulfill({
        json: [
          {
            iniciativa_id: 100,
            votacao_id: '1',
            legislatura_id: 'XVII',
            data: '2026-07-30',
            resultado: 'Aprovado',
            unanime: false,
            reuniao: null,
            tipo_reuniao: null,
            descricao: 'Votação final global',
            a_favor: ['PSD'],
            contra: ['CDS-PP'],
            abstencao: [],
            ausencias: [],
          },
        ],
      }),
    );

    await page.goto('/');
    await page.getByRole('button', { name: 'Ver detalhe' }).click();
    await expect(page.getByText('PSD: A Favor')).toBeVisible();
    await expect(page.getByText('CDS-PP: Contra')).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });
});
