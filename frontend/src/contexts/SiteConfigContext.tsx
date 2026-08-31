import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import type { Depoimento } from "@/types";

export interface SiteConfig {
  nome: string;
  logomarca?: string | null;
  telefone?: string | null;
  email_contato?: string | null;
  endereco?: string | null;
  redes_sociais: Record<string, string>;
  footer_texto: string;
  footer_endereco: string;
  politica_privacidade: string;
  depoimentos: Depoimento[];
  banner_home_titulo: string;
  banner_home_subtitulo: string;
  banner_home_imagem: string;
  menu_inicio: string;
  menu_imoveis: string;
  menu_blog: string;
  menu_contato: string;
}

const CONFIG_VAZIA: SiteConfig = {
  nome: "Imobiliária",
  redes_sociais: {},
  footer_texto: "",
  footer_endereco: "",
  politica_privacidade: "",
  depoimentos: [],
  banner_home_titulo: "",
  banner_home_subtitulo: "",
  banner_home_imagem: "",
  menu_inicio: "Início",
  menu_imoveis: "Imóveis",
  menu_blog: "Blog",
  menu_contato: "Contato",
};

const SiteConfigContexto = createContext<SiteConfig>(CONFIG_VAZIA);

export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SiteConfig>(CONFIG_VAZIA);

  useEffect(() => {
    api
      .get("/site/config")
      .then((resposta) => setConfig({ ...CONFIG_VAZIA, ...resposta.data }))
      .catch(() => {});
  }, []);

  return <SiteConfigContexto.Provider value={config}>{children}</SiteConfigContexto.Provider>;
}

export function useSiteConfig() {
  return useContext(SiteConfigContexto);
}
