export type Locale = "en" | "es";

export const copy = {
  en: {
    brand: "Casted",
    tagline: "Live selfie. Five-second trailer.",
    ageLead: "You must be 18 or older.",
    ageButton: "I am 18+",
    consentLead: "This generation only. The still is not kept after we send it.",
    consentLabel:
      "This is my face. I allow biometric processing for this generation only.",
    continue: "Continue",
    cameraDenied:
      "Camera access was denied. Allow the camera in your browser settings. There is no file upload.",
    cameraMissing: "No camera found on this device.",
    retryCamera: "Try camera again",
    pick: "Pick a scene",
    action: "Action",
    noir: "Noir",
    myth: "Myth",
    capture: "Capture",
    generating: "Directing your trailer…",
    generatingHint: "About a minute. Keep this tab open.",
    aiGenerated: "AI generated",
    download: "Download",
    share: "Share",
    again: "Make another",
    errorGeneric: "Generation failed. Try again.",
    errorServer: "The server could not reach the model. Try again.",
    langToggle: "ES",
    langAria: "Switch to Spanish",
  },
  es: {
    brand: "Casted",
    tagline: "Selfie en vivo. Tráiler de 5 segundos.",
    ageLead: "Debes tener 18 años o más.",
    ageButton: "Tengo 18+",
    consentLead: "Solo esta generación. No guardamos el still después de enviarlo.",
    consentLabel:
      "Esta es mi cara. Autorizo el procesamiento biométrico solo para esta generación.",
    continue: "Continuar",
    cameraDenied:
      "Cámara denegada. Actívala en el navegador. No hay subida de archivos.",
    cameraMissing: "No hay cámara en este dispositivo.",
    retryCamera: "Reintentar cámara",
    pick: "Elige una escena",
    action: "Acción",
    noir: "Noir",
    myth: "Mito",
    capture: "Capturar",
    generating: "Dirigiendo tu tráiler…",
    generatingHint: "Un minuto aprox. No cierres esta pestaña.",
    aiGenerated: "Generado por IA",
    download: "Descargar",
    share: "Compartir",
    again: "Otro",
    errorGeneric: "Falló la generación. Inténtalo de nuevo.",
    errorServer: "El servidor no pudo usar el modelo. Inténtalo de nuevo.",
    langToggle: "EN",
    langAria: "Cambiar a inglés",
  },
} as const;

export function localeFromNavigator(): Locale {
  if (typeof navigator === "undefined") return "en";
  return navigator.language?.toLowerCase().startsWith("es") ? "es" : "en";
}
