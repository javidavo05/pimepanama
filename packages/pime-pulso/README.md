# Pime Pulso

Un archivo (`pulso.ts`) que cada sistema entregado por Pime instala para reportar a Pime:

- **Errores**: agrupados por huella; el mismo error repetido se manda una vez cada 10 min con el conteo.
- **Despliegues**: queda en la línea de tiempo interna del cliente.
- **Salud**: Pime consulta la dirección de salud cada 30 min. Dos fallos seguidos = caído = alerta al celular y correo, y el cliente ve «Con problemas» en su cuenta.
- **Latidos** (opcional): para sistemas con cron propio; más de 3 h sin latido = «sin señal».

Firma igual que el control plane de God Mode: `X-Pime-Timestamp` en milisegundos y
`X-Pime-Signature = hex(HMAC-SHA256(secreto, "${timestamp}.${cuerpo}"))`, más `X-Pime-System` con la key.

Las instrucciones de instalación están al inicio de `pulso.ts`. La key y el secreto de cada sistema se ven en
`/empresa/sistemas/<id>`. El secreto no se guarda en la base: se deriva de `PIME_PULSO_SECRET`; rotarlo invalida el anterior al instante.

## Sistemas que no son Next.js

Cualquier lenguaje sirve: es un POST JSON firmado.

```bash
TS=$(node -p "Date.now()")
BODY='{"id":"evt-'$TS'","type":"error","data":{"message":"No conecta a la base","level":"grave"}}'
SIG=$(node -e "const c=require('crypto');console.log(c.createHmac('sha256',process.env.PIME_PULSO_SECRET).update(process.argv[1]+'.'+process.argv[2]).digest('hex'))" "$TS" "$BODY")
curl -sS -X POST https://pimepanama.com/api/pulso \
  -H "content-type: application/json" -H "x-pime-system: $PIME_PULSO_KEY" \
  -H "x-pime-timestamp: $TS" -H "x-pime-signature: $SIG" -d "$BODY"
```
