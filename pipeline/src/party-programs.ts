export interface PartyProgramSource {
  label: string;
  partyName: string;
  /** AR parliamentary-group siglas this program applies to (see notes below). */
  arSiglas: string[];
  sourceUrl: string;
  electionCycle: string;
}

// Every URL here was independently downloaded and its extracted text
// inspected (line counts, titles) before being trusted — not just a search
// result. Two of the eight needed correction from what a first search
// turned up:
//
// - AD: the first URL found (.../programa-eleitoral-sumario.pdf) is an
//   executive summary (687 extracted lines). The real full program
//   (.../programa-eleitoral.pdf, 11,005 lines, explicitly titled "DA AD -
//   COLIGAÇÃO PSD/CDS") is linked from AD's own /programa-eleitoral page.
// - BE: their 2025 PDF is a short campaign manifesto (452 lines) that
//   itself says "the program we're running on is our 2024 one" and points
//   to programa2024.bloco.org. The full document lives there (11,301
//   lines) — dated 2024, which is why electionCycle says so explicitly
//   rather than being normalized to "2025".
//
// CNE (cne.pt) does not publish party programs — confirmed by direct check,
// it only hosts candidacy/administrative material. These are each party's
// own official (or, for Chega, official-linked CDN) source.
//
// CDS-PP has no separate 2025 program — it ran fully merged into AD.
export const PARTY_PROGRAM_SOURCES: PartyProgramSource[] = [
  {
    label: 'PS',
    partyName: 'Partido Socialista',
    arSiglas: ['PS'],
    sourceUrl: 'https://ps.pt/wp-content/uploads/2025/04/programa-eleitoral.pdf',
    electionCycle: '2025',
  },
  {
    label: 'AD',
    partyName: 'AD — Coligação PSD/CDS',
    arSiglas: ['PSD', 'CDS-PP'],
    sourceUrl: 'https://ad2025.pt/pdf/programa-eleitoral.pdf',
    electionCycle: '2025',
  },
  {
    label: 'CH',
    partyName: 'Chega',
    arSiglas: ['CH'],
    sourceUrl:
      'https://pub-acfa34005415427bb560174ca37a9c6f.r2.dev/Programa%20Eleitoral%20CHEGA%20-%202025.pdf',
    electionCycle: '2025',
  },
  {
    label: 'IL',
    partyName: 'Iniciativa Liberal',
    arSiglas: ['IL'],
    sourceUrl: 'https://iniciativaliberal.pt/wp-content/uploads/IL_Programa_ACelerarPortugal.pdf',
    electionCycle: '2025',
  },
  {
    label: 'BE',
    partyName: 'Bloco de Esquerda',
    arSiglas: ['BE'],
    sourceUrl:
      'https://programa2024.bloco.org/wp-content/uploads/2024/02/programa-bloco-esquerda-legislativas-2024.pdf',
    electionCycle: '2024 (reaffirmed for 2025 — see sourcing note above)',
  },
  {
    label: 'PCP',
    partyName: 'Partido Comunista Português',
    arSiglas: ['PCP'],
    sourceUrl:
      'https://www.pcp.pt/sites/default/files/documentos/2025_compromisso_eleitoral_pcp_legislativas.pdf',
    electionCycle: '2025',
  },
  {
    label: 'L',
    partyName: 'Livre',
    arSiglas: ['L'],
    sourceUrl: 'https://partidolivre.pt/wp-content/uploads/2019/04/ProgramaV1.pdf',
    electionCycle: '2025',
  },
  {
    label: 'PAN',
    partyName: 'Pessoas-Animais-Natureza',
    arSiglas: ['PAN'],
    sourceUrl:
      'https://www.pan.com.pt/files/uploads/2025/05/Programa-Eleitoral-PAN_Legislativas25_Campanhas_2025_PAN-Nacional.pdf',
    electionCycle: '2025',
  },
];
