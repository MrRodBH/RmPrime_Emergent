import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Bath, BedDouble, Car, Check, Ruler } from "lucide-react";
import { api } from "@/lib/api";
import { useSeo } from "@/hooks/useSeo";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import { FormularioLead } from "@/components/site/FormularioLead";
import { CartaoImovel } from "@/components/site/CartaoImovel";
import { MapaImovel } from "@/components/site/MapaImovel";
import { formatarMoeda, rotuloFinalidade } from "@/lib/format";
import type { Imovel } from "@/types";

function urlVideoEmbed(url: string): string | null {
  const curto = url.match(/youtu\.be\/([\w-]{6,})/);
  const longo = url.match(/[?&]v=([\w-]{6,})/);
  const id = curto?.[1] || longo?.[1];
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

export default function ImovelDetalhePage() {
  const { slug } = useParams<{ slug: string }>();
  const config = useSiteConfig();
  const [imovel, setImovel] = useState<Imovel | null>(null);
  const [similares, setSimilares] = useState<Imovel[]>([]);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [fotoAtiva, setFotoAtiva] = useState(0);

  useEffect(() => {
    setImovel(null);
    setSimilares([]);
    setNaoEncontrado(false);
    setFotoAtiva(0);
    api
      .get(`/imoveis/publico/${slug}`)
      .then((r) => setImovel(r.data))
      .catch(() => setNaoEncontrado(true));
  }, [slug]);

  const imovelId = imovel?.id;
  useEffect(() => {
    if (!imovelId) return;
    api
      .get("/imoveis/recomendados", { params: { imovel_id: imovelId } })
      .then((r) => setSimilares(r.data.itens || []))
      .catch(() => {});
  }, [imovelId]);

  const descricaoSeo = imovel?.descricao
    ? imovel.descricao.slice(0, 155)
    : `${imovel?.titulo} — ${imovel?.tipo} para ${imovel?.finalidade} em ${imovel?.endereco?.bairro || ""}`;

  useSeo({
    titulo: imovel ? `${imovel.titulo} | ${config.nome}` : undefined,
    descricao: imovel ? descricaoSeo : undefined,
    imagem: imovel?.fotos?.[0],
    jsonLd: imovel
      ? {
          "@context": "https://schema.org",
          "@type": "RealEstateListing",
          name: imovel.titulo,
          description: descricaoSeo,
          url: window.location.href,
          image: imovel.fotos,
          offers: {
            "@type": "Offer",
            price: imovel.preco,
            priceCurrency: "BRL",
            availability: "https://schema.org/InStock",
          },
          address: {
            "@type": "PostalAddress",
            addressLocality: imovel.endereco?.cidade,
            addressRegion: imovel.endereco?.estado,
            addressCountry: "BR",
            ...(imovel.exibir_endereco_exato
              ? { streetAddress: `${imovel.endereco?.logradouro || ""}, ${imovel.endereco?.numero || ""}`, postalCode: imovel.endereco?.cep }
              : { addressLocality: imovel.endereco?.bairro || imovel.endereco?.cidade }),
          },
          numberOfRooms: imovel.caracteristicas?.quartos,
          floorSize: imovel.caracteristicas?.area_m2
            ? { "@type": "QuantitativeValue", value: imovel.caracteristicas.area_m2, unitCode: "MTK" }
            : undefined,
        }
      : undefined,
  });

  if (naoEncontrado) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center" data-testid="imovel-nao-encontrado">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-stone-950">Imóvel não encontrado</h1>
        <p className="mt-2 text-stone-600">Ele pode ter sido vendido ou removido do ar.</p>
        <Link to="/imoveis" className="mt-6 inline-block rounded-md bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-stone-800" data-testid="link-voltar-imoveis">
          Ver todos os imóveis
        </Link>
      </div>
    );
  }

  if (!imovel) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-8" data-testid="imovel-carregando">
        <div className="h-[420px] animate-pulse rounded-lg bg-stone-200" />
      </div>
    );
  }

  const c = imovel.caracteristicas || {};
  const enderecoTexto = imovel.exibir_endereco_exato
    ? [imovel.endereco?.logradouro, imovel.endereco?.numero, imovel.endereco?.bairro, imovel.endereco?.cidade, imovel.endereco?.estado]
        .filter(Boolean)
        .join(", ")
    : [imovel.endereco?.bairro, imovel.endereco?.cidade, imovel.endereco?.estado].filter(Boolean).join(", ");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8" data-testid="pagina-detalhe-imovel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            {imovel.tipo} · {rotuloFinalidade(imovel.finalidade)}
          </p>
          <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">
            {imovel.titulo}
          </h1>
          {enderecoTexto ? <p className="mt-1 text-stone-600">{enderecoTexto}</p> : null}
        </div>
        <div className="text-right">
          <p className="font-heading text-3xl font-bold text-stone-950" data-testid="imovel-preco">
            {formatarMoeda(imovel.preco)}
            {imovel.finalidade === "aluguel" ? <span className="text-base font-medium text-stone-500">/mês</span> : null}
          </p>
          <p className="text-sm text-stone-500">
            {imovel.condominio ? `Condomínio ${formatarMoeda(imovel.condominio)}` : ""}
            {imovel.condominio && imovel.iptu ? " · " : ""}
            {imovel.iptu ? `IPTU ${formatarMoeda(imovel.iptu)}` : ""}
          </p>
        </div>
      </div>

      {imovel.fotos.length > 0 ? (
        <div className="mt-8" data-testid="galeria-fotos">
          <div className="overflow-hidden rounded-lg border border-stone-200">
            <img
              src={imovel.fotos[fotoAtiva]}
              alt={`Foto ${fotoAtiva + 1} do imóvel ${imovel.titulo}`}
              className="h-[300px] w-full object-cover md:h-[440px]"
            />
          </div>
          {imovel.fotos.length > 1 ? (
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1" role="tablist" aria-label="Miniaturas das fotos">
              {imovel.fotos.map((foto, indice) => (
                <button
                  key={indice}
                  onClick={() => setFotoAtiva(indice)}
                  aria-label={`Ver foto ${indice + 1}`}
                  aria-selected={indice === fotoAtiva}
                  data-testid={`miniatura-foto-${indice}`}
                  className={`h-20 w-28 shrink-0 overflow-hidden rounded-md border-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 ${
                    indice === fotoAtiva ? "border-stone-900" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={foto} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-10 grid gap-10 lg:grid-cols-3">
        <div className="space-y-10 lg:col-span-2">
          <section aria-label="Características" className="grid grid-cols-2 gap-4 rounded-lg border border-stone-200 bg-white p-6 sm:grid-cols-4" data-testid="caracteristicas-imovel">
            {[
              { icone: BedDouble, rotulo: "quartos", valor: c.quartos },
              { icone: Bath, rotulo: "banheiros", valor: c.banheiros },
              { icone: Car, rotulo: "vagas", valor: c.vagas },
              { icone: Ruler, rotulo: "m²", valor: c.area_m2 },
            ].map((item) => (
              <div key={item.rotulo} className="flex items-center gap-3">
                <item.icone className="h-6 w-6 text-stone-400" />
                <div>
                  <p className="font-heading text-lg font-bold text-stone-950">{item.valor ?? "—"}</p>
                  <p className="text-xs uppercase tracking-wide text-stone-500">{item.rotulo}</p>
                </div>
              </div>
            ))}
          </section>

          {imovel.descricao ? (
            <section aria-label="Descrição">
              <h2 className="font-heading text-2xl font-semibold tracking-tight text-stone-900">Sobre este imóvel</h2>
              <div className="mt-3 space-y-3 text-stone-700" data-testid="descricao-imovel">
                {imovel.descricao.split("\n").filter(Boolean).map((paragrafo, i) => (
                  <p key={i} className="leading-relaxed">{paragrafo}</p>
                ))}
              </div>
            </section>
          ) : null}

          {imovel.lazer.length > 0 ? (
            <section aria-label="Itens de lazer">
              <h2 className="font-heading text-2xl font-semibold tracking-tight text-stone-900">Lazer e comodidades</h2>
              <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2" data-testid="lista-lazer">
                {imovel.lazer.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-stone-700">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
                      <Check className="h-3 w-3 text-emerald-700" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {imovel.videos.length > 0 ? (
            <section aria-label="Vídeo do imóvel" data-testid="secao-video">
              <h2 className="font-heading text-2xl font-semibold tracking-tight text-stone-900">Vídeo</h2>
              <div className="mt-4 space-y-4">
                {imovel.videos.map((video, i) => {
                  const embed = urlVideoEmbed(video);
                  return embed ? (
                    <iframe
                      key={i}
                      src={embed}
                      title={`Vídeo do imóvel ${imovel.titulo}`}
                      className="aspect-video w-full rounded-lg border border-stone-200"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      data-testid={`video-imovel-${i}`}
                    />
                  ) : (
                    <video key={i} src={video} controls className="w-full rounded-lg border border-stone-200" data-testid={`video-imovel-${i}`} />
                  );
                })}
              </div>
            </section>
          ) : null}

          <section aria-label="Localização">
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-stone-900">Localização</h2>
            <div className="mt-4">
              <MapaImovel
                lat={imovel.endereco?.lat}
                lng={imovel.endereco?.lng}
                exato={imovel.exibir_endereco_exato}
                titulo={imovel.titulo}
              />
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <div className="rounded-lg border border-stone-200 bg-white p-6 lg:sticky lg:top-28" data-testid="cartao-contato-imovel">
            <FormularioLead
              origem="site"
              imovelId={imovel.id}
              titulo="Tenho interesse neste imóvel"
              textoBotao="Quero ser atendido"
              mensagemPadrao={`Tenho interesse no imóvel "${imovel.titulo}".`}
            />
          </div>
          <div className="rounded-lg border border-stone-200 bg-white p-6" data-testid="cartao-agendar-visita">
            <h3 className="font-heading text-lg font-semibold text-stone-950">Prefere ver pessoalmente?</h3>
            <p className="mt-1 text-sm text-stone-600">Agende uma visita com um corretor em poucos cliques.</p>
            <div className="mt-4">
              <FormularioLead
                origem="agendamento"
                imovelId={imovel.id}
                textoBotao="Agendar visita"
                mensagemPadrao={`Quero agendar uma visita ao imóvel "${imovel.titulo}".`}
              />
            </div>
          </div>
        </aside>
      </div>

      {similares.length > 0 ? (
        <section className="mt-14" data-testid="secao-similares">
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-stone-900">
            Você também pode gostar
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Imóveis parecidos em localização, tipo e faixa de preço.
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similares.map((similar) => (
              <CartaoImovel key={similar.id} imovel={similar} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
