import { describe, expect, it } from 'vitest';
import { removeTypecast } from '../ts_utils';

describe('ts_utils', () => {
    it('should handle base case correctly', () => {
        const expr = `(x as any)`

        const result = removeTypecast(expr)
        expect(result).toBe('x');
    })

    it('should nest correctly', () => {
        const expr = `((domElement as any) as HTMLImageElement)`

        const result = removeTypecast(expr)
        expect(result).toBe('domElement');
    })

    it('should handle multiple typecasts', () => {
        const expr = `((domElement as any) as HTMLImageElement).src = (newProps as any).src;`


        const result = removeTypecast(expr)
        expect(result).toBe('domElement.src = newProps.src;');
    })
});