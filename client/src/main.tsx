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

createRoot(document.getElementById("root")!).render(<App />);
