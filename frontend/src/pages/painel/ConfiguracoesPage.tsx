import { useEffect, useState, type FormEvent } from "react";
import { Cloud, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, erroApi } from "@/lib/api";
import type { Usuario } from "@/contexts/AuthContext";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from "@/components/ui-kit";

interface ConfigCompleta {
  nome: string;
  logomarca?: string | null;
  telefone?: string | null;
  email_contato?: string | null;
  endereco?: string | null;
  redes_sociais: Record<string, string>;
  round_robin_ativo: boolean;
  corretor_padrao_id?: string | null;
  footer_texto: string;
  footer_endereco: string;
  politica_privacidade: string;
  depoimentos: string;
}

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState<ConfigCompleta | null>(null);
  const [corretores, setCorretores] = useState<Usuario[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    api.get("/site/config/completa").then((r) => setConfig(r.data)).catch((e) => toast.error(erroApi(e)));
    api.get("/usuarios", { params: { papel: "corretor", ativo: true } }).then((r) => setCorretores(r.data)).catch(() => {});
  }, []);

  function set(campo: keyof ConfigCompleta, valor: unknown) {
    setConfig((c) => (c ? { ...c, [campo]: valor } : c));
  }

  function setRede(rede: string, valor: string) {
    setConfig((c) => (c ? { ...c, redes_sociais: { ...c.redes_sociais, [rede]: valor } } : c));
  }

  async function aoSalvar(evento: FormEvent) {
    evento.preventDefault();
    if (!config) return;
    setErro("");
    setSalvando(true);
    try {
      await api.put("/site/config", {
        ...config,
        logomarca: config.logomarca || null,
        corretor_padrao_id: config.corretor_padrao_id || null,
      });
      toast.success("Configurações salvas. O site já reflete as mudanças.");
    } catch (e) {
      setErro(erroApi(e));
    } finally {
      setSalvando(false);
    }
  }

  if (!config) {
    return (
      <div className="flex min-h-[300px] items-center justify-center" data-testid="config-carregando">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <form onSubmit={aoSalvar} className="space-y-8" data-testid="pagina-configuracoes">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">Configurações</h1>
          <p className="mt-1 text-stone-600">Identidade da imobiliária, textos do site e distribuição de leads.</p>
        </div>
        <Button type="submit" disabled={salvando} className="h-11 bg-stone-900 text-white transition-colors duration-200 hover:bg-stone-800" data-testid="botao-salvar-config">
          {salvando ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>) : "Salvar tudo"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-stone-200">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Identidade da imobiliária</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cfg-nome">Nome da imobiliária</Label>
              <Input id="cfg-nome" value={config.nome} onChange={(e) => set("nome", e.target.value)} className="border-stone-300" data-testid="cfg-nome" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cfg-logomarca">URL da logomarca</Label>
              <Input id="cfg-logomarca" type="url" placeholder="https://... (imagem PNG/SVG)" value={config.logomarca || ""} onChange={(e) => set("logomarca", e.target.value)} className="border-stone-300" data-testid="cfg-logomarca" />
              <p className="text-xs text-stone-500">A logomarca aparece em destaque no topo do site, do painel e das landing pages.</p>
              {config.logomarca ? (
                <div className="rounded-md border border-stone-200 bg-white p-4">
                  <img src={config.logomarca} alt="Pré-visualização da logomarca" className="h-14 w-auto object-contain" data-testid="cfg-logomarca-preview" />
                </div>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cfg-telefone">Telefone / WhatsApp</Label>
                <Input id="cfg-telefone" placeholder="(11) 99999-9999" value={config.telefone || ""} onChange={(e) => set("telefone", e.target.value)} className="border-stone-300" data-testid="cfg-telefone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cfg-email">E-mail de contato</Label>
                <Input id="cfg-email" type="email" placeholder="contato@imobiliaria.com.br" value={config.email_contato || ""} onChange={(e) => set("email_contato", e.target.value)} className="border-stone-300" data-testid="cfg-email" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cfg-endereco">Endereço da loja</Label>
              <Input id="cfg-endereco" value={config.endereco || ""} onChange={(e) => set("endereco", e.target.value)} className="border-stone-300" data-testid="cfg-endereco" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Redes sociais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { rede: "instagram", rotulo: "Instagram (link do perfil)" },
              { rede: "facebook", rotulo: "Facebook (link da página)" },
              { rede: "youtube", rotulo: "YouTube (link do canal)" },
              { rede: "whatsapp", rotulo: "WhatsApp (somente números, com DDD)" },
            ].map((item) => (
              <div key={item.rede} className="space-y-2">
                <Label htmlFor={`cfg-${item.rede}`}>{item.rotulo}</Label>
                <Input
                  id={`cfg-${item.rede}`}
                  value={config.redes_sociais[item.rede] || ""}
                  onChange={(e) => setRede(item.rede, e.target.value)}
                  className="border-stone-300"
                  data-testid={`cfg-${item.rede}`}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Textos do site (CMS)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cfg-footer-texto">Texto institucional do rodapé</Label>
              <Textarea id="cfg-footer-texto" rows={3} value={config.footer_texto} onChange={(e) => set("footer_texto", e.target.value)} className="border-stone-300" data-testid="cfg-footer-texto" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cfg-footer-endereco">Endereço exibido no rodapé</Label>
              <Input id="cfg-footer-endereco" value={config.footer_endereco} onChange={(e) => set("footer_endereco", e.target.value)} className="border-stone-300" data-testid="cfg-footer-endereco" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cfg-depoimentos">Depoimentos da página inicial</Label>
              <Textarea id="cfg-depoimentos" rows={4} value={config.depoimentos} onChange={(e) => set("depoimentos", e.target.value)} className="border-stone-300" data-testid="cfg-depoimentos" />
              <p className="text-xs text-stone-500">Um depoimento por linha, no formato: Nome do cliente :: Texto do depoimento</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cfg-politica">Política de Privacidade (LGPD)</Label>
              <Textarea id="cfg-politica" rows={8} value={config.politica_privacidade} onChange={(e) => set("politica_privacidade", e.target.value)} className="border-stone-300" data-testid="cfg-politica" />
              <p className="text-xs text-stone-500">Exibida em /politica-de-privacidade e vinculada ao consentimento dos formulários.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Distribuição de leads entre corretores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-md border border-stone-200 bg-stone-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-stone-900">Rodízio automático (round-robin)</p>
                <p className="text-xs text-stone-500">
                  Ligado: cada novo lead vai para o próximo corretor ativo da fila. Desligado: todos vão para o usuário padrão.
                </p>
              </div>
              <Switch checked={config.round_robin_ativo} onCheckedChange={(v: boolean) => set("round_robin_ativo", v)} data-testid="cfg-round-robin" />
            </div>
            <div className="space-y-2">
              <Label>Usuário padrão (quando o rodízio estiver desligado)</Label>
              <Select value={config.corretor_padrao_id || ""} onValueChange={(v: string) => set("corretor_padrao_id", v === "nenhum" ? null : v)}>
                <SelectTrigger className="border-stone-300" data-testid="cfg-corretor-padrao">
                  <SelectValue placeholder="Selecione um corretor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Primeiro corretor ativo disponível</SelectItem>
                  {corretores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-stone-200" data-testid="card-dominio-lp">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-lg">
            <Cloud className="h-5 w-5 text-stone-500" /> Domínio próprio para landing pages
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-stone-700">
          <p>
            Suas landing pages já funcionam no endereço deste site (ex.: <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">/lp/nome-da-oferta</code>).
            Se quiser usar um domínio próprio como <strong>ofertas.suaimobiliaria.com.br</strong>, siga este passo a passo:
          </p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>Crie uma conta gratuita na <strong>Cloudflare</strong> (cloudflare.com) e adicione o seu domínio, seguindo as instruções para trocar os "nameservers" no registrador (Registro.br, GoDaddy etc.).</li>
            <li>Na Cloudflare, vá em <strong>DNS → Registros → Adicionar registro</strong> e preencha: <em>Tipo</em>: <strong>CNAME</strong>; <em>Nome</em>: <strong>ofertas</strong> (ou o subdomínio desejado); <em>Destino</em>: o endereço de deploy deste site na Emergent; <em>Proxy</em>: ativado (nuvem laranja).</li>
            <li>Salve e aguarde a propagação — geralmente alguns minutos, podendo levar até 24 horas.</li>
            <li>Volte aqui e preencha o campo "Domínio próprio" em cada landing page (menu Landing Pages → Editar).</li>
          </ol>
          <p className="rounded-md border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-600">
            Importante: o certificado de segurança (HTTPS) e a liberação do domínio são provisionados nas configurações de
            deploy da própria plataforma Emergent — não é necessário (nem possível) fazer isso pelo código do site.
          </p>
        </CardContent>
      </Card>

      {erro ? (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" data-testid="config-erro">{erro}</div>
      ) : null}
    </form>
  );
}
