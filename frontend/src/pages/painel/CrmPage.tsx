import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { api, erroApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { LeadDetalheSheet } from "@/components/LeadDetalheSheet";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui-kit";
import type { Lead } from "@/types";

export const ETAPAS = ["Novo", "Conversando", "Visita", "Proposta", "Negócio Fechado", "Perdido", "Descartado"];

export const ROTULOS_ORIGEM: Record<string, string> = {
  site: "Site",
  landing_page: "Landing Page",
  agendamento: "Agendamento",
};

const CORES_TOPO: Record<string, string> = {
  Novo: "border-t-blue-500",
  Conversando: "border-t-amber-500",
  Visita: "border-t-violet-500",
  Proposta: "border-t-cyan-600",
  "Negócio Fechado": "border-t-emerald-600",
  Perdido: "border-t-red-500",
  Descartado: "border-t-stone-400",
};

export function tempoRelativo(data?: string): string {
  if (!data) return "";
  const agora = Date.now();
  const instante = new Date(data).getTime();
  const minutos = Math.floor((agora - instante) / 60000);
  if (minutos < 1) return "agora mesmo";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return "há 1 dia";
  if (dias < 30) return `há ${dias} dias`;
  return new Intl.DateTimeFormat("pt-BR").format(new Date(data));
}

export function slugEtapa(etapa: string): string {
  return etapa
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

export default function CrmPage() {
  const { usuario } = useAuth();
  const [parametros, setParametros] = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [motivos, setMotivos] = useState<string[]>([]);
  const [arrastandoId, setArrastandoId] = useState<string | null>(null);
  const [colunaAlvo, setColunaAlvo] = useState<string | null>(null);
  const [descartePendente, setDescartePendente] = useState<string | null>(null);
  const [motivoSelecionado, setMotivoSelecionado] = useState("");
  const [leadAberto, setLeadAberto] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const { data } = await api.get("/crm/leads", { params: { busca: busca.trim() || undefined } });
      setLeads(data);
    } catch (e) {
      toast.error(erroApi(e));
    } finally {
      setCarregando(false);
    }
  }, [busca]);

  useEffect(() => {
    const atraso = setTimeout(carregar, 300);
    return () => clearTimeout(atraso);
  }, [carregar]);

  useEffect(() => {
    api.get("/crm/motivos-descarte").then((r) => setMotivos(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const id = parametros.get("lead");
    if (id) setLeadAberto(id);
  }, [parametros]);

  async function mover(leadId: string, etapa: string, motivo?: string): Promise<boolean> {
    const anteriores = leads;
    setLeads((atuais) =>
      atuais.map((l) => (l.id === leadId ? { ...l, etapa_crm: etapa, motivo_descarte: motivo || null } : l))
    );
    try {
      await api.patch(`/crm/leads/${leadId}/etapa`, { etapa, motivo_descarte: motivo || null });
      toast.success(`Lead movido para "${etapa}".`);
      return true;
    } catch (e) {
      toast.error(erroApi(e));
      setLeads(anteriores);
      return false;
    }
  }

  function aoSoltar(etapa: string) {
    setColunaAlvo(null);
    if (!arrastandoId) return;
    const lead = leads.find((l) => l.id === arrastandoId);
    setArrastandoId(null);
    if (!lead || lead.etapa_crm === etapa) return;
    if (etapa === "Descartado") {
      api.get("/crm/motivos-descarte").then((r) => setMotivos(r.data)).catch(() => {});
      setMotivoSelecionado("");
      setDescartePendente(arrastandoId);
    } else {
      mover(arrastandoId, etapa);
    }
  }

  async function confirmarDescarte() {
    if (!descartePendente || !motivoSelecionado) return;
    const ok = await mover(descartePendente, "Descartado", motivoSelecionado);
    if (ok) setDescartePendente(null);
  }

  const adminOuGestor = !!usuario && (usuario.papel === "admin" || usuario.papel === "gestor");

  return (
    <div className="space-y-6" data-testid="pagina-crm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">CRM / Leads</h1>
          <p className="mt-1 text-stone-600">
            {adminOuGestor
              ? "Arraste os cartões entre as etapas do funil. Todo lead novo entra automaticamente em \"Novo\"."
              : "Aqui estão os leads atribuídos a você. Arraste os cartões para mudar de etapa."}
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input
            placeholder="Buscar por nome, telefone ou e-mail..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-11 border-stone-300 bg-white pl-10 focus-visible:ring-2 focus-visible:ring-stone-900"
            data-testid="busca-leads"
          />
        </div>
      </div>

      {carregando ? (
        <div className="flex min-h-[300px] items-center justify-center" data-testid="crm-carregando">
          <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
        </div>
      ) : (
        <div
          className="grid gap-4 overflow-x-auto pb-4"
          style={{ gridTemplateColumns: "repeat(7, minmax(220px, 1fr))" }}
          data-testid="quadro-kanban"
        >
          {ETAPAS.map((etapa) => {
            const daEtapa = leads.filter((l) => l.etapa_crm === etapa);
            return (
              <section
                key={etapa}
                aria-label={`Coluna ${etapa}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setColunaAlvo(etapa);
                }}
                onDragLeave={() => setColunaAlvo((c) => (c === etapa ? null : c))}
                onDrop={() => aoSoltar(etapa)}
                className={`flex min-h-[300px] flex-col rounded-lg border border-stone-200 border-t-4 ${CORES_TOPO[etapa]} bg-stone-100/70 p-3 transition-colors duration-200 ${
                  colunaAlvo === etapa ? "ring-2 ring-stone-900" : ""
                }`}
                data-testid={`coluna-${slugEtapa(etapa)}`}
              >
                <header className="mb-3 flex items-center justify-between px-1">
                  <h2 className="text-sm font-semibold text-stone-800">{etapa}</h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-stone-600" data-testid={`contador-${slugEtapa(etapa)}`}>
                    {daEtapa.length}
                  </span>
                </header>
                <div className="flex flex-1 flex-col gap-2">
                  {daEtapa.map((lead) => (
                    <article
                      key={lead.id}
                      draggable
                      onDragStart={() => setArrastandoId(lead.id)}
                      onDragEnd={() => {
                        setArrastandoId(null);
                        setColunaAlvo(null);
                      }}
                      onClick={() => setLeadAberto(lead.id)}
                      onKeyDown={(e) => e.key === "Enter" && setLeadAberto(lead.id)}
                      tabIndex={0}
                      aria-label={`Lead ${lead.nome}, etapa ${lead.etapa_crm}. Pressione Enter para abrir.`}
                      data-testid={`card-lead-${lead.id}`}
                      className={`cursor-grab rounded-md border border-stone-200 bg-white p-3 shadow-sm transition-all duration-200 hover:border-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 ${
                        arrastandoId === lead.id ? "opacity-40" : ""
                      }`}
                    >
                      <p className="font-medium leading-snug text-stone-900">{lead.nome}</p>
                      <p className="mt-0.5 text-xs text-stone-500">{lead.telefone}</p>
                      {lead.imovel_titulo ? (
                        <p className="mt-1.5 truncate text-xs text-stone-600" title={lead.imovel_titulo}>
                          {lead.imovel_titulo}
                        </p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="border-stone-200 bg-stone-50 text-[10px] text-stone-600">
                          {ROTULOS_ORIGEM[lead.origem] || lead.origem}
                        </Badge>
                        {lead.motivo_descarte ? (
                          <Badge variant="outline" className="border-red-200 bg-red-50 text-[10px] text-red-700">
                            {lead.motivo_descarte}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-stone-400">
                        <span>{tempoRelativo(lead.criado_em)}</span>
                        {adminOuGestor && lead.corretor_nome ? <span>{lead.corretor_nome}</span> : null}
                      </div>
                    </article>
                  ))}
                  {daEtapa.length === 0 ? (
                    <p className="rounded-md border border-dashed border-stone-300 px-3 py-6 text-center text-xs text-stone-400">
                      Nenhum lead nesta etapa
                    </p>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <Dialog open={!!descartePendente} onOpenChange={(v: boolean) => !v && setDescartePendente(null)}>
        <DialogContent className="max-w-md" data-testid="dialog-descarte">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight">Motivo do descarte</DialogTitle>
            <DialogDescription>
              Para manter o funil organizado, informe por que este lead está sendo descartado.
              Esta lista é configurada em Configurações.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Select value={motivoSelecionado} onValueChange={setMotivoSelecionado}>
              <SelectTrigger className="border-stone-300" data-testid="select-motivo-descarte">
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {motivos.map((motivo) => (
                  <SelectItem key={motivo} value={motivo} data-testid={`motivo-${slugEtapa(motivo)}`}>
                    {motivo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {motivos.length === 0 ? (
              <p className="text-xs text-amber-700">
                Nenhum motivo cadastrado. Peça a um Administrador ou Gestor para configurar a lista em
                Configurações → Motivos de descarte.
              </p>
            ) : null}
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setDescartePendente(null)} className="border-stone-300" data-testid="botao-cancelar-descarte">
              Voltar
            </Button>
            <Button
              onClick={confirmarDescarte}
              disabled={!motivoSelecionado}
              className="bg-stone-900 text-white hover:bg-stone-800"
              data-testid="botao-confirmar-descarte"
            >
              Confirmar descarte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LeadDetalheSheet
        leadId={leadAberto}
        aoFechar={() => {
          setLeadAberto(null);
          if (parametros.get("lead")) setParametros(new URLSearchParams());
        }}
        aoAtualizar={carregar}
        adminOuGestor={adminOuGestor}
      />
    </div>
  );
}
