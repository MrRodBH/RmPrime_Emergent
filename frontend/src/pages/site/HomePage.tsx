import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowRight, ChevronLeft, ChevronRight, Quote, Search, Star } from "lucide-react";
import { api } from "@/lib/api";
import { useSeo } from "@/hooks/useSeo";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import { CartaoImovel } from "@/components/site/CartaoImovel";
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui-kit";
import type { Imovel } from "@/types";

const HERO = "https://images.unsplash.com/photo-1721815693498-cc28507c0ba2?auto=format&fit=crop&w=1920&q=80";

export default function HomePage() {
  const config = useSiteConfig();
  const navigate = useNavigate();
  const [destaques, setDestaques] = useState<Imovel[]>([]);
  const [recomendados, setRecomendados] = useState<Imovel[]>([]);
  const [tipos, setTipos] = useState<string[]>([]);
  const [finalidade, setFinalidade] = useState("");
  const [tipo, setTipo] = useState("");
  const [bairro, setBairro] = useState("");
  const [precoMax, setPrecoMax] = useState("");
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", loop: false });

  useSeo({
    titulo: `${config.nome} — Imóveis para comprar e alugar`,
    descricao: "Encontre apartamentos, casas e coberturas com o atendimento de corretores especializados.",
    imagem: HERO,
  });

  useEffect(() => {
    api.get("/imoveis/publico", { params: { destaque: true, por_pagina: 6 } })
      .then((r) => setDestaques(r.data.itens))
      .catch(() => {});
    api.get("/imoveis/publico", { params: { por_pagina: 8, ordenar: "recentes" } })
      .then((r) => setRecomendados(r.data.itens))
      .catch(() => {});
    api.get("/imoveis/opcoes").then((r) => setTipos(r.data.tipos)).catch(() => {});
  }, []);

  function buscar() {
    const params = new URLSearchParams();
    if (finalidade) params.set("finalidade", finalidade);
    if (tipo) params.set("tipo", tipo);
    if (bairro.trim()) params.set("bairro", bairro.trim());
    if (precoMax) params.set("preco_max", precoMax);
    navigate(`/imoveis?${params.toString()}`);
  }

  return (
    <div data-testid="pagina-inicio-site">
      <section className="relative">
        <img src={config.banner_home_imagem || HERO} alt="Foto de destaque de um imóvel da imobiliária" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-stone-950/60" />
        <div className="relative z-10 mx-auto flex max-w-7xl flex-col justify-center px-4 py-20 md:px-8 md:py-28">
          <h1 className="max-w-2xl font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {config.banner_home_titulo || "O imóvel certo para o seu próximo capítulo"}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-stone-200">
            {config.banner_home_subtitulo ||
              "Apartamentos, casas e coberturas selecionados por quem entende do mercado — com atendimento próximo do começo ao fim."}
          </p>

          <div className="mt-10 rounded-lg bg-white p-4 shadow-xl md:p-6" data-testid="busca-avancada">
            <div className="grid gap-4 md:grid-cols-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-stone-500">Quero</Label>
                <Select value={finalidade} onValueChange={setFinalidade}>
                  <SelectTrigger className="h-11 border-stone-300" data-testid="busca-finalidade">
                    <SelectValue placeholder="Comprar ou alugar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="venda" data-testid="busca-finalidade-venda">Comprar</SelectItem>
                    <SelectItem value="aluguel" data-testid="busca-finalidade-aluguel">Alugar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-stone-500">Tipo de imóvel</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger className="h-11 border-stone-300" data-testid="busca-tipo">
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    {tipos.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-stone-500">Bairro</Label>
                <Input
                  placeholder="Ex.: Savassi"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  className="h-11 border-stone-300"
                  data-testid="busca-bairro"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-stone-500">Preço até</Label>
                <Select value={precoMax} onValueChange={setPrecoMax}>
                  <SelectTrigger className="h-11 border-stone-300" data-testid="busca-preco">
                    <SelectValue placeholder="Qualquer valor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3000">R$ 3.000</SelectItem>
                    <SelectItem value="5000">R$ 5.000</SelectItem>
                    <SelectItem value="1000000">R$ 1 milhão</SelectItem>
                    <SelectItem value="2000000">R$ 2 milhões</SelectItem>
                    <SelectItem value="5000000">R$ 5 milhões</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={buscar} className="h-11 w-full bg-stone-900 text-white transition-colors duration-200 hover:bg-stone-800" data-testid="busca-botao">
                  <Search className="mr-2 h-4 w-4" /> Buscar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8" data-testid="secao-destaques">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-heading text-3xl font-bold tracking-tight text-stone-950">Imóveis em destaque</h2>
            <p className="mt-1 text-stone-600">Seleção especial da nossa equipe.</p>
          </div>
          <Link to="/imoveis" className="hidden items-center gap-1 text-sm font-semibold text-stone-900 underline-offset-4 hover:underline sm:flex" data-testid="link-ver-todos-imoveis">
            Ver todos <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {destaques.length === 0 ? (
          <p className="mt-8 text-stone-500">Nenhum imóvel em destaque no momento.</p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {destaques.map((imovel) => (
              <CartaoImovel key={imovel.id} imovel={imovel} />
            ))}
          </div>
        )}
      </section>

      <section className="bg-stone-950 py-16 text-white" data-testid="secao-recomendados">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="rounded-full border border-stone-700 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-stone-300">
                Seleção da equipe
              </span>
              <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight">Imóveis recomendados para você</h2>
              <p className="mt-1 text-sm text-stone-400">
                As novidades mais recentes do nosso portfólio. Em breve: recomendações personalizadas por inteligência artificial.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => emblaApi?.scrollPrev()} aria-label="Ver imóveis anteriores" data-testid="carrossel-anterior" className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-700 transition-colors duration-200 hover:bg-stone-800">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={() => emblaApi?.scrollNext()} aria-label="Ver próximos imóveis" data-testid="carrossel-proximo" className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-700 transition-colors duration-200 hover:bg-stone-800">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="mt-8 overflow-hidden" ref={emblaRef} data-testid="carrossel-recomendados">
            <div className="flex gap-6">
              {recomendados.map((imovel) => (
                <div key={imovel.id} className="min-w-0 flex-[0_0_100%] sm:flex-[0_0_47%] lg:flex-[0_0_31.5%]">
                  <CartaoImovel imovel={imovel} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {config.depoimentos.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-16 md:px-8" data-testid="secao-depoimentos">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-stone-950">Quem confiou, recomenda</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {config.depoimentos.map((depoimento, indice) => (
              <figure key={indice} className="rounded-lg border border-stone-200 bg-white p-6" data-testid={`depoimento-${indice}`}>
                <Quote className="h-6 w-6 text-stone-300" />
                <blockquote className="mt-3 text-sm leading-relaxed text-stone-700">{depoimento.texto}</blockquote>
                <figcaption className="mt-4 flex items-center gap-2">
                  <span className="flex gap-0.5 text-amber-500">
                    {[1, 2, 3, 4, 5].map((estrela) => (
                      <Star key={estrela} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </span>
                  <span className="text-sm font-semibold text-stone-900">{depoimento.nome}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      <section className="border-y border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-4 py-12 md:px-8">
          <div>
            <h2 className="font-heading text-2xl font-bold tracking-tight text-stone-950">Quer vender ou alugar seu imóvel?</h2>
            <p className="mt-1 text-stone-600">Anuncie com quem tem corretores dedicados e marketing de verdade.</p>
          </div>
          <Link
            to="/contato"
            data-testid="cta-anunciar"
            className="rounded-md bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-stone-800"
          >
            Fale com a nossa equipe
          </Link>
        </div>
      </section>
    </div>
  );
}
