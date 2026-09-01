declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

export function gerarEventoId(): string {
  return crypto.randomUUID();
}

let pixelCarregado = false;
export function iniciarPixel(pixelId: string) {
  if (pixelCarregado || !pixelId) return;
  pixelCarregado = true;
  const w = window as any;
  const fbq: any = function (...args: any[]) {
    fbq.queue.push(args);
  };
  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = "2.0";
  w.fbq = fbq;
  if (!w._fbq) w._fbq = fbq;
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
  window.fbq!("init", pixelId);
  window.fbq!("track", "PageView");
}

let gtagCarregado = false;
export function iniciarGtag(id: string) {
  if (gtagCarregado || !id) return;
  gtagCarregado = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function (...args: any[]) {
    window.dataLayer!.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", id);
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}

export function rastrearPageview() {
  if (window.fbq) window.fbq("track", "PageView");
  if (window.gtag) window.gtag("event", "page_view", { page_path: window.location.pathname });
}

export function rastrearLead(eventoId: string, origem: string) {
  if (window.fbq) window.fbq("track", "Lead", { origem }, { eventID: eventoId });
  if (window.gtag) window.gtag("event", "generate_lead", { origem, event_id: eventoId });
}

export function rastrearContato(canal: string) {
  if (window.fbq) window.fbq("track", "Contact", { canal });
  if (window.gtag) window.gtag("event", "contact", { canal });
}

export function injetarScriptsCustomizados(html: string, onde: "head" | "body") {
  if (!html?.trim()) return;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const destino = onde === "head" ? document.head : document.body;
  doc.querySelectorAll("script").forEach((antigo) => {
    const script = document.createElement("script");
    Array.from(antigo.attributes).forEach((attr) => script.setAttribute(attr.name, attr.value));
    script.text = antigo.textContent ?? "";
    script.setAttribute("data-customizado", "1");
    destino.appendChild(script);
  });
}
