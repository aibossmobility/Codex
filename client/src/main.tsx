import { analytics } from "@heycatch/sdk";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

analytics.init({
  projectKey: "hck_pk_LLcO8oj69hds70qS_xXNwoIT0j3gcT7B",
  install: {
    framework: "vite-react",
    frameworkVersion: "7",
    agent: "codex",
  },
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/ai-boss-sw.js").catch((error) => {
      console.warn("AI Boss OS service worker registration failed", error);
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
