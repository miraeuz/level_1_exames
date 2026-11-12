// Tiny, dependency-free XML parser. Works the same in the browser, in Web Workers and in Node.
export interface XNode {
  name: string;
  attrs: Record<string, string>;
  children: XNode[];
}

export class XmlError extends Error {}

const ENT: Record<string, string> = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENT[e] ?? m;
  });
}

export function encodeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function parseXml(src: string): XNode {
  let i = 0;
  const n = src.length;
  if (src.charCodeAt(0) === 0xfeff) i = 1;
  const stack: XNode[] = [];
  let root: XNode | null = null;

  const skipWs = () => {
    while (i < n && /\s/.test(src[i])) i++;
  };

  while (i < n) {
    const lt = src.indexOf("<", i);
    if (lt < 0) break;
    i = lt;
    if (src.startsWith("<?", i)) {
      const e = src.indexOf("?>", i);
      if (e < 0) throw new XmlError("XML deklaratsiyasi yopilmagan");
      i = e + 2;
      continue;
    }
    if (src.startsWith("<!--", i)) {
      const e = src.indexOf("-->", i);
      if (e < 0) throw new XmlError("XML izohi yopilmagan");
      i = e + 3;
      continue;
    }
    if (src.startsWith("<![CDATA[", i)) {
      const e = src.indexOf("]]>", i);
      if (e < 0) throw new XmlError("CDATA yopilmagan");
      i = e + 3;
      continue;
    }
    if (src.startsWith("<!", i)) {
      const e = src.indexOf(">", i);
      if (e < 0) throw new XmlError("DOCTYPE yopilmagan");
      i = e + 1;
      continue;
    }
    if (src.startsWith("</", i)) {
      const e = src.indexOf(">", i);
      if (e < 0) throw new XmlError("Yopuvchi teg tugallanmagan");
      const name = src.slice(i + 2, e).trim();
      const top = stack.pop();
      if (!top || top.name !== name) throw new XmlError(`Teglar mos emas: </${name}>`);
      i = e + 1;
      continue;
    }
    // start tag
    i++;
    const ns = i;
    while (i < n && /[^\s/>]/.test(src[i])) i++;
    const name = src.slice(ns, i);
    if (!name) throw new XmlError("Teg nomi yo‘q");
    const node: XNode = { name, attrs: {}, children: [] };
    for (;;) {
      skipWs();
      if (i >= n) throw new XmlError(`<${name}> tegi yopilmagan`);
      if (src[i] === "/" && src[i + 1] === ">") {
        i += 2;
        attach(node);
        break;
      }
      if (src[i] === ">") {
        i++;
        attach(node);
        stack.push(node);
        break;
      }
      const as = i;
      while (i < n && /[^\s=/>]/.test(src[i])) i++;
      const an = src.slice(as, i);
      skipWs();
      if (src[i] !== "=") throw new XmlError(`Atribut qiymati yo‘q: ${an}`);
      i++;
      skipWs();
      const q = src[i];
      if (q !== '"' && q !== "'") throw new XmlError(`Atribut qo‘shtirnoqsiz: ${an}`);
      const ve = src.indexOf(q, i + 1);
      if (ve < 0) throw new XmlError(`Atribut yopilmagan: ${an}`);
      node.attrs[an] = decodeEntities(src.slice(i + 1, ve));
      i = ve + 1;
    }
  }
  if (stack.length) throw new XmlError(`<${stack[stack.length - 1].name}> tegi yopilmagan`);
  if (!root) throw new XmlError("XML bo‘sh");
  return root;

  function attach(node: XNode) {
    if (stack.length) stack[stack.length - 1].children.push(node);
    else if (!root) root = node;
    else throw new XmlError("Bir nechta ildiz element");
  }
}
