import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";
import App from "./App";
import { applyPrefs, readPrefs } from "./components/ui";

applyPrefs(readPrefs());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
