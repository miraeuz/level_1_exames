import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseFprg, run, compareOutput, canonical, sha256 } from "../src/judge";
import { judgeSource } from "../src/judge";
import { toFprg, D, A, I, O, IF, W, F } from "../src/judge/build";
import { parseExpr } from "../src/judge/expr";
import { parseXml } from "../src/judge/xml";

const fx = (n: string) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), "utf8");
const exec = (b: Parameters<typeof toFprg>[0], stdin = "") => run(parseFprg(toFprg(b)), stdin);
const outOf = (b: Parameters<typeof toFprg>[0], stdin = "") => exec(b, stdin).output;
const ev = (expr: string, decl: Parameters<typeof toFprg>[0] = []) => outOf([...decl, O(expr)]).trim();

describe("XML", () => {
  it("parses attributes and entities", () => {
    const n = parseXml(`<?xml version="1.0"?><a x="1 &lt; 2 &amp;&amp; &quot;q&quot;"><b/></a>`);
    expect(n.attrs.x).toBe('1 < 2 && "q"');
    expect(n.children[0].name).toBe("b");
  });
  it("rejects broken xml", () => expect(() => parseXml("<a><b></a>")).toThrow());
  it("handles comments and BOM", () => expect(parseXml("﻿<!-- c --><a/>").name).toBe("a"));
});

describe("expressions & precedence", () => {
  it("multiplication before addition", () => expect(ev("2 + 3 * 4")).toBe("14"));
  it("parentheses", () => expect(ev("(2 + 3) * 4")).toBe("20"));
  it("integer division gives real", () => expect(ev("7 / 2")).toBe("3.5"));
  it("whole real prints without .0", () => expect(ev("10 / 2")).toBe("5"));
  it("mod keyword", () => expect(ev("17 mod 5")).toBe("2"));
  it("% operator", () => expect(ev("17 % 5")).toBe("2"));
  it("negative mod keeps sign of dividend", () => expect(ev("-7 mod 3")).toBe("-1"));
  it("power is right associative", () => expect(ev("2 ^ 3 ^ 2")).toBe("512"));
  it("unary minus binds tighter than ^", () => expect(ev("-2 ^ 2")).toBe("4"));
  it("concatenation with numbers", () => expect(ev('"Natija: " & 5 + 3')).toBe("Natija: 8"));
  it("& lower than +", () => expect(ev('1 + 2 & 3')).toBe("33"));
  it("relational = and ==", () => expect(ev("3 = 3") + ev("3 == 4")).toBe("truefalse"));
  it("<> and !=", () => expect(ev("3 <> 4") + ev("3 != 3")).toBe("truefalse"));
  it("and / && / or / || / not / !", () =>
    expect([ev("true and false"), ev("true && true"), ev("false or true"), ev("false || false"), ev("not true"), ev("!false")].join(",")).toBe(
      "false,true,true,false,false,true",
    ));
  it("and binds tighter than or", () => expect(ev("true or false and false")).toBe("true"));
  it("short circuit avoids division by zero", () => expect(ev("false and 1 / 0 > 1")).toBe("false"));
  it("comparison of strings", () => expect(ev('"abc" < "abd"')).toBe("true"));
  it("real arithmetic precision", () => expect(ev("0.1 + 0.2")).toBe("0.3"));
  it("string + string", () => expect(ev('"a" + "b"')).toBe("ab"));
  it("keywords are case-insensitive", () => expect(ev("7 MOD 4")).toBe("3"));
  it("parse error reported", () => expect(() => parseExpr("2 +")).toThrow());
  it("unknown char", () => expect(() => parseExpr("2 $ 3")).toThrow());
});

describe("intrinsic functions", () => {
  const cases: [string, string][] = [
    ["Abs(-5)", "5"],
    ["Abs(-2.5)", "2.5"],
    ["Int(3.9)", "3"],
    ["Int(-3.9)", "-3"],
    ["Sqrt(16)", "4"],
    ["Sgn(-7)", "-1"],
    ["Len(\"salom\")", "5"],
    ["Char(\"salom\", 1)", "a"],
    ["ToCode(\"A\")", "65"],
    ["ToChar(66)", "B"],
    ["ToFixed(3.14159, 2)", "3.14"],
    ["ToInteger(\"42\") + 1", "43"],
    ["ToReal(\"2.5\") * 2", "5"],
    ["ToString(12) & \"!\"", "12!"],
    ["Log10(1000)", "3"],
    ["Log(1)", "0"],
    ["Cos(0)", "1"],
    ["Sin(0)", "0"],
    ["Tan(0)", "0"],
    ["Arctan(0)", "0"],
    ["Arcsin(0)", "0"],
    ["Arccos(1)", "0"],
  ];
  for (const [e, r] of cases) it(e, () => expect(ev(e)).toBe(r));
  it("Random is in range", () => {
    const v = Number(ev("Random(10)"));
    expect(v >= 0 && v < 10).toBe(true);
  });
  it("Size of array", () => expect(outOf([{ k: "declare", names: "a", type: "Integer", array: true, size: "7" }, O("Size(a)")]).trim()).toBe("7"));
});

