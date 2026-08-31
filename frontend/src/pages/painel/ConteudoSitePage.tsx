import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, erroApi } from "@/lib/api";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
} from "@/components/ui-kit";

interface ConfigCompleta {
  footer_texto: string;
  footer_endereco: string;
  politica_privacidade: string;
  depoimentos: string;
  banner_home_titulo: string;
  banner_home_subtitulo: string;
  banner_home_imagem: string;
  menu_inicio: string;
  menu_imoveis: string;
  menu_blog: string;
  menu_contato: string;
  redes_sociais: Record<string, string>;
}

export default function ConteudoSitePage() {
  const [config, setConfig] = useState<ConfigCompleta | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    api.get("/site/config/completa").then((r) => setConfig(r.data)).catch((e) => toast.error(erroApi(e)));
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
      await api.put("/site/config", config);
      toast.success("Conteúdo salvo. O site já está atualizado — abra uma página para conferir.");
    } catch (e) {
      setErro(erroApi(e));
    } finally {
      setSalvando(false);
    }
  }

  if (!config) {
    return (
      <div className="flex min-h-[300px] items-center justify-center" data-testid="conteudo-carregando">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <form onSubmit={aoSalvar} className="space-y-8" data-testid="pagina-conteudo-site">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">Conteúdo do Site</h1>
          <p className="mt-1 max-w-2xl text-stone-600">
            Aqui você altera os textos e imagens do site sem mexer em código: é só digitar e salvar.
            Os posts do blog têm uma tela própria (menu <strong>Blog</strong>).
          </p>
        </div>
        <Button type="submit" disabled={salvando} className="h-11 bg-stone-900 text-white transition-colors duration-200 hover:bg-stone-800" data-testid="botao-salvar-conteudo">
          {salvando ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>) : "Salvar tudo"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-stone-200">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Banner da página inicial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-stone-500">
              É a primeira coisa que o visitante vê ao abrir o site: a frase grande, a frase menor e a foto de fundo.
            </p>
            <div className="space-y-2">
              <Label htmlFor="cms-banner-titulo">Frase principal (título grande)</Label>
              <Input id="cms-banner-titulo" placeholder="Ex.: O imóvel certo para o seu próximo capítulo" value={config.banner_home_titulo} onChange={(e) => set("banner_home_titulo", e.target.value)} className="border-stone-300" data-testid="cms-banner-titulo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cms-banner-subtitulo">Frase de apoio (texto menor)</Label>
              <Textarea id="cms-banner-subtitulo" rows={2} value={config.banner_home_subtitulo} onChange={(e) => set("banner_home_subtitulo", e.target.value)} className="border-stone-300" data-testid="cms-banner-subtitulo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cms-banner-imagem">URL da imagem de fundo</Label>
              <Input id="cms-banner-imagem" type="url" placeholder="https://... (deixe vazio para usar a imagem padrão)" value={config.banner_home_imagem} onChange={(e) => set("banner_home_imagem", e.target.value)} className="border-stone-300" data-testid="cms-banner-imagem" />
              {config.banner_home_imagem ? (
                <img src={config.banner_home_imagem} alt="Pré-visualização do banner da página inicial" className="h-28 w-full rounded-md border border-stone-200 object-cover" data-testid="cms-banner-preview" />
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Itens do menu do site</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-stone-500">
              Os nomes que aparecem no menu do topo. Se deixar vazio, o site usa o nome padrão.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { campo: "menu_inicio" as const, padrao: "Início" },
                { campo: "menu_imoveis" as const, padrao: "Imóveis" },
                { campo: "menu_blog" as const, padrao: "Blog" },
                { campo: "menu_contato" as const, padrao: "Contato" },
              ].map((item) => (
                <div key={item.campo} className="space-y-2">
                  <Label htmlFor={`cms-${item.campo}`}>Item "{item.padrao}"</Label>
                  <Input id={`cms-${item.campo}`} placeholder={item.padrao} value={config[item.campo]} onChange={(e) => set(item.campo, e.target.value)} className="border-stone-300" data-testid={`cms-${item.campo}`} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Rodapé e redes sociais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cms-footer-texto">Texto institucional do rodapé</Label>
              <Textarea id="cms-footer-texto" rows={3} value={config.footer_texto} onChange={(e) => set("footer_texto", e.target.value)} className="border-stone-300" data-testid="cms-footer-texto" />
              <p className="text-xs text-stone-500">Um resumo sobre a imobiliária, exibido na parte de baixo de todas as páginas.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cms-footer-endereco">Endereço exibido no rodapé</Label>
              <Input id="cms-footer-endereco" value={config.footer_endereco} onChange={(e) => set("footer_endereco", e.target.value)} className="border-stone-300" data-testid="cms-footer-endereco" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { rede: "instagram", rotulo: "Instagram (link)" },
                { rede: "facebook", rotulo: "Facebook (link)" },
                { rede: "youtube", rotulo: "YouTube (link)" },
                { rede: "whatsapp", rotulo: "WhatsApp (só números, com DDD)" },
              ].map((item) => (
                <div key={item.rede} className="space-y-2">
                  <Label htmlFor={`cms-${item.rede}`}>{item.rotulo}</Label>
                  <Input id={`cms-${item.rede}`} value={config.redes_sociais[item.rede] || ""} onChange={(e) => setRede(item.rede, e.target.value)} className="border-stone-300" data-testid={`cms-${item.rede}`} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Depoimentos e Política de Privacidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cms-depoimentos">Depoimentos da página inicial</Label>
              <Textarea id="cms-depoimentos" rows={4} value={config.depoimentos} onChange={(e) => set("depoimentos", e.target.value)} className="border-stone-300" data-testid="cms-depoimentos" />
              <p className="text-xs text-stone-500">
                Um depoimento por linha, neste formato: Nome do cliente :: Texto do depoimento
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cms-politica">Política de Privacidade (obrigatória pela LGPD)</Label>
              <Textarea id="cms-politica" rows={8} value={config.politica_privacidade} onChange={(e) => set("politica_privacidade", e.target.value)} className="border-stone-300" data-testid="cms-politica" />
              <p className="text-xs text-stone-500">
                Publicada na página /politica-de-privacidade e vinculada ao consentimento de todos os formulários do site.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {erro ? (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" data-testid="conteudo-erro">{erro}</div>
      ) : null}
    </form>
  );
}
