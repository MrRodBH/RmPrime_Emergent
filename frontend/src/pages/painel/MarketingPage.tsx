import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, erroApi } from "@/lib/api";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea } from "@/components/ui-kit";

interface MarketingConfig {
  meta_pixel_id: string;
  meta_capi_token: string;
  google_ads_id: string;
  script_cabecalho: string;
  script_rodape: string;
}

const VAZIO: MarketingConfig = {
  meta_pixel_id: "",
  meta_capi_token: "",
  google_ads_id: "",
  script_cabecalho: "",
  script_rodape: "",
};

function StatusBadge({ preenchido }: { preenchido: boolean }) {
  return preenchido ? (
    <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
      Configurado
    </span>
  ) : (
    <span className="rounded-full border border-stone-200 bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold text-stone-500">
      Não configurado
    </span>
  );
}

export default function MarketingPage() {
  const [config, setConfig] = useState<MarketingConfig>(VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    api
      .get("/marketing/config")
      .then((r) => setConfig(r.data))
      .catch((e) => toast.error(erroApi(e)))
      .finally(() => setCarregando(false));
  }, []);

  function set(campo: keyof MarketingConfig, valor: string) {
    setConfig((c) => ({ ...c, [campo]: valor }));
  }

  async function aoSalvar(evento: FormEvent) {
    evento.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      await api.put("/marketing/config", config);
      toast.success("Configurações salvas. O rastreamento já está ativo no site.");
    } catch (e) {
      setErro(erroApi(e));
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <div className="flex min-h-[300px] items-center justify-center" data-testid="marketing-carregando">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <form onSubmit={aoSalvar} className="space-y-8" data-testid="pagina-marketing">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">Marketing e Rastreamento</h1>
          <p className="mt-1 max-w-2xl text-stone-600">
            Conecte as ferramentas de anúncio da imobiliária. Cada campo tem instruções passo a passo —
            não é preciso conhecimento técnico. Depois de salvar, o rastreamento passa a valer no site e nas landing pages.
          </p>
        </div>
        <Button type="submit" disabled={salvando} className="h-11 bg-stone-900 text-white transition-colors duration-200 hover:bg-stone-800" data-testid="botao-salvar-marketing">
          {salvando ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>) : "Salvar tudo"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-stone-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between font-heading text-lg">
              Meta Pixel (Facebook e Instagram)
              <StatusBadge preenchido={!!config.meta_pixel_id} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs leading-relaxed text-stone-500">
              É o que permite medir quantas pessoas que viram seus anúncios chegaram ao site.
              <strong> Onde encontrar:</strong> abra o Gerenciador de Eventos da Meta (business.facebook.com/events_manager),
              clique na sua fonte de dados (Pixel) e copie o número do <strong>ID do Pixel</strong> (só números).
            </p>
            <div className="space-y-2">
              <Label htmlFor="mk-meta-pixel">ID do Pixel</Label>
              <Input id="mk-meta-pixel" placeholder="Ex.: 1234567890123456" value={config.meta_pixel_id} onChange={(e) => set("meta_pixel_id", e.target.value)} className="border-stone-300" data-testid="mk-meta-pixel" />
            </div>
            <p className="text-xs text-stone-500">Com o ID preenchido, o site registra automaticamente as páginas visitadas e os cliques em WhatsApp, telefone e e-mail.</p>
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between font-heading text-lg">
              Meta — API de Conversões (CAPI)
              <StatusBadge preenchido={!!config.meta_capi_token} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs leading-relaxed text-stone-500">
              Envia o evento "Lead" direto do nosso servidor para a Meta sempre que um formulário é enviado —
              mesmo se o visitante usar bloqueador de anúncios.
              <strong> Onde gerar o token:</strong> no Gerenciador de Eventos, clique no seu Pixel → aba
              <strong> Configurações</strong> → seção <strong>API de Conversões</strong> → <strong>Gerar token de acesso</strong>.
              Cole aqui o código longo gerado.
            </p>
            <div className="space-y-2">
              <Label htmlFor="mk-meta-capi">Token de acesso da API de Conversões</Label>
              <Input id="mk-meta-capi" type="password" placeholder="Cole o token gerado na Meta" value={config.meta_capi_token} onChange={(e) => set("meta_capi_token", e.target.value)} className="border-stone-300" data-testid="mk-meta-capi" />
            </div>
            <p className="text-xs text-stone-500">Usamos o mesmo identificador de evento no Pixel e no CAPI, então a Meta deduplica e não conta o lead duas vezes.</p>
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between font-heading text-lg">
              Google Tag (Google Ads)
              <StatusBadge preenchido={!!config.google_ads_id} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs leading-relaxed text-stone-500">
              Mede as conversões dos anúncios do Google.
              <strong> Onde encontrar:</strong> no Google Ads, vá em <strong>Ferramentas → Conversões</strong> ou em
              <strong> Ferramentas → Gerenciamento de tags</strong> e copie o <strong>ID da tag do Google</strong>
              (começa com AW- ou G-).
            </p>
            <div className="space-y-2">
              <Label htmlFor="mk-google-tag">ID de acompanhamento</Label>
              <Input id="mk-google-tag" placeholder="Ex.: AW-123456789 ou G-XXXXXXX" value={config.google_ads_id} onChange={(e) => set("google_ads_id", e.target.value)} className="border-stone-300" data-testid="mk-google-tag" />
            </div>
            <p className="text-xs text-stone-500">Quando um formulário de contato ou agendamento é concluído, o evento de conversão ("generate_lead") é disparado automaticamente.</p>
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Scripts personalizados (avançado)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs leading-relaxed text-stone-500">
              Para outras ferramentas (chat online, prova social, mapa de calor etc.), cole aqui o código completo
              fornecido por elas, incluindo as tags <code className="rounded bg-stone-100 px-1">&lt;script&gt;</code>.
            </p>
            <div className="space-y-2">
              <Label htmlFor="mk-script-cabecalho">Scripts do cabeçalho (carregam em todas as páginas, no topo)</Label>
              <Textarea id="mk-script-cabecalho" rows={4} placeholder="<script>...</script>" value={config.script_cabecalho} onChange={(e) => set("script_cabecalho", e.target.value)} className="border-stone-300 font-mono text-xs" data-testid="mk-script-cabecalho" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mk-script-rodape">Scripts do rodapé (carregam no fim da página)</Label>
              <Textarea id="mk-script-rodape" rows={4} placeholder="<script>...</script>" value={config.script_rodape} onChange={(e) => set("script_rodape", e.target.value)} className="border-stone-300 font-mono text-xs" data-testid="mk-script-rodape" />
            </div>
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Atenção: cole apenas códigos de ferramentas em que você confia. Scripts de terceiros rodam dentro do seu site.
            </p>
          </CardContent>
        </Card>
      </div>

      {erro ? (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" data-testid="marketing-erro">{erro}</div>
      ) : null}
    </form>
  );
}
