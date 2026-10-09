#!/bin/sh
# Vercel CLI para ESTE proyecto (pime-v2). El entorno de la sesión trae VERCEL_ORG_ID/VERCEL_PROJECT_ID del
# proyecto viejo (pimepanama-wt62): si no se quitan, cualquier `vercel deploy` iría al proyecto de pimepanama.com.
# El token sale de pimepanama/.claude/settings.local.json (misma cuenta javidavo05). Nunca imprime el token.
TOKEN=$(node -e "const s=require('/Users/javiervallejo/Documents/Websites/pimepanama/.claude/settings.local.json');process.stdout.write(s.env.VERCEL_TOKEN||'')")
exec env -u VERCEL_PROJECT_ID -u VERCEL_ORG_ID npx vercel --cwd /Users/javiervallejo/Documents/Websites/pime-v2 --scope javier-vallejos-projects --token "$TOKEN" "$@"
