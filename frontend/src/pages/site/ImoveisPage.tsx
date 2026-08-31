import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, LayoutGrid, List, SearchX } from "lucide-react";
import { api } from "@/lib/api";
import { useSeo } from "@/hooks/useSeo";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import { CartaoImovel } from "@/components/site/CartaoImovel";
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui-kit";
import type { Imovel, ListaImoveis } from "@/types";

const VAZIO: ListaImoveis = { itens: [], total: 0, pagina: 1, por_pagina: 9 };

export default function ImoveisPage() {
  const config = useSiteConfig();
  const [parametros, setParametros] = useSearchParams();
  const [dados, setDados] = useState<ListaImoveis>(VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [opcoes, setOpcoes] = useState<{ tipos: string[]; bairros: string[] }>({ tipos: [], bairros: [] });
  const [visualizacao, setVisualizacao] = useState<"grade" | "lista">("grade");

  const finalidade = parametros.get("finalidade") || "";
  const tipo = parametros.get("tipo") || "";
  const bairro = parametros.get("bairro") || "";
  const quartos = parametros.get("quartos") || "";
  const precoMin = parametros.get("preco_min") || "";
  const precoMax = parametros.get("preco_max") || "";
  const ordenar = parametros.get("ordenar") || "recentes";
  const pagina = Number(parametros.get("pagina") || "1");
  const [precoMinDigitado, setPrecoMinDigitado] = useState(precoMin);
  const [precoMaxDigitado, setPrecoMaxDigitado] = useState(precoMax);
  const [bairroDigitado, setBairroDigitado] = useState(bairro);

  useSeo({
    titulo: `Imóveis à venda e para alugar | ${config.nome}`,
    descricao: "Catálogo completo de imóveis: apartamentos, casas, coberturas e studios com filtros por tipo, preço, quartos e bairro.",
  });

  useEffect(() => {
    api.get("/imoveis/opcoes").then((r) => setOpcoes(r.data)).catch(() => {});
  }, []);

  const carregar = useCallback(() => {
    setCarregando(true);
    api
      .get("/imoveis/publico", {
        params: {
          finalidade: finalidade || undefined,
          tipo: tipo || undefined,
          bairro: bairro || undefined,
          quartos_min: quartos || undefined,
          preco_min: precoMin || undefined,
          preco_max: precoMax || undefined,
          ordenar,
          pagina,
          por_pagina: 9,
        },
      })
      .then((r) => setDados(r.data))
      .catch(() => setDados(VAZIO))
      .finally(() => setCarregando(false));
  }, [finalidade, tipo, bairro, quartos, precoMin, precoMax, ordenar, pagina]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function definirParametro(chave: string, valor: string) {
    const novos = new URLSearchParams(parametros);
    if (valor) novos.set(chave, valor);
    else novos.delete(chave);
    if (chave !== "pagina") novos.delete("pagina");
    setParametros(novos);
  }

  function aplicarPrecoEBairro() {
    const novos = new URLSearchParams(parametros);
    if (bairroDigitado.trim()) novos.set("bairro", bairroDigitado.trim());
    else novos.delete("bairro");
    if (precoMinDigitado) novos.set("preco_min", precoMinDigitado);
    else novos.delete("preco_min");
    if (precoMaxDigitado) novos.set("preco_max", precoMaxDigitado);
    else novos.delete("preco_max");
    novos.delete("pagina");
    setParametros(novos);
  }

  const totalPaginas = Math.max(1, Math.ceil(dados.total / dados.por_pagina));

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-8" data-testid="pagina-imoveis">
      <h1 className="font-heading text-4xl font-bold tracking-tight text-stone-950">Imóveis</h1>
      <p className="mt-2 text-stone-600">
        {carregando ? "Buscando imóveis..." : `${dados.total} ${dados.total === 1 ? "imóvel encontrado" : "imóveis encontrados"}`}
      </p>

      <div className="mt-8 rounded-lg border border-stone-200 bg-white p-4 md:p-6" data-testid="filtros-imoveis">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-stone-500">Finalidade</Label>
            <Select value={finalidade} onValueChange={(v: string) => definirParametro("finalidade", v === "todas" ? "" : v)}>
              <SelectTrigger className="h-11 border-stone-300" data-testid="filtro-finalidade">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="venda">Comprar</SelectItem>
                <SelectItem value="aluguel">Alugar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-stone-500">Tipo</Label>
            <Select value={tipo} onValueChange={(v: string) => definirParametro("tipo", v === "todos" ? "" : v)}>
              <SelectTrigger className="h-11 border-stone-300" data-testid="filtro-tipo">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {opcoes.tipos.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-stone-500">Bairro</Label>
            <Input
              list="lista-bairros"
              placeholder="Digite o bairro"
              value={bairroDigitado}
              onChange={(e) => setBairroDigitado(e.target.value)}
              className="h-11 border-stone-300"
              data-testid="filtro-bairro"
            />
            <datalist id="lista-bairros">
              {opcoes.bairros.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-stone-500">Quartos (mín.)</Label>
            <Select value={quartos} onValueChange={(v: string) => definirParametro("quartos", v === "qualquer" ? "" : v)}>
              <SelectTrigger className="h-11 border-stone-300" data-testid="filtro-quartos">
                <SelectValue placeholder="Qualquer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="qualquer">Qualquer</SelectItem>
                <SelectItem value="1">1+</SelectItem>
                <SelectItem value="2">2+</SelectItem>
                <SelectItem value="3">3+</SelectItem>
                <SelectItem value="4">4+</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-stone-500">Preço de / até</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                placeholder="Mín."
                value={precoMinDigitado}
                onChange={(e) => setPrecoMinDigitado(e.target.value)}
                className="h-11 border-stone-300"
                data-testid="filtro-preco-min"
              />
              <Input
                type="number"
                min={0}
                placeholder="Máx."
                value={precoMaxDigitado}
                onChange={(e) => setPrecoMaxDigitado(e.target.value)}
                className="h-11 border-stone-300"
                data-testid="filtro-preco-max"
              />
            </div>
          </div>
          <div className="flex items-end">
            <Button onClick={aplicarPrecoEBairro} className="h-11 w-full bg-stone-900 text-white transition-colors duration-200 hover:bg-stone-800" data-testid="filtro-aplicar">
              Aplicar filtros
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-sm text-stone-600">Ordenar por:</Label>
          <Select value={ordenar} onValueChange={(v: string) => definirParametro("ordenar", v)}>
            <SelectTrigger className="h-10 w-48 border-stone-300 bg-white" data-testid="filtro-ordenar">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recentes">Mais recentes</SelectItem>
              <SelectItem value="menor_preco">Menor preço</SelectItem>
              <SelectItem value="maior_preco">Maior preço</SelectItem>
              <SelectItem value="maior_area">Maior área</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex rounded-md border border-stone-300 bg-white p-1" role="group" aria-label="Modo de visualização">
          <button
            onClick={() => setVisualizacao("grade")}
            aria-pressed={visualizacao === "grade"}
            data-testid="visualizacao-grade"
            className={`flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${visualizacao === "grade" ? "bg-stone-900 text-white" : "text-stone-600 hover:text-stone-900"}`}
          >
            <LayoutGrid className="h-4 w-4" /> Grade
          </button>
          <button
            onClick={() => setVisualizacao("lista")}
            aria-pressed={visualizacao === "lista"}
            data-testid="visualizacao-lista"
            className={`flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${visualizacao === "lista" ? "bg-stone-900 text-white" : "text-stone-600 hover:text-stone-900"}`}
          >
            <List className="h-4 w-4" /> Lista
          </button>
        </div>
      </div>

      {carregando ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" data-testid="grade-carregando">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 animate-pulse rounded-lg bg-stone-200" />
          ))}
        </div>
      ) : dados.itens.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-lg border border-dashed border-stone-300 bg-white py-20 text-center" data-testid="nenhum-imovel">
          <SearchX className="h-10 w-10 text-stone-400" />
          <p className="font-heading text-lg font-semibold text-stone-800">Nenhum imóvel encontrado</p>
          <p className="text-sm text-stone-500">Ajuste os filtros ou fale com a gente — podemos ter algo sob medida para você.</p>
        </div>
      ) : (
        <div
          className={visualizacao === "grade" ? "mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" : "mt-8 flex flex-col gap-4"}
          data-testid="grade-imoveis"
        >
          {dados.itens.map((imovel: Imovel) => (
            <CartaoImovel key={imovel.id} imovel={imovel} modo={visualizacao} />
          ))}
        </div>
      )}

      {totalPaginas > 1 ? (
        <div className="mt-10 flex items-center justify-center gap-4" data-testid="paginacao">
          <Button
            variant="outline"
            disabled={pagina <= 1}
            onClick={() => definirParametro("pagina", String(pagina - 1))}
            className="border-stone-300"
            data-testid="pagina-anterior"
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
          </Button>
          <span className="text-sm text-stone-600" data-testid="paginacao-info">
            Página {pagina} de {totalPaginas}
          </span>
          <Button
            variant="outline"
            disabled={pagina >= totalPaginas}
            onClick={() => definirParametro("pagina", String(pagina + 1))}
            className="border-stone-300"
            data-testid="proxima-pagina"
          >
            Próxima <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
