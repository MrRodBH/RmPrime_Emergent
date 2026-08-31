import { Link } from "react-router-dom";
import { ArrowRight, Building2, KanbanSquare, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ROTULOS_PAPEL } from "@/contexts/rotulos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui-kit";

const CARTOES_FASES = [
  {
    titulo: "Imóveis",
    descricao: "Cadastro completo de imóveis com fotos, vídeos, características e endereço.",
    icone: Building2,
    testid: "cartao-imoveis",
  },
  {
    titulo: "CRM / Leads",
    descricao: "Funil de vendas com etapas, histórico de atividades e distribuição round-robin.",
    icone: KanbanSquare,
    testid: "cartao-crm",
  },
];

export default function InicioPage() {
  const { usuario } = useAuth();
  if (!usuario) return null;

  const dataFormatada = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const podeGerenciarUsuarios = usuario.papel === "admin" || usuario.papel === "gestor";

  return (
    <div className="space-y-8" data-testid="pagina-inicio">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">
          Olá, {usuario.nome.split(" ")[0]}!
        </h1>
        <p className="mt-1 capitalize text-stone-600">{dataFormatada}</p>
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-6 md:p-8">
        <p className="text-sm font-medium uppercase tracking-wide text-stone-500">
          Sua conta
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-stone-700">
          <span>
            <span className="font-semibold text-stone-900">E-mail:</span> {usuario.email}
          </span>
          <span>
            <span className="font-semibold text-stone-900">Papel:</span>{" "}
            {ROTULOS_PAPEL[usuario.papel]}
          </span>
        </div>
      </div>

      {podeGerenciarUsuarios ? (
        <Link
          to="/painel/usuarios"
          data-testid="atalho-gestao-usuarios"
          className="group flex items-center justify-between rounded-lg border border-stone-200 bg-white p-6 transition-colors duration-200 hover:border-stone-400"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-stone-900 text-white">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="font-heading text-lg font-semibold text-stone-900">
                Gestão de usuários
              </p>
              <p className="text-sm text-stone-600">
                Cadastre e gerencie os corretores e gestores da imobiliária.
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-stone-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-stone-900" />
        </Link>
      ) : null}

      <div>
        <h2 className="font-heading text-xl font-semibold tracking-tight text-stone-900">
          Próximas fases
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {CARTOES_FASES.map((cartao) => {
            const Icone = cartao.icone;
            return (
              <Card key={cartao.titulo} className="border-stone-200" data-testid={cartao.testid}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Icone className="h-4 w-4 text-stone-500" />
                    {cartao.titulo}
                  </CardTitle>
                  <span className="rounded-full border border-stone-200 bg-stone-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                    Em breve
                  </span>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-stone-600">{cartao.descricao}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
