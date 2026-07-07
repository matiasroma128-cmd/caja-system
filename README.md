# Caja Diaria — Apertura y Cierre de Caja

Sistema completo de Apertura y Cierre de Caja Diario: React (frontend) + Node.js/Express (API) + PostgreSQL (base de datos).

## Funcionalidades incluidas

- **Apertura de caja**: saldos iniciales en ARS, USD, EUR, criptomonedas (cantidad libre), cheques en cartera y observaciones.
- **Movimientos automáticos**: cada operación (efectivo, transferencia, cheque, cripto) actualiza los saldos sin cálculos manuales.
- **Dashboard en tiempo real**: saldos actuales por moneda, cheques en cartera, operaciones del día, pendientes/finalizadas y últimos movimientos (se refresca solo cada 5 segundos).
- **Cierre de caja con arqueo**: comparación automática entre saldo esperado (sistema) y saldo real contado, con diferencia a favor / en contra / sin diferencia, resaltada por color.
- **Historial permanente**: cada cierre guarda apertura, movimientos, saldos, diferencias y observaciones.
- **Reportes**: exportar a Excel (CSV), generar PDF, imprimir, y buscar cierres por rango de fechas.
- **Seguridad**: un cierre confirmado queda bloqueado; solo un usuario con rol `administrador` puede reabrirlo, y la acción se registra en una tabla de auditoría (usuario, fecha, hora, campo modificado).

## Estructura del proyecto

```
caja-system/
├── backend/
│   ├── src/
│   │   ├── index.js              # servidor Express
│   │   ├── db.js                 # conexión a PostgreSQL
│   │   ├── middleware/auth.js    # JWT + control de roles
│   │   ├── routes/                # auth, apertura, movimientos, dashboard, cierre, historial
│   │   └── utils/
│   │       ├── saldos.js         # cálculo automático de saldos esperados
│   │       ├── migrate.js        # aplica el esquema SQL
│   │       └── seed.js           # crea usuarios de prueba
│   ├── sql/schema.sql            # esquema completo de la base de datos
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── pages/                # Login, Dashboard, Apertura, Movimientos, Cierre, Historial, DetalleCierre
    │   ├── styles/global.css
    │   ├── api.js                # cliente HTTP hacia la API
    │   ├── constants.js
    │   └── App.jsx
    ├── index.html
    └── package.json
```

## Requisitos previos

- Node.js 18 o superior
- PostgreSQL 14 o superior (local o remoto)

## 1. Base de datos

Creá la base de datos vacía:

```bash
createdb caja_diaria
```

(o desde psql: `CREATE DATABASE caja_diaria;`)

## 2. Backend

```bash
cd backend
cp .env.example .env
# editá .env con tus credenciales de PostgreSQL si no usás los valores por defecto
npm install
npm run migrate    # crea todas las tablas
npm run seed       # crea los usuarios admin/admin123 y cajero/cajero123
npm run dev        # levanta la API en http://localhost:4000
```

Verificá que esté arriba: `curl http://localhost:4000/api/health` → `{"ok":true}`

## 3. Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev        # levanta la app en http://localhost:5173
```

El frontend usa un proxy (`vite.config.js`) hacia `http://localhost:4000`, así que con ambos procesos corriendo no hace falta configurar nada más.

Abrí `http://localhost:5173` e ingresá con:

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin`  | `admin123`  | administrador |
| `cajero` | `cajero123` | cajero |

## 4. Flujo de uso

1. Iniciá sesión.
2. Andá a **Apertura de caja** y cargá los saldos iniciales del día.
3. Registrá operaciones en **Movimientos**: los saldos del dashboard se actualizan solos.
4. Al final del día, andá a **Cierre y arqueo**, contá el dinero/criptomonedas reales, cargá el arqueo y confirmá el cierre (queda bloqueado).
5. Consultá cierres pasados en **Historial**, exportalos a Excel/PDF, o reabrilos si entraste como `admin`.

## Notas para producción

- Cambiá `JWT_SECRET` en `.env` por un valor propio y secreto.
- Agregá HTTPS y restringí CORS al dominio real del frontend (`backend/src/index.js`).
- Las contraseñas se guardan con `bcrypt`; no hay límite de intentos de login en esta versión — agregar rate limiting antes de exponerlo a internet.
- Este prototipo asume una sola caja activa a la vez (campo `UNIQUE(fecha)` en `aperturas`). Para múltiples puntos de caja simultáneos, agregar una columna `caja_id`.
