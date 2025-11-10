import { describe, expect, it } from 'vitest';
import { generateVue2JsSyntax, generateVue2JsxSyntax, generateVue2Ref } from '../vue2';

describe("Vue 2", () => {
  it("should generate the correct JS syntax class", () => {
    const dataObjectPattern = ["attrs.<nativeAttr>", "domProps.<nativeProp>"];
    const result = generateVue2JsSyntax(dataObjectPattern);
    expect(result).toMatchSnapshot();
  });

  it("should generate the correct JSX syntax class", () => {
    const dataObjectPattern = ["attrs-<nativeAttr>", "domProps-<nativeProp>"];
    const result = generateVue2JsxSyntax(dataObjectPattern);
    expect(result).toMatchSnapshot();
  });

  it("should generate the correct ref mechanism", () => {
    const result = generateVue2Ref(true, true);
    expect(result).toMatchSnapshot();
  });

  // No SFC test since we reuse the standard library later
});