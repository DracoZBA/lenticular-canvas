import { defineConfig, loadEnv } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";

// Configuración estándar de Vite + TanStack Start (sin dependencias de Lovable).
// - tanstackStart: SSR/routing de TanStack Start. `server.entry: "server"` hace
//   que el build use src/server.ts como punto de entrada del servidor (nuestro
//   wrapper que atrapa errores SSR), tal como antes.
// - nitro: motor de build/servidor. `preset: "vercel"` genera funciones
//   serverless compatibles con Vercel automáticamente. Si despliegas en otro
//   lado (Railway, Render, un VPS, Docker) cambia el preset a "node-server"
//   (ver README, sección "Desplegar en la nube").
export default defineConfig(({ mode }) => {
  // Expone las variables VITE_* del .env como import.meta.env.* en el cliente.
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const envDefine = Object.fromEntries(
    Object.entries(env).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
  );

  return {
    define: envDefine,
    css: { transformer: "lightningcss" },
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"],
    },
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({
        importProtection: {
          behavior: "error",
          client: { files: ["**/server/**"], specifiers: ["server-only"] },
        },
        server: { entry: "server" },
      }),
      nitro({ preset: "vercel" }),
      viteReact(),
    ],
  };
});
