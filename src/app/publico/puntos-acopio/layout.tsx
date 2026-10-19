import type { Viewport } from "next";

// Esta pantalla la abren extraños desde un link de WhatsApp, en cualquier
// teléfono y con cualquier preferencia de tema. Sin declarar que soporta
// ambos esquemas, algunos navegadores (sobre todo en Android) la repintan
// con un "modo oscuro forzado" heurístico que ignora los colores reales del
// sitio — así se veían las letras sin contraste. Con esto, el navegador usa
// las clases dark: de abajo en vez de adivinar.
export const viewport: Viewport = {
  colorScheme: "light dark",
};

export default function PublicoPuntosAcopioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
