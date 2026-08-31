import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { api, erroApi } from "@/lib/api";
import { formatarData } from "@/lib/format";
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
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "@/components/ui-kit";
import type { Post } from "@/types";

const FORM_VAZIO = { titulo: "", resumo: "", conteudo: "", capa: "", publicado: true };

export default function BlogPainelPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<Post | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      const { data } = await api.get("/blog/admin");
      setPosts(data);
    } catch (e) {
      toast.error(erroApi(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrirDialog(post: Post | null) {
    setEditando(post);
    setForm(
      post
        ? { titulo: post.titulo, resumo: post.resumo || "", conteudo: post.conteudo, capa: post.capa || "", publicado: post.publicado }
        : FORM_VAZIO
    );
    setErro("");
    setDialogAberto(true);
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      const corpo = {
        titulo: form.titulo.trim(),
        resumo: form.resumo.trim() || null,
        conteudo: form.conteudo,
        capa: form.capa.trim() || null,
        publicado: form.publicado,
      };
      if (editando) {
        await api.patch(`/blog/${editando.id}`, corpo);
        toast.success("Post atualizado com sucesso.");
      } else {
        await api.post("/blog", corpo);
        toast.success("Post publicado com sucesso.");
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
    <div className="space-y-8" data-testid="pagina-blog-painel">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">Blog</h1>
          <p className="mt-1 text-stone-600">Escreva conteúdos que aparecem no site e ajudam no Google (SEO).</p>
        </div>
        <Button onClick={() => abrirDialog(null)} className="h-11 bg-stone-900 text-white transition-colors duration-200 hover:bg-stone-800" data-testid="botao-novo-post">
          <Plus className="mr-2 h-4 w-4" /> Novo post
        </Button>
      </div>

      <div className="border-y border-stone-200 bg-white" data-testid="tabela-posts">
        <Table>
          <TableHeader>
            <TableRow className="border-stone-200">
              <TableHead className="pl-6">Post</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Publicado em</TableHead>
              <TableHead className="pr-6 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carregando ? (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center text-stone-500">Carregando posts...</TableCell>
              </TableRow>
            ) : posts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center text-stone-500" data-testid="tabela-posts-vazia">
                  Nenhum post cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              posts.map((post) => (
                <TableRow key={post.id} className="border-stone-200" data-testid={`linha-post-${post.id}`}>
                  <TableCell className="pl-6">
                    <p className="font-medium text-stone-900">{post.titulo}</p>
                    <p className="text-xs text-stone-500">/blog/{post.slug}</p>
                  </TableCell>
                  <TableCell>
                    {post.publicado ? (
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-100 text-emerald-800">Publicado</Badge>
                    ) : (
                      <Badge variant="outline" className="border-stone-200 bg-stone-100 text-stone-600">Rascunho</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-stone-600">{formatarData(post.criado_em)}</TableCell>
                  <TableCell className="pr-6 text-right">
                    <div className="flex justify-end gap-1">
                      {post.publicado ? (
                        <Link to={`/blog/${post.slug}`} target="_blank">
                          <Button variant="ghost" size="sm" data-testid={`acao-ver-post-${post.id}`}>
                            <ExternalLink className="mr-2 h-4 w-4" /> Ver
                          </Button>
                        </Link>
                      ) : null}
                      <Button variant="ghost" size="sm" onClick={() => abrirDialog(post)} data-testid={`acao-editar-post-${post.id}`}>
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
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-8" data-testid="dialog-post">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl tracking-tight">
              {editando ? "Editar post" : "Novo post"}
            </DialogTitle>
            <DialogDescription>Separe os parágrafos com uma linha em branco no conteúdo.</DialogDescription>
          </DialogHeader>
          <form onSubmit={aoEnviar} className="mt-2 space-y-5" data-testid="formulario-post">
            <div className="space-y-2">
              <Label htmlFor="post-titulo">Título</Label>
              <Input id="post-titulo" required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="border-stone-300" data-testid="post-titulo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-resumo">Resumo (aparece na listagem e no Google)</Label>
              <Textarea id="post-resumo" rows={2} value={form.resumo} onChange={(e) => setForm({ ...form, resumo: e.target.value })} className="border-stone-300" data-testid="post-resumo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-conteudo">Conteúdo</Label>
              <Textarea id="post-conteudo" rows={10} required value={form.conteudo} onChange={(e) => setForm({ ...form, conteudo: e.target.value })} className="border-stone-300" data-testid="post-conteudo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-capa">URL da imagem de capa (opcional)</Label>
              <Input id="post-capa" type="url" placeholder="https://..." value={form.capa} onChange={(e) => setForm({ ...form, capa: e.target.value })} className="border-stone-300" data-testid="post-capa" />
            </div>
            <div className="flex items-center justify-between rounded-md border border-stone-200 bg-stone-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-stone-900">Publicado</p>
                <p className="text-xs text-stone-500">Rascunhos não aparecem no site.</p>
              </div>
              <Switch checked={form.publicado} onCheckedChange={(v: boolean) => setForm({ ...form, publicado: v })} data-testid="post-publicado" />
            </div>
            {erro ? (
              <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" data-testid="formulario-post-erro">{erro}</div>
            ) : null}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogAberto(false)} className="border-stone-300" data-testid="botao-cancelar-post">
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando} className="bg-stone-900 text-white hover:bg-stone-800" data-testid="botao-salvar-post">
                {salvando ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>) : "Salvar post"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
