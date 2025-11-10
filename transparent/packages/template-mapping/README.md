# Vue
- Two HTML-like syntax -> SFC (Single File Component) and JSX
- SFC compiler architecture:
  - Core compilation is located in `src/compiler/index.ts`, resulting in `CompiledResult` object, which contains the string (or function) of the JS-syntax render function
    - Compilation logic `baseCompile()` is wrapped in `createCompilerCreator()`
    - Depends on two functions -> `parse` and `generate`
    - `CompiledResult` type is defined many times, but -> `src/types/compiler.ts`
  - `createCompilerCreator` is called in platforms `src/platforms/web/compiler`
  - Web compiler is used in many parts, depending on the context 
    - Global API, but only have one test cases -> `test/unit/features/global-api/compile.spec.ts`
    - Server renderer -> optimization
    - Pre-compilation -> `packages/compiler-sfc` -> `compileTemplate`


## Test Cases
- SFC -> located on `vue` main repository
  - nativeAttr -> `packages/compiler-sfc/test/compileTemplate.spec.ts`
    - VNode attrs -> extrapolated
  - `v-html` -> `unit/features/directives/html.spec.ts`
    - Uses `vm.$el` instead of `domProps`