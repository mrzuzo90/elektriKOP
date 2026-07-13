# ElektriKOP

**Emulador de lógica de escalera (KOP) para estudiantes de automatización industrial — 100% en español, gratuito y de código abierto.**

![Licencia](https://img.shields.io/badge/licencia-MIT-yellow) ![Estado](https://img.shields.io/badge/estado-en%20desarrollo-orange) ![Hecho con](https://img.shields.io/badge/hecho%20con-React-blue)

### 🔗 [Pruébalo ahora en kop.elektrizia.com](https://kop.elektrizia.com) — sin instalar nada

---

## ¿Qué es ElektriKOP?

ElektriKOP es un simulador visual de lógica de escalera (KOP / Ladder Diagram) inspirado en el entorno de programación de un PLC Siemens S7-1200. Permite montar segmentos de automatización — contactos, bobinas, temporizadores, enclavamientos — y ver en tiempo real cómo fluye la corriente por el circuito, sin necesitar TIA Portal, licencias, ni hardware real.

Está pensado para **estudiantes de ciclos de automatización y electricidad** (como el certificado de profesionalidad ELEE0109), profesores que quieran una herramienta de apoyo en clase, o cualquiera que quiera entender cómo piensa un PLC antes de sentarse delante del software industrial de verdad.

## Por qué existe

TIA Portal es el estándar de la industria, pero tiene barreras de entrada reales para un estudiante:

- Licencia de pago (o de campus, con acceso limitado).
- Solo corre en Windows — un dolor de cabeza en Mac o Linux.
- La curva de entrada es alta si lo primero que ves es el software completo, con todas sus opciones.

ElektriKOP no sustituye a TIA Portal — es un compañero de estudio: un sitio donde equivocarte gratis, entender por qué un circuito no enclava, y coger intuición sobre lógica de escalera antes de enfrentarte al programa real.

## Características

**Editor KOP**
- Segmentos con contactos en serie y en paralelo (ramas anidadas, sin límite artificial de profundidad).
- Contactos NA / NC conmutables con un clic.
- Bobina directa, SET, RESET y temporizador TON.
- Visualización en tiempo real del flujo de corriente por el circuito, como en TIA Portal.
- Detección de direcciones de salida duplicadas entre segmentos (evita bugs típicos de principiante).

**Simulación**
- 10 entradas digitales (I0.0–I0.9) y 10 salidas digitales (Q0.0–Q0.9).
- Ciclo de scan automático o **modo paso a paso**, para ver exactamente qué pasa en cada pasada.
- Contador de ciclos de scan visible en la pantalla del HMI.

**Panel HMI**
- Interruptores, pulsadores momentáneos y una seta de PARO con enclavamiento — los tres tipos de entrada más habituales en campo.
- Pantalla LCD retro con estado del sistema y temporizadores activos.

**Cableado físico NA/NC**
- Cada entrada puede marcarse como normalmente abierta o normalmente cerrada a nivel de dispositivo físico (por ejemplo, un termostato NC), independientemente del contacto que uses en el segmento — igual que en una instalación real.

**Proceso simulado**
- Asigna a cada dirección un dispositivo visual animado: motor, cinta transportadora, sensor, lámpara, alarma o puerta.
- Solo se muestran las direcciones que estás usando de verdad en tus segmentos.
- Aviso sonoro (silenciable) cuando se activa una alarma.

**Tabla de variables**
- Asigna nombres simbólicos a tus direcciones (por ejemplo, `I0.2` → `Marcha_M1`) y verlos reflejados directamente en el editor.

**Deshacer/rehacer y autoguardado**
- Ctrl+Z / Ctrl+Shift+Z (o los botones ⟲/⟳) para deshacer y rehacer, hasta 50 pasos.
- El proyecto se autoguarda solo en el navegador — cerrar o recargar la pestaña por accidente ya no significa perder el trabajo.

**Modo Desafío**
- Comprueba automáticamente si tu solución a uno de los [ejercicios propuestos](docs/ejercicios/) se comporta como debe, ciclo a ciclo — valida el resultado, no cómo has dibujado el circuito, así que cualquier forma correcta de resolverlo vale.

**Proyectos**
- Exporta e importa proyectos completos en JSON — no pierdes tu trabajo al cerrar la pestaña, y puedes compartir ejercicios con compañeros o alumnos.

## Capturas

![Editor KOP con el Proceso simulado y el panel HMI](docs/images/editor.png)

## Instalación

La forma más rápida de usar ElektriKOP es entrar directamente en **[kop.elektrizia.com](https://kop.elektrizia.com)** — no hace falta clonar el repo, instalar nada, ni saber nada de React. Se ejecuta entero en tu navegador, no envía datos a ningún servidor, y tu proyecto se autoguarda localmente en tu propio navegador.

Si prefieres ejecutarlo en local (por ejemplo, para modificar el código):

ElektriKOP es un componente de React sin dependencias de backend. Para ejecutarlo en local:

```bash
git clone https://github.com/mrzuzo90/elektriKOP.git
cd elektriKOP
npm install
npm run dev
```

Abre `http://localhost:5173` (o el puerto que indique tu terminal) y listo.

> Si vienes de un proyecto React ya existente, también puedes copiar la carpeta `src/` completa a tu propio proyecto — solo necesita React y `@fontsource/silkscreen` (la tipografía retro, autoalojada: se empaqueta con el build, sin llamadas a servicios externos en tiempo de ejecución).

## Cómo usar

1. **Renombra el proyecto** haciendo clic en el título de la barra lateral.
2. **Añade un segmento** con el botón correspondiente en el editor.
3. **Añade contactos** en serie (`+C`) o en paralelo (`+P`), y elige su dirección (I o Q) en el desplegable.
4. Haz clic sobre un contacto para alternarlo entre normalmente abierto (NA) y normalmente cerrado (NC).
5. Elige el tipo de salida del segmento: bobina directa, SET, RESET o temporizador TON.
6. Pulsa **RUN** para simular, o **1 CICLO** para avanzar el scan paso a paso.
7. Usa el **Panel HMI** para activar tus entradas — interruptores, pulsadores o la seta de PARO, según cómo las hayas configurado en el **Proceso simulado**.
8. Cuando quieras guardar tu trabajo, usa **Exportar** — te descarga un `.json` que puedes volver a cargar con **Importar** en cualquier momento. (No es imprescindible: tu proyecto se autoguarda solo, y siempre puedes deshacer con Ctrl+Z si te equivocas.)
9. Si estás resolviendo uno de los [ejercicios propuestos](docs/ejercicios/), abre el panel **Modo Desafío** (barra derecha) y pulsa **Comprobar** para validar tu solución automáticamente.

## Ejercicios propuestos

En [`docs/ejercicios/`](docs/ejercicios/) encontrarás ejercicios de dificultad creciente, cada uno con su enunciado y un `.json` con la solución listo para importar:

1. [Marcha/Paro con enclavamiento](docs/ejercicios/01-marcha-paro-enclavamiento/enunciado.md) ⭐
2. [Semáforo con temporizadores](docs/ejercicios/02-semaforo-temporizadores/enunciado.md) ⭐⭐
3. [Puerta automática con finales de carrera](docs/ejercicios/03-puerta-automatica-finales-carrera/enunciado.md) ⭐⭐⭐

> Si te animas a crear más ejercicios (propuestos y, ojalá, también resueltos), ¡son bienvenidos como *pull request*!

## Roadmap / ideas futuras

- [x] Ejercicios propuestos y resueltos en `docs/ejercicios/`.
- [x] Deshacer/rehacer y autoguardado.
- [x] Modo Desafío: valida automáticamente el resultado esperado de un ejercicio.
- [ ] Más tipos de temporizador (TOF, TP).
- [ ] Contadores (CTU/CTD).
- [ ] Comparadores numéricos (`>=`, `==`) sobre valores simulados.
- [ ] Compartir proyectos mediante un enlace, sin necesidad de archivo.

Si tienes una idea, abre un *issue* — toda sugerencia de un caso de uso real de aula es bienvenida.

## Contribuir

Las contribuciones son bienvenidas, especialmente:

- Más ejercicios (propuestos y, si puede ser, también resueltos) para `docs/ejercicios/`.
- Corrección de errores de lógica en la simulación.
- Traducciones (el proyecto nació en español, pero un `README.en.md` sería estupendo).

Para contribuir código: haz un *fork*, crea una rama descriptiva, y abre un *pull request* explicando el cambio.

## Licencia

Este proyecto está bajo licencia MIT — úsalo, modifícalo y compártelo libremente, incluso en tus propias clases o formaciones.

## Autor

Creado por **Zuzo** ([@mrzuzo90](https://github.com/mrzuzo90)) mientras cursaba el certificado de profesionalidad ELEE0109, como herramienta de estudio propia que terminó mereciendo ser compartida.

Si esta herramienta te sirve en clase, en un curso que impartas, o simplemente te resultó útil para entender lógica de escalera, un ⭐ en el repo o un comentario en el *issue tracker* siempre alegra el día.