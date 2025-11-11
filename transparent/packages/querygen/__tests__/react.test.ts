import { describe, expect, it } from 'vitest';
import { generateReactJsSyntax, generateReactJsxSyntax, generateReactRef } from '../react';

describe("React", () => {
  it("should generate the correct JS syntax class", () => {
    const dataObjectPattern = ["<nativeAttr>"];
    const result = generateReactJsSyntax(dataObjectPattern);
    expect(result).toMatchSnapshot();
  });
  it("should generate the correct JSX syntax class", () => {
    const dataObjectPattern = ["<nativeAttr>"];
    const result = generateReactJsxSyntax(dataObjectPattern);
    expect(result).toMatchSnapshot();
  });
  it("should generate the correct ref mechanism", () => {
    const result = generateReactRef(true, true);
    expect(result).toMatchSnapshot();
  });
});