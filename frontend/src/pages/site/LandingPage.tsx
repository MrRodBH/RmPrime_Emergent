import { useEffect, useState, type JSX } from "react";
import { useParams } from "react-router-dom";
import { Bath, BedDouble, Car, Ruler } from "lucide-react";
import { api } from "@/lib/api";
import { useSeo } from "@/hooks/useSeo";
import { FormularioLead } from "@/components/site/FormularioLead";
import { Logomarca } from "@/site/SiteLayout";
import { formatarMoeda, rotuloFinalidade } from "@/lib/format";
import type { Imovel } from "@/types";

interface BlocoLp {
  tipo: string;
  ativo: boolean;
}

interface DadosLp {
  slug: string;
  conteudo: {
    titulo?: string;
    subtitulo?: string;
    texto?: string;
    cor_destaque?: string;
    blocos?: BlocoLp[];
  };
  imovel: Imovel;
}

const ORDEM_PADRAO = ["hero", "caracteristicas", "texto", "galeria", "formulario"];

export default function LandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [dados, setDados] = useState<DadosLp | null>(null);
  const [naoEncontrada, setNaoEncontrada] = useState(false);

  useEffect(() => {
    api
      .get(`/lp/${slug}`)
      .then((r) => setDados(r.data))
      .catch(() => setNaoEncontrada(true));
  }, [slug]);

  const cor = dados?.conteudo.cor_destaque || "#b45309";

  useSeo({
    titulo: dados?.conteudo.titulo || dados?.imovel.titulo,
    descricao: dados?.conteudo.subtitulo || dados?.imovel.descricao?.slice(0, 155),
    imagem: dados?.imovel.fotos?.[0],
  });

  if (naoEncontrada) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4" data-testid="lp-nao-encontrada">
        <div className="text-center">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-stone-950">Página não encontrada</h1>
          <p className="mt-2 text-stone-600">Esta oferta pode ter sido encerrada.</p>
        </div>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900" />
      </div>
    );
  }

  const { imovel, conteudo } = dados;
  const c = imovel.caracteristicas || {};
  const blocosSalvos = conteudo.blocos;
  const ordem = blocosSalvos && blocosSalvos.length
    ? blocosSalvos.filter((b) => b.ativo).map((b) => b.tipo)
    : ORDEM_PADRAO;

  function renderHero() {
    return (
      <section key="hero" className="relative">
        {imovel.fotos[0] ? (
          <img src={imovel.fotos[0]} alt={`Foto principal do imóvel ${imovel.titulo}`} className="absolute inset-0 h-full w-full object-cover opacity-40" />
        ) : null}
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-20 md:px-8 md:py-28">
          <p className="text-sm font-semibold uppercase tracking-widest text-stone-300">
            {imovel.tipo} · {rotuloFinalidade(imovel.finalidade)} · {imovel.endereco?.bairro}
          </p>
          <h1 className="mt-3 max-w-3xl font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl" data-testid="lp-titulo">
            {conteudo.titulo || imovel.titulo}
          </h1>
          {conteudo.subtitulo ? (
            <p className="mt-4 max-w-2xl text-lg text-stone-300">{conteudo.subtitulo}</p>
          ) : null}
          <p className="mt-8 font-heading text-4xl font-bold text-white" data-testid="lp-preco">
            {formatarMoeda(imovel.preco)}
            {imovel.finalidade === "aluguel" ? <span className="text-lg font-medium text-stone-400">/mês</span> : null}
          </p>
          <a
            href="#formulario-interesse"
            data-testid="lp-cta-hero"
            className="mt-8 inline-block rounded-md px-8 py-4 text-base font-semibold text-white transition-opacity duration-200 hover:opacity-90"
            style={{ backgroundColor: cor }}
          >
            Quero conhecer este imóvel
          </a>
        </div>
      </section>
    );
  }

  function renderCaracteristicas() {
    return (
      <section key="caracteristicas" className="border-y border-stone-800 bg-stone-900">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-x-10 gap-y-4 px-4 py-6 text-stone-200 md:px-8" data-testid="lp-caracteristicas">
          {c.quartos ? <span className="flex items-center gap-2"><BedDouble className="h-5 w-5" /> {c.quartos} {c.quartos === 1 ? "quarto" : "quartos"}</span> : null}
          {c.banheiros ? <span className="flex items-center gap-2"><Bath className="h-5 w-5" /> {c.banheiros} {c.banheiros === 1 ? "banheiro" : "banheiros"}</span> : null}
          {c.vagas ? <span className="flex items-center gap-2"><Car className="h-5 w-5" /> {c.vagas} {c.vagas === 1 ? "vaga" : "vagas"}</span> : null}
          {c.area_m2 ? <span className="flex items-center gap-2"><Ruler className="h-5 w-5" /> {c.area_m2} m²</span> : null}
        </div>
      </section>
    );
  }

  function renderTexto() {
    const texto = conteudo.texto || imovel.descricao || "";
    if (!texto) return null;
    return (
      <section key="texto" className="mx-auto max-w-3xl px-4 py-14 md:px-8">
        <div className="space-y-3 text-lg leading-relaxed text-stone-300" data-testid="lp-texto">
          {texto.split("\n").filter(Boolean).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </section>
    );
  }

  function renderGaleria() {
    if (imovel.fotos.length <= 1) return null;
    return (
      <section key="galeria" className="mx-auto max-w-6xl px-4 pb-14 md:px-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4" data-testid="lp-galeria">
          {imovel.fotos.slice(1, 9).map((foto, i) => (
            <img key={i} src={foto} alt={`Foto ${i + 2} do imóvel ${imovel.titulo}`} className="h-44 w-full rounded-lg border border-stone-800 object-cover" loading="lazy" />
          ))}
        </div>
      </section>
    );
  }

  function renderFormulario() {
    return (
      <section key="formulario" id="formulario-interesse" className="mx-auto max-w-6xl px-4 pb-16 md:px-8">
        <div className="mx-auto max-w-xl rounded-lg bg-white p-6 md:p-8" data-testid="lp-formulario">
          <FormularioLead
            origem="landing_page"
            imovelId={imovel.id}
            titulo="Receba atendimento exclusivo"
            textoBotao="Quero ser atendido"
            mensagemPadrao={`Vi a oferta "${conteudo.titulo || imovel.titulo}" e quero mais informações.`}
          />
        </div>
      </section>
    );
  }

  const RENDERIZADORES: Record<string, () => JSX.Element | null> = {
    hero: renderHero,
    caracteristicas: renderCaracteristicas,
    texto: renderTexto,
    galeria: renderGaleria,
    formulario: renderFormulario,
  };

  return (
    <div className="min-h-screen bg-stone-950" data-testid="pagina-landing">
      <header className="border-b border-stone-800">
        <div className="mx-auto flex h-24 items-center max-w-6xl px-4 md:px-8">
          <Logomarca escura />
        </div>
      </header>

      {ordem.map((tipo) => (RENDERIZADORES[tipo] ? RENDERIZADORES[tipo]() : null))}

      <footer className="border-t border-stone-800 py-8 text-center text-xs text-stone-500">
        Oferta sujeita a disponibilidade. Seus dados são tratados conforme a LGPD.
      </footer>
    </div>
  );
}
