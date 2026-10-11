# Prompt maestro · Pime Suite

Plataforma de gestión de una corporación tecnológica. Escrito el 11 de octubre de 2026.

Úsalo completo como instrucción para quien construya o continúe la plataforma, sea una persona o un agente de IA. Cada módulo dice qué resuelve, qué ve la persona y cuándo está terminado.

---

## 1. Quién eres y para quién construyes

Construyes **Pime Suite**, el sistema con el que **Pime Panamá** opera su empresa. Pime es una corporación tecnológica que diseña, programa, entrega y mantiene software a medida (ERP, CRM, plataformas) para empresas en Panamá. Vive en `pimepanama.com/empresa` para el equipo y en `pimepanama.com/cliente` para los clientes.

La persona que más la usa es el dueño. Trabaja desde el teléfono, entre reuniones, y necesita saber en segundos:

- qué tiene que hacer hoy,
- quién le debe,
- qué está por cobrar,
- qué entró,
- qué sistema de un cliente tiene problemas.

Si una pantalla no responde una de esas preguntas o no ayuda a actuar sobre ella, sobra.

## 2. Principios que no se negocian

1. **Un solo motor.** Cliente → proyecto → fase → factura → pago están siempre ligados. Ninguna factura nace sin cliente. Si se nombra un cliente que no existe, se busca y, si no existe, se crea. Un proyecto muestra su dinero real. Nada vive en un módulo aislado.
2. **Asistentes de pocos pasos para lo frecuente.** Crear un proyecto, cobrar, conectar una cuenta, registrar un pago: tres pasos como máximo, con todo lo que se pueda inferir ya puesto. No se hace un asistente para lo que se hace una vez al año.
3. **Hablarle al sistema.** Todo lo frecuente también se puede pedir en lenguaje natural, escrito o por voz, al asistente (sección 4).
4. **Colores con significado, iguales en toda la plataforma:**
   - **Rojo:** dinero vencido, que alguien debe y ya pasó su fecha. También un sistema caído.
   - **Azul:** dinero por cobrar que todavía no vence.
   - **Verde:** dinero que entró o un pago confirmado. También un sistema en línea.
   - **Ámbar:** lo que espera una decisión o vence en los próximos 3 días.
   - **Gris:** borradores y cosas sin efecto todavía.
   - El color nunca va solo: siempre lleva texto o un icono. Lo leen personas daltónicas y lectores de pantalla.
5. **Nada sale a un cliente sin permiso.** Toda comunicación a clientes pasa por `enviarAlCliente`, que hoy está apagado en la base y en el servidor. El asistente nunca envía a clientes; prepara y deja en borrador.
6. **Confirmar antes de escribir.** El asistente puede leer todo, pero antes de crear, cambiar o borrar muestra qué va a hacer y espera un «sí». Lo que crea queda en borrador cuando aplica (facturas, órdenes de cambio).
7. **Marca y oficio:**
   - Manrope como única familia.
   - Logo «Capas abiertas». Línea Normal en azul tinta y línea Premium en negro y oro.
   - Escala de espacios 4/8/12/16/24/32/48.
   - Toda vista con datos tiene carga, vacío y error.
   - Papel tamaño carta (Letter) para todo documento.
   - Nada se da por terminado sin la revisión en los 69 teléfonos actuales, contra el build de producción local.
8. **Datos y seguridad:**
   - Migraciones SQL numeradas en `supabase/migrations/` (nunca `prisma migrate` ni `db push`), con RLS activo y sin políticas.
   - Doble verificación obligatoria para el equipo.
   - Secretos cifrados y nunca mostrados en avisos.
   - Auditoría de cambios en dinero.

## 3. Inicio: «Hoy»

La primera pantalla, pensada para el teléfono. En este orden:

1. **Saludo con el resumen en una línea.** Ejemplo: «Hoy: 3 reuniones, 2 cobros vencidos por USD 2,250, 1 sistema caído».
2. **Alertas rojas**, solo si existen:
   - facturas vencidas, con cliente, monto y días de atraso;
   - sistemas caídos;
   - tickets urgentes sin responder.
   Cada alerta lleva su acción en un toque: Cobrar, Registrar pago, Ver sistema, Responder.
3. **Agenda de hoy, en orden de hora**, juntando:
   - eventos de Google Calendar;
   - citas de PimeBook;
   - reuniones de PimeMeet;
   - tareas que vencen hoy;
   - cuotas que vencen hoy.
   Lo que ya pasó se atenúa y lo siguiente se destaca.
4. **Dinero en tres números, con su color:**
   - Vencido (rojo).
   - Por cobrar (azul): incluye las cuotas de los próximos 30 días.
   - Entró este mes (verde): con la comparación contra el mes pasado.

   Tocar cualquiera abre la lista filtrada.
5. **Esperan tu decisión:**
   - órdenes de cambio sin enviar;
   - estimados por aprobar;
   - borradores de factura;
   - pagos reportados por clientes sin confirmar.
6. **Proyectos en curso:**
   - nombre, cliente y la barra de avance verificada con GitHub;
   - una marca ámbar si el repositorio lleva más de 14 días sin actividad.

Cuando no hay nada vencido ni urgente, se dice en una línea positiva y se pasa a la agenda. No se muestran tarjetas decorativas ni conteos que no llevan a una acción.

## 4. Asistente

### 4.1 Qué es

Es un botón fijo en toda la suite, abajo a la derecha en el teléfono y con el atajo ⌘K en la computadora. Abre una conversación. Se le habla de tres formas:

- **Texto.**
- **Voz.** Mantener presionado para hablar. El audio se transcribe con el modelo de voz que ya usan las reuniones (Whisper) y se muestra el texto antes de ejecutar.
- **Nota de voz larga.** Por ejemplo, el resumen de una llamada. El asistente propone tareas, notas al proyecto y cobros.

Usa las llaves de IA que ya tiene la plataforma. Los modelos actuales están en `src/lib/ai`.

### 4.2 Cómo trabaja

El modelo recibe herramientas (tool calling) del mismo motor de la plataforma. No escribe directo a la base:

| Herramienta | Qué hace |
|---|---|
| `buscar_cliente(texto)` | Encuentra por nombre aproximado, empresa, correo o alias. «Holo Realtor» encuentra «HOLO REAL ESTATE & RELOCATION, S.A.». Si hay más de uno, pregunta cuál. |
| `buscar_proyecto(texto, cliente?)` | Igual que la anterior, con proyectos. |
| `resumen_cliente(id)` | Saldo, vencido, proyectos, tickets y última actividad. |
| `crear_factura(cliente, concepto, monto, proyecto?)` | Crea la factura en borrador por el motor único (`crearCobro`). Sin proyecto es una factura aparte por ese concepto, ligada igual al cliente. Con proyecto, ofrece cobrar una fase o el plan si existen. |
| `registrar_pago(cliente, monto, fecha, método, factura?)` | Si no se dice la factura, la elige por antigüedad y lo dice. |
| `crear_tarea(texto, proyecto?, vence?, responsable?)` | Crea una tarea. |
| `nota_a_proyecto(proyecto, texto)` | Queda en la línea de tiempo interna del proyecto. |
| `crear_orden_de_cambio(proyecto, título, fases)` | Siempre en borrador. |
| `agenda(día)` | Lee la agenda unida del Inicio. |
| `estado_proyecto(proyecto)` | Fases, dinero y estado verificado con GitHub. |
| `estado_sistemas()` | Lee el pulso de los sistemas. |
| `cuanto_me_deben(cliente?)`, `que_entro(periodo)` | Consultas de dinero. |

### 4.3 Reglas del asistente

- Antes de escribir algo, muestra una tarjeta de confirmación con lo que hará. Ejemplo: «Factura en borrador · HOLO Real Estate · Asesoramiento de sitio web · USD 400.00 · sin proyecto». Tiene los botones Confirmar y Cambiar.
- Lo infiere todo y solo pregunta lo que no se puede deducir.
- Nunca envía correos a clientes. Si se le pide, responde que los envíos están apagados y deja el documento listo.
- Cada acción ejecutada queda en un registro, con quién la pidió, el texto o audio original y el resultado, y se puede deshacer cuando aplica.
- Responde en español, corto, y siempre con el enlace a lo que creó.

### 4.4 Criterios de aceptación con ejemplos reales

- «Haz una factura para Holo Realtor por 400.» Crea el borrador ligado a HOLO. Como HOLO tiene un proyecto, pregunta en un toque si es del proyecto «HOLO REALTY» o aparte.
- «Factura aparte a Holo por asesoramiento de sitio web, 400 dólares.» Crea un borrador sin proyecto con ese concepto.
- «Al proyecto de la Unión agrégale una tarea: revisar el acta de la junta para el viernes.» Crea la tarea con vencimiento el viernes próximo.
- «¿Cuánto me debe HOLO?» Responde con el monto, las facturas y los días de atraso, en rojo si está vencido.
- Una nota de voz de 2 minutos sobre una llamada termina en una lista de acciones propuestas para aprobar todas juntas.

## 5. Google Calendar

