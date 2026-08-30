export type Locale = "en" | "es";

export const copy = {
  en: {
    brand: "Casted",
    picture: "A picture",
    ageLine: "Tonight, you open.",
    ageSub: "One night. One film. You are 18 or older.",
    ageButton: "Admit one",
    releaseEyebrow: "Talent release  ·  No. 001",
    releaseTitle: "This generation only",
    releaseBody:
      "I am the face on this film. I allow biometric processing for this generation only. The still is destroyed after the lab takes it. There is no file upload.",
    releaseSign: "I sign",
    releaseEnter: "Enter the set",
    cameraDenied:
      "The lens is closed. Allow the camera in your browser. There is no file upload.",
    cameraMissing: "No camera on this house.",
    retryCamera: "Open the lens",
    pick: "Chapters",
    chase: "The Chase",
    confession: "The Confession",
    ending: "The Ending",
    capture: "Shutter",
    developing: "Developing",
    generatingHint: "Keep this house open.",
    endCard: "A Casted Picture",
    aiGenerated: "AI generated",
    download: "Take a print",
    share: "Drop the trailer",
    again: "Another take",
    langToggle: "ES",
    langAria: "Switch to Spanish",
    errors: {
      lab_missing_key: "The studio key is missing on the server.",
      lab_refused: "The lab would not take the reel. Try another take.",
      lab_timeout: "The reel ran long. Stay and try again.",
      lab_busy: "The lab is backed up. Wait a moment.",
      lab_safety: "The lab would not print this take.",
      lab_no_print: "The take came back blank. Try again.",
      lab_failed: "The take didn't print. Try again.",
    },
  },
  es: {
    brand: "Casted",
    picture: "Una película",
    ageLine: "Esta noche estrenas.",
    ageSub: "Una noche. Un film. Tienes 18 o más.",
    ageButton: "Entrada",
    releaseEyebrow: "Cesión de imagen  ·  N.º 001",
    releaseTitle: "Solo esta generación",
    releaseBody:
      "Esta es mi cara en el film. Autorizo el procesamiento biométrico solo para esta generación. El still se destruye cuando entra al laboratorio. No hay subida de archivos.",
    releaseSign: "Firmo",
    releaseEnter: "Al set",
    cameraDenied:
      "El lente está cerrado. Activa la cámara en el navegador. No hay subida de archivos.",
    cameraMissing: "No hay cámara en esta sala.",
    retryCamera: "Abrir el lente",
    pick: "Capítulos",
    chase: "La persecución",
    confession: "La confesión",
    ending: "El final",
    capture: "Obturador",
    developing: "Revelando",
    generatingHint: "No cierres la sala.",
    endCard: "A Casted Picture",
    aiGenerated: "Generado por IA",
    download: "Lleva una copia",
    share: "Suelta el tráiler",
    again: "Otra toma",
    langToggle: "EN",
    langAria: "Cambiar a inglés",
    errors: {
      lab_missing_key: "Falta la clave del estudio en el servidor.",
      lab_refused: "El laboratorio no aceptó el rollo. Otra toma.",
      lab_timeout: "El rollo se alargó. Quédate e inténtalo de nuevo.",
      lab_busy: "El laboratorio está lleno. Espera un momento.",
      lab_safety: "El laboratorio no quiso copiar esta toma.",
      lab_no_print: "La toma volvió en blanco. Inténtalo de nuevo.",
      lab_failed: "La toma no se copió. Inténtalo de nuevo.",
    },
  },
} as const;

export function localeFromNavigator(): Locale {
  if (typeof navigator === "undefined") return "en";
  return navigator.language?.toLowerCase().startsWith("es") ? "es" : "en";
}
