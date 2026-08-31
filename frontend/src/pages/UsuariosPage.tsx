import { useEffect, useMemo, useState } from "react";
import { MoreHorizontal, Pencil, Plus, Power, PowerOff, Search } from "lucide-react";
import { toast } from "sonner";
import { api, erroApi } from "@/lib/api";
import { useAuth, type Usuario } from "@/contexts/AuthContext";
import { CORES_PAPEL, ROTULOS_PAPEL } from "@/contexts/rotulos";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui-kit";
import { UsuarioDialog } from "@/components/UsuarioDialog";

function iniciaisDe(nome: string): string {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();
}

export default function UsuariosPage() {
  const { usuario: logado } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [alternando, setAlternando] = useState<Usuario | null>(null);
  const [processandoStatus, setProcessandoStatus] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      const { data } = await api.get("/usuarios");
      setUsuarios(data);
    } catch (e) {
      toast.error(erroApi(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return usuarios;
    return usuarios.filter(
      (u) => u.nome.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo)
    );
  }, [usuarios, busca]);

  async function confirmarAlternarStatus() {
    if (!alternando) return;
    setProcessandoStatus(true);
    try {
      await api.patch(`/usuarios/${alternando.id}`, { ativo: !alternando.ativo });
      toast.success(
        alternando.ativo
          ? `${alternando.nome} foi desativado.`
          : `${alternando.nome} foi reativado.`
      );
      setAlternando(null);
      await carregar();
    } catch (e) {
      toast.error(erroApi(e));
    } finally {
      setProcessandoStatus(false);
    }
  }

  const podeEditar = (alvo: Usuario) =>
    !!logado && (logado.papel === "admin" || alvo.papel !== "admin");

  return (
    <div className="space-y-8" data-testid="pagina-usuarios">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">
            Gestão de Usuários
          </h1>
          <p className="mt-1 text-stone-600">
            Cadastre, edite e desative corretores, gestores e administradores.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditando(null);
            setDialogAberto(true);
          }}
          className="h-11 bg-stone-900 text-white transition-colors duration-200 hover:bg-stone-800"
          data-testid="botao-adicionar-usuario"
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar usuário
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="h-11 border-stone-300 bg-white pl-10 focus-visible:ring-2 focus-visible:ring-stone-900"
          data-testid="input-busca-usuarios"
        />
      </div>

      <div className="border-y border-stone-200 bg-white" data-testid="tabela-usuarios">
        <Table>
          <TableHeader>
            <TableRow className="border-stone-200">
              <TableHead className="pl-6">Usuário</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cadastrado em</TableHead>
              <TableHead className="pr-6 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carregando ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-stone-500">
                  Carregando usuários...
                </TableCell>
              </TableRow>
            ) : filtrados.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-12 text-center text-stone-500"
                  data-testid="tabela-usuarios-vazia"
                >
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map((u) => (
                <TableRow
                  key={u.id}
                  className="border-stone-200 transition-colors duration-200"
                  data-testid={`linha-usuario-${u.id}`}
                >
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        {u.foto ? <AvatarImage src={u.foto} alt={u.nome} /> : null}
                        <AvatarFallback className="bg-stone-200 text-xs font-semibold text-stone-700">
                          {iniciaisDe(u.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-stone-900">{u.nome}</p>
                        <p className="text-xs text-stone-500">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-stone-600">{u.telefone || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={CORES_PAPEL[u.papel]}>
                      {ROTULOS_PAPEL[u.papel]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.ativo ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-200 bg-emerald-100 text-emerald-800"
                        data-testid={`status-ativo-${u.id}`}
                      >
                        Ativo
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-stone-200 bg-stone-100 text-stone-600"
                        data-testid={`status-inativo-${u.id}`}
                      >
                        Inativo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-stone-600">
                    {u.criado_em
                      ? new Intl.DateTimeFormat("pt-BR").format(new Date(u.criado_em))
                      : "—"}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    {podeEditar(u) ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`botao-acoes-${u.id}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="cursor-pointer"
                            data-testid={`acao-editar-${u.id}`}
                            onClick={() => {
                              setEditando(u);
                              setDialogAberto(true);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          {logado && logado.id !== u.id ? (
                            <DropdownMenuItem
                              className={`cursor-pointer ${u.ativo ? "text-red-600 focus:text-red-600" : ""}`}
                              data-testid={`acao-alternar-status-${u.id}`}
                              onClick={() => setAlternando(u)}
                            >
                              {u.ativo ? (
                                <>
                                  <PowerOff className="mr-2 h-4 w-4" />
                                  Desativar
                                </>
                              ) : (
                                <>
                                  <Power className="mr-2 h-4 w-4" />
                                  Reativar
                                </>
                              )}
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span className="text-xs text-stone-400">Sem permissão</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <UsuarioDialog
        aberto={dialogAberto}
        aoFechar={() => setDialogAberto(false)}
        usuario={editando}
        aoSalvar={carregar}
      />

      <AlertDialog open={!!alternando} onOpenChange={(aberto: boolean) => !aberto && setAlternando(null)}>
        <AlertDialogContent data-testid="alerta-confirmar-status">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {alternando?.ativo ? "Desativar usuário" : "Reativar usuário"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {alternando?.ativo
                ? `${alternando?.nome} perderá o acesso ao painel imediatamente. Você poderá reativá-lo a qualquer momento.`
                : `${alternando?.nome} voltará a ter acesso ao painel.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="botao-cancelar-status">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarAlternarStatus}
              disabled={processandoStatus}
              className={
                alternando?.ativo
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-stone-900 text-white hover:bg-stone-800"
              }
              data-testid="botao-confirmar-status"
            >
              {processandoStatus
                ? "Aguarde..."
                : alternando?.ativo
                  ? "Sim, desativar"
                  : "Sim, reativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
