-- Migration 0015: Contenido estructurado de propuesta de proyecto (IA) para el PDF de propuesta comercial

SET search_path TO public;

ALTER TABLE "Project"
  ADD COLUMN IF NOT EXISTS "proposalContent" JSONB;