- Se conecta con OAuth de Google, una vez por persona, desde Configuración. Pide solo permiso de lectura del calendario (`calendar.readonly`).
- Lee los eventos de hoy y de los próximos 7 días para el Inicio y el asistente. La consulta se hace al abrir el Inicio, con caché de 5 minutos: nada de sondeos constantes contra Vercel.
- Más adelante, si se decide, crea eventos desde el asistente («agéndame con HOLO el martes a las 10») con permiso de escritura aparte.

## 6. Módulos de una corporación tecnológica

Cada módulo es una vista del mismo motor, no un sistema aparte.

1. **Clientes.**
   - La ficha es el centro: dinero con colores, proyectos, tickets, sistemas, cuenta del cliente, contratos, línea de tiempo.
   - Línea Normal o Premium con su tarifa, que se pone a mano.
2. **Comercial.**
   - El pipeline va de lead a propuesta, contrato y proyecto.
   - La propuesta se arma desde fases con precio y sale en PDF tamaño carta con la línea del cliente.
   - Al aceptarse crea el proyecto con sus fases y su plan de pagos, sin volver a escribir nada.
   - Lleva la probabilidad y el valor del pipeline por mes.
3. **Proyectos.**
   - Fases con precio y momento de cobro.
   - Avance verificado con GitHub por milestone.
   - Órdenes de cambio.
   - Tareas y repositorio.
   - Dinero del proyecto: presupuesto, facturado, cobrado, por cobrar.
   - Margen: precio contra horas internas por costo hora.
4. **Dinero.**
   - **Facturación:** factura electrónica DGI preparada para cuando se active; ITBMS por línea.
   - **Cobros y pagos:** un pago por fila, con comprobante.
   - **Cartera por antigüedad:** al día, 1 a 30 días, 31 a 60 días y más de 60, en rojo creciente.
   - **Por pagar:** gastos y proveedores.
   - **Ingresos recurrentes:** mantenimiento y hosting mensual de cada cliente, facturados solos en borrador.
   - **Flujo de caja proyectado a 90 días:** cuotas, recurrentes y gastos fijos.
   - **Conciliación con el banco:** importar el estado de cuenta y cruzarlo con los pagos.
5. **Soporte.**
   - Tickets con imágenes.
   - Horas en bloques de 15 minutos y mínimo 30.
   - Garantía de 90 días sin cobro.
   - Estimado aprobado por el cliente si pasa de 2 horas.
   - Factura mensual de horas en borrador.
   - Tiempo de primera respuesta.
6. **Sistemas entregados.**
   - Pulso de salud, errores agrupados y alertas graves al celular.
   - Accesos y cuentas de infraestructura cifrados.
   - Dominios, certificados y planes (Vercel, Supabase, otros) con fecha de renovación y costo mensual por cliente.
   - Aviso de lo que vence en 30 días.
7. **Equipo.**
   - Personas, roles y permisos por módulo.
   - Doble verificación.
   - Horas internas por proyecto, capacidad de la semana y comisiones.
8. **Reuniones.**
   - PimeMeet: grabación, minuta y acciones que van a tareas.
   - Ligadas al proyecto y al calendario.
9. **Comunicaciones.**
   - Bandeja de correo, plantillas de marca y firmas.
   - Interruptor general de envíos a clientes.
10. **Cuenta del cliente.**
    - Pocas pantallas y pocos clics, con la confianza visual de una fintech y la marca del landing.
    - Avance en vivo, saldo, pagar o reportar un pago, tickets y aprobaciones.
11. **Reportes.**
    - Ingresos por mes, ingresos recurrentes y su crecimiento.
    - Margen por proyecto y por cliente.
    - Cartera vencida, días promedio de cobro, conversión del pipeline y horas facturables contra no facturables.
12. **Configuración.**
    - Empresa y documentos.
    - Tarifas y líneas.
    - Cuentas de GitHub con su asistente, Google Calendar, métodos de pago.
    - Envíos a clientes, llaves de acceso.

## 7. Orden de construcción

1. Inicio «Hoy» con colores y agenda, con datos internos: tareas, citas, reuniones y vencimientos.
2. El asistente por texto, con las herramientas de lectura y crear factura, tarea y nota.
3. La voz en el asistente.
4. Google Calendar en la agenda.
5. Cartera por antigüedad e ingresos recurrentes.
6. Margen por proyecto y horas internas.
7. Cuenta del cliente con cara de fintech, cuando se enciendan los envíos.
8. Factura electrónica DGI y conciliación bancaria.

Cada etapa cierra con:

- pruebas automáticas;
- la prueba contra la base real con datos «[prueba]», borrados después;
- la revisión en 69 teléfonos con cero graves;
- el build de producción en verde;
- el registro en el artifact de avance.
