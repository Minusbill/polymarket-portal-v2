import { createApp } from "vue";
import { Buffer } from "buffer";
import App from "./App.vue";
import "./styles.css";

if (typeof window !== "undefined") {
  (window as unknown as { Buffer?: typeof Buffer }).Buffer = Buffer;
}

createApp(App).mount("#app");
