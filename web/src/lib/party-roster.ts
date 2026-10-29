// Mirrors pipeline/src/party-programs.ts's PARTY_PROGRAM_SOURCES — kept as
// a separate copy deliberately (the web app has no dependency on the
// pipeline package, same pattern review.ts/votes.ts already use). Rows come
// from the party_programs table rather than a hardcoded list here, so a
// party added/renamed at ingestion time is reflected without a web deploy.
export interface PartyProgramRow {
  label: string;
  partyName: string;
  arSiglas: string[];
}

export function rowToPartyProgram(row: Record<string, unknown>): PartyProgramRow {
  return {
    label: row.label as string,
    partyName: row.party_name as string,
    arSiglas: (row.ar_siglas as string[]) ?? [],
  };
}

// Flattens every tracked party's AR siglas into one list, for passing as
// renderVoteResult's arSiglas param when a page wants to show *all*
// parties' positions rather than just one. AD contributes both 'PSD' and
// 'CDS-PP' as separate entries — never merged into one — same rule
// documented in votes.ts and digest.ts.
export function flattenPartyRosterSiglas(programs: PartyProgramRow[]): string[] {
  return programs.flatMap((program) => program.arSiglas);
}
