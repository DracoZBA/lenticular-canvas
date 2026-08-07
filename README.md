# Lenticular Events

Estudio web para crear imágenes lenticulares (efecto 3D/profundidad y efecto Flip)
listas para imprimir en láminas lenticulares, pensado para usarse en fotocabinas
de eventos: el organizador define estilos desde su panel y, el día del evento, el
invitado solo se toma una foto en el modo "kiosco".

## Cómo está armado

- **Frontend + backend**: [TanStack Start](https://tanstack.com/start) (React 19 + Vite + Nitro), todo en un mismo proyecto.
- **Base de datos y autenticación**: [Supabase](https://supabase.com) (Postgres + Auth + Storage).
- **IA generativa de imágenes**: API de Gemini de Google, para crear la segunda foto del efecto Flip.
- **Hosting**: configurado para desplegar en **Vercel** (ver más abajo).

## Desarrollo local

Necesitas Node.js 20+ y npm.

```sh
npm install
cp .env.example .env   # completa tus credenciales (ver siguiente sección)
npm run dev
```

## Variables de entorno

Copia `.env.example` como `.env` para desarrollo local. En Vercel, estas mismas
variables se configuran en **Project Settings → Environment Variables** (Vercel
no lee el archivo `.env`, así que este paso es obligatorio para que la app
funcione en producción).

| Variable | De dónde sale | Notas |
|---|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API → "Project URL" | |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API → "anon / publishable" | Es pública, no es secreta |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → "service_role" | **Secreta.** Se usa solo en el servidor para subir fotos saltándose Row Level Security. Nunca la pongas con prefijo `VITE_` |
| `VITE_SUPABASE_URL` | igual que `SUPABASE_URL` | La necesita el navegador (cliente de Supabase del lado del cliente) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | igual que `SUPABASE_PUBLISHABLE_KEY` | Idem |
| `VITE_SUPABASE_PROJECT_ID` | el id de tu proyecto Supabase (parte del subdominio) | Idem |
| `GEMINI_API_KEY` | <https://aistudio.google.com/apikey> | Clave de la API de Gemini, para la IA de imágenes |

## Base de datos (Supabase / Postgres)

Las tablas viven en `supabase/migrations/` y se crean con Row Level Security
(cada organizador solo ve sus propios datos):

- `profiles` — perfil del organizador (se crea solo al registrarse).
- `events` — eventos que crea cada organizador.
- `photo_styles` — estilos de foto configurados por evento (modo, tamaño,
  prompt de IA, color de marco, etc.).
- `captures` — cada foto final generada en el kiosco, con su URL firmada.

Las fotos finales se guardan en el bucket de Storage `capturas`.

### Cómo dejarla lista

1. Crea un proyecto en [supabase.com](https://supabase.com) (o usa el que ya
   tenías conectado).
2. Corre las migraciones. Con la [Supabase CLI](https://supabase.com/docs/guides/cli):
   ```sh
   npx supabase link --project-ref TU_PROJECT_ID
   npx supabase db push
   ```
   O, si prefieres no instalar la CLI, copia y pega el contenido de los dos
   archivos de `supabase/migrations/` (en orden) en el **SQL Editor** del
   panel de Supabase y ejecútalos.
3. Crea el bucket de Storage llamado **`capturas`** (Storage → New bucket).
   Puede ser privado: la app genera URLs firmadas temporales para entregar
   cada foto, no necesita ser público.
4. Habilita el login con Google si lo vas a usar: Authentication → Providers
   → Google, y sigue el asistente de Supabase para conectar tus credenciales
   de Google Cloud (esto es aparte de las variables de entorno de arriba).
5. Copia la URL del proyecto y las claves (anon y service_role) a tus
   variables de entorno, tal como se explica en la tabla de arriba.

## IA generativa de imágenes

El endpoint `src/routes/api/generate-flip.ts` recibe la foto tomada y el
`ai_prompt` del estilo, y llama directamente a la API de Gemini
(`generativelanguage.googleapis.com`, modelo `gemini-2.5-flash-image`) pidiéndole
que transforme la foto según el estilo elegido, conservando la pose y el
parecido de la persona.

### Cómo dejarla lista

1. Entra a <https://aistudio.google.com/apikey> y crea una clave (tiene una
   cuota gratuita).
2. Ponla como `GEMINI_API_KEY` en tu `.env` local y en las variables de
   entorno de Vercel.

Si el estilo tiene la IA desactivada, o la API falla o se queda sin cuota, la
app usa automáticamente una variante en blanco y negro generada en el
navegador — el kiosco nunca se queda sin poder entregar una foto.

¿Prefieres otro proveedor de IA (OpenAI, Replicate, Stability, etc.)? Solo hay
que cambiar la llamada `fetch` dentro de `generate-flip.ts`; el resto del
endpoint (validaciones, respuesta al frontend) no cambia.

## Desplegar en Vercel

El proyecto ya está configurado para Vercel: `vite.config.ts` usa el preset
`vercel` de [Nitro](https://nitro.build), que genera automáticamente la
estructura de funciones serverless que Vercel espera (`npm run build` produce
`.vercel/output`, listo para desplegar).

1. Sube el proyecto a un repo de GitHub (o GitLab/Bitbucket).
2. En [vercel.com](https://vercel.com) → **Add New… → Project** → importa el
   repo. Vercel detecta que es un proyecto Node/Vite con `npm run build` y no
   necesitas tocar el "Build Command" ni el "Output Directory".
3. Antes de darle a Deploy (o justo después, en Project Settings →
   Environment Variables), agrega **todas** las variables de la tabla de
   arriba (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
   `GEMINI_API_KEY`).
4. Deploy. Cada push a la rama conectada vuelve a desplegar solo.
5. Si usas login con Google: en Supabase (Authentication → URL Configuration)
   agrega la URL de tu deployment de Vercel (`https://tu-proyecto.vercel.app`)
   a los "Redirect URLs" permitidos, o el login con Google fallará en
   producción aunque funcione en local.

### ¿Y si prefiero otro proveedor?

Cambiando una línea en `vite.config.ts` (`nitro({ preset: "..." })`) puedes
apuntar a Railway/Render/un VPS con `"node-server"`, a Netlify con
`"netlify"`, o a Cloudflare con `"cloudflare-module"`. El resto del proyecto
no cambia. Guía completa: <https://nitro.build/deploy>.

Supabase (base de datos, auth y storage) ya vive en la nube por su cuenta —
no hace falta desplegarlo, solo apuntar el proyecto al `SUPABASE_URL` que
configuraste arriba.
