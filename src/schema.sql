CREATE TABLE IF NOT EXISTS itinerarios (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  dia           TEXT NOT NULL CHECK (dia IN ('terca','quarta')),
  titulo        TEXT NOT NULL,
  professor     TEXT NOT NULL,
  descricao     TEXT NOT NULL DEFAULT '',
  video_url     TEXT NOT NULL DEFAULT '',
  capacidade    INTEGER NOT NULL,
  ordem         INTEGER NOT NULL DEFAULT 0,
  placeholder   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS inscricoes (
  id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  itinerario_id   INTEGER NOT NULL REFERENCES itinerarios(id),
  dia             TEXT NOT NULL CHECK (dia IN ('terca','quarta')),
  nome_aluno      TEXT NOT NULL,
  turma_aluno     TEXT NOT NULL,
  nome_norm       TEXT NOT NULL,
  turma_norm      TEXT NOT NULL,
  confirmado      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE inscricoes ADD COLUMN IF NOT EXISTS confirmado BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_inscricoes_dia_aluno
  ON inscricoes(dia, nome_norm, turma_norm);

CREATE INDEX IF NOT EXISTS idx_inscricoes_itinerario
  ON inscricoes(itinerario_id);
