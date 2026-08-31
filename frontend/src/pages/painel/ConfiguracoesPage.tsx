import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Cloud, Loader2, Users } from "lucide-react";
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
  round_robin_ativo: boolean;
  corretor_padrao_id?: string | null;
  emails_notificacao: string[];
}

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState<ConfigCompleta | null>(null);
  const [emailsTexto, setEmailsTexto] = useState("");
  const [corretores, setCorretores] = useState<Usuario[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    api.get("/site/config/completa").then((r) => {
      setConfig(r.data);
      setEmailsTexto((r.data.emails_notificacao || []).join("\n"));
    }).catch((e) => toast.error(erroApi(e)));
    api.get("/usuarios", { params: { papel: "corretor", ativo: true } }).then((r) => setCorretores(r.data)).catch(() => {});
  }, []);

  function set(campo: keyof ConfigCompleta, valor: unknown) {
    setConfig((c) => (c ? { ...c, [campo]: valor } : c));
  }

  async function aoSalvar(evento: FormEvent) {
    evento.preventDefault();
    if (!config) return;
    setErro("");
    setSalvando(true);
    try {
      await api.put("/site/config", {
        nome: config.nome,
        logomarca: config.logomarca || null,
        telefone: config.telefone || null,
        email_contato: config.email_contato || null,
        endereco: config.endereco || null,
        round_robin_ativo: config.round_robin_ativo,
        corretor_padrao_id: config.corretor_padrao_id || null,
        emails_notificacao: emailsTexto.split("\n").map((e) => e.trim()).filter(Boolean),
      });
      toast.success("Configurações salvas com sucesso.");
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
          <p className="mt-1 max-w-2xl text-stone-600">
            Dados da imobiliária, distribuição de leads e domínio das landing pages.
            Para textos do site (banner, menu, rodapé, redes sociais e Política de Privacidade), use o menu{" "}
            <Link to="/painel/conteudo" className="font-medium text-stone-900 underline underline-offset-2" data-testid="link-conteudo-site">
              Conteúdo do Site
            </Link>
            . Para a equipe, use{" "}
            <Link to="/painel/usuarios" className="font-medium text-stone-900 underline underline-offset-2" data-testid="link-gestao-usuarios">
              Usuários
            </Link>
            .
          </p>
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
              <p className="text-xs text-stone-500">Aparece no cabeçalho, no rodapé e na aba do navegador.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cfg-logomarca">URL da logomarca</Label>
              <Input id="cfg-logomarca" type="url" placeholder="https://... (imagem PNG ou SVG)" value={config.logomarca || ""} onChange={(e) => set("logomarca", e.target.value)} className="border-stone-300" data-testid="cfg-logomarca" />
              <p className="text-xs text-stone-500">
                Cole o link de uma imagem já hospedada, ou envie a imagem pelo cadastro de um imóvel e reutilize o link gerado.
                A logomarca aparece em destaque no site, no painel e nas landing pages.
              </p>
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
            <div className="space-y-2">
              <Label htmlFor="cfg-emails-notificacao">E-mails que recebem aviso de novo lead</Label>
              <Textarea id="cfg-emails-notificacao" rows={3} placeholder={"um@email.com\noutro@email.com"} value={emailsTexto} onChange={(e) => setEmailsTexto(e.target.value)} className="border-stone-300" data-testid="cfg-emails-notificacao" />
              <p className="text-xs text-stone-500">
                Um e-mail por linha. Sempre que um visitante preencher um formulário do site, estas pessoas serão avisadas
                (o envio de e-mails será ativado na fase de integrações).
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-stone-200">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Distribuição de leads entre corretores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-md border border-stone-200 bg-stone-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-stone-900">Rodízio automático (round-robin)</p>
                  <p className="text-xs text-stone-500">
                    Ligado: cada novo lead vai para o próximo corretor ativo da fila, em ordem. Desligado: todos os leads
                    vão para o usuário padrão escolhido abaixo.
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

          <Card className="border-stone-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-lg">
                <Users className="h-5 w-5 text-stone-500" /> Equipe (corretores e gestores)
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-stone-700">
              <p>
                O cadastro, a edição e a desativação de corretores e gestores são feitos na tela{" "}
                <strong>Usuários</strong>. Lá você define o papel de cada pessoa: Administrador (acesso total),
                Gestor (quase tudo, sem configurações críticas) ou Corretor (apenas os próprios imóveis e leads).
              </p>
              <Link to="/painel/usuarios" data-testid="atalho-usuarios-config">
                <Button type="button" variant="outline" className="mt-4 border-stone-300">
                  Abrir gestão de usuários
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
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
