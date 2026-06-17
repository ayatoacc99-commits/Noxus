import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const devMode = !(window as Window & { invokeNative?: unknown }).invokeNative;
const root = ReactDOM.createRoot(document.getElementById("root")!);

const renderApp = () => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

if (window.name === "" || devMode) {
  if (devMode) {
    document.body.setAttribute("data-theme", "dark");
    document.body.setAttribute("data-device", "tablet");
    renderApp();
  } else {
    window.addEventListener("message", (event) => {
      if (event.data === "componentsLoaded") renderApp();
    });
  }
}
