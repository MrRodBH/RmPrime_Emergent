import { Link } from "react-router-dom";
import { Bath, BedDouble, Car, Ruler, Star } from "lucide-react";
import type { Imovel } from "@/types";
import { formatarMoeda, rotuloFinalidade } from "@/lib/format";

export function CartaoImovel({ imovel, modo = "grade" }: { imovel: Imovel; modo?: "grade" | "lista" }) {
  const foto = imovel.fotos?.[0];
  const local = [imovel.endereco?.bairro, imovel.endereco?.cidade].filter(Boolean).join(", ");
  const preco = `${formatarMoeda(imovel.preco)}${imovel.finalidade === "aluguel" ? "/mês" : ""}`;
  const c = imovel.caracteristicas || {};

  const conteudo = (
    <>
      <div className={modo === "lista" ? "relative h-48 w-full shrink-0 sm:h-full sm:w-72" : "relative h-52"}>
        {foto ? (
          <img
            src={foto}
            alt={`Foto do imóvel: ${imovel.titulo}`}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-200 text-sm text-stone-500">
            Sem foto cadastrada
          </div>
        )}
        <div className="absolute left-3 top-3 flex gap-2">
          <span className="rounded-full bg-stone-950/85 px-3 py-1 text-xs font-semibold text-white">
            {rotuloFinalidade(imovel.finalidade)}
          </span>
          {imovel.destaque ? (
            <span className="flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-stone-950">
              <Star className="h-3 w-3" /> Destaque
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{imovel.tipo}</p>
        <h3 className="mt-1 font-heading text-lg font-semibold leading-snug tracking-tight text-stone-950">
          {imovel.titulo}
        </h3>
        {local ? <p className="mt-1 text-sm text-stone-500">{local}</p> : null}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600">
          {c.quartos ? (
            <span className="flex items-center gap-1.5">
              <BedDouble className="h-4 w-4 text-stone-400" /> {c.quartos} {c.quartos === 1 ? "quarto" : "quartos"}
            </span>
          ) : null}
          {c.banheiros ? (
            <span className="flex items-center gap-1.5">
              <Bath className="h-4 w-4 text-stone-400" /> {c.banheiros}
            </span>
          ) : null}
          {c.vagas ? (
            <span className="flex items-center gap-1.5">
              <Car className="h-4 w-4 text-stone-400" /> {c.vagas}
            </span>
          ) : null}
          {c.area_m2 ? (
            <span className="flex items-center gap-1.5">
              <Ruler className="h-4 w-4 text-stone-400" /> {c.area_m2} m²
            </span>
          ) : null}
        </div>
        <p className="mt-4 font-heading text-xl font-bold text-stone-950">{preco}</p>
      </div>
    </>
  );

  return (
    <Link
      to={`/imoveis/${imovel.slug}`}
      data-testid={`cartao-imovel-${imovel.id}`}
      className={`group flex overflow-hidden rounded-lg border border-stone-200 bg-white transition-colors duration-200 hover:border-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 ${
        modo === "lista" ? "flex-col sm:flex-row" : "flex-col"
      }`}
    >
      {conteudo}
    </Link>
  );
}
