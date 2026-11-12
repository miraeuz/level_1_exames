/// <reference types="vite/client" />
declare module "*.ttf?url" { const s: string; export default s; }
declare module "pdfmake/build/pdfmake";
declare module "*?worker&inline" { const W: { new (): Worker }; export default W; }
