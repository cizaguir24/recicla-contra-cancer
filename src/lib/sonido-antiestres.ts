// Sonido del botón antiestrés, sintetizado con Web Audio (sin archivos): un
// "pop" suave seguido de unas campanitas en escala pentatónica, que siempre
// suenan bien juntas. El navegador solo permite audio tras un clic, por eso el
// contexto se crea la primera vez que se pulsa el botón.

const LLAVE_SILENCIO = "recicla-antiestres-silencio";
const PENTATONICA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];

let audio: AudioContext | null = null;

export function leerSilencio(): boolean {
  try {
    return localStorage.getItem(LLAVE_SILENCIO) === "1";
  } catch {
    return false;
  }
}

export function guardarSilencio(silencio: boolean) {
  try {
    localStorage.setItem(LLAVE_SILENCIO, silencio ? "1" : "0");
  } catch {
    // Sin almacenamiento disponible (modo privado, etc.): solo dura la sesión.
  }
}

function obtenerContexto(): AudioContext | null {
  if (audio) return audio;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  audio = new Ctor();
  return audio;
}

function tono(
  ac: AudioContext,
  { tipo, desde, hasta, inicio, duracion, volumen }: {
    tipo: OscillatorType;
    desde: number;
    hasta: number;
    inicio: number;
    duracion: number;
    volumen: number;
  },
) {
  const osc = ac.createOscillator();
  const ganancia = ac.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(desde, inicio);
  if (hasta !== desde) osc.frequency.exponentialRampToValueAtTime(hasta, inicio + duracion);
  // Entrada rápida y caída exponencial: sin "clics" al empezar ni al terminar.
  ganancia.gain.setValueAtTime(0.0001, inicio);
  ganancia.gain.exponentialRampToValueAtTime(volumen, inicio + 0.008);
  ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
  osc.connect(ganancia).connect(ac.destination);
  osc.start(inicio);
  osc.stop(inicio + duracion + 0.05);
}

export function reproducirSonidoAntiestres() {
  if (typeof window === "undefined") return;
  try {
    const ac = obtenerContexto();
    if (!ac) return;
    if (ac.state === "suspended") void ac.resume();
    const t0 = ac.currentTime + 0.01;

    // Pop: una burbuja que sube y se apaga.
    tono(ac, { tipo: "sine", desde: 220, hasta: 620, inicio: t0, duracion: 0.11, volumen: 0.22 });

    // Campanitas: 3 notas al azar de la escala, en orden ascendente.
    const elegidas = [...PENTATONICA]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .sort((a, b) => a - b);
    elegidas.forEach((frecuencia, i) => {
      const inicio = t0 + 0.07 + i * 0.085;
      tono(ac, { tipo: "sine", desde: frecuencia, hasta: frecuencia, inicio, duracion: 0.9, volumen: 0.09 });
      // Armónico suave para que suene a campanita y no a pitido.
      tono(ac, { tipo: "triangle", desde: frecuencia * 2, hasta: frecuencia * 2, inicio, duracion: 0.45, volumen: 0.025 });
    });
  } catch {
    // Si el audio falla, el confeti igual se muestra.
  }
}
