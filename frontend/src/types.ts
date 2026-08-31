export interface Endereco {
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface Caracteristicas {
  quartos?: number | null;
  banheiros?: number | null;
  vagas?: number | null;
  area_m2?: number | null;
}

export interface Imovel {
  id: string;
  slug: string;
  titulo: string;
  descricao?: string | null;
  tipo: string;
  finalidade: "venda" | "aluguel";
  preco: number;
  condominio?: number | null;
  iptu?: number | null;
  endereco?: Endereco | null;
  exibir_endereco_exato: boolean;
  caracteristicas?: Caracteristicas | null;
  lazer: string[];
  fotos: string[];
  videos: string[];
  status: "ativo" | "inativo" | "vendido";
  destaque: boolean;
  criado_em?: string;
  corretor_responsavel_id?: string | null;
  corretor?: { nome: string; telefone?: string | null; foto?: string | null };
}

export interface ListaImoveis {
  itens: Imovel[];
  total: number;
  pagina: number;
  por_pagina: number;
}

export interface Post {
  id: string;
  titulo: string;
  slug: string;
  resumo?: string | null;
  conteudo: string;
  capa?: string | null;
  publicado: boolean;
  criado_em?: string;
}

export interface Depoimento {
  nome: string;
  texto: string;
}

export interface Lead {
  id: string;
  nome: string;
  telefone: string;
  email?: string | null;
  origem: "site" | "landing_page" | "agendamento";
  imovel_id?: string | null;
  imovel_titulo?: string | null;
  imovel_slug?: string | null;
  mensagem?: string | null;
  corretor_atribuido_id?: string | null;
  corretor_nome?: string | null;
  etapa_crm: string;
  motivo_descarte?: string | null;
  consentimento_em?: string | null;
  criado_em?: string;
  atividades?: Atividade[];
}

export interface Atividade {
  id: string;
  lead_id: string;
  tipo: string;
  descricao: string;
  autor_id?: string | null;
  autor_nome?: string | null;
  data?: string;
}

export interface LandingPage {
  id: string;
  slug: string;
  imovel_id: string;
  imovel_titulo?: string;
  dominio_customizado?: string | null;
  conteudo: {
    titulo?: string;
    subtitulo?: string;
    texto?: string;
    cor_destaque?: string;
    blocos?: { tipo: string; ativo: boolean }[];
  };
  publicada: boolean;
}
