import { toNumberOrDefault } from '../../../src/utils/number';

describe('Number utils', () => {
  describe('toNumberOrDefault', () => {
    describe('converts a string possibly containing a number to a number or the given default value', () => {
      const defaultValue = 10;
      test.each([
        // input, expected output
        ['0', 0],
        ['15', 15],
        ['10', 10],
        ['', 10],
        ['15notreallyanumber!', 10],
        ['definitelynotanumber', 10],
        ['-15', 10],
      ])('\'%s\' -> %d', (input, expectedOutput) => {
        const output = toNumberOrDefault(input, defaultValue);
        expect(output).toBe(expectedOutput);
      });
    });
  });
});
