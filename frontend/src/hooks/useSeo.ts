import { useEffect } from "react";

interface SeoProps {
  titulo?: string;
  descricao?: string;
  imagem?: string;
  jsonLd?: Record<string, unknown>;
}

function definirMeta(seletor: string, atributo: string, chave: string, conteudo?: string) {
  if (!conteudo) return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${atributo}="${seletor}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(atributo, chave);
    document.head.appendChild(el);
  }
  el.setAttribute("content", conteudo);
}

export function useSeo({ titulo, descricao, imagem, jsonLd }: SeoProps) {
  useEffect(() => {
    const tituloAnterior = document.title;
    if (titulo) document.title = titulo;
    definirMeta("description", "name", "description", descricao);
    definirMeta("og:title", "property", "og:title", titulo);
    definirMeta("og:description", "property", "og:description", descricao);
    definirMeta("og:image", "property", "og:image", imagem);
    definirMeta("og:type", "property", "og:type", "website");
    definirMeta("og:url", "property", "og:url", window.location.href);

    let script: HTMLScriptElement | null = null;
    if (jsonLd) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.text = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
    return () => {
      document.title = tituloAnterior;
      if (script) script.remove();
    };
  }, [titulo, descricao, imagem, jsonLd]);
}
