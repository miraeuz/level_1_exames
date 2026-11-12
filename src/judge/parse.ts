import { parseXml, XNode, XmlError } from "./xml";
import type { FFunction, FType, Program, Stmt } from "./ast";

export class FprgError extends Error {}

const TYPES: Record<string, FType> = {
  integer: "Integer",
  real: "Real",
  string: "String",
  boolean: "Boolean",
};

function ftype(s: string | undefined, where: string): FType {
  const t = TYPES[(s ?? "").trim().toLowerCase()];
  if (!t) throw new FprgError(`${where}: noma’lum ma’lumot turi «${s ?? ""}»`);
  return t;
}

export function parseFprg(src: string): Program {
  let root: XNode;
  try {
    root = parseXml(src);
  } catch (e) {
    throw new FprgError("Fayl XML sifatida o‘qilmadi: " + (e instanceof XmlError ? e.message : String(e)));
  }
  if (root.name !== "flowgorithm") throw new FprgError("Bu Flowgorithm fayli emas (<flowgorithm> ildiz elementi yo‘q)");
  let id = 0;
  const attributes: Record<string, string> = {};
  const functions: FFunction[] = [];
  for (const c of root.children) {
    if (c.name === "attributes") {
      for (const a of c.children) if (a.name === "attribute") attributes[a.attrs.name ?? ""] = a.attrs.value ?? "";
    } else if (c.name === "function") {
      const name = (c.attrs.name ?? "").trim();
      const params =
        c.children
          .find((x) => x.name === "parameters")
          ?.children.filter((p) => p.name === "parameter")
          .map((p) => ({
            name: (p.attrs.name ?? "").trim(),
            type: ftype(p.attrs.type, `${name} parametri`),
            array: (p.attrs.array ?? "False").toLowerCase() === "true",
          })) ?? [];
      const bodyNode = c.children.find((x) => x.name === "body");
      const rt = (c.attrs.type ?? "None").trim();
      functions.push({
        name,
        type: rt.toLowerCase() === "none" || rt === "" ? "None" : ftype(rt, `${name} funksiyasi`),
        variable: (c.attrs.variable ?? "").trim(),
        params,
        body: bodyNode ? block(bodyNode.children) : [],
      });
    }
  }
  if (!functions.some((f) => f.name.toLowerCase() === "main"))
    throw new FprgError("Main funksiyasi topilmadi");
  return { fileversion: root.attrs.fileversion ?? "", attributes, functions };

  function block(nodes: XNode[]): Stmt[] {
    const out: Stmt[] = [];
    for (const n of nodes) {
      const s = stmt(n);
      if (s) out.push(s);
    }
    return out;
  }

  function child(n: XNode, name: string): XNode[] {
    return n.children.find((x) => x.name === name)?.children ?? [];
  }

  function stmt(n: XNode): Stmt | null {
    const a = n.attrs;
    switch (n.name) {
      case "declare":
        return {
          k: "declare",
          id: ++id,
          names: (a.name ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          type: ftype(a.type, "Declare"),
          array: (a.array ?? "False").toLowerCase() === "true",
          size: a.size ?? "",
        };
      case "assign":
        return { k: "assign", id: ++id, variable: (a.variable ?? "").trim(), expression: a.expression ?? "" };
      case "input":
        return { k: "input", id: ++id, variable: (a.variable ?? "").trim() };
      case "output":
        return {
          k: "output",
          id: ++id,
          expression: a.expression ?? "",
          newline: (a.newline ?? "True").toLowerCase() !== "false",
        };
      case "if": {
        const myId = ++id;
        return { k: "if", id: myId, expression: a.expression ?? "", then: block(child(n, "then")), else: block(child(n, "else")) };
      }
      case "while": {
        const myId = ++id;
        return { k: "while", id: myId, expression: a.expression ?? "", body: block(n.children) };
      }
      case "do": {
        const myId = ++id;
        return { k: "do", id: myId, expression: a.expression ?? "", body: block(n.children) };
      }
      case "for": {
        const myId = ++id;
        return {
          k: "for",
          id: myId,
          variable: (a.variable ?? "").trim(),
          start: a.start ?? "",
          end: a.end ?? "",
          dec: (a.direction ?? "inc").toLowerCase() === "dec",
          step: a.step && a.step.trim() !== "" ? a.step : "1",
          body: block(n.children),
        };
      }
      case "call":
        return { k: "call", id: ++id, expression: a.expression ?? "" };
      case "comment":
        return { k: "comment", id: ++id, text: a.text ?? "" };
      case "breakpoint":
      case "more":
        return null;
      default:
        throw new FprgError(`Noma’lum element: <${n.name}>`);
    }
  }
}
