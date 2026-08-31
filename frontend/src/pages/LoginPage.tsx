import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Landmark, Loader2 } from "lucide-react";
import { Button, Input, Label } from "@/components/ui-kit";
import { useAuth } from "@/contexts/AuthContext";
import { erroApi } from "@/lib/api";

const IMAGEM_FUNDO =
  "https://images.pexels.com/photos/15422346/pexels-photo-15422346.jpeg";

export default function LoginPage() {
  const { entrar } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      await entrar(email, senha);
      navigate("/painel");
    } catch (e) {
      setErro(erroApi(e));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-stone-50 lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <img
          src={IMAGEM_FUNDO}
          alt="Fachada de imóvel de alto padrão"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-stone-950/60" />
        <div className="relative z-10 flex h-full flex-col justify-end p-12">
          <p className="max-w-md font-heading text-3xl font-bold tracking-tight text-white">
            Gestão completa da sua imobiliária em um só lugar.
          </p>
          <p className="mt-3 max-w-md text-stone-300">
            Site, CMS, CRM e inteligência artificial para a sua equipe de corretores.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center justify-center" data-testid="area-logomarca-login">
            <div className="flex h-24 w-full max-w-[260px] items-center justify-center gap-2 rounded-md border border-dashed border-stone-400 bg-stone-100">
              <Landmark className="h-8 w-8 text-stone-500" />
              <span className="text-base font-bold tracking-wide text-stone-600">
                SUA LOGOMARCA
              </span>
            </div>
          </div>

          <h1 className="font-heading text-3xl font-bold tracking-tight text-stone-950">
            Acesse o painel
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            Entre com seu e-mail e senha para gerenciar imóveis, leads e usuários.
          </p>

          <form onSubmit={aoEnviar} className="mt-8 space-y-5" data-testid="formulario-login">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="seuemail@imobiliaria.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 border-stone-300 bg-white focus-visible:ring-2 focus-visible:ring-stone-900"
                data-testid="login-email-input"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="senha">Senha</Label>
                <Link
                  to="/esqueci-senha"
                  className="text-xs font-medium text-stone-600 underline-offset-4 transition-colors duration-200 hover:text-stone-900 hover:underline"
                  data-testid="link-esqueci-senha"
                >
                  Esqueci minha senha
                </Link>
              </div>
              <Input
                id="senha"
                type="password"
                autoComplete="current-password"
                required
                placeholder="Digite sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="h-12 border-stone-300 bg-white focus-visible:ring-2 focus-visible:ring-stone-900"
                data-testid="login-senha-input"
              />
            </div>

            {erro ? (
              <div
                role="alert"
                data-testid="login-erro-mensagem"
                className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {erro}
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={carregando}
              className="h-12 w-full bg-stone-900 text-base text-white transition-colors duration-200 hover:bg-stone-800"
              data-testid="login-submit-button"
            >
              {carregando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
