import { useEffect, useState, type FormEvent } from "react";
import { ExternalLink, Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { api, erroApi } from "@/lib/api";
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
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "@/components/ui-kit";
import type { Imovel, LandingPage } from "@/types";

const FORM_VAZIO = {
  imovel_id: "",
  slug: "",
  titulo: "",
  subtitulo: "",
  texto: "",
  cor_destaque: "#b45309",
  publicada: false,
  dominio_customizado: "",
};

export default function LandingPagesPainelPage() {
  const [paginas, setPaginas] = useState<LandingPage[]>([]);
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<LandingPage | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      const { data } = await api.get("/landing-pages");
      setPaginas(data);
    } catch (e) {
      toast.error(erroApi(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    api.get("/imoveis").then((r) => setImoveis(r.data)).catch(() => {});
  }, []);

  function abrirDialog(lp: LandingPage | null) {
    setEditando(lp);
    setForm(
      lp
        ? {
            imovel_id: lp.imovel_id,
            slug: lp.slug,
            titulo: lp.conteudo.titulo || "",
            subtitulo: lp.conteudo.subtitulo || "",
            texto: lp.conteudo.texto || "",
            cor_destaque: lp.conteudo.cor_destaque || "#b45309",
            publicada: lp.publicada,
            dominio_customizado: lp.dominio_customizado || "",
          }
        : FORM_VAZIO
    );
    setErro("");
    setDialogAberto(true);
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro("");
    if (!form.imovel_id) {
      setErro("Selecione o imóvel que será divulgado nesta página.");
      return;
    }
    setSalvando(true);
    try {
      const conteudo = {
        titulo: form.titulo.trim() || null,
        subtitulo: form.subtitulo.trim() || null,
        texto: form.texto.trim() || null,
        cor_destaque: form.cor_destaque,
      };
      if (editando) {
        await api.patch(`/landing-pages/${editando.id}`, {
          imovel_id: form.imovel_id,
          slug: form.slug,
          dominio_customizado: form.dominio_customizado.trim() || null,
          conteudo,
          publicada: form.publicada,
        });
        toast.success("Landing page atualizada.");
      } else {
        await api.post("/landing-pages", {
          imovel_id: form.imovel_id,
          slug: form.slug,
          dominio_customizado: form.dominio_customizado.trim() || null,
          conteudo,
          publicada: form.publicada,
        });
        toast.success("Landing page criada.");
      }
      setDialogAberto(false);
      await carregar();
    } catch (e) {
      setErro(erroApi(e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-8" data-testid="pagina-landing-pages">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">Landing Pages</h1>
          <p className="mt-1 text-stone-600">
            Páginas de divulgação de um único imóvel, ideais para anúncios pagos. Cada página tem um endereço próprio.
          </p>
        </div>
        <Button onClick={() => abrirDialog(null)} className="h-11 bg-stone-900 text-white transition-colors duration-200 hover:bg-stone-800" data-testid="botao-nova-lp">
          <Plus className="mr-2 h-4 w-4" /> Nova landing page
        </Button>
      </div>

      <div className="border-y border-stone-200 bg-white" data-testid="tabela-lps">
        <Table>
          <TableHeader>
            <TableRow className="border-stone-200">
              <TableHead className="pl-6">Endereço</TableHead>
              <TableHead>Imóvel divulgado</TableHead>
              <TableHead>Domínio próprio</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-6 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carregando ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-stone-500">Carregando landing pages...</TableCell>
              </TableRow>
            ) : paginas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-stone-500" data-testid="tabela-lps-vazia">
                  Nenhuma landing page criada. Clique em "Nova landing page" para começar.
                </TableCell>
              </TableRow>
            ) : (
              paginas.map((lp) => (
                <TableRow key={lp.id} className="border-stone-200" data-testid={`linha-lp-${lp.id}`}>
                  <TableCell className="pl-6 font-medium text-stone-900">/lp/{lp.slug}</TableCell>
                  <TableCell className="text-stone-600">{lp.imovel_titulo}</TableCell>
                  <TableCell className="text-stone-600">{lp.dominio_customizado || "—"}</TableCell>
                  <TableCell>
                    {lp.publicada ? (
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-100 text-emerald-800">Publicada</Badge>
                    ) : (
                      <Badge variant="outline" className="border-stone-200 bg-stone-100 text-stone-600">Rascunho</Badge>
                    )}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <div className="flex justify-end gap-1">
                      {lp.publicada ? (
                        <a href={`/lp/${lp.slug}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" data-testid={`acao-ver-lp-${lp.id}`}>
                            <ExternalLink className="mr-2 h-4 w-4" /> Ver
                          </Button>
                        </a>
                      ) : null}
                      <Button variant="ghost" size="sm" onClick={() => abrirDialog(lp)} data-testid={`acao-editar-lp-${lp.id}`}>
                        <Pencil className="mr-2 h-4 w-4" /> Editar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogAberto} onOpenChange={(v: boolean) => !v && setDialogAberto(false)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-8" data-testid="dialog-lp">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl tracking-tight">
              {editando ? "Editar landing page" : "Nova landing page"}
            </DialogTitle>
            <DialogDescription>
              A página usa automaticamente as fotos e informações do imóvel escolhido.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={aoEnviar} className="mt-2 space-y-5" data-testid="formulario-lp">
            <div className="space-y-2">
              <Label>Imóvel divulgado</Label>
              <Select value={form.imovel_id} onValueChange={(v: string) => setForm({ ...form, imovel_id: v })}>
                <SelectTrigger className="border-stone-300" data-testid="lp-imovel">
                  <SelectValue placeholder="Selecione o imóvel" />
                </SelectTrigger>
                <SelectContent>
                  {imoveis.map((imovel) => (
                    <SelectItem key={imovel.id} value={imovel.id}>{imovel.titulo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lp-slug">Endereço da página (slug)</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-stone-500">/lp/</span>
                <Input
                  id="lp-slug"
                  required
                  placeholder="cobertura-itaim-oferta"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="border-stone-300"
                  data-testid="lp-slug"
                />
              </div>
              <p className="text-xs text-stone-500">Use letras minúsculas, números e hífens. Sem espaços.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lp-titulo">Título da oferta</Label>
              <Input id="lp-titulo" placeholder="Ex.: Últimas unidades com condições especiais" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="border-stone-300" data-testid="lp-titulo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lp-subtitulo">Subtítulo</Label>
              <Input id="lp-subtitulo" placeholder="Uma frase de apoio" value={form.subtitulo} onChange={(e) => setForm({ ...form, subtitulo: e.target.value })} className="border-stone-300" data-testid="lp-subtitulo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lp-texto">Texto principal (opcional — se vazio, usa a descrição do imóvel)</Label>
              <Textarea id="lp-texto" rows={4} value={form.texto} onChange={(e) => setForm({ ...form, texto: e.target.value })} className="border-stone-300" data-testid="lp-texto" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lp-cor">Cor de destaque (botões)</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="lp-cor"
                    type="color"
                    value={form.cor_destaque}
                    onChange={(e) => setForm({ ...form, cor_destaque: e.target.value })}
                    className="h-11 w-16 cursor-pointer rounded-md border border-stone-300"
                    data-testid="lp-cor"
                  />
                  <span className="text-sm text-stone-600">{form.cor_destaque}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lp-dominio">Domínio próprio (opcional)</Label>
                <Input id="lp-dominio" placeholder="oferta.seudominio.com.br" value={form.dominio_customizado} onChange={(e) => setForm({ ...form, dominio_customizado: e.target.value })} className="border-stone-300" data-testid="lp-dominio" />
                <p className="text-xs text-stone-500">
                  Veja o passo a passo em <strong>Configurações → Domínio das landing pages</strong>.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border border-stone-200 bg-stone-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-stone-900">Publicada</p>
                <p className="text-xs text-stone-500">Rascunhos não ficam visíveis ao público.</p>
              </div>
              <Switch checked={form.publicada} onCheckedChange={(v: boolean) => setForm({ ...form, publicada: v })} data-testid="lp-publicada" />
            </div>
            {erro ? (
              <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" data-testid="formulario-lp-erro">{erro}</div>
            ) : null}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogAberto(false)} className="border-stone-300" data-testid="botao-cancelar-lp">
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando} className="bg-stone-900 text-white hover:bg-stone-800" data-testid="botao-salvar-lp">
                {salvando ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>) : "Salvar landing page"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
