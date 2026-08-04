import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import "./styles.css";

const router = getRouter();

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

/**
 * Depois do render, e sem `await`: os ajustes da casca nativa (barra de
 * status, splash, links do e-mail) não podem atrasar a primeira pintura, e na
 * web a função retorna no primeiro `if` sem carregar plugin nenhum.
 */
void import("./lib/nativo").then(({ iniciarNativo }) => iniciarNativo());
