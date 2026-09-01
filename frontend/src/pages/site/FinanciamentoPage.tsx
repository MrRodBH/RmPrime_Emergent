import { useEffect, useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { api } from "@/lib/api";
import { useSeo } from "@/hooks/useSeo";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import { formatarMoedaExata } from "@/lib/format";
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui-kit";

interface Parcela {
  numero: number;
  valor: number;
  amortizacao: number;
  juros: number;
  saldo: number;
}

const BANCOS = [
  { valor: "CEF", rotulo: "Caixa (CEF)" },
  { valor: "Itaú", rotulo: "Itaú" },
  { valor: "Bradesco", rotulo: "Bradesco" },
  { valor: "Inter", rotulo: "Inter" },
];

export default function FinanciamentoPage() {
  const config = useSiteConfig();
  const [valorImovel, setValorImovel] = useState("500000");
  const [entrada, setEntrada] = useState("100000");
  const [prazoMeses, setPrazoMeses] = useState("360");
  const [taxaAA, setTaxaAA] = useState("10");
  const [fonteTaxa, setFonteTaxa] = useState("");
  const [banco, setBanco] = useState("CEF");
  const [modalidade, setModalidade] = useState("MCMV");
  const [sistema, setSistema] = useState<"SAC" | "PRICE">("SAC");

  useSeo({
    titulo: `Calculadora de financiamento SAC e PRICE | ${config.nome}`,
    descricao: "Simule as parcelas do seu financiamento imobiliário nos sistemas SAC e PRICE com as taxas atuais dos bancos.",
  });

  useEffect(() => {
    api
      .get("/calculadora/taxa", {
        params: { banco, sistema, modalidade: banco === "CEF" ? modalidade : undefined },
      })
      .then((r) => {
        if (r.data?.taxa_aa) {
          setTaxaAA(String(r.data.taxa_aa));
          if (r.data.fonte === "exemplo") {
            setFonteTaxa(
              "Ainda não temos a taxa desta combinação — usando uma taxa de exemplo. Você pode digitar qualquer valor no campo de taxa."
            );
          } else {
            const dataRef = r.data.data_referencia
              ? new Date(r.data.data_referencia).toLocaleDateString("pt-BR")
              : "";
            const origem =
              r.data.fonte === "manual"
                ? "informada pela imobiliária"
                : "Banco Central (atualização automática)";
            setFonteTaxa(
              `Taxa referente a ${dataRef} · ${r.data.banco}${r.data.modalidade ? ` (${r.data.modalidade})` : ""} · ${r.data.sistema} · fonte: ${origem}. Você pode ajustar o valor no campo de taxa.`
            );
          }
        }
      })
      .catch(() => {});
  }, [banco, sistema, modalidade]);

  const resultado = useMemo(() => {
    const valor = parseFloat(valorImovel) || 0;
    const entradaValor = parseFloat(entrada) || 0;
    const n = parseInt(prazoMeses) || 0;
    const taxaAnual = parseFloat(taxaAA) || 0;
    const principal = valor - entradaValor;
    if (principal <= 0 || n <= 0) return null;

    const i = taxaAnual / 100 / 12;
    const parcelas: Parcela[] = [];
    let saldo = principal;
    let totalJuros = 0;

    if (sistema === "SAC") {
      const amortizacao = principal / n;
      for (let mes = 1; mes <= n; mes++) {
        const juros = saldo * i;
        const valor = amortizacao + juros;
        saldo = Math.max(0, saldo - amortizacao);
        totalJuros += juros;
        parcelas.push({ numero: mes, valor, amortizacao, juros, saldo });
      }
    } else {
      const parcela = i > 0 ? (principal * i) / (1 - Math.pow(1 + i, -n)) : principal / n;
      for (let mes = 1; mes <= n; mes++) {
        const juros = saldo * i;
        const amortizacao = parcela - juros;
        saldo = Math.max(0, saldo - amortizacao);
        totalJuros += juros;
        parcelas.push({ numero: mes, valor: parcela, amortizacao, juros, saldo });
      }
    }

    return {
      parcelas,
      primeira: parcelas[0]?.valor ?? 0,
      ultima: parcelas[parcelas.length - 1]?.valor ?? 0,
      totalJuros,
      totalPago: principal + totalJuros,
      principal,
    };
  }, [valorImovel, entrada, prazoMeses, taxaAA, sistema]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-8" data-testid="pagina-financiamento">
      <h1 className="font-heading text-4xl font-bold tracking-tight text-stone-950">Calculadora de financiamento</h1>
      <p className="mt-2 max-w-2xl text-stone-600">
        Simule as parcelas nos sistemas SAC (parcelas decrescentes) e PRICE (parcela fixa) com as taxas mais recentes
        dos bancos — e descubra qual cabe melhor no seu bolso.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-5">
        <div className="rounded-lg border border-stone-200 bg-white p-6 lg:col-span-2">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-stone-500" />
            <h2 className="font-heading text-lg font-semibold text-stone-950">Dados da simulação</h2>
          </div>
          <div className="mt-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Banco</Label>
                <Select value={banco} onValueChange={setBanco}>
                  <SelectTrigger className="h-11 border-stone-300" data-testid="calc-banco">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BANCOS.map((b) => (
                      <SelectItem key={b.valor} value={b.valor} data-testid={`calc-banco-${b.valor.toLowerCase()}`}>
                        {b.rotulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {banco === "CEF" ? (
                <div className="space-y-2">
                  <Label>Modalidade</Label>
                  <Select value={modalidade} onValueChange={setModalidade}>
                    <SelectTrigger className="h-11 border-stone-300" data-testid="calc-modalidade">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MCMV" data-testid="calc-modalidade-mcmv">MCMV</SelectItem>
                      <SelectItem value="SBPE" data-testid="calc-modalidade-sbpe">SBPE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor-imovel">Valor do imóvel (R$)</Label>
              <Input id="valor-imovel" type="number" min={0} value={valorImovel} onChange={(e) => setValorImovel(e.target.value)} className="h-11 border-stone-300" data-testid="calc-valor-imovel" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entrada">Entrada (R$)</Label>
              <Input id="entrada" type="number" min={0} value={entrada} onChange={(e) => setEntrada(e.target.value)} className="h-11 border-stone-300" data-testid="calc-entrada" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prazo">Prazo (meses)</Label>
                <Input id="prazo" type="number" min={12} max={420} value={prazoMeses} onChange={(e) => setPrazoMeses(e.target.value)} className="h-11 border-stone-300" data-testid="calc-prazo" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxa">Taxa de juros (% a.a.)</Label>
                <Input id="taxa" type="number" min={0} step="0.01" value={taxaAA} onChange={(e) => setTaxaAA(e.target.value)} className="h-11 border-stone-300" data-testid="calc-taxa" />
              </div>
            </div>
            {fonteTaxa ? <p className="text-xs text-stone-500" data-testid="calc-fonte-taxa">{fonteTaxa}</p> : null}
            <div className="space-y-2">
              <Label>Sistema de amortização</Label>
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="Sistema de amortização">
                {(["SAC", "PRICE"] as const).map((opcao) => (
                  <button
                    key={opcao}
                    type="button"
                    onClick={() => setSistema(opcao)}
                    aria-pressed={sistema === opcao}
                    data-testid={`calc-sistema-${opcao.toLowerCase()}`}
                    className={`h-11 rounded-md border text-sm font-semibold transition-colors duration-200 ${
                      sistema === opcao
                        ? "border-stone-900 bg-stone-900 text-white"
                        : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"
                    }`}
                  >
                    {opcao}
                  </button>
                ))}
              </div>
              <p className="text-xs text-stone-500">
                {sistema === "SAC"
                  ? "SAC: parcelas começam maiores e diminuem com o tempo. Menos juros no total."
                  : "PRICE: parcela fixa do começo ao fim. Mais previsibilidade no mês a mês."}
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          {!resultado ? (
            <div className="flex h-full min-h-[240px] items-center justify-center rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500" data-testid="calc-invalida">
              A entrada deve ser menor que o valor do imóvel e o prazo maior que zero.
            </div>
          ) : (
            <div className="space-y-6" data-testid="calc-resultado">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-stone-950 p-5 text-white">
                  <p className="text-xs uppercase tracking-wide text-stone-400">
                    {sistema === "SAC" ? "Primeira parcela" : "Parcela mensal"}
                  </p>
                  <p className="mt-1 font-heading text-3xl font-bold" data-testid="calc-primeira-parcela">{formatarMoedaExata(resultado.primeira)}</p>
                  {sistema === "SAC" ? (
                    <p className="mt-1 text-sm text-stone-400">Última parcela: <span data-testid="calc-ultima-parcela">{formatarMoedaExata(resultado.ultima)}</span></p>
                  ) : null}
                </div>
                <div className="rounded-lg border border-stone-200 bg-white p-5">
                  <p className="text-xs uppercase tracking-wide text-stone-500">Valor financiado</p>
                  <p className="mt-1 font-heading text-2xl font-bold text-stone-950" data-testid="calc-valor-financiado">{formatarMoedaExata(resultado.principal)}</p>
                  <p className="mt-1 text-sm text-stone-500">{prazoMeses} meses · {taxaAA}% a.a.</p>
                </div>
                <div className="rounded-lg border border-stone-200 bg-white p-5">
                  <p className="text-xs uppercase tracking-wide text-stone-500">Total de juros</p>
                  <p className="mt-1 font-heading text-2xl font-bold text-amber-700" data-testid="calc-total-juros">{formatarMoedaExata(resultado.totalJuros)}</p>
                </div>
                <div className="rounded-lg border border-stone-200 bg-white p-5">
                  <p className="text-xs uppercase tracking-wide text-stone-500">Total pago (sem entrada)</p>
                  <p className="mt-1 font-heading text-2xl font-bold text-stone-950" data-testid="calc-total-pago">{formatarMoedaExata(resultado.totalPago)}</p>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
                <p className="border-b border-stone-200 px-5 py-3 text-sm font-semibold text-stone-900">
                  Primeiras 12 parcelas ({sistema})
                </p>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm" data-testid="calc-tabela-parcelas">
                    <thead className="sticky top-0 bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                      <tr>
                        <th className="px-5 py-2">Mês</th>
                        <th className="px-5 py-2">Parcela</th>
                        <th className="px-5 py-2">Amortização</th>
                        <th className="px-5 py-2">Juros</th>
                        <th className="px-5 py-2">Saldo devedor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.parcelas.slice(0, 12).map((parcela) => (
                        <tr key={parcela.numero} className="border-t border-stone-100">
                          <td className="px-5 py-2 text-stone-500">{parcela.numero}</td>
                          <td className="px-5 py-2 font-medium text-stone-900">{formatarMoedaExata(parcela.valor)}</td>
                          <td className="px-5 py-2 text-stone-600">{formatarMoedaExata(parcela.amortizacao)}</td>
                          <td className="px-5 py-2 text-stone-600">{formatarMoedaExata(parcela.juros)}</td>
                          <td className="px-5 py-2 text-stone-600">{formatarMoedaExata(parcela.saldo)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-stone-500">
                Simulação apenas ilustrativa, com a taxa média divulgada pelo Banco Central para o banco e a modalidade
                escolhidos. As condições reais variam conforme perfil de crédito e regra do banco na data da contratação.
                Fale com nossos corretores para uma análise completa.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
