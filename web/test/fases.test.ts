import { describe, expect, it } from 'vitest';
import { rowToFase } from '../src/lib/fases';

describe('rowToFase', () => {
  it('maps a full row, including the nested parecer detail', () => {
    const fase = rowToFase({
      iniciativa_id: 315892,
      ctl_index: 2,
      data: '2026-01-06',
      evento: 'Baixa comissão distribuição inicial generalidade',
      obs: 'Conexão à 11.ª Comissão',
      parecer_nao_emitido_data: '2026-01-07',
      parecer_nao_emitido_motivo:
        'Impossibilidade de emissão de relatório em tempo, por pedido de agendamento por arrastamento, da discussão na generalidade para a reunião plenária de 7/1',
    });

    expect(fase).toEqual({
      ctl_index: 2,
      data: '2026-01-06',
      evento: 'Baixa comissão distribuição inicial generalidade',
      obs: 'Conexão à 11.ª Comissão',
      parecer_nao_emitido_data: '2026-01-07',
      parecer_nao_emitido_motivo:
        'Impossibilidade de emissão de relatório em tempo, por pedido de agendamento por arrastamento, da discussão na generalidade para a reunião plenária de 7/1',
    });
  });

  it('defaults optional fields to null when absent', () => {
    const fase = rowToFase({
      iniciativa_id: 356479,
      ctl_index: 0,
      data: '2026-03-31',
      evento: 'Entrada',
    });

    expect(fase.obs).toBeNull();
    expect(fase.parecer_nao_emitido_data).toBeNull();
    expect(fase.parecer_nao_emitido_motivo).toBeNull();
  });
});
