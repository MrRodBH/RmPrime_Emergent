import { useEffect, useState } from "react";
import { Pencil, Plus, Search, Star } from "lucide-react";
import { toast } from "sonner";
import { api, erroApi } from "@/lib/api";
import { formatarMoeda } from "@/lib/format";
import { Badge, Button, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui-kit";
import { ImovelDialog } from "@/components/ImovelDialog";
import type { Imovel } from "@/types";

const CORES_STATUS: Record<string, string> = {
  ativo: "border-emerald-200 bg-emerald-100 text-emerald-800",
  inativo: "border-stone-200 bg-stone-100 text-stone-600",
  vendido: "border-blue-200 bg-blue-100 text-blue-800",
};

const ROTULOS_STATUS: Record<string, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  vendido: "Vendido",
};

export default function ImoveisPainelPage() {
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<Imovel | null>(null);

  async function carregar() {
    setCarregando(true);
    try {
      const { data } = await api.get("/imoveis");
      setImoveis(data);
    } catch (e) {
      toast.error(erroApi(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const filtrados = busca.trim()
    ? imoveis.filter((i) => i.titulo.toLowerCase().includes(busca.trim().toLowerCase()))
    : imoveis;

  return (
    <div className="space-y-8" data-testid="pagina-imoveis-painel">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">Imóveis</h1>
          <p className="mt-1 text-stone-600">Cadastre e gerencie os imóveis exibidos no site.</p>
        </div>
        <Button
          onClick={() => {
            setEditando(null);
            setDialogAberto(true);
          }}
          className="h-11 bg-stone-900 text-white transition-colors duration-200 hover:bg-stone-800"
          data-testid="botao-novo-imovel"
        >
          <Plus className="mr-2 h-4 w-4" /> Novo imóvel
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <Input
          placeholder="Buscar por título..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="h-11 border-stone-300 bg-white pl-10 focus-visible:ring-2 focus-visible:ring-stone-900"
          data-testid="busca-imoveis-painel"
        />
      </div>

      <div className="border-y border-stone-200 bg-white" data-testid="tabela-imoveis">
        <Table>
          <TableHeader>
            <TableRow className="border-stone-200">
              <TableHead className="pl-6">Imóvel</TableHead>
              <TableHead>Finalidade</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-6 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carregando ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-stone-500">Carregando imóveis...</TableCell>
              </TableRow>
            ) : filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-stone-500" data-testid="tabela-imoveis-vazia">
                  Nenhum imóvel cadastrado. Clique em "Novo imóvel" para começar.
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map((imovel) => (
                <TableRow key={imovel.id} className="border-stone-200" data-testid={`linha-imovel-${imovel.id}`}>
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      {imovel.fotos?.[0] ? (
                        <img src={imovel.fotos[0]} alt="" className="h-12 w-16 rounded-md object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-12 w-16 items-center justify-center rounded-md bg-stone-100 text-[10px] text-stone-400">Sem foto</div>
                      )}
                      <div>
                        <p className="flex items-center gap-1.5 font-medium text-stone-900">
                          {imovel.titulo}
                          {imovel.destaque ? <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> : null}
                        </p>
                        <p className="text-xs text-stone-500">
                          {imovel.tipo}
                          {imovel.endereco?.bairro ? ` · ${imovel.endereco.bairro}` : ""}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-stone-600">{imovel.finalidade === "aluguel" ? "Aluguel" : "Venda"}</TableCell>
                  <TableCell className="font-medium text-stone-900">{formatarMoeda(imovel.preco)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={CORES_STATUS[imovel.status]} data-testid={`status-imovel-${imovel.id}`}>
                      {ROTULOS_STATUS[imovel.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditando(imovel);
                        setDialogAberto(true);
                      }}
                      data-testid={`acao-editar-imovel-${imovel.id}`}
                    >
                      <Pencil className="mr-2 h-4 w-4" /> Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ImovelDialog aberto={dialogAberto} aoFechar={() => setDialogAberto(false)} imovel={editando} aoSalvar={carregar} />
    </div>
  );
}
