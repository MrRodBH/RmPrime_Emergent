import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Landmark, Loader2, MailCheck } from "lucide-react";
import { Button, Input, Label } from "@/components/ui-kit";
import { api, erroApi } from "@/lib/api";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setEnviado(true);
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

        {enviado ? (
          <div className="text-center" data-testid="esqueci-senha-confirmacao">
            <MailCheck className="mx-auto h-12 w-12 text-stone-900" />
            <h1 className="mt-4 font-heading text-2xl font-bold tracking-tight text-stone-950">
              Verifique seu e-mail
            </h1>
            <p className="mt-2 text-sm text-stone-600">
              Se este e-mail estiver cadastrado, você receberá um link para redefinir a
              senha. O link expira em 1 hora.
            </p>
          </div>
        ) : (
          <>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-stone-950">
              Esqueci minha senha
            </h1>
            <p className="mt-2 text-sm text-stone-600">
              Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha.
            </p>
            <form onSubmit={aoEnviar} className="mt-8 space-y-5" data-testid="formulario-esqueci-senha">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="seuemail@imobiliaria.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 border-stone-300 bg-white focus-visible:ring-2 focus-visible:ring-stone-900"
                  data-testid="esqueci-senha-email-input"
                />
              </div>
              {erro ? (
                <div
                  role="alert"
                  data-testid="esqueci-senha-erro"
                  className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {erro}
                </div>
              ) : null}
              <Button
                type="submit"
                disabled={carregando}
                className="h-12 w-full bg-stone-900 text-base text-white transition-colors duration-200 hover:bg-stone-800"
                data-testid="esqueci-senha-submit-button"
              >
                {carregando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar link de redefinição"
                )}
              </Button>
            </form>
          </>
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
