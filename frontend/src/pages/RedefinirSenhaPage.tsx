import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Landmark, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Label } from "@/components/ui-kit";
import { api, erroApi } from "@/lib/api";

export default function RedefinirSenhaPage() {
  const [parametros] = useSearchParams();
  const navigate = useNavigate();
  const token = parametros.get("token") || "";
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro("");
    if (senha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmacao) {
      setErro("As senhas não coincidem. Digite novamente.");
      return;
    }
    setCarregando(true);
    try {
      await api.post("/auth/reset-password", { token, senha });
      toast.success("Senha redefinida com sucesso. Faça login com a nova senha.");
      navigate("/entrar");
    } catch (e) {
      setErro(erroApi(e));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 p-8">
      <div className="w-full max-w-md">
        <div className="mb-10 flex items-center justify-center">
          <div className="flex h-24 w-full max-w-[260px] items-center justify-center gap-2 rounded-md border border-dashed border-stone-400 bg-stone-100">
            <Landmark className="h-8 w-8 text-stone-500" />
            <span className="text-base font-bold tracking-wide text-stone-600">SUA LOGOMARCA</span>
          </div>
        </div>

        <h1 className="font-heading text-3xl font-bold tracking-tight text-stone-950">
          Criar nova senha
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Escolha uma nova senha para acessar o painel.
        </p>

        {!token ? (
          <div
            role="alert"
            data-testid="redefinir-senha-sem-token"
            className="mt-8 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            Link inválido. Solicite uma nova redefinição de senha.
          </div>
        ) : (
          <form onSubmit={aoEnviar} className="mt-8 space-y-5" data-testid="formulario-redefinir-senha">
            <div className="space-y-2">
              <Label htmlFor="nova-senha">Nova senha</Label>
              <Input
                id="nova-senha"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Mínimo de 6 caracteres"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="h-12 border-stone-300 bg-white focus-visible:ring-2 focus-visible:ring-stone-900"
                data-testid="redefinir-senha-nova-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmar-senha">Confirmar nova senha</Label>
              <Input
                id="confirmar-senha"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Repita a nova senha"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                className="h-12 border-stone-300 bg-white focus-visible:ring-2 focus-visible:ring-stone-900"
                data-testid="redefinir-senha-confirmacao-input"
              />
            </div>
            {erro ? (
              <div
                role="alert"
                data-testid="redefinir-senha-erro"
                className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {erro}
              </div>
            ) : null}
            <Button
              type="submit"
              disabled={carregando}
              className="h-12 w-full bg-stone-900 text-base text-white transition-colors duration-200 hover:bg-stone-800"
              data-testid="redefinir-senha-submit-button"
            >
              {carregando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar nova senha"
              )}
            </Button>
          </form>
        )}

        <Link
          to="/entrar"
          className="mt-8 flex items-center justify-center gap-2 text-sm font-medium text-stone-600 transition-colors duration-200 hover:text-stone-900"
          data-testid="link-voltar-login"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}
