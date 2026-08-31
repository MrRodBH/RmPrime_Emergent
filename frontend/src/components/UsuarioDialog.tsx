import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, erroApi } from "@/lib/api";
import { useAuth, type Papel, type Usuario } from "@/contexts/AuthContext";
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
} from "@/components/ui-kit";

interface Props {
  aberto: boolean;
  aoFechar: () => void;
  usuario: Usuario | null;
  aoSalvar: () => Promise<void>;
}

export function UsuarioDialog({ aberto, aoFechar, usuario, aoSalvar }: Props) {
  const { usuario: logado } = useAuth();
  const editando = !!usuario;

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [foto, setFoto] = useState("");
  const [papel, setPapel] = useState<Papel>("corretor");
  const [senha, setSenha] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setNome(usuario?.nome ?? "");
      setEmail(usuario?.email ?? "");
      setTelefone(usuario?.telefone ?? "");
      setFoto(usuario?.foto ?? "");
      setPapel(usuario?.papel ?? "corretor");
      setSenha("");
      setAtivo(usuario?.ativo ?? true);
      setErro("");
    }
  }, [aberto, usuario]);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro("");
    if (!editando && senha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (editando && senha && senha.length < 6) {
      setErro("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setSalvando(true);
    try {
      if (editando && usuario) {
        const corpo: Record<string, unknown> = { nome, email, telefone: telefone || null, foto: foto || null, papel, ativo };
        if (senha) corpo.senha = senha;
        await api.patch(`/usuarios/${usuario.id}`, corpo);
        toast.success("Usuário atualizado com sucesso.");
      } else {
        await api.post("/usuarios", {
          nome,
          email,
          senha,
          papel,
          telefone: telefone || null,
          foto: foto || null,
          ativo,
        });
        toast.success("Usuário criado com sucesso.");
      }
      aoFechar();
      await aoSalvar();
    } catch (e) {
      setErro(erroApi(e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v: boolean) => !v && aoFechar()}>
      <DialogContent className="max-w-2xl p-8" data-testid="dialog-usuario">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl tracking-tight">
            {editando ? "Editar usuário" : "Adicionar usuário"}
          </DialogTitle>
          <DialogDescription>
            {editando
              ? "Atualize os dados do usuário. Deixe a senha em branco para mantê-la."
              : "Preencha os dados para criar o acesso de um novo membro da equipe."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={aoEnviar} className="mt-2 space-y-5" data-testid="formulario-usuario">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="campo-nome">Nome completo</Label>
              <Input
                id="campo-nome"
                required
                placeholder="Ex.: Maria Silva"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="border-stone-300 focus-visible:ring-2 focus-visible:ring-stone-900"
                data-testid="campo-nome"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campo-email">E-mail</Label>
              <Input
                id="campo-email"
                type="email"
                required
                placeholder="maria@imobiliaria.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-stone-300 focus-visible:ring-2 focus-visible:ring-stone-900"
                data-testid="campo-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campo-telefone">Telefone (opcional)</Label>
              <Input
                id="campo-telefone"
                placeholder="(11) 99999-9999"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="border-stone-300 focus-visible:ring-2 focus-visible:ring-stone-900"
                data-testid="campo-telefone"
              />
            </div>
            <div className="space-y-2">
              <Label>Papel de acesso</Label>
              <Select value={papel} onValueChange={(v: string) => setPapel(v as Papel)}>
                <SelectTrigger
                  className="border-stone-300 focus:ring-2 focus:ring-stone-900"
                  data-testid="campo-papel"
                >
                  <SelectValue placeholder="Selecione o papel" />
                </SelectTrigger>
                <SelectContent>
                  {logado && logado.papel === "admin" ? (
                    <SelectItem value="admin" data-testid="opcao-papel-admin">
                      Administrador — acesso total
                    </SelectItem>
                  ) : null}
                  <SelectItem value="gestor" data-testid="opcao-papel-gestor">
                    Gestor — tudo, exceto configurações críticas
                  </SelectItem>
                  <SelectItem value="corretor" data-testid="opcao-papel-corretor">
                    Corretor — próprios imóveis e leads
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="campo-senha">
                {editando ? "Nova senha (opcional)" : "Senha de acesso"}
              </Label>
              <Input
                id="campo-senha"
                type="password"
                autoComplete="new-password"
                required={!editando}
                placeholder={editando ? "Deixe em branco para manter" : "Mínimo de 6 caracteres"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="border-stone-300 focus-visible:ring-2 focus-visible:ring-stone-900"
                data-testid="campo-senha"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campo-foto">URL da foto (opcional)</Label>
              <Input
                id="campo-foto"
                type="url"
                placeholder="https://..."
                value={foto}
                onChange={(e) => setFoto(e.target.value)}
                className="border-stone-300 focus-visible:ring-2 focus-visible:ring-stone-900"
                data-testid="campo-foto"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-stone-200 bg-stone-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-stone-900">Usuário ativo</p>
              <p className="text-xs text-stone-500">
                Usuários inativos não conseguem acessar o painel.
              </p>
            </div>
            <Switch
              checked={ativo}
              onCheckedChange={setAtivo}
              data-testid="switch-ativo"
            />
          </div>

          {erro ? (
            <div
              role="alert"
              data-testid="formulario-usuario-erro"
              className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {erro}
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={aoFechar}
              className="border-stone-300"
              data-testid="botao-cancelar-usuario"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={salvando}
              className="bg-stone-900 text-white transition-colors duration-200 hover:bg-stone-800"
              data-testid="botao-salvar-usuario"
            >
              {salvando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : editando ? (
                "Salvar alterações"
              ) : (
                "Criar usuário"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
