import { describe, expect, it } from 'vitest';
import { generateAngularRef } from '../angular';

describe('Angular Reference Generation', () => {
  it('should generate the correct Angular reference sink', () => {
    const result = generateAngularRef();
    expect(result).toMatchSnapshot();
  });
});