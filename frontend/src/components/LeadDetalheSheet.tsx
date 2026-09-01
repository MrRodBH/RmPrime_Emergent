import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Loader2, Mail, Phone, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { api, erroApi } from "@/lib/api";
import type { Usuario } from "@/contexts/AuthContext";
import {
  Badge,
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@/components/ui-kit";
import { formatarData } from "@/lib/format";
import { ROTULOS_ORIGEM, tempoRelativo } from "@/pages/painel/CrmPage";
import type { Atividade, Lead } from "@/types";

interface Props {
  leadId: string | null;
  aoFechar: () => void;
  aoAtualizar: () => void;
  adminOuGestor: boolean;
}

const ROTULOS_ATIVIDADE: Record<string, string> = {
  cadastro: "Cadastro",
  etapa: "Mudança de etapa",
  atribuicao: "Atribuição",
  anotacao: "Anotação",
  ligacao: "Ligação",
  email: "E-mail",
};

interface InsightsLead {
  sentimento: string;
  resumo: string;
  proximos_passos: string[];
  gerado_em: string;
}

const ESTILO_SENTIMENTO: Record<string, string> = {
  positivo: "border-emerald-200 bg-emerald-50 text-emerald-700",
  neutro: "border-amber-200 bg-amber-50 text-amber-700",
  negativo: "border-red-200 bg-red-50 text-red-700",
  indefinido: "border-stone-200 bg-stone-100 text-stone-600",
};

const ROTULO_SENTIMENTO: Record<string, string> = {
  positivo: "Positivo",
  neutro: "Neutro",
  negativo: "Negativo",
  indefinido: "Ainda indefinido",
};

export function LeadDetalheSheet({ leadId, aoFechar, aoAtualizar, adminOuGestor }: Props) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [corretores, setCorretores] = useState<Usuario[]>([]);
  const [corretorSelecionado, setCorretorSelecionado] = useState("");
  const [tipoAtividade, setTipoAtividade] = useState("anotacao");
  const [textoAtividade, setTextoAtividade] = useState("");
  const [enviandoAtividade, setEnviandoAtividade] = useState(false);
  const [reatribuindo, setReatribuindo] = useState(false);
  const [insightsIa, setInsightsIa] = useState<InsightsLead | null>(null);
  const [gerandoIa, setGerandoIa] = useState(false);

  const carregar = useCallback(async () => {
    if (!leadId) return;
    try {
      const { data } = await api.get(`/crm/leads/${leadId}`);
      setLead(data);
      setCorretorSelecionado(data.corretor_atribuido_id || "");
    } catch (e) {
      toast.error(erroApi(e));
      aoFechar();
    }
  }, [leadId, aoFechar]);

  useEffect(() => {
    setLead(null);
    setTextoAtividade("");
    setInsightsIa(null);
    if (leadId) carregar();
  }, [leadId, carregar]);

  useEffect(() => {
    if (leadId && adminOuGestor) {
      api.get("/usuarios", { params: { papel: "corretor", ativo: true } })
        .then((r) => setCorretores(r.data))
        .catch(() => {});
    }
  }, [leadId, adminOuGestor]);

  async function registrarAtividade(evento: FormEvent) {
    evento.preventDefault();
    if (!lead || !textoAtividade.trim()) return;
    setEnviandoAtividade(true);
    try {
      await api.post(`/crm/leads/${lead.id}/atividades`, {
        tipo: tipoAtividade,
        descricao: textoAtividade.trim(),
      });
      setTextoAtividade("");
      toast.success("Atividade registrada.");
      await carregar();
    } catch (e) {
      toast.error(erroApi(e));
    } finally {
      setEnviandoAtividade(false);
    }
  }

  async function reatribuir() {
    if (!lead || !corretorSelecionado) return;
    if (corretorSelecionado === lead.corretor_atribuido_id) {
      toast.info("Este corretor já é o responsável pelo lead.");
      return;
    }
    setReatribuindo(true);
    try {
      await api.patch(`/crm/leads/${lead.id}/atribuir`, { corretor_id: corretorSelecionado });
      toast.success("Lead reatribuído. O novo corretor foi avisado por e-mail.");
      await carregar();
      aoAtualizar();
    } catch (e) {
      toast.error(erroApi(e));
    } finally {
      setReatribuindo(false);
    }
  }

  async function gerarInsightsIa() {
    if (!lead) return;
    setGerandoIa(true);
    try {
      const { data } = await api.get(`/ia/insights-lead/${lead.id}`);
      setInsightsIa(data);
    } catch (e) {
      toast.error(erroApi(e));
    } finally {
      setGerandoIa(false);
    }
  }

  return (
    <Sheet open={!!leadId} onOpenChange={(v: boolean) => !v && aoFechar()}>
      <SheetContent side="right" className="w-full overflow-y-auto bg-stone-50 sm:max-w-xl" data-testid="sheet-lead">
        {!lead ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <SheetTitle className="sr-only">Carregando lead...</SheetTitle>
            <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
          </div>
        ) : (
          <div className="space-y-6 p-2">
            <div>
              <SheetTitle className="font-heading text-2xl tracking-tight text-stone-950">{lead.nome}</SheetTitle>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-stone-300 bg-white text-stone-700">{lead.etapa_crm}</Badge>
                <Badge variant="outline" className="border-stone-200 bg-stone-100 text-stone-600">
                  Origem: {ROTULOS_ORIGEM[lead.origem] || lead.origem}
                </Badge>
                {lead.motivo_descarte ? (
                  <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">{lead.motivo_descarte}</Badge>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-stone-500">
                Captado {tempoRelativo(lead.criado_em)}
                {lead.corretor_nome ? ` · Responsável: ${lead.corretor_nome}` : ""}
              </p>
            </div>

            <Tabs defaultValue="resumo">
              <TabsList className="w-full bg-stone-200/70">
                <TabsTrigger value="resumo" className="flex-1" data-testid="tab-resumo">Resumo</TabsTrigger>
                <TabsTrigger value="atividades" className="flex-1" data-testid="tab-atividades">Atividades</TabsTrigger>
                <TabsTrigger value="ia" className="flex-1" data-testid="tab-ia">Insights de IA</TabsTrigger>
              </TabsList>

              <TabsContent value="resumo" className="mt-4 space-y-5">
                <div className="space-y-3 rounded-lg border border-stone-200 bg-white p-5">
                  <a href={`tel:${lead.telefone}`} className="flex items-center gap-3 text-sm text-stone-800 transition-colors duration-200 hover:text-stone-950" data-testid="lead-telefone">
                    <Phone className="h-4 w-4 text-stone-400" /> {lead.telefone}
                  </a>
                  {lead.email ? (
                    <a href={`mailto:${lead.email}`} className="flex items-center gap-3 text-sm text-stone-800 transition-colors duration-200 hover:text-stone-950" data-testid="lead-email">
                      <Mail className="h-4 w-4 text-stone-400" /> {lead.email}
                    </a>
                  ) : null}
                  {lead.imovel_titulo ? (
                    <p className="flex items-center gap-3 text-sm text-stone-800">
                      <User className="h-4 w-4 text-stone-400" />
                      Interesse:{" "}
                      {lead.imovel_slug ? (
                        <Link to={`/imoveis/${lead.imovel_slug}`} target="_blank" className="font-medium underline underline-offset-2" data-testid="lead-imovel">
                          {lead.imovel_titulo}
                        </Link>
                      ) : (
                        lead.imovel_titulo
                      )}
                    </p>
                  ) : null}
                </div>

                {lead.mensagem ? (
                  <div className="rounded-lg border border-stone-200 bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Mensagem do lead</p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-stone-700" data-testid="lead-mensagem">{lead.mensagem}</p>
                  </div>
                ) : null}

                {adminOuGestor ? (
                  <div className="rounded-lg border border-stone-200 bg-white p-5" data-testid="bloco-reatribuir">
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Reatribuir lead</p>
                    <div className="mt-3 flex gap-2">
                      <Select value={corretorSelecionado} onValueChange={setCorretorSelecionado}>
                        <SelectTrigger className="border-stone-300" data-testid="select-reatribuir">
                          <SelectValue placeholder="Escolha o corretor" />
                        </SelectTrigger>
                        <SelectContent>
                          {corretores.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={reatribuir}
                        disabled={reatribuindo || !corretorSelecionado || corretorSelecionado === lead.corretor_atribuido_id}
                        className="shrink-0 bg-stone-900 text-white hover:bg-stone-800"
                        data-testid="botao-reatribuir"
                      >
                        {reatribuindo ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reatribuir"}
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-stone-500">O novo corretor recebe um e-mail com os dados do lead.</p>
                  </div>
                ) : null}
              </TabsContent>

              <TabsContent value="atividades" className="mt-4 space-y-5">
                <form onSubmit={registrarAtividade} className="space-y-3 rounded-lg border border-stone-200 bg-white p-5" data-testid="form-atividade">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Registrar atividade</p>
                  <div className="flex gap-2">
                    <Select value={tipoAtividade} onValueChange={setTipoAtividade}>
                      <SelectTrigger className="w-40 border-stone-300" data-testid="select-tipo-atividade">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="anotacao">Anotação</SelectItem>
                        <SelectItem value="ligacao">Ligação</SelectItem>
                        <SelectItem value="email">E-mail</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    rows={3}
                    placeholder="Ex.: Liguei e combinei uma visita para sábado às 10h..."
                    value={textoAtividade}
                    onChange={(e) => setTextoAtividade(e.target.value)}
                    className="border-stone-300"
                    data-testid="textarea-atividade"
                  />
                  <Button type="submit" disabled={enviandoAtividade || !textoAtividade.trim()} className="bg-stone-900 text-white hover:bg-stone-800" data-testid="botao-registrar-atividade">
                    {enviandoAtividade ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar"}
                  </Button>
                </form>

                <ol className="relative space-y-4 border-l border-stone-300 pl-5" data-testid="lista-atividades">
                  {(lead.atividades || []).map((atividade: Atividade) => (
                    <li key={atividade.id} className="relative">
                      <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-stone-400 bg-white" />
                      <div className="rounded-lg border border-stone-200 bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Badge variant="outline" className="border-stone-200 bg-stone-100 text-[10px] text-stone-600">
                            {ROTULOS_ATIVIDADE[atividade.tipo] || atividade.tipo}
                          </Badge>
                          <span className="text-[11px] text-stone-400">
                            {formatarData(atividade.data)}
                            {atividade.autor_nome ? ` · ${atividade.autor_nome}` : ""}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-stone-700">{atividade.descricao}</p>
                      </div>
                    </li>
                  ))}
                  {(lead.atividades || []).length === 0 ? (
                    <p className="text-sm text-stone-500">Nenhuma atividade registrada ainda.</p>
                  ) : null}
                </ol>
              </TabsContent>

              <TabsContent value="ia" className="mt-4">
                <div className="rounded-lg border border-stone-200 bg-white p-6" data-testid="painel-insights-ia">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-stone-400" />
                      <p className="font-heading text-lg font-semibold text-stone-900">Insights de IA</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={gerarInsightsIa}
                      disabled={gerandoIa}
                      className="border-stone-300"
                      data-testid="botao-gerar-insights-lead"
                    >
                      {gerandoIa ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analisando...
                        </>
                      ) : insightsIa ? (
                        "Gerar novamente"
                      ) : (
                        "Gerar análise"
                      )}
                    </Button>
                  </div>
                  {!insightsIa && !gerandoIa ? (
                    <p className="mt-3 text-sm leading-relaxed text-stone-600">
                      A inteligência artificial lê a mensagem do cliente e todo o histórico de atividades para
                      resumir o momento do lead, indicar o sentimento da conversa e sugerir os próximos passos.
                      Clique em "Gerar análise" para começar.
                    </p>
                  ) : null}
                  {insightsIa ? (
                    <div className="mt-4 space-y-4" data-testid="insights-lead-resultado">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Sentimento do cliente</span>
                        <Badge
                          variant="outline"
                          className={ESTILO_SENTIMENTO[insightsIa.sentimento] || ESTILO_SENTIMENTO.indefinido}
                          data-testid="insights-lead-sentimento"
                        >
                          {ROTULO_SENTIMENTO[insightsIa.sentimento] || "Ainda indefinido"}
                        </Badge>
                      </div>
                      <p className="text-sm leading-relaxed text-stone-700" data-testid="insights-lead-resumo">
                        {insightsIa.resumo}
                      </p>
                      {insightsIa.proximos_passos.length > 0 ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Próximos passos sugeridos</p>
                          <ul className="mt-2 space-y-2" data-testid="insights-lead-passos">
                            {insightsIa.proximos_passos.map((passo, indice) => (
                              <li key={indice} className="flex items-start gap-2 text-sm text-stone-700">
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-900" />
                                {passo}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      <p className="text-[11px] text-stone-400">
                        Análise gerada por IA em {formatarData(insightsIa.gerado_em)} — confira as informações antes de agir.
                      </p>
                    </div>
                  ) : null}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
