import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Bath, BedDouble, Car, Ruler } from "lucide-react";
import { api } from "@/lib/api";
import { useSeo } from "@/hooks/useSeo";
import { FormularioLead } from "@/components/site/FormularioLead";
import { Logomarca } from "@/site/SiteLayout";
import { formatarMoeda, rotuloFinalidade } from "@/lib/format";
import type { Imovel } from "@/types";

interface DadosLp {
  slug: string;
  conteudo: { titulo?: string; subtitulo?: string; texto?: string; cor_destaque?: string };
  imovel: Imovel;
}

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

  const cor = dados?.conteudo.cor_destaque || "#1c1917";

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

  return (
    <div className="min-h-screen bg-stone-950" data-testid="pagina-landing">
      <header className="border-b border-stone-800">
        <div className="mx-auto flex h-24 max-w-6xl items-center px-4 md:px-8">
          <Logomarca escura />
        </div>
      </header>

      <section className="relative">
        {imovel.fotos[0] ? (
          <img src={imovel.fotos[0]} alt={`Foto principal do imóvel ${imovel.titulo}`} className="absolute inset-0 h-full w-full object-cover opacity-40" />
        ) : null}
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-20 md:px-8 md:py-28">
          <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#d6d3d1" }}>
            {imovel.tipo} · {rotuloFinalidade(imovel.finalidade)} · {imovel.endereco?.bairro}
          </p>
          <h1 className="mt-3 max-w-3xl font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl" data-testid="lp-titulo">
            {conteudo.titulo || imovel.titulo}
          </h1>
          {conteudo.subtitulo ? (
            <p className="mt-4 max-w-2xl text-lg text-stone-300">{conteudo.subtitulo}</p>
          ) : null}
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-stone-200">
            {c.quartos ? <span className="flex items-center gap-2"><BedDouble className="h-5 w-5" /> {c.quartos} quartos</span> : null}
            {c.banheiros ? <span className="flex items-center gap-2"><Bath className="h-5 w-5" /> {c.banheiros} banheiros</span> : null}
            {c.vagas ? <span className="flex items-center gap-2"><Car className="h-5 w-5" /> {c.vagas} vagas</span> : null}
            {c.area_m2 ? <span className="flex items-center gap-2"><Ruler className="h-5 w-5" /> {c.area_m2} m²</span> : null}
          </div>
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

      <section className="mx-auto grid max-w-6xl gap-12 px-4 py-16 md:px-8 lg:grid-cols-2">
        <div>
          {conteudo.texto ? (
            <div className="space-y-3 text-lg leading-relaxed text-stone-300" data-testid="lp-texto">
              {conteudo.texto.split("\n").filter(Boolean).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          ) : (
            <div className="space-y-3 text-lg leading-relaxed text-stone-300">
              {(imovel.descricao || "").split("\n").filter(Boolean).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}
          {imovel.fotos.length > 1 ? (
            <div className="mt-8 grid grid-cols-2 gap-4">
              {imovel.fotos.slice(1, 5).map((foto, i) => (
                <img key={i} src={foto} alt={`Foto ${i + 2} do imóvel ${imovel.titulo}`} className="h-40 w-full rounded-lg border border-stone-800 object-cover" loading="lazy" />
              ))}
            </div>
          ) : null}
        </div>

        <div id="formulario-interesse" className="h-fit rounded-lg bg-white p-6 md:p-8 lg:sticky lg:top-8" data-testid="lp-formulario">
          <FormularioLead
            origem="landing_page"
            imovelId={imovel.id}
            titulo="Receba atendimento exclusivo"
            textoBotao="Quero ser atendido"
            mensagemPadrao={`Vi a oferta "${conteudo.titulo || imovel.titulo}" e quero mais informações.`}
          />
        </div>
      </section>

      <footer className="border-t border-stone-800 py-8 text-center text-xs text-stone-500">
        Oferta sujeita a disponibilidade. Seus dados são tratados conforme a LGPD.
      </footer>
    </div>
  );
}
