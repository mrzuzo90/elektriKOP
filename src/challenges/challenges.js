// Guiones de prueba del Modo Desafío: uno por ejercicio de
// docs/ejercicios/. El `id` coincide con el nombre de esa carpeta (solo
// como referencia cruzada, no se usa para cargar nada de ahí). Cada guion
// se ejecuta contra el ladder actual del alumno con runChallenge()
// (src/utils/challengeRunner.js) y se verifica contra la solución de
// referencia real en challengeRunner.test.js.
export const CHALLENGES = [
  {
    id: "01-marcha-paro-enclavamiento",
    title: "Marcha/Paro",
    steps: [
      { type: "set", addr: "I0.0", value: true },
      { type: "wait", scans: 2 },
      { type: "assert", addr: "Q0.0", value: true, label: "El motor arranca al pulsar Marcha (I0.0)" },
      { type: "set", addr: "I0.0", value: false },
      { type: "wait", scans: 2 },
      { type: "assert", addr: "Q0.0", value: true, label: "Sigue en marcha al soltar Marcha (enclavamiento)" },
      { type: "set", addr: "I0.1", value: true },
      { type: "wait", scans: 2 },
      { type: "assert", addr: "Q0.0", value: false, label: "Se para al pulsar Paro (I0.1)" },
      { type: "set", addr: "I0.1", value: false },
      { type: "wait", scans: 2 },
      { type: "assert", addr: "Q0.0", value: false, label: "No rearranca solo al soltar Paro" },
      { type: "set", addr: "I0.0", value: true },
      { type: "wait", scans: 2 },
      { type: "assert", addr: "Q0.0", value: true, label: "Vuelve a arrancar al pulsar Marcha de nuevo" },
    ],
  },
  {
    id: "02-semaforo-temporizadores",
    title: "Semáforo (TON)",
    steps: [
      { type: "set", addr: "I0.0", value: true },
      { type: "wait", scans: 10 }, // t = 1.0 s
      { type: "assert", addr: "Q0.0", value: true, label: "Rojo encendido al arrancar (t=1.0s)" },
      { type: "assert", addr: "Q0.1", value: false, label: "Verde apagado al arrancar (t=1.0s)" },
      { type: "assert", addr: "Q0.2", value: false, label: "Amarillo apagado al arrancar (t=1.0s)" },
      { type: "wait", scans: 40 }, // t = 5.0 s
      { type: "assert", addr: "Q0.1", value: true, label: "Verde encendido tras el rojo (t=5.0s)" },
      { type: "assert", addr: "Q0.0", value: false, label: "Rojo apagado en fase verde (t=5.0s)" },
      { type: "wait", scans: 40 }, // t = 9.0 s
      { type: "assert", addr: "Q0.2", value: true, label: "Amarillo encendido tras el verde (t=9.0s)" },
      { type: "assert", addr: "Q0.1", value: false, label: "Verde apagado en fase amarilla (t=9.0s)" },
      { type: "wait", scans: 15 }, // t = 10.5 s
      { type: "assert", addr: "Q0.0", value: true, label: "El ciclo se repite: rojo otra vez (t=10.5s)" },
      { type: "assert", addr: "Q0.2", value: false, label: "Amarillo apagado al reiniciar el ciclo (t=10.5s)" },
    ],
  },
  {
    id: "03-puerta-automatica-finales-carrera",
    title: "Puerta automática",
    steps: [
      // Puerta cerrada en reposo: el sensor FC_Cerrada está activado físicamente.
      { type: "set", addr: "I0.3", value: true },
      { type: "wait", scans: 2 },
      { type: "assert", addr: "Q0.0", value: false, label: "Nada en marcha con la puerta cerrada en reposo" },
      { type: "assert", addr: "Q0.1", value: false, label: "Motor cerrar apagado con la puerta ya cerrada" },
      // Pulsar Abrir
      { type: "set", addr: "I0.0", value: true },
      { type: "wait", scans: 2 },
      { type: "assert", addr: "Q0.0", value: true, label: "El motor de abrir arranca al pulsar Abrir" },
      { type: "set", addr: "I0.0", value: false },
      { type: "wait", scans: 2 },
      { type: "assert", addr: "Q0.0", value: true, label: "Sigue abriendo al soltar el pulsador (enclavamiento)" },
      // La puerta se aleja del cierre: el sensor FC_Cerrada deja de estar activado.
      { type: "set", addr: "I0.3", value: false },
      { type: "wait", scans: 2 },
      // Pulsar Cerrar a mitad de camino: debe invertir de inmediato.
      { type: "set", addr: "I0.1", value: true },
      { type: "wait", scans: 2 },
      { type: "assert", addr: "Q0.0", value: false, label: "Abrir se detiene al ordenar Cerrar mientras abría" },
      { type: "assert", addr: "Q0.1", value: true, label: "Cerrar arranca de inmediato (inversión de sentido)" },
      { type: "set", addr: "I0.1", value: false },
      { type: "wait", scans: 2 },
      { type: "assert", addr: "Q0.1", value: true, label: "Sigue cerrando al soltar el pulsador (enclavamiento)" },
      // Llega al tope cerrado.
      { type: "set", addr: "I0.3", value: true },
      { type: "wait", scans: 2 },
      { type: "assert", addr: "Q0.1", value: false, label: "Cerrar se detiene al llegar al final de carrera cerrada" },
    ],
  },
  {
    id: "04-cintas-transportadoras-fc",
    title: "Cintas con FC",
    steps: [
      { type: "set", addr: "I0.0", value: true }, // Marcha_Sistema
      { type: "wait", scans: 2 },
      { type: "assert", addr: "Q0.0", value: false, label: "Cinta 1 parada mientras no se pulse su marcha" },
      { type: "assert", addr: "Q0.1", value: false, label: "Cinta 2 parada mientras no se pulse su marcha" },
      { type: "set", addr: "I0.1", value: true }, // Marcha_Cinta1
      { type: "wait", scans: 25 }, // t = 2.5s desde Marcha_Cinta1
      { type: "assert", addr: "Q0.0", value: false, label: "Cinta 1 aún no arranca a los 2.5s (preset 3s)" },
      { type: "wait", scans: 10 }, // t = 3.5s desde Marcha_Cinta1
      { type: "assert", addr: "Q0.0", value: true, label: "Cinta 1 arranca a los 3s de pulsar su marcha" },
      { type: "assert", addr: "Q0.1", value: false, label: "Cinta 2 sigue parada: nunca se pulsó su marcha" },
      { type: "set", addr: "I0.2", value: true }, // Marcha_Cinta2
      { type: "wait", scans: 10 }, // t = 1.0s desde Marcha_Cinta2
      { type: "assert", addr: "Q0.1", value: false, label: "Cinta 2 aún no arranca al segundo de pulsar su marcha" },
      { type: "assert", addr: "Q0.0", value: true, label: "Cinta 1 no se ve afectada por el arranque de la cinta 2" },
      { type: "wait", scans: 20 }, // t = 3.0s desde Marcha_Cinta2
      { type: "assert", addr: "Q0.1", value: true, label: "Cinta 2 arranca a los 3s de SU PROPIA marcha, con temporizador independiente" },
      { type: "assert", addr: "Q0.0", value: true, label: "Cinta 1 sigue en marcha, cada llamada mantuvo su propio tiempo" },
    ],
  },
  {
    id: "05-contador-piezas-marca",
    title: "Contador de piezas",
    steps: [
      { type: "wait", scans: 1 },
      { type: "assert", addr: "Q0.1", value: true, label: "El motor arranca en reposo (lote no completo)" },
      { type: "assert", addr: "M0.0", value: false, label: "La marca Lote_Completo empieza a false" },
      // 4 pulsos de pieza (flanco de subida cada vez) — todavía no llega a 5.
      { type: "set", addr: "I0.0", value: true }, { type: "wait", scans: 2 },
      { type: "set", addr: "I0.0", value: false }, { type: "wait", scans: 2 },
      { type: "set", addr: "I0.0", value: true }, { type: "wait", scans: 2 },
      { type: "set", addr: "I0.0", value: false }, { type: "wait", scans: 2 },
      { type: "set", addr: "I0.0", value: true }, { type: "wait", scans: 2 },
      { type: "set", addr: "I0.0", value: false }, { type: "wait", scans: 2 },
      { type: "set", addr: "I0.0", value: true }, { type: "wait", scans: 2 },
      { type: "set", addr: "I0.0", value: false }, { type: "wait", scans: 2 },
      { type: "assert", addr: "M0.0", value: false, label: "Con 4 piezas contadas, el lote todavía no está completo" },
      { type: "assert", addr: "Q0.1", value: true, label: "El motor sigue en marcha con 4 piezas" },
      // 5º pulso: completa el lote.
      { type: "set", addr: "I0.0", value: true }, { type: "wait", scans: 2 },
      { type: "set", addr: "I0.0", value: false }, { type: "wait", scans: 2 },
      { type: "assert", addr: "M0.0", value: true, label: "A la 5ª pieza, la marca Lote_Completo se activa" },
      { type: "assert", addr: "Q0.0", value: true, label: "La alarma se enciende al completar el lote" },
      { type: "assert", addr: "Q0.1", value: false, label: "El motor se detiene por el interbloqueo con la marca" },
      // Reset: libera la marca y el motor, sin necesidad de un segmento aparte.
      { type: "set", addr: "I0.1", value: true }, { type: "wait", scans: 2 },
      { type: "assert", addr: "M0.0", value: false, label: "Reset libera la marca Lote_Completo" },
      { type: "assert", addr: "Q0.0", value: false, label: "La alarma se apaga tras el Reset" },
      { type: "assert", addr: "Q0.1", value: true, label: "El motor vuelve a arrancar tras el Reset" },
    ],
  },
];
