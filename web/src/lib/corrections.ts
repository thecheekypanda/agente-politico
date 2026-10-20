export interface CorrectionInsert {
  verdict_id: number | null;
  reference_note: string;
  description: string;
  submitter_email: string | null;
}

export interface CorrectionRequest {
  id: number;
  verdictId: number | null;
  referenceNote: string;
  description: string;
  status: 'pending' | 'resolved' | 'rejected';
  resolutionNotes: string | null;
  submittedAt: string;
  resolvedAt: string | null;
}

export function buildCorrectionInsert(
  referenceNote: string,
  description: string,
  submitterEmail: string,
  verdictId: number | null = null,
): CorrectionInsert {
  const trimmedReference = referenceNote.trim();
  const trimmedDescription = description.trim();
  if (trimmedReference === '') {
    throw new Error('É necessário indicar a que item se refere o pedido.');
  }
  if (trimmedDescription === '') {
    throw new Error('É necessário descrever o problema.');
  }

  const trimmedEmail = submitterEmail.trim();
  return {
    verdict_id: verdictId,
    reference_note: trimmedReference,
    description: trimmedDescription,
    submitter_email: trimmedEmail === '' ? null : trimmedEmail,
  };
}

export function rowToCorrectionRequest(row: Record<string, unknown>): CorrectionRequest {
  return {
    id: row.id as number,
    verdictId: (row.verdict_id as number | null) ?? null,
    referenceNote: row.reference_note as string,
    description: row.description as string,
    status: row.status as CorrectionRequest['status'],
    resolutionNotes: (row.resolution_notes as string | null) ?? null,
    submittedAt: row.submitted_at as string,
    resolvedAt: (row.resolved_at as string | null) ?? null,
  };
}
