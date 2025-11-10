import { describe, expect, it } from 'vitest';
import { concreteMapping } from '../concrete-mapping';

describe("vue2", () => {
  describe("SFC template", () => {
    it("should generate a concrete mapping { 'ref' : 'vnode.data.ref' }", () => {
      const source = `<template><div ref="myRef"></div></template>`;
      const expectation = "vnode.data.ref";
      const toBe = "myRef";
      const result = concreteMapping(source, expectation, toBe);
      expect(result).toEqual({ "ref": "vnode.data.ref" });
    });

    it("should generate a concrete mapping { 'v-html' : 'vnode.data.domProps.innerHTML' }", () => {
      const source = `<template><div v-html="<p>hi</p>"></div></template>`;
      const expectation = "vnode.data.domProps.innerHTML";
      const toBe = "<p>hi</p>";
      const result = concreteMapping(source, expectation, toBe);
      expect(result).toEqual({ "v-html": "vnode.data.domProps.innerHTML" });
    });
  });
  
  describe("JSX template", () => {
    it("should generate a concrete mapping { 'ref' : 'vnode.data.ref' }", () => {
      const source = `<div ref="myRef"></div>`;
      const expectation = "vnode.data.ref";
      const toBe = "myRef";
      const result = concreteMapping(source, expectation, toBe);
      expect(result).toEqual({ "ref": "vnode.data.ref" });
    });
  });
});

// React has no concrete mapping, since they're handled at the Javascript level

// Angular has no concrete mapping

