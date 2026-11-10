import { describe, expect, it } from 'vitest';
import { quoteCsvCell } from './csv.js';

describe('quoteCsvCell', () => {
  it.each(['=1+1', '+1+1', '-1+1', '@SUM(A1:A2)', '  =1+1'])(
    'forces formula-like value %s to text',
    (value) => expect(quoteCsvCell(value)).toBe(`"'${value}"`),
  );

  it('escapes embedded quotes', () => {
    expect(quoteCsvCell('Candidate "One"')).toBe('"Candidate ""One"""');
  });
});
