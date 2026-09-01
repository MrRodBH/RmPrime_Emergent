import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Sparkles, TrendingUp, Users, CalendarCheck, FileSignature } from "lucide-react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, erroApi } from "@/lib/api";
import { useAuth, type Usuario } from "@/contexts/AuthContext";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui-kit";

interface Metricas {
  total_leads: number;
  leads_por_dia: { data: string; total: number }[];
  funil: { etapa: string; total: number; percentual: number }[];
  conversao_global: number;
  visitas: { agendadas: number; realizadas: number };
  propostas: { enviadas: number; fechadas: number };
  por_corretor: { corretor_id: string; nome: string; leads: number; fechados: number }[] | null;
  gerado_em: string;
}

const CORES_FUNIL: Record<string, string> = {
  Novo: "#3b82f6",
  Conversando: "#f59e0b",
  Visita: "#8b5cf6",
  Proposta: "#0891b2",
  "Negócio Fechado": "#059669",
  Perdido: "#ef4444",
  Descartado: "#a8a29e",
};

const PERIODOS = [
  { valor: "7", rotulo: "Últimos 7 dias" },
  { valor: "30", rotulo: "Últimos 30 dias" },
  { valor: "90", rotulo: "Últimos 90 dias" },
  { valor: "0", rotulo: "Todo o período" },
];

function dataCurta(iso: string): string {
  const partes = iso.split("-");
  if (partes.length !== 3) return iso;
  return `${partes[2]}/${partes[1]}`;
}

function TooltipPadrao({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold text-stone-900">{payload[0]?.payload?.etapa || payload[0]?.payload?.nome || dataCurta(label)}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color || p.fill }} className="text-stone-700">
          {p.name}: <strong>{p.value}</strong>
          {p.dataKey === "total" && payload[0]?.payload?.percentual !== undefined
            ? ` (${payload[0].payload.percentual}%)`
            : ""}
        </p>
      ))}
    </div>
  );
}

