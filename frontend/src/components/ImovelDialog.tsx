import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api, erroApi } from "@/lib/api";
import { useAuth, type Usuario } from "@/contexts/AuthContext";
import { FotosUploader } from "@/components/FotosUploader";
import { MapaImovel } from "@/components/site/MapaImovel";
import {
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
  Textarea,
} from "@/components/ui-kit";
import type { Imovel } from "@/types";

interface Props {
  aberto: boolean;
  aoFechar: () => void;
  imovel: Imovel | null;
  aoSalvar: () => Promise<void>;
}

const FORM_VAZIO = {
  titulo: "",
  descricao: "",
  tipo: "Apartamento",
  finalidade: "venda",
  preco: "",
  condominio: "",
  iptu: "",
  status: "ativo",
  destaque: false,
  exibir_endereco_exato: false,
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  cep: "",
  lat: "",
  lng: "",
  quartos: "",
  banheiros: "",
  vagas: "",
  area_m2: "",
  lazerTexto: "",
  videosTexto: "",
  corretorId: "",
};

function numeroOuNulo(valor: string): number | null {
  const n = parseFloat(valor.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function ImovelDialog({ aberto, aoFechar, imovel, aoSalvar }: Props) {
  const { usuario: logado } = useAuth();
  const editando = !!imovel;
  const [form, setForm] = useState(FORM_VAZIO);
  const [fotos, setFotos] = useState<string[]>([]);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [melhorando, setMelhorando] = useState(false);
  const [corretores, setCorretores] = useState<Usuario[]>([]);

  const podeAtribuir = !!logado && (logado.papel === "admin" || logado.papel === "gestor");

  useEffect(() => {
    if (!aberto) return;
    if (imovel) {
      const e = imovel.endereco || {};
      const c = imovel.caracteristicas || {};
      setForm({
        titulo: imovel.titulo,
        descricao: imovel.descricao || "",
        tipo: imovel.tipo,
        finalidade: imovel.finalidade,
        preco: String(imovel.preco),
        condominio: imovel.condominio ? String(imovel.condominio) : "",
        iptu: imovel.iptu ? String(imovel.iptu) : "",
        status: imovel.status,
        destaque: imovel.destaque,
        exibir_endereco_exato: imovel.exibir_endereco_exato,
        logradouro: e.logradouro || "",
        numero: e.numero || "",
        complemento: e.complemento || "",
        bairro: e.bairro || "",
        cidade: e.cidade || "",
        estado: e.estado || "",
        cep: e.cep || "",
        lat: e.lat ? String(e.lat) : "",
        lng: e.lng ? String(e.lng) : "",
        quartos: c.quartos ? String(c.quartos) : "",
        banheiros: c.banheiros ? String(c.banheiros) : "",
        vagas: c.vagas ? String(c.vagas) : "",
        area_m2: c.area_m2 ? String(c.area_m2) : "",
        lazerTexto: (imovel.lazer || []).join(", "),
        videosTexto: (imovel.videos || []).join("\n"),
        corretorId: imovel.corretor_responsavel_id || "",
      });
      setFotos(imovel.fotos || []);
    } else {
      setForm(FORM_VAZIO);
      setFotos([]);
    }
    setErro("");
  }, [aberto, imovel]);

  useEffect(() => {
    if (aberto && podeAtribuir) {
      api.get("/usuarios", { params: { papel: "corretor", ativo: true } })
        .then((r) => setCorretores(r.data))
        .catch(() => {});
    }
  }, [aberto, podeAtribuir]);

  function set(campo: keyof typeof FORM_VAZIO, valor: string | boolean) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function melhorarComIA() {
    if (!form.descricao.trim()) return;
    setMelhorando(true);
    try {
      const { data } = await api.post("/ia/melhorar-descricao", { texto: form.descricao });
      set("descricao", data.texto_melhorado);
      toast.success("Descrição aprimorada! (Demonstração — a IA real será conectada na Fase 6.)");
    } catch (e) {
      toast.error(erroApi(e));
    } finally {
      setMelhorando(false);
    }
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro("");
    const preco = numeroOuNulo(form.preco);
    if (!preco || preco <= 0) {
      setErro("Informe um preço válido maior que zero.");
      return;
    }
    const corpo: Record<string, unknown> = {
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      tipo: form.tipo.trim(),
      finalidade: form.finalidade,
      preco,
      condominio: numeroOuNulo(form.condominio),
      iptu: numeroOuNulo(form.iptu),
      status: form.status,
      destaque: form.destaque,
      exibir_endereco_exato: form.exibir_endereco_exato,
      endereco: {
        logradouro: form.logradouro.trim() || null,
        numero: form.numero.trim() || null,
        complemento: form.complemento.trim() || null,
        bairro: form.bairro.trim() || null,
        cidade: form.cidade.trim() || null,
        estado: form.estado.trim() || null,
        cep: form.cep.trim() || null,
        lat: numeroOuNulo(form.lat),
        lng: numeroOuNulo(form.lng),
      },
      caracteristicas: {
        quartos: numeroOuNulo(form.quartos),
        banheiros: numeroOuNulo(form.banheiros),
        vagas: numeroOuNulo(form.vagas),
        area_m2: numeroOuNulo(form.area_m2),
      },
      lazer: form.lazerTexto.split(",").map((s) => s.trim()).filter(Boolean),
      fotos,
      videos: form.videosTexto.split("\n").map((s) => s.trim()).filter(Boolean),
    };
    if (podeAtribuir && form.corretorId) corpo.corretor_responsavel_id = form.corretorId;

    setSalvando(true);
    try {
      if (editando && imovel) {
        await api.patch(`/imoveis/${imovel.id}`, corpo);
        toast.success("Imóvel atualizado com sucesso.");
      } else {
        await api.post("/imoveis", corpo);
        toast.success("Imóvel cadastrado com sucesso.");
      }
      aoFechar();
      await aoSalvar();
    } catch (e) {
      setErro(erroApi(e));
    } finally {
      setSalvando(false);
    }
  }

  const latNum = numeroOuNulo(form.lat);
  const lngNum = numeroOuNulo(form.lng);

  return (
    <Dialog open={aberto} onOpenChange={(v: boolean) => !v && aoFechar()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto p-8" data-testid="dialog-imovel">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl tracking-tight">
            {editando ? "Editar imóvel" : "Novo imóvel"}
          </DialogTitle>
          <DialogDescription>
            Preencha os campos abaixo. Os textos de ajuda explicam cada seção — não é preciso conhecimento técnico.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={aoEnviar} className="mt-2 space-y-8" data-testid="formulario-imovel">
          <section className="space-y-4">
            <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-stone-500">Informações básicas</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="imovel-titulo">Título do anúncio</Label>
                <Input id="imovel-titulo" required placeholder="Ex.: Apartamento de 3 quartos na Moema" value={form.titulo} onChange={(e) => set("titulo", e.target.value)} className="border-stone-300" data-testid="imovel-titulo" />
                <p className="text-xs text-stone-500">É o texto que aparece em destaque no site e no Google.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="imovel-tipo">Tipo</Label>
                <Input id="imovel-tipo" list="tipos-imovel" required placeholder="Apartamento, Casa..." value={form.tipo} onChange={(e) => set("tipo", e.target.value)} className="border-stone-300" data-testid="imovel-tipo" />
                <datalist id="tipos-imovel">
                  {["Apartamento", "Casa", "Cobertura", "Studio", "Terreno", "Comercial"].map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label>Finalidade</Label>
                <Select value={form.finalidade} onValueChange={(v: string) => set("finalidade", v)}>
                  <SelectTrigger className="border-stone-300" data-testid="imovel-finalidade">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="venda">Venda</SelectItem>
                    <SelectItem value="aluguel">Aluguel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="imovel-preco">Preço (R$)</Label>
                <Input id="imovel-preco" type="number" min={0} step="0.01" required value={form.preco} onChange={(e) => set("preco", e.target.value)} className="border-stone-300" data-testid="imovel-preco" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imovel-condominio">Condomínio (R$, opcional)</Label>
                <Input id="imovel-condominio" type="number" min={0} step="0.01" value={form.condominio} onChange={(e) => set("condominio", e.target.value)} className="border-stone-300" data-testid="imovel-condominio" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imovel-iptu">IPTU (R$, opcional)</Label>
                <Input id="imovel-iptu" type="number" min={0} step="0.01" value={form.iptu} onChange={(e) => set("iptu", e.target.value)} className="border-stone-300" data-testid="imovel-iptu" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v: string) => set("status", v)}>
                  <SelectTrigger className="border-stone-300" data-testid="imovel-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo (visível no site)</SelectItem>
                    <SelectItem value="inativo">Inativo (fora do ar)</SelectItem>
                    <SelectItem value="vendido">Vendido/Alugado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-md border border-stone-200 bg-stone-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-stone-900">Imóvel em destaque</p>
                  <p className="text-xs text-stone-500">Aparece na vitrine da página inicial.</p>
                </div>
                <Switch checked={form.destaque} onCheckedChange={(v: boolean) => set("destaque", v)} data-testid="imovel-destaque" />
              </div>
              <div className="flex items-center justify-between rounded-md border border-stone-200 bg-stone-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-stone-900">Exibir endereço exato</p>
                  <p className="text-xs text-stone-500">Desligado: o mapa mostra apenas a região do bairro.</p>
                </div>
                <Switch checked={form.exibir_endereco_exato} onCheckedChange={(v: boolean) => set("exibir_endereco_exato", v)} data-testid="imovel-endereco-exato" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="imovel-descricao">Descrição</Label>
                <button
                  type="button"
                  onClick={melhorarComIA}
                  disabled={!form.descricao.trim() || melhorando}
                  title={form.descricao.trim() ? "Reescrever e aprimorar o texto digitado" : "Digite um texto na descrição para habilitar este botão"}
                  data-testid="botao-melhorar-ia"
                  className="flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition-colors duration-200 hover:border-stone-500 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {melhorando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Melhorar com IA
                </button>
              </div>
              <Textarea id="imovel-descricao" rows={4} placeholder="Descreva os diferenciais do imóvel com suas palavras..." value={form.descricao} onChange={(e) => set("descricao", e.target.value)} className="border-stone-300" data-testid="imovel-descricao" />
              <p className="text-xs text-stone-500">
                Escreva primeiro um rascunho com as suas palavras. Depois, se quiser, use o botão "Melhorar com IA"
                para deixar o texto mais atrativo — ele só funciona quando já existe texto no campo.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-stone-500">Fotos do imóvel</h3>
            <FotosUploader valor={fotos} onChange={setFotos} />
          </section>

          <section className="space-y-4">
            <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-stone-500">Endereço e localização</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="imovel-logradouro">Logradouro</Label>
                <Input id="imovel-logradouro" placeholder="Rua, avenida..." value={form.logradouro} onChange={(e) => set("logradouro", e.target.value)} className="border-stone-300" data-testid="imovel-logradouro" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imovel-numero">Número</Label>
                <Input id="imovel-numero" value={form.numero} onChange={(e) => set("numero", e.target.value)} className="border-stone-300" data-testid="imovel-numero" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imovel-bairro">Bairro</Label>
                <Input id="imovel-bairro" value={form.bairro} onChange={(e) => set("bairro", e.target.value)} className="border-stone-300" data-testid="imovel-bairro" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imovel-cidade">Cidade</Label>
                <Input id="imovel-cidade" value={form.cidade} onChange={(e) => set("cidade", e.target.value)} className="border-stone-300" data-testid="imovel-cidade" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imovel-estado">Estado (UF)</Label>
                <Input id="imovel-estado" maxLength={2} placeholder="SP" value={form.estado} onChange={(e) => set("estado", e.target.value)} className="border-stone-300" data-testid="imovel-estado" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imovel-cep">CEP</Label>
                <Input id="imovel-cep" placeholder="00000-000" value={form.cep} onChange={(e) => set("cep", e.target.value)} className="border-stone-300" data-testid="imovel-cep" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imovel-lat">Latitude</Label>
                <Input id="imovel-lat" placeholder="-23.5505" value={form.lat} onChange={(e) => set("lat", e.target.value)} className="border-stone-300" data-testid="imovel-lat" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imovel-lng">Longitude</Label>
                <Input id="imovel-lng" placeholder="-46.6333" value={form.lng} onChange={(e) => set("lng", e.target.value)} className="border-stone-300" data-testid="imovel-lng" />
              </div>
            </div>
            <p className="text-xs text-stone-500">
              Como descobrir as coordenadas: pesquise o endereço no Google Maps, clique com o botão direito no ponto do
              imóvel e clique nos números que aparecem para copiá-los.
            </p>
            {latNum !== null && lngNum !== null ? (
              <div data-testid="previa-mapa-imovel">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Pré-visualização do mapa (como aparece no site)</p>
                <MapaImovel lat={latNum} lng={lngNum} exato={form.exibir_endereco_exato} titulo={form.titulo || "este imóvel"} />
              </div>
            ) : null}
          </section>

          <section className="space-y-4">
            <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-stone-500">Características</h3>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="imovel-quartos">Quartos</Label>
                <Input id="imovel-quartos" type="number" min={0} value={form.quartos} onChange={(e) => set("quartos", e.target.value)} className="border-stone-300" data-testid="imovel-quartos" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imovel-banheiros">Banheiros</Label>
                <Input id="imovel-banheiros" type="number" min={0} value={form.banheiros} onChange={(e) => set("banheiros", e.target.value)} className="border-stone-300" data-testid="imovel-banheiros" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imovel-vagas">Vagas</Label>
                <Input id="imovel-vagas" type="number" min={0} value={form.vagas} onChange={(e) => set("vagas", e.target.value)} className="border-stone-300" data-testid="imovel-vagas" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imovel-area">Área (m²)</Label>
                <Input id="imovel-area" type="number" min={0} step="0.01" value={form.area_m2} onChange={(e) => set("area_m2", e.target.value)} className="border-stone-300" data-testid="imovel-area" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="imovel-lazer">Itens de lazer (separados por vírgula)</Label>
              <Input id="imovel-lazer" placeholder="Piscina, Academia, Salão de festas" value={form.lazerTexto} onChange={(e) => set("lazerTexto", e.target.value)} className="border-stone-300" data-testid="imovel-lazer" />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-stone-500">Vídeos e responsável</h3>
            <div className="space-y-2">
              <Label htmlFor="imovel-videos">Vídeos (uma URL por linha — link do YouTube ou arquivo de vídeo)</Label>
              <Textarea id="imovel-videos" rows={2} placeholder="https://www.youtube.com/watch?v=..." value={form.videosTexto} onChange={(e) => set("videosTexto", e.target.value)} className="border-stone-300 font-mono text-xs" data-testid="imovel-videos" />
              <p className="text-xs text-stone-500">Cole o link normal do YouTube — o site converte automaticamente para o player.</p>
            </div>
            {podeAtribuir ? (
              <div className="space-y-2">
                <Label>Corretor responsável</Label>
                <Select value={form.corretorId} onValueChange={(v: string) => set("corretorId", v === "nenhum" ? "" : v)}>
                  <SelectTrigger className="border-stone-300" data-testid="imovel-corretor">
                    <SelectValue placeholder="Sem corretor definido" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">Sem corretor definido</SelectItem>
                    {corretores.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-stone-500">É quem aparece como contato do anúncio e recebe os leads deste imóvel no rodízio.</p>
              </div>
            ) : (
              <p className="rounded-md border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-500">
                Este imóvel será atribuído automaticamente a você.
              </p>
            )}
          </section>

          {erro ? (
            <div role="alert" data-testid="formulario-imovel-erro" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {erro}
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={aoFechar} className="border-stone-300" data-testid="botao-cancelar-imovel">
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando} className="bg-stone-900 text-white transition-colors duration-200 hover:bg-stone-800" data-testid="botao-salvar-imovel">
              {salvando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : editando ? (
                "Salvar alterações"
              ) : (
                "Cadastrar imóvel"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
