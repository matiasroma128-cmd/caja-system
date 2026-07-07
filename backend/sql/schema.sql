-- ============================================================
-- Sistema de Apertura y Cierre de Caja - Esquema PostgreSQL
-- ============================================================

DROP TABLE IF EXISTS auditoria CASCADE;
DROP TABLE IF EXISTS cierres CASCADE;
DROP TABLE IF EXISTS movimientos CASCADE;
DROP TABLE IF EXISTS saldos_cripto_apertura CASCADE;
DROP TABLE IF EXISTS aperturas CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

CREATE TABLE usuarios (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  usuario       VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol           VARCHAR(20) NOT NULL CHECK (rol IN ('cajero', 'administrador')),
  activo        BOOLEAN DEFAULT TRUE,
  creado_en     TIMESTAMP DEFAULT NOW()
);

CREATE TABLE aperturas (
  id                  SERIAL PRIMARY KEY,
  fecha               DATE NOT NULL,
  hora_apertura       TIME NOT NULL DEFAULT CURRENT_TIME,
  usuario_id          INTEGER NOT NULL REFERENCES usuarios(id),
  saldo_inicial_ars   NUMERIC(18,2) NOT NULL DEFAULT 0,
  saldo_inicial_usd   NUMERIC(18,2) NOT NULL DEFAULT 0,
  saldo_inicial_eur   NUMERIC(18,2) NOT NULL DEFAULT 0,
  cheques_iniciales   INTEGER NOT NULL DEFAULT 0,
  observaciones       TEXT,
  estado              VARCHAR(20) NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada')),
  creado_en           TIMESTAMP DEFAULT NOW(),
  UNIQUE(fecha)
);

CREATE TABLE saldos_cripto_apertura (
  id            SERIAL PRIMARY KEY,
  apertura_id   INTEGER NOT NULL REFERENCES aperturas(id) ON DELETE CASCADE,
  moneda        VARCHAR(10) NOT NULL,
  saldo_inicial NUMERIC(28,8) NOT NULL DEFAULT 0,
  UNIQUE(apertura_id, moneda)
);

CREATE TABLE movimientos (
  id            SERIAL PRIMARY KEY,
  apertura_id   INTEGER NOT NULL REFERENCES aperturas(id) ON DELETE CASCADE,
  usuario_id    INTEGER NOT NULL REFERENCES usuarios(id),
  fecha_hora    TIMESTAMP NOT NULL DEFAULT NOW(),
  tipo          VARCHAR(20) NOT NULL CHECK (tipo IN ('efectivo', 'transferencia', 'cheque', 'cripto')),
  direccion     VARCHAR(10) NOT NULL CHECK (direccion IN ('ingreso', 'egreso')),
  moneda        VARCHAR(10) NOT NULL,            -- ARS, USD, EUR, USDT, BTC, ETH, etc.
  monto         NUMERIC(28,8) NOT NULL,
  cantidad_cheques INTEGER DEFAULT 0,            -- solo si tipo = cheque
  estado        VARCHAR(20) NOT NULL DEFAULT 'finalizada' CHECK (estado IN ('pendiente', 'parcial', 'finalizada')),
  descripcion   TEXT,
  creado_en     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_movimientos_apertura ON movimientos(apertura_id);

CREATE TABLE cierres (
  id                SERIAL PRIMARY KEY,
  apertura_id       INTEGER NOT NULL UNIQUE REFERENCES aperturas(id),
  usuario_id        INTEGER NOT NULL REFERENCES usuarios(id),
  fecha             DATE NOT NULL,
  hora_cierre       TIME NOT NULL DEFAULT CURRENT_TIME,
  total_operaciones INTEGER NOT NULL DEFAULT 0,
  totales_json      JSONB NOT NULL,   -- totales por moneda, por tipo, por estado
  arqueo_json       JSONB NOT NULL,   -- saldos contados por el usuario
  diferencias_json  JSONB NOT NULL,   -- diferencias calculadas por moneda
  observaciones     TEXT,
  bloqueado         BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en         TIMESTAMP DEFAULT NOW()
);

CREATE TABLE auditoria (
  id                SERIAL PRIMARY KEY,
  cierre_id         INTEGER REFERENCES cierres(id),
  usuario_id        INTEGER NOT NULL REFERENCES usuarios(id),
  fecha_hora        TIMESTAMP NOT NULL DEFAULT NOW(),
  accion            VARCHAR(50) NOT NULL,   -- 'reapertura', 'edicion'
  campo_modificado  VARCHAR(100),
  valor_anterior    TEXT,
  valor_nuevo       TEXT
);

-- ============================================================
-- Usuarios semilla (password: admin123 / cajero123)
-- Los hashes se generan en seed.js con bcrypt; este insert es
-- referencial y se sobreescribe al correr `npm run seed`.
-- ============================================================
