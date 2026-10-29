import { describe, expect, it } from 'vitest';
import { flattenPartyRosterSiglas, rowToPartyProgram } from '../src/lib/party-roster';

describe('rowToPartyProgram', () => {
  it('maps a snake_case DB row to the camelCase shape', () => {
    const row = {
      label: 'AD',
      party_name: 'AD — Coligação PSD/CDS',
      ar_siglas: ['PSD', 'CDS-PP'],
    };

    expect(rowToPartyProgram(row)).toEqual({
      label: 'AD',
      partyName: 'AD — Coligação PSD/CDS',
      arSiglas: ['PSD', 'CDS-PP'],
    });
  });

  it('defaults a missing ar_siglas to an empty array', () => {
    const row = { label: 'PS', party_name: 'Partido Socialista' };
    expect(rowToPartyProgram(row).arSiglas).toEqual([]);
  });
});

describe('flattenPartyRosterSiglas', () => {
  it('flattens every party\'s siglas into one list, keeping a coalition\'s siglas separate', () => {
    const programs = [
      { label: 'PS', partyName: 'Partido Socialista', arSiglas: ['PS'] },
      { label: 'AD', partyName: 'AD — Coligação PSD/CDS', arSiglas: ['PSD', 'CDS-PP'] },
      { label: 'CH', partyName: 'Chega', arSiglas: ['CH'] },
    ];

    expect(flattenPartyRosterSiglas(programs)).toEqual(['PS', 'PSD', 'CDS-PP', 'CH']);
  });
});