describe("statements", () => {
  it("declare + assign + output", () => expect(outOf([D("a"), A("a", "5"), O("a * 2")])).toBe("10\n"));
  it("output without newline", () => expect(outOf([O('"a"', false), O('"b"')])).toBe("ab\n"));
  it("input integer", () => expect(outOf([D("a"), I("a"), O("a + 1")], "41\n")).toBe("42\n"));
  it("input real", () => expect(outOf([D("x", "Real"), I("x"), O("x * 2")], "1.25")).toBe("2.5\n"));
  it("input string keeps spaces", () => expect(outOf([D("s", "String"), I("s"), O('"[" & s & "]"')], "Ali Valiyev")).toBe("[Ali Valiyev]\n"));
  it("input boolean", () => expect(outOf([D("b", "Boolean"), I("b"), O("not b")], "true")).toBe("false\n"));
  it("real to integer truncates", () => expect(outOf([D("a"), A("a", "17 / 5"), O("a")])).toBe("3\n"));
  it("integer to real", () => expect(outOf([D("x", "Real"), A("x", "3"), O("x / 2")])).toBe("1.5\n"));
  it("if then", () => expect(outOf([D("a"), A("a", "7"), IF("a > 5", [O('"katta"')], [O('"kichik"')])])).toBe("katta\n"));
  it("if else", () => expect(outOf([D("a"), A("a", "3"), IF("a > 5", [O('"katta"')], [O('"kichik"')])])).toBe("kichik\n"));
  it("nested if", () =>
    expect(outOf([D("a"), A("a", "0"), IF("a > 0", [O('"+"')], [IF("a < 0", [O('"-"')], [O('"0"')])])])).toBe("0\n"));
  it("for inc", () => expect(outOf([D("i"), F("i", "1", "4", [O("i", false)])])).toBe("1234"));
  it("for dec", () => expect(outOf([D("i"), F("i", "5", "1", [O("i", false)], { dec: true })])).toBe("54321"));
  it("for step 2", () => expect(outOf([D("i"), F("i", "1", "9", [O("i", false)], { step: "2" })])).toBe("13579"));
  it("for that never runs", () => expect(outOf([D("i"), F("i", "5", "1", [O("i")]), O('"tugadi"')])).toBe("tugadi\n"));
  it("for variable after loop", () => expect(outOf([D("i"), F("i", "1", "3", []), O("i")])).toBe("3\n"));
  it("nested for", () => expect(outOf([D("i, j"), F("i", "1", "2", [F("j", "1", "3", [O("i * j", false)]), O('""')])])).toBe("123\n246\n"));
  it("while", () => expect(outOf([D("n"), A("n", "1"), W("n < 100", [A("n", "n * 3")]), O("n")])).toBe("243\n"));
  it("array assign / read", () =>
    expect(outOf([{ k: "declare", names: "a", type: "Integer", array: true, size: "3" }, A("a[0]", "4"), A("a[2]", "a[0] * 2"), O("a[2]")])).toBe("8\n"));
  it("do loop from real file element", () => {
    const src = `<?xml version="1.0"?><flowgorithm fileversion="3.0"><function name="Main" type="None" variable=""><parameters/><body>
      <declare name="n" type="Integer" array="False" size=""/><assign variable="n" expression="0"/>
      <do expression="n &lt; 3"><assign variable="n" expression="n+1"/></do><output expression="n" newline="True"/>
      <comment text="izoh"/><breakpoint expression="" always="True"/></body></function></flowgorithm>`;
    expect(run(parseFprg(src), "").output).toBe("3\n");
  });
  it("user function with return value and call statement", () => {
    const src = `<?xml version="1.0"?><flowgorithm fileversion="3.0">
      <function name="Main" type="None" variable=""><parameters/><body>
        <declare name="x" type="Integer" array="False" size=""/>
        <assign variable="x" expression="Kvadrat(7)"/><output expression="x" newline="True"/>
        <call expression="Salom(&quot;Ali&quot;)"/></body></function>
      <function name="Kvadrat" type="Integer" variable="r"><parameters><parameter name="a" type="Integer" array="False"/></parameters><body>
        <declare name="r" type="Integer" array="False" size=""/><assign variable="r" expression="a*a"/></body></function>
      <function name="Salom" type="None" variable=""><parameters><parameter name="s" type="String" array="False"/></parameters><body>
        <output expression="&quot;Salom, &quot; &amp; s" newline="True"/></body></function>
      </flowgorithm>`;
    expect(run(parseFprg(src), "").output).toBe("49\nSalom, Ali\n");
  });
});

