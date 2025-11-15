import { describe, expect, it } from 'vitest';
import { extrapolateMapping } from "../extrapolated-mapping";

describe("vue2", () => {
  // Based on `packages/compiler-sfc/test/compileTemplate.spec.ts`
  describe("SFC template", () => {
    it("should generate a extrapolated mapping { '<nativeAttr>' : 'vnode.data.attrs.<nativeAttr>' }", () => {
      const source = `
    <div>
      <img src="https://foo.com/logo.png">
    </div>
    `;
      const expectation = "data.attrs.src";
      const toBe = "https://foo.com/logo.png";
      const mapping = extrapolateMapping(source, expectation, toBe);
      expect(mapping).toEqual({
        "<nativeAttr>": "data.attrs.<nativeAttr>"
      });
    });
  });

  // Based on `test/test.js` in `babel-plugin-transform-vue-jsx` repo
  describe("JSX template", () => {
    it("should generate a extrapolated mapping { 'domProps<nativeProp>' : 'vnode.data.domProps.<nativeProp>' }", () => {
      const source = `
    <div>
      <input domPropsInnerHTML="<p>hi</p>" />
    </div>
    `;

      const expectation = "data.domProps.innerHTML";
      const toBe = "<p>hi</p>";
      const mapping = extrapolateMapping(source, expectation, toBe);
      expect(mapping).toEqual({
        "domProps<nativeProp>": "data.domProps.<nativeProp>"
      });
    })

    it("should generate a extrapolated mapping { 'domProps-<nativeProp>' : 'vnode.data.domProps.<nativeProp>' }", () => {
      const source = `
    <div>
      <input domProps-innerHTML="<p>hi</p>" />
    </div>
    `;

      const expectation = "data.domProps.innerHTML";
      const toBe = "<p>hi</p>";
      const mapping = extrapolateMapping(source, expectation, toBe);
      expect(mapping).toEqual({
        "domProps-<nativeProp>": "data.domProps.<nativeProp>"
      });
    })

    it("should generate a extrapolated mapping { 'attrs-<nativeAttr>' : 'vnode.data.attrs.<nativeAttr>' }", () => {
      const source = `
    <div>
      <input attrs-id="hehe" />
    </div>
    `;

      const expectation = "data.attrs.id";
      const toBe = "hehe";
      const mapping = extrapolateMapping(source, expectation, toBe);
      expect(mapping).toEqual({
        "attrs-<nativeAttr>": "data.attrs.<nativeAttr>"
      });
    })

    it("should generate a extrapolated mapping { '<nativeAttr>' : 'vnode.data.attrs.<nativeAttr>' }", () => {
      const source = `
    <div>
      <input id="hehe" />
    </div>
    `;

      const expectation = "data.attrs.id";
      const toBe = "hehe";
      const mapping = extrapolateMapping(source, expectation, toBe);
      expect(mapping).toEqual({
        "<nativeAttr>": "data.attrs.<nativeAttr>"
      });
    })
  });
});

describe("react", () => {
  // Based on `packages/babel-plugin-transform-react-jsx/test/fixtures/react/*` on `babel/babel` repo
  // `input.js` files are the JSX templates, and `output.js` files contain the render function patterns
  describe("JSX template", () => {
    // Based on `should-quote-jsx-attribute`
    // this includes `dangerouslySetInnerHTML` and `ref` test case, since they 
    // only differ on the element level instead of render function level.
    it("should generate a extrapolated mapping { '<nativeAttr>' : '<nativeAttr>' }", () => {
      const source = `<button data-value='a value'>Button</button>`;
      const expectation = "data-value";
      const toBe = "a value";
      const mapping = extrapolateMapping(source, expectation, toBe);
      expect(mapping).toEqual({
        "<nativeAttr>": "<nativeAttr>"
      });
    });
  });
});

describe("angular", () => {
  // Based on `packages/compiler-cli/test/ngtsc/template_mapping_spec.ts` on `angular/angular` repo
  describe("template", () => {
    // Based on binding expressions
    it("should generate a extrapolated mapping { 'bind-<nativeProp>' : 'i0.ɵɵproperty('<nativeProp>', ctx.name)' }", () => {
      const source = `<div bind-innerHTML='name'></div>`;
      const expectation = `i0.ɵɵproperty('innerHTML', ctx.name)`;
      const toBe = "name";
      const mapping = extrapolateMapping(source, expectation, toBe);
      expect(mapping).toEqual({
        "bind-<nativeProp>": "i0.ɵɵproperty('<nativeProp>', ctx.name)"
      });
    });
  });
});