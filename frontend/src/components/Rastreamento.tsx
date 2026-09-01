import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "@/lib/api";
import {
  iniciarGtag,
  iniciarPixel,
  injetarScriptsCustomizados,
  rastrearContato,
  rastrearPageview,
} from "@/lib/tracking";

interface MarketingPublico {
  meta_pixel_id: string;
  google_ads_id: string;
  script_cabecalho: string;
  script_rodape: string;
}

export function Rastreamento() {
  const location = useLocation();
  const [pronto, setPronto] = useState(false);
  const injetado = useRef(false);

  useEffect(() => {
    api
      .get("/marketing/publico")
      .then((resposta) => {
        const config: MarketingPublico = resposta.data;
        if (injetado.current) return;
        injetado.current = true;
        iniciarPixel(config.meta_pixel_id);
        iniciarGtag(config.google_ads_id);
        injetarScriptsCustomizados(config.script_cabecalho, "head");
        injetarScriptsCustomizados(config.script_rodape, "body");
        setPronto(true);
      })
      .catch(() => setPronto(true));
  }, []);

  useEffect(() => {
    if (pronto) rastrearPageview();
  }, [location.pathname, pronto]);

  useEffect(() => {
    function aoClicar(evento: MouseEvent) {
      const alvo = (evento.target as HTMLElement).closest("a");
      if (!alvo) return;
      const href = alvo.getAttribute("href") || "";
      if (href.startsWith("https://wa.me")) rastrearContato("whatsapp");
      else if (href.startsWith("tel:")) rastrearContato("telefone");
      else if (href.startsWith("mailto:")) rastrearContato("email");
    }
    document.addEventListener("click", aoClicar);
    return () => document.removeEventListener("click", aoClicar);
  }, []);

  return null;
}