describe("runtime errors and limits", () => {
  it("undeclared variable", () => expect(exec([A("x", "1")]).status).toBe("RE"));
  it("uninitialised variable", () => expect(exec([D("x"), O("x")]).status).toBe("RE"));
  it("division by zero", () => expect(exec([D("x"), A("x", "0"), O("5 / x")]).status).toBe("RE"));
  it("mod by zero", () => expect(exec([O("5 mod 0")]).status).toBe("RE"));
  it("type mismatch string into integer", () => expect(exec([D("x"), A("x", '"a"')]).status).toBe("RE"));
  it("non-integer input for Integer", () => expect(exec([D("x"), I("x")], "3.5").status).toBe("RE"));
  it("reading past end of input", () => expect(exec([D("x"), I("x"), I("x")], "1").status).toBe("RE"));
  it("array out of range", () => expect(exec([{ k: "declare", names: "a", type: "Integer", array: true, size: "2" }, A("a[2]", "1")]).status).toBe("RE"));
  it("if with non-boolean condition", () => expect(exec([IF("5", [O("1")])]).status).toBe("RE"));
  it("infinite loop gives TLE", () => expect(exec([D("i"), A("i", "0"), W("i >= 0", [A("i", "i + 1")])]).status).toBe("TLE"));
  it("error message names the shape", () => expect(exec([D("x"), O("x")]).error).toMatch(/Output/));
  it("non-flowgorithm xml is rejected", () => expect(() => parseFprg("<html></html>")).toThrow());
  it("missing Main", () => expect(() => parseFprg('<flowgorithm fileversion="3.0"></flowgorithm>')).toThrow());
});

describe("output comparison", () => {
  it("ignores trailing spaces and blank lines", () => expect(compareOutput("5 \n\n", "5").ok).toBe(true));
  it("numeric checker accepts 5 vs 5.0", () => expect(compareOutput("5.0", "5").ok).toBe(true));
  it("reports first differing line", () => expect(compareOutput("1\n2\n4", "1\n2\n3").line).toBe(3));
  it("exact checker is strict", () => expect(compareOutput("a  b", "a b", "exact").ok).toBe(false));
  it("canonical hash equality", () => expect(sha256(canonical("5.0 \n"))).toBe(sha256(canonical("5"))));
  it("sha256 known vector", () => expect(sha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"));
  it("judge verdicts", () => {
    const src = toFprg([D("a, b"), I("a"), I("b"), O("a + b")]);
    const r = judgeSource(src, [{ input: "2\n3", output: "5" }, { input: "1\n1", output: "3" }, { input: "1", output: "1" }]);
    expect(r.map((x) => x.verdict)).toEqual(["AC", "WA", "RE"]);
    expect(judgeSource("not xml", [{ input: "", output: "" }])[0].verdict).toBe("PE");
  });
});

describe("real .fprg files", () => {
  it("factorial (while, v3.0)", () => expect(run(parseFprg(fx("factorial.fprg")), "5").output).toBe("Enter n\n120\n"));
  it("reverse number (integer truncation)", () =>
    expect(run(parseFprg(fx("reverse.fprg")), "1234").output).toBe("Enter the number to be reverse.\nThe reverse of the number is 4321\n"));
  it("multiplication table (for)", () => {
    const o = run(parseFprg(fx("multable.fprg")), "3").output.split("\n");
    expect(o[0]).toBe("Multiplication table of 3 is");
    expect(o[10]).toBe("3x10=30");
  });
  it("leap year function returning Boolean", () => {
    expect(run(parseFprg(fx("leap_fn.fprg")), "1900").output).toBe("false\n");
    expect(run(parseFprg(fx("leap_fn.fprg")), "2024").output).toBe("true\n");
  });
  it("odd sum with step 2", () =>
    expect(run(parseFprg(fx("oddsum.fprg")), "10").output).toBe("Enter the size of numbers to find the sum.\nFirst five odd natural numbers are\n1\n3\n5\n7\n9\nThe sum is 25\n"));
  it("gcd (while + if)", () => expect(run(parseFprg(fx("gcd.fprg")), "12\n18").output).toBe("Enter the two numbers.\nThe GCD of given two numbers is 6\n"));
  it("max of 3 (file version 2.11, Real)", () => expect(run(parseFprg(fx("max3_v211.fprg")), "3\n9.5\n2").output).toBe("9.5\n"));
});
