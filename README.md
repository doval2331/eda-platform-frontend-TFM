# Plataforma EDA — Frontend

Interfaz React (Vite) para el prototipo TFM: login JWT, panel con sidebar y ejecución del pipeline contra la API FastAPI.

## Requisitos

- Node.js 18+
- Backend en `http://127.0.0.1:8000` (ver [eda-platform-backend](https://github.com))

## Instalación

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. El proxy de Vite reenvía `/api` y `/health` al backend.

## Autenticación

1. En el backend: `python scripts/seed_user.py`
2. Credenciales demo: **analista@tfm.local** / **TfmDemo2026!**

Sin token válido, las rutas protegidas redirigen a `/login`. El pipeline (`POST /api/runs`) siempre usa Bearer desde `localStorage`.

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `VITE_API_BASE` | Prefijo opcional de la API (vacío = mismo origen + proxy en dev) |

## Estructura relevante

- `src/pages/LoginPage.jsx` — formulario de acceso
- `src/pages/DashboardPage.jsx` — controles del pipeline y gráfico
- `src/components/layout/MainLayout.jsx` — shell (sidebar estilo gestión-archivo)
- `src/components/Scatter2D.jsx` — visualización Plotly (no modificar salvo contenedor CSS)

## Build

```bash
npm run build
npm run preview
```

## Despliegue

En producción define la URL de la API al compilar:

```bash
VITE_API_BASE=https://tu-api.onrender.com npm run build
```

El backend debe tener `CORS_ORIGINS` con la URL del frontend. Postgres: ver `eda-platform-backend/docs/DEPLOY.md` y Docker (`docker compose`).
