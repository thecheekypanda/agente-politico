import { describe, expect, it } from 'vitest';
import { formatDate } from '../src/lib/format';

describe('formatDate', () => {
  it('formats an ISO date as pt-PT day/month/year', () => {
    expect(formatDate('2026-07-15')).toBe('15/07/2026');
  });
});
