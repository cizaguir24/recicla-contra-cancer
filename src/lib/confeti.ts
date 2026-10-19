// Confeti que cae desde arriba de la pantalla, dibujado en un canvas de página
// completa. Sin dependencias: cada llamada suma una tanda de partículas y, al
// terminar de caer la última, el canvas se retira solo.

const COLORES = ["#ff3b5c", "#ff8a1f", "#ffd21f", "#2fc95a", "#19c8d4", "#1f8bff", "#6a4cff", "#c92fe0"];
const MAX_PARTICULAS = 700;

type Forma = "cuadro" | "circulo" | "triangulo" | "tira" | "elipse";
const FORMAS: Forma[] = ["cuadro", "circulo", "triangulo", "tira", "elipse"];

type Particula = {
  x: number;
  y: number;
  vy: number; // caída, px/s
  deriva: number; // movimiento lateral base, px/s
  amplitud: number; // vaivén lateral, px/s
  frecuencia: number;
  fase: number;
  rot: number;
  vrot: number;
  giro: number; // volteo en 3D simulado
  vgiro: number;
  ancho: number;
  alto: number;
  color: string;
  forma: Forma;
};

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let particulas: Particula[] = [];
let cuadro = 0;
let anterior = 0;
let tiempo = 0;
let dpr = 1;

const azar = (min: number, max: number) => min + Math.random() * (max - min);

function ajustarTamano() {
  if (!canvas) return;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
}

function crearParticula(ancho: number, alto: number): Particula {
  const forma = FORMAS[Math.floor(Math.random() * FORMAS.length)];
  const tamano = azar(6, 13);
  return {
    x: azar(0, ancho),
    // Arrancan escalonadas por encima de la pantalla para que lluevan en continuo.
    y: -azar(10, alto * 0.5),
    // La caída escala con la altura de la pantalla: en un monitor alto no se arrastra.
    vy: alto * azar(0.1, 0.26),
    deriva: azar(-25, 25),
    amplitud: azar(15, 60),
    frecuencia: azar(1.2, 3),
    fase: azar(0, Math.PI * 2),
    rot: azar(0, Math.PI * 2),
    vrot: azar(-4, 4),
    giro: azar(0, Math.PI * 2),
    vgiro: azar(2, 7),
    ancho: forma === "tira" ? tamano * 0.28 : tamano,
    alto: forma === "tira" ? tamano * 1.6 : forma === "elipse" ? tamano * 0.65 : tamano,
    color: COLORES[Math.floor(Math.random() * COLORES.length)],
    forma,
  };
}

function dibujar(p: Particula) {
  if (!ctx) return;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.scale(1, Math.max(0.15, Math.abs(Math.cos(p.giro)))); // efecto de volteo
  ctx.fillStyle = p.color;
  const w = p.ancho;
  const h = p.alto;
  switch (p.forma) {
    case "circulo":
      ctx.beginPath();
      ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "elipse":
      ctx.beginPath();
      ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "triangulo":
      ctx.beginPath();
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(w / 2, h / 2);
      ctx.lineTo(-w / 2, h / 2);
      ctx.closePath();
      ctx.fill();
      break;
    default:
      ctx.fillRect(-w / 2, -h / 2, w, h);
  }
  ctx.restore();
}

function detener() {
  cancelAnimationFrame(cuadro);
  cuadro = 0;
  window.removeEventListener("resize", ajustarTamano);
  canvas?.remove();
  canvas = null;
  ctx = null;
  particulas = [];
}

function paso(ahora: number) {
  if (!canvas || !ctx) return;
  const dt = Math.min((ahora - anterior) / 1000, 0.05);
  anterior = ahora;
  tiempo += dt;

  const ancho = window.innerWidth;
  const alto = window.innerHeight;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, ancho, alto);

  particulas = particulas.filter((p) => p.y < alto + 30);
  for (const p of particulas) {
    p.y += p.vy * dt;
    p.x += (p.deriva + Math.sin(tiempo * p.frecuencia + p.fase) * p.amplitud) * dt;
    p.rot += p.vrot * dt;
    p.giro += p.vgiro * dt;
    if (p.y > -20) dibujar(p);
  }

  if (particulas.length === 0) {
    detener();
    return;
  }
  cuadro = requestAnimationFrame(paso);
}

export function lanzarConfeti(cantidad = 160) {
  if (typeof window === "undefined") return;

  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, {
      position: "fixed",
      inset: "0",
      width: "100vw",
      height: "100vh",
      pointerEvents: "none",
      zIndex: "3000",
    });
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
    if (!ctx) {
      detener();
      return;
    }
    ajustarTamano();
    window.addEventListener("resize", ajustarTamano);
  }

  // Menos partículas en pantallas angostas, para que no se vea saturado.
  const escala = Math.min(1, window.innerWidth / 1100);
  const nuevas = Math.max(40, Math.round(cantidad * Math.max(0.5, escala)));
  const espacio = Math.max(0, MAX_PARTICULAS - particulas.length);
  for (let i = 0; i < Math.min(nuevas, espacio); i++) {
    particulas.push(crearParticula(window.innerWidth, window.innerHeight));
  }

  if (!cuadro) {
    anterior = performance.now();
    cuadro = requestAnimationFrame(paso);
  }
}
