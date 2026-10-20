import type { SupabaseClient } from '@supabase/supabase-js';
import type { VerdictLabel } from './verdict-labels.js';

export interface PendingVerdict {
  iniciativaId: number;
  titulo: string;
  tipoDesc: string;
  epigrafe: string | null;
  topic: string;
  partyLabel: string;
}

export interface VerdictInsert {
  iniciativaId: number;
  partyLabel: string;
  topic: string;
  label: VerdictLabel;
  citationPageNumber: number | null;
  quotedPassage: string | null;
  rationale: string | null;
  prompt: string | null;
}

export interface VerdictStore {
  findPendingPairs(partyLabels: string[]): Promise<PendingVerdict[]>;
  saveVerdict(row: VerdictInsert): Promise<void>;
}

// Comfortably covers a full legislature backfill across all parties in one
// run; after the first run this only ever selects newly tagged initiatives
// crossed with the fixed party roster. Same sizing rationale as
// topic-store.ts's SELECT_LIMIT.
const SELECT_LIMIT = 2000;

export class SupabaseVerdictStore implements VerdictStore {
  constructor(private readonly client: SupabaseClient) {}

  async findPendingPairs(partyLabels: string[]): Promise<PendingVerdict[]> {
    if (partyLabels.length === 0) {
      return [];
    }

    const { data, error } = await this.client.rpc('find_pending_verdicts', {
      p_party_labels: partyLabels,
      p_limit: SELECT_LIMIT,
    });
    if (error) {
      throw new Error(`Failed to find pending verdicts: ${error.message}`);
    }

    const rows = (data ?? []) as {
      iniciativa_id: number;
      titulo: string;
      tipo_desc: string;
      epigrafe: string | null;
      topic: string;
      party_label: string;
    }[];
    return rows.map((row) => ({
      iniciativaId: row.iniciativa_id,
      titulo: row.titulo,
      tipoDesc: row.tipo_desc,
      epigrafe: row.epigrafe,
      topic: row.topic,
      partyLabel: row.party_label,
    }));
  }

  async saveVerdict(row: VerdictInsert): Promise<void> {
    const { error } = await this.client.from('verdicts').upsert(
      {
        iniciativa_id: row.iniciativaId,
        party_label: row.partyLabel,
        topic: row.topic,
        label: row.label,
        citation_page_number: row.citationPageNumber,
        quoted_passage: row.quotedPassage,
        rationale: row.rationale,
        prompt: row.prompt,
      },
      { onConflict: 'iniciativa_id,party_label' },
    );
    if (error) {
      throw new Error(
        `Failed to save verdict for iniciativa ${row.iniciativaId}/${row.partyLabel}: ${error.message}`,
      );
    }
  }
}
