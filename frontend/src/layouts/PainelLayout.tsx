import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Building2,
  FileText,
  KanbanSquare,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  Newspaper,
  Rocket,
  Settings,
  Users,
} from "lucide-react";
import { useAuth, type Papel } from "@/contexts/AuthContext";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui-kit";

export const ROTULOS_PAPEL: Record<Papel, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  corretor: "Corretor",
};

interface ItemMenu {
  rotulo: string;
  icone: typeof LayoutDashboard;
  caminho?: string;
  papeis?: Papel[];
  emBreve?: boolean;
  testid: string;
}

const ITENS_MENU: ItemMenu[] = [
  { rotulo: "Visão Geral", icone: LayoutDashboard, caminho: "/painel", testid: "menu-visao-geral" },
  { rotulo: "Imóveis", icone: Building2, caminho: "/painel/imoveis", testid: "menu-imoveis" },
  { rotulo: "Usuários", icone: Users, caminho: "/painel/usuarios", papeis: ["admin", "gestor"], testid: "menu-usuarios" },
  { rotulo: "Blog", icone: Newspaper, caminho: "/painel/blog", papeis: ["admin", "gestor"], testid: "menu-blog" },
  { rotulo: "Conteúdo do Site", icone: FileText, caminho: "/painel/conteudo", papeis: ["admin", "gestor"], testid: "menu-conteudo" },
  { rotulo: "Landing Pages", icone: Rocket, caminho: "/painel/landing-pages", papeis: ["admin", "gestor"], testid: "menu-landing-pages" },
  { rotulo: "CRM / Leads", icone: KanbanSquare, emBreve: true, testid: "menu-crm" },
  { rotulo: "Configurações", icone: Settings, caminho: "/painel/configuracoes", papeis: ["admin", "gestor"], testid: "menu-configuracoes" },
];

function AreaLogomarca() {
  return (
    <div className="flex h-24 items-center border-b border-stone-800 px-6" data-testid="area-logomarca">
      <div className="flex h-14 w-full items-center justify-center gap-2 rounded-md border border-dashed border-stone-600 bg-stone-900">
        <Landmark className="h-6 w-6 text-stone-400" />
        <span className="text-sm font-semibold tracking-wide text-stone-300">SUA LOGOMARCA</span>
      </div>
    </div>
  );
}

function Navegacao({ aoNavegar }: { aoNavegar?: () => void }) {
  const { usuario } = useAuth();
  if (!usuario) return null;
  return (
    <nav className="flex-1 space-y-1 px-4 py-6">
      {ITENS_MENU.filter((item) => !item.papeis || item.papeis.includes(usuario.papel)).map((item) => {
        const Icone = item.icone;
        if (item.emBreve || !item.caminho) {
          return (
            <div
              key={item.rotulo}
              data-testid={item.testid}
              className="flex cursor-not-allowed items-center justify-between rounded-md px-4 py-2.5 text-sm text-stone-500"
              title="Disponível nas próximas fases"
            >
              <span className="flex items-center gap-3">
                <Icone className="h-4 w-4" />
                {item.rotulo}
              </span>
              <span className="rounded-full border border-stone-700 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-stone-500">
                Em breve
              </span>
            </div>
          );
        }
        return (
          <NavLink
            key={item.rotulo}
            to={item.caminho}
            end={item.caminho === "/painel"}
            onClick={aoNavegar}
            data-testid={item.testid}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-4 py-2.5 text-sm transition-colors duration-200 ${
                isActive
                  ? "bg-stone-800 font-semibold text-white"
                  : "text-stone-300 hover:bg-stone-900 hover:text-white"
              }`
            }
          >
            <Icone className="h-4 w-4" />
            {item.rotulo}
          </NavLink>
        );
      })}
    </nav>
  );
}

export function PainelLayout() {
  const { usuario, sair } = useAuth();
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);

  if (!usuario) return null;

  const iniciais = usuario.nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();

  async function aoSair() {
    await sair();
    navigate("/entrar");
  }

  return (
    <div className="flex min-h-screen bg-stone-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col bg-stone-950 md:flex" data-testid="barra-lateral">
        <AreaLogomarca />
        <Navegacao />
        <div className="border-t border-stone-800 px-6 py-4">
          <p className="text-xs text-stone-500">Conectado como</p>
          <p className="mt-1 truncate text-sm font-medium text-stone-200">{usuario.nome}</p>
          <Badge variant="outline" className="mt-2 border-stone-700 text-stone-300">
            {ROTULOS_PAPEL[usuario.papel]}
          </Badge>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col md:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-stone-200 bg-white px-4 md:px-8">
          <div className="flex items-center gap-3">
            <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden" data-testid="botao-menu-mobile">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-stone-950 p-0">
                <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
                <AreaLogomarca />
                <Navegacao aoNavegar={() => setMenuAberto(false)} />
              </SheetContent>
            </Sheet>
            <span className="text-sm font-medium tracking-wide text-stone-500">
              Painel da Imobiliária
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                data-testid="menu-usuario-logado"
                className="flex items-center gap-3 rounded-full py-1 pl-1 pr-3 transition-colors duration-200 hover:bg-stone-100"
              >
                <Avatar className="h-9 w-9">
                  {usuario.foto ? <AvatarImage src={usuario.foto} alt={usuario.nome} /> : null}
                  <AvatarFallback className="bg-stone-900 text-xs font-semibold text-white">
                    {iniciais}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-left sm:block">
                  <span className="block text-sm font-medium leading-tight text-stone-900">
                    {usuario.nome}
                  </span>
                  <span className="block text-xs leading-tight text-stone-500">
                    {ROTULOS_PAPEL[usuario.papel]}
                  </span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <span className="block text-sm font-semibold">{usuario.nome}</span>
                <span className="block truncate text-xs font-normal text-stone-500">{usuario.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                data-testid="botao-sair"
                onClick={aoSair}
                className="cursor-pointer text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair do painel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 p-6 md:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
