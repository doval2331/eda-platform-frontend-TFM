# Plataforma EDA - Frontend React

Interfaz React + Vite para el prototipo TFM. Incluye login, ejecucion del pipeline, proyeccion 2D, interpretacion de clusters, exploracion conversacional de incidencias IT, dashboard conversacional de insights seleccionados e integracion con Metabase BI.

## Requisitos

- Node.js 20.19+ o 22 LTS (requerido por Vite 8).
- pnpm 10 o superior (`corepack enable` y `corepack prepare pnpm@latest --activate`).
- Backend FastAPI levantado.
- Acceso a las credenciales demo creadas en el backend.

## Instalacion

```powershell
cd "C:\Users\Marisol Altamiranda\eda-platform-frontend-TFM"
pnpm install
Copy-Item .env.example .env
```

## Configurar URL del backend

Crear un archivo `.env` en la raiz del frontend.

Si el backend corre en `8000`, usar:

```env
VITE_API_BASE=http://127.0.0.1:8000
```

Si el backend corre en otro puerto, ajustar `VITE_API_BASE` con ese mismo puerto. Tambien se puede dejar `VITE_API_BASE` vacio y usar el proxy de Vite, pero entonces el proxy debe apuntar al mismo puerto del backend.

## Ejecutar frontend

```powershell
pnpm dev
```

Abrir la URL que muestre Vite, por ejemplo:

```text
http://127.0.0.1:5174/login
```

o:

```text
http://localhost:5173/login
```

## Autenticacion

Antes de iniciar sesion, en el backend debe haberse ejecutado:

```powershell
python scripts/seed_user.py
```

Credenciales demo:

- Email: `analista@tfm.local`
- Password: `TfmDemo2026!`

## Flujo de uso

1. Iniciar backend.
2. Iniciar frontend.
3. Entrar a `/login`.
4. Iniciar sesion con el usuario demo.
5. En `Analisis exploratorio`, subir CSV o usar dataset IT Ops.
6. Ejecutar pipeline.
7. Revisar `Proyeccion 2D y clusters`.
8. Usar la pestana `Interpretacion` para entender clusters.
9. Usar la exploracion conversacional para preguntar por SLA, prioridad, tiempos, servicios, causas raiz, anomalias o clusters criticos.
10. Seleccionar insights.
11. Entrar a `Dashboard conversacional` para ver la visualizacion interactiva de los insights guardados.
12. Entrar a `Metabase BI` para publicar tablas `bi_*`, crear el dashboard base y abrir Metabase.

## Pantallas principales

- `src/pages/LoginPage.jsx`: login JWT.
- `src/pages/DashboardPage.jsx`: configuracion del experimento, pipeline, proyeccion 2D e interpretacion.
- `src/components/ConversationPanel.jsx`: exploracion conversacional.
- `src/components/ClusterInterpretationPanel.jsx`: lectura guiada de clusters.
- `src/pages/ConversationDashboardPage.jsx`: dashboard conversacional interactivo.
- `src/pages/MetabasePage.jsx`: estado de Metabase, sincronizacion BI, creacion de dashboard y enlace externo.
- `src/Scatter2D.jsx`: visualizacion Plotly de clusters.
- `src/api/conversation.js`: llamadas al chat, seleccion de insights y dashboard.
- `src/api/metabase.js`: estado y publicacion de tablas BI.

## Agente conversacional

El frontend usa el mismo endpoint `/api/runs/{run_id}/chat`. La diferencia esta en el backend:

- Si `LLM_ENABLED=false`, responde con reglas locales.
- Si `LLM_ENABLED=true`, el backend ejecuta herramientas analiticas internas y usa un LLM para explicar resumenes agregados y ordenar alternativas de decision.

El LLM no recibe el dataset completo, no calcula clusters y no toma decisiones automaticas; solo mejora la explicacion para usuarios no expertos y ayuda a presentar opciones de priorizacion.

## Metabase BI

La pantalla `Metabase BI` no reemplaza el dashboard conversacional propio. Sirve para publicar los resultados analiticos en PostgreSQL y abrir Metabase, que consume las tablas:

```text
bi_runs
bi_evidences
bi_cluster_summary
bi_sla_by_category
bi_service_risk
bi_selected_insights
```

Requisitos para que figure como disponible:

1. Backend levantado con `.env.docker.example` copiado a `.env`.
2. `BI_SYNC_ENABLED=true`.
3. PostgreSQL y Metabase levantados con `docker compose up -d`.
4. Metabase configurado contra la base PostgreSQL `eda_platform`.

Si se usan los contenedores locales existentes del TFM:

```powershell
docker start tfm-analytics-db
docker start tfm-metabase
```

el backend debe tener:

```env
BI_SYNC_ENABLED=true
BI_DATABASE_URL=postgresql+psycopg2://tfm:tfm@127.0.0.1:5432/tfm_it
METABASE_URL=http://localhost:3000
METABASE_USERNAME=analista@tfm.local
METABASE_PASSWORD=TfmDemo2026!
METABASE_DATABASE_NAME=TFM IT Analytics
METABASE_DASHBOARD_NAME=Dashboard IT - Evidencias conversacionales
```

Metabase se abre en:

```text
http://localhost:3000
```

Si el navegador muestra `localhost rechazo la conexion`, esperar unos minutos y revisar que `tfm-metabase` este iniciado. Metabase puede demorar por migraciones internas H2.

Si la pantalla `Metabase BI` muestra `Not Found`, cerrar sesion, volver a iniciar sesion y recargar con `Ctrl + F5`. En desarrollo la app usa el proxy de Vite hacia el backend en `http://127.0.0.1:8000`.

### Crear dashboard de Metabase

En `Metabase BI` usar:

1. `Publicar tablas BI`, para copiar resultados desde DuckDB hacia PostgreSQL.
2. `Crear dashboard en Metabase`, para generar automaticamente `Dashboard IT - Evidencias conversacionales`.
3. `Abrir dashboard creado`, para ver las tarjetas en Metabase.

El dashboard generado incluye tarjetas de SLA por categoria, riesgo por servicio, volumen por severidad, tiempos de resolucion, clusters prioritarios e insights seleccionados por el usuario.

## Build

```powershell
pnpm build
```

Vista previa local:

```powershell
pnpm preview
```

## Verificacion rapida

Backend:

```text
http://127.0.0.1:8000/health
```

Frontend:

```text
http://127.0.0.1:5174/login
```

Si aparece `Failed to fetch`, revisar:

- Que el backend este levantado.
- Que `VITE_API_BASE` apunte al puerto correcto.
- Que `CORS_ORIGINS` del backend incluya el puerto del frontend.
- Que el archivo `.env` del frontend no tenga espacios en la URL.

Si aparece `Not Found` solo en `Metabase BI`, probar:

```powershell
curl.exe -i http://127.0.0.1:5174/api/metabase/status
curl.exe -i http://127.0.0.1:8000/api/metabase/status
```

Sin token deberia responder `401 No autenticado`, no `404`.

## Despliegue

En produccion, compilar el frontend con `VITE_API_BASE` apuntando a la API publica:

```powershell
$env:VITE_API_BASE="https://tu-api.onrender.com"
pnpm build
```

En Dokploy (Nixpacks), el proyecto usa Node 22 via `.nvmrc` y `nixpacks.toml`. Define `VITE_API_BASE` como variable de entorno de la aplicacion antes del build; Vite la incrusta en el bundle en tiempo de compilacion.

El backend debe tener `CORS_ORIGINS` configurado con la URL publica del frontend.