export default function InicioPage() {
  const { usuario } = useAuth();
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [periodo, setPeriodo] = useState("30");
  const [corretorId, setCorretorId] = useState("");
  const [corretores, setCorretores] = useState<Usuario[]>([]);
  const [atualizando, setAtualizando] = useState(false);
  const [insights, setInsights] = useState("");
  const [gerandoInsights, setGerandoInsights] = useState(false);

  const adminOuGestor = !!usuario && (usuario.papel === "admin" || usuario.papel === "gestor");

  const carregar = useCallback(async (silencioso = false) => {
    if (!silencioso) setAtualizando(true);
    try {
      const { data } = await api.get("/dashboard/metricas", {
        params: { dias: Number(periodo), corretor_id: corretorId || undefined },
      });
      setMetricas(data);
    } catch (e) {
      toast.error(erroApi(e));
    } finally {
      setAtualizando(false);
    }
  }, [periodo, corretorId]);

  useEffect(() => {
    carregar();
    const intervalo = setInterval(() => carregar(true), 30000);
    return () => clearInterval(intervalo);
  }, [carregar]);

  useEffect(() => {
    if (adminOuGestor) {
      api.get("/usuarios", { params: { papel: "corretor" } }).then((r) => setCorretores(r.data)).catch(() => {});
    }
  }, [adminOuGestor]);

  if (!usuario) return null;

  async function gerarInsights() {
    setGerandoInsights(true);
    try {
      const { data } = await api.get("/ia/insights-dashboard", { params: { dias: Number(periodo) || 30 } });
      setInsights(data.texto);
    } catch (e) {
      toast.error(erroApi(e));
    } finally {
      setGerandoInsights(false);
    }
  }

  const dadosVisitasPropostas = metricas
    ? [
        { nome: "Visitas", Agendadas: metricas.visitas.agendadas, "Realizadas / Avançaram": metricas.visitas.realizadas },
        { nome: "Propostas", Agendadas: metricas.propostas.enviadas, "Realizadas / Avançaram": metricas.propostas.fechadas },
      ]
    : [];

  return (
    <div className="space-y-8" data-testid="pagina-dashboard">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">
            Olá, {usuario.nome.split(" ")[0]}!
          </h1>
          <p className="mt-1 text-stone-600">
            {adminOuGestor
              ? "Indicadores consolidados da imobiliária, atualizados automaticamente."
              : "Seus indicadores de leads e funil, atualizados automaticamente."}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-stone-500">Período</Label>
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="h-10 w-44 border-stone-300 bg-white" data-testid="filtro-periodo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODOS.map((p) => (
                  <SelectItem key={p.valor} value={p.valor}>{p.rotulo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {adminOuGestor ? (
            <div className="space-y-1">
              <Label className="text-xs text-stone-500">Corretor</Label>
              <Select value={corretorId} onValueChange={(v: string) => setCorretorId(v === "todos" ? "" : v)}>
                <SelectTrigger className="h-10 w-48 border-stone-300 bg-white" data-testid="filtro-corretor">
                  <SelectValue placeholder="Todos os corretores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os corretores</SelectItem>
                  {corretores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <Button variant="outline" onClick={() => carregar()} disabled={atualizando} className="h-10 border-stone-300" data-testid="botao-atualizar-dashboard">
            <RefreshCw className={`mr-2 h-4 w-4 ${atualizando ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {metricas ? (
        <p className="text-xs text-stone-400" data-testid="atualizado-em">
          Atualizado às {new Date(metricas.gerado_em).toLocaleTimeString("pt-BR")} · os números se atualizam sozinhos a cada 30 segundos
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-stone-200" data-testid="kpi-leads">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-stone-600">Leads no período</CardTitle>
            <Users className="h-4 w-4 text-stone-400" />
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-bold text-stone-950">{metricas?.total_leads ?? "—"}</p>
            <p className="text-xs text-stone-500">contatos recebidos pelo site, landing pages e agendamentos</p>
          </CardContent>
        </Card>
        <Card className="border-stone-200" data-testid="kpi-conversao">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-stone-600">Taxa de conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-stone-400" />
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-bold text-stone-950">
              {metricas ? `${metricas.conversao_global}%` : "—"}
            </p>
            <p className="text-xs text-stone-500">leads que chegaram a "Negócio Fechado"</p>
          </CardContent>
        </Card>
        <Card className="border-stone-200" data-testid="kpi-visitas">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-stone-600">Visitas</CardTitle>
            <CalendarCheck className="h-4 w-4 text-stone-400" />
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-bold text-stone-950">
              {metricas ? `${metricas.visitas.realizadas} de ${metricas.visitas.agendadas}` : "—"}
            </p>
            <p className="text-xs text-stone-500">realizadas (etapa Visita ou além) vs. agendadas pelo site</p>
          </CardContent>
        </Card>
        <Card className="border-stone-200" data-testid="kpi-propostas">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-stone-600">Propostas</CardTitle>
            <FileSignature className="h-4 w-4 text-stone-400" />
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-bold text-stone-950">
              {metricas ? `${metricas.propostas.fechadas} de ${metricas.propostas.enviadas}` : "—"}
            </p>
            <p className="text-xs text-stone-500">fechadas vs. enviadas (etapa Proposta ou além)</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-stone-200" data-testid="grafico-leads-periodo">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Volume de leads por dia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={(metricas?.leads_por_dia || []).map((d) => ({ ...d, rotulo: dataCurta(d.data) }))} margin={{ left: -20, right: 10 }}>
                  <defs>
                    <linearGradient id="corLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1c1917" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#1c1917" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                  <XAxis dataKey="rotulo" tick={{ fontSize: 11, fill: "#78716c" }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#78716c" }} tickLine={false} axisLine={false} />
                  <Tooltip content={<TooltipPadrao />} />
                  <Area type="monotone" dataKey="total" name="Leads" stroke="#1c1917" strokeWidth={2} fill="url(#corLeads)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-stone-200" data-testid="grafico-funil">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Funil de vendas (leads por etapa)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metricas?.funil || []} layout="vertical" margin={{ left: 40, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#78716c" }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="etapa" tick={{ fontSize: 11, fill: "#44403c" }} tickLine={false} axisLine={false} width={100} />
                  <Tooltip content={<TooltipPadrao />} />
                  <Bar dataKey="total" name="Leads" radius={[0, 4, 4, 0]}>
                    {(metricas?.funil || []).map((item) => (
                      <Cell key={item.etapa} fill={CORES_FUNIL[item.etapa] || "#78716c"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-stone-200" data-testid="grafico-visitas-propostas">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Visitas e propostas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosVisitasPropostas} margin={{ left: -20, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                  <XAxis dataKey="nome" tick={{ fontSize: 12, fill: "#44403c" }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#78716c" }} tickLine={false} axisLine={false} />
                  <Tooltip content={<TooltipPadrao />} />
                  <Legend formatter={(valor: string) => (valor === "Agendadas" ? "Visitas agendadas / Propostas enviadas" : "Visitas realizadas / Negócios fechados")} />
                  <Bar dataKey="Agendadas" name="Agendadas" fill="#a8a29e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Realizadas / Avançaram" name="Realizadas / Avançaram" fill="#1c1917" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-stone-500">
              Como lemos: "realizada" = o lead avançou para a etapa Visita ou além; "enviada" = avançou para Proposta ou além.
            </p>
          </CardContent>
        </Card>

        {adminOuGestor ? (
          <Card className="border-stone-200" data-testid="grafico-comparativo-corretores">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Comparativo entre corretores</CardTitle>
            </CardHeader>
            <CardContent>
              {metricas?.por_corretor && metricas.por_corretor.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metricas.por_corretor} margin={{ left: -20, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                      <XAxis dataKey="nome" tick={{ fontSize: 11, fill: "#44403c" }} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#78716c" }} tickLine={false} axisLine={false} />
                      <Tooltip content={<TooltipPadrao />} />
                      <Legend />
                      <Bar dataKey="leads" name="Leads recebidos" fill="#78716c" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="fechados" name="Negócios fechados" fill="#059669" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="flex h-64 items-center justify-center text-sm text-stone-500">
                  Nenhum lead atribuído a corretores no período selecionado.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-stone-200">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Sua posição no funil</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-stone-600">
                Estes números mostram apenas os leads atribuídos a você. O consolidado da imobiliária e o comparativo
                entre corretores ficam disponíveis para Administradores e Gestores.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="border-stone-200" data-testid="bloco-insights-ia">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 font-heading text-lg">
              <Sparkles className="h-5 w-5 text-stone-400" />
              Insights de negócio com IA
            </CardTitle>
            <Button
              variant="outline"
              onClick={gerarInsights}
              disabled={gerandoInsights}
              className="border-stone-300"
              data-testid="botao-gerar-insights-dashboard"
            >
              {gerandoInsights ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Analisando...
                </>
              ) : insights ? (
                "Gerar novamente"
              ) : (
                "Gerar análise"
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {insights ? (
            <div className="space-y-3" data-testid="insights-dashboard-texto">
              {insights.split("\n").filter(Boolean).map((paragrafo, i) => (
                <p key={i} className="text-sm leading-relaxed text-stone-700">{paragrafo}</p>
              ))}
              <p className="text-[11px] text-stone-400">
                Análise gerada por IA com base nos números do período selecionado ({PERIODOS.find((p) => p.valor === periodo)?.rotulo.toLowerCase()}).
              </p>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-stone-600">
              A inteligência artificial analisa os números do período selecionado e aponta tendências e pontos de
              atenção em linguagem simples — por exemplo, em qual etapa o funil está travando e qual origem de lead
              está convertendo melhor. Clique em "Gerar análise" para ver o resumo.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
