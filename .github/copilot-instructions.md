Code review instructions:

- All code (names, comments, etc.) must be written in English. Proofread for possible typos.
- Code must be clean, idiomatic and consistent with the existing codebase and language conventions.
- Code must be self-documenting. Comments that restate what the code already expresses are not allowed. Names (types, functions, variables, constants) must be descriptive and specific.
    - Verbs for functions (`parseUser`, `calculateTotal`).
    - Nouns for values (`userId`, `invoiceTotal`).
    - Booleans read as predicates (`isReady`, `hasAccess`).
- Functions should be small, single-purpose and with a clear control flow. The ideal nesting level is 2 or at most 3 if needed for clarity. The maximum number of function arguments is 3, or 4 if absolutely required.
- Comments are allowed only when explaining a non-obvious design decision or trade-off. Comments documenting public APIs (docstrings and similar) are allowed but not required nor encouraged.
- Disallow modifications to the project dependencies.
- Clarity, correctness, and maintainability is preferred over cleverness or micro-optimizations.
- In your code review comments, use `inline code formatting` to refer to code elements. For example: `SomeClass<String>` or `@Annotation`.
