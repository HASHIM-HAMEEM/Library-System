import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import KeyService from "./lib/keyService";

async function bootstrap() {
  // Initialize encryption key service before rendering the app
  await KeyService.initialize();

  createRoot(document.getElementById("root")!).render(
    <App />
  );
}

bootstrap();
