# Lenticular Events

Estudio web para crear imágenes lenticulares (efecto 3D/profundidad y efecto Flip)
listas para imprimir en láminas lenticulares, pensado para usarse en fotocabinas
de eventos: el organizador define estilos desde su panel y, el día del evento, el
invitado solo se toma una foto en el modo "kiosco".

## Cómo está armado

- **Frontend + backend**: [TanStack Start](https://tanstack.com/start) (React 19 + Vite + Nitro), todo en un mismo proyecto.
- **Base de datos y autenticación**: [Supabase](https://supabase.com) (Postgres + Auth + Storage).
- **IA generativa de imágenes**: API de Gemini de Google, para crear la segunda foto del efecto Flip.

### Base de datos (Supabase / Postgres)

Las tablas viven en `supabase/migrations/` y se crean con Row Level Security
(cada organizador solo ve sus propios datos):

- `profiles` — perfil del organizador (se crea solo al registrarse).
- `events` — eventos que crea cada organizador.
- `photo_styles` — estilos de foto configurados por evento (modo, tamaño,
  prompt de IA, color de marco, etc.).
- `captures` — cada foto final generada en el kiosco, con su URL firmada.

Las fotos finales se guardan en el bucket de Storage `capturas`.

### IA generativa de imágenes

El endpoint `src/routes/api/generate-flip.ts` recibe la foto tomada y el
`ai_prompt` del estilo, y llama directamente a la API de Gemini
(`generativelanguage.googleapis.com`, modelo `gemini-2.5-flash-image`) pidiéndole
que transforme la foto según el estilo elegido, conservando la pose y el
parecido de la persona.

Para que funcione necesitas una `GEMINI_API_KEY` (gratis, con cuota limitada):

1. Entra a <https://aistudio.google.com/apikey> y crea una clave.
2. Ponla en tu `.env` como `GEMINI_API_KEY="tu-clave"`.

Si el estilo tiene la IA desactivada (o la API falla), se usa automáticamente
una variante en blanco y negro generada en el navegador — el kiosco nunca se
queda sin poder entregar una foto.

¿Prefieres otro proveedor de IA (OpenAI, Replicate, Stability, etc.)? Solo hay
que cambiar la llamada `fetch` dentro de `generate-flip.ts`; el resto del
endpoint (validaciones, respuesta al frontend) no cambia.

## Desarrollo local

Necesitas Node.js 20+ y npm.

```sh
npm install
npm run dev
```

Copia `.env` y completa tus propias credenciales de Supabase y tu
`GEMINI_API_KEY` antes de arrancar.

## Desplegar en la nube

El build (`npm run build`) usa [Nitro](https://nitro.build) con el preset
`node-server`: genera un servidor Node.js normal en `.output/server/index.mjs`,
sin depender de ningún proveedor en particular. Opciones recomendadas:

- **Railway** o **Render**: conectas el repo de GitHub, cada uno detecta
  `npm run build` / `npm start`-style y te da una URL pública en minutos. Es la
  opción más simple si nunca has desplegado un backend.
- **Un VPS con Docker** (Hetzner, DigitalOcean, etc.): construyes la imagen con
  el resultado de `npm run build` y corres `node .output/server/index.mjs`.
- **Serverless (Vercel, Netlify, Cloudflare)**: cambia el `preset` en
  `vite.config.ts` (por ejemplo `preset: "vercel"`, `"netlify"` o
  `"cloudflare-module"`) y sigue la guía de Nitro para ese proveedor:
  <https://nitro.build/deploy>.

En cualquiera de los casos, recuerda configurar las variables de entorno en el
proveedor de hosting: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`,
`VITE_SUPABASE_PUBLISHABLE_KEY` y `GEMINI_API_KEY`.

Supabase (base de datos, auth y storage) ya vive en la nube por su cuenta —
no hace falta desplegarlo, solo apuntar el proyecto al mismo `SUPABASE_URL`
que usas en desarrollo (o crear un proyecto de Supabase separado para
producción, si prefieres mantenerlos aislados).
