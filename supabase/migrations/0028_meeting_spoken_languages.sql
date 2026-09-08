-- 0028_meeting_spoken_languages.sql
-- Una reunión puede ser bilingüe.
--
-- Hasta ahora `Meeting.language` era una sola cosa y se usaba para dos que no
-- son la misma: en qué idioma se habla y en qué idioma sale la minuta. Con eso,
-- una reunión mitad en español y mitad en inglés se transcribía forzando un solo
-- idioma en Whisper, y todo lo dicho en el otro salía como ruido — Whisper
-- intenta oír español donde hay inglés y devuelve palabras inventadas que suenan
-- parecido.
--
-- `spokenLanguages` son los idiomas que se hablan en la reunión. Con más de uno,
-- la transcripción deja que Whisper detecte el idioma tramo por tramo, que es lo
-- único que funciona cuando la gente cambia de idioma a media conversación.
-- `language` se queda como el idioma en el que se redacta la minuta y lo que
-- sale hacia el cliente.
--
-- Idempotente: se puede correr varias veces sin efecto.

ALTER TABLE "Meeting"
    ADD COLUMN IF NOT EXISTS "spokenLanguages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Las reuniones existentes hablaban el idioma que tenían declarado.
UPDATE "Meeting"
SET "spokenLanguages" = ARRAY["language"]
WHERE cardinality("spokenLanguages") = 0;
