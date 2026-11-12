// Helper for e2e: judge a .fprg against samples + hidden tests with visible outputs; prints {passed,total}.
import { readFileSync } from "node:fs";
import { judgeSource } from "../src/judge";

const [, , file, testsFile] = process.argv;
const src = readFileSync(file, "utf8");
const t = JSON.parse(readFileSync(testsFile, "utf8"));
const res = judgeSource(src, [...t.samples, ...t.tests], "numeric");
console.log(JSON.stringify({ passed: res.filter((r) => r.verdict === "AC").length, total: res.length, verdicts: res.map((r) => r.verdict) }));
