import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";

import { resolve } from "path";

import { fileURLToPath, URL } from "node:url";


import dns from "dns";
dns.setDefaultResultOrder("verbatim");

export default () => {
  const baseURL =
    process.env.APP_ENV === "development" ? "/" : "/sev2026/t2/";

  return defineConfig({
    plugins: [vue(), vuetify({ autoImport: true })],
    resolve: {
      alias: {

        "@": resolve(__dirname, "src"),
      },
    },

        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },


    server: {
      host: "localhost",
      port: 8081,
    },

    base: baseURL,
  });
};
