import { useSeo } from "@/hooks/useSeo";
import { useSiteConfig } from "@/contexts/SiteConfigContext";

export default function PrivacidadePage() {
  const config = useSiteConfig();

  useSeo({
    titulo: `Política de Privacidade | ${config.nome}`,
    descricao: "Como coletamos, usamos e protegemos seus dados pessoais, em conformidade com a LGPD.",
  });

  const paragrafos = (config.politica_privacidade || "")
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12" data-testid="pagina-privacidade">
      <h1 className="font-heading text-4xl font-bold tracking-tight text-stone-950">Política de Privacidade</h1>
      <p className="mt-2 text-sm text-stone-500">
        Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
      </p>
      <div className="mt-8 space-y-4 leading-relaxed text-stone-700" data-testid="texto-privacidade">
        {paragrafos.length === 0 ? (
          <p>Esta página está sendo atualizada.</p>
        ) : (
          paragrafos.map((paragrafo, i) => <p key={i}>{paragrafo}</p>)
        )}
      </div>
    </div>
  );
}
