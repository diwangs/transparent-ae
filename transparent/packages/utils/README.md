# CodeQL JS binding
This is a library to instrument CodeQL through JS (and TS).
Not to be confused with CodeQL's JS qlpack, which is how to analyze JS (and TS) using CodeQL.

Features:
- Execute a query against a certain database, stdlib, and qlpack
- Parse result (both for `problem` and `path-problem`) as a JavaScript object
    - For `path-queries`, Microsoft had a [SARIF JS SDK](https://github.com/microsoft/sarif-js-sdk) but it looks unmaintained and the current version only cares about linting and schema enforcement.
- Simple macro processor of CodeQL query with double-mustache syntax
- Parse CodeQL's location object as a TS type