import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";
import App from "./App";
import { applyPrefs, readPrefs } from "./components/ui";
import { VARIANT_NO } from "./config/exam.config";

applyPrefs(readPrefs());
document.title = `Informatika imtihoni · ${VARIANT_NO}-variant`;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
