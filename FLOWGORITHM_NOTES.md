# Flowgorithm rules used by the judge

Verified against the Flowgorithm documentation (copy at intranet.cb.amrita.edu, "Flowgorithm documentation.pdf")
and against real `.fprg` files (MIT-licensed repos `andreaval/FlowgorithmJS` — file version 2.11, and
`aloukikjoshi/flowgorithm-practice-playground` — file version 3.0; copies in `tests/fixtures/`).

| Rule | Source | Judge behaviour | Test |
|---|---|---|---|
| Root `<flowgorithm fileversion>`, `<attributes>`, `<function name type variable>`, `<parameters>`, `<body>` | real files | parsed | `tests/judge.test.ts › real .fprg files` |
| Elements: `declare(name,type,array,size)`, `assign(variable,expression)`, `input(variable)`, `output(expression,newline)`, `if/then/else`, `while`, `do`, `for(variable,start,end,direction,step)`, `call(expression)`, `comment(text)`, `breakpoint` | real files (v3.0 has `direction`; v2.11 has none → treated as `inc`) | all supported, breakpoint ignored | statements tests |
| Operators and families: `= ==`, `<> !=`, `and &&`, `or \|\|`, `not !`, `mod %`, `^`, `&` | docs, Operators | all supported, keywords case-insensitive | precedence tests |
| Precedence: unary(− ! not) > ^ > * / mod > + − > & > relational > and > or | docs table | implemented exactly (so `-2 ^ 2 = 4`, `1 + 2 & 3 = "33"`) | precedence tests |
| "Division will always be high-precision (floating point)" | docs | `/` always returns Real: `7 / 2 = 3.5`, `10 / 2 = 5` (Real) | `integer division gives real` |
| "If a number with a fractional value is stored into an integer, the fractional value will be discarded (3.2 → 3)" | docs, Data types | Real → Integer assignment truncates | `real to integer truncates`, real file `reverse.fprg` relies on it |
| Intrinsic functions Abs, Arccos, Arcsin, Arctan, Char (0-based), Cos, Int, Len, Log, Log10, Random, Sgn, Sin, Size, Sqrt, Tan, ToChar, ToCode, ToFixed, ToInteger, ToReal, ToString | docs, Intrinsic functions | all implemented | intrinsic tests |
| Boolean constants `true` / `false` | docs | output text `true` / `false` | real file `leap_fn.fprg` |
| Function with return variable (`type="Boolean" variable="leap"`) | real file | supported, arrays by reference | `leap year function` |

## Not stated in the docs (my decisions, flagged)

- **How Real values are printed.** Not documented. The judge prints up to 15 significant digits and drops a
  trailing `.0` (`10 / 2` → `5`, `0.1 + 0.2` → `0.3`). The default checker (`numeric`) treats `5` and `5.0`
  as equal, so this can never cost a student points. No exam question depends on the format of a whole Real.
- **Using a variable before it has a value** gives a runtime error (Flowgorithm also stops with an error).
- **Variable names** are matched case-insensitively (lenient).
- **Input** reads one line per Input element (one value per line, like typing in the console).
- `Random(n)` is deterministic in the judge (fixed seed) so judging is reproducible.
