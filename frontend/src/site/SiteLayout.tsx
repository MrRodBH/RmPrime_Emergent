import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Building2, Facebook, Instagram, Landmark, Mail, MapPin, Menu, Phone, Youtube } from "lucide-react";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import { Button, Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui-kit";

const MENU = [
  { rotulo: "Início", caminho: "/", testid: "menu-inicio" },
  { rotulo: "Imóveis", caminho: "/imoveis", testid: "menu-imoveis" },
  { rotulo: "Blog", caminho: "/blog", testid: "menu-blog" },
  { rotulo: "Contato", caminho: "/contato", testid: "menu-contato" },
];

export function Logomarca({ escura }: { escura?: boolean }) {
  const config = useSiteConfig();
  if (config.logomarca) {
    return (
      <img
        src={config.logomarca}
        alt={`Logomarca da ${config.nome}`}
        className="h-14 w-auto max-w-[220px] object-contain"
        data-testid="logomarca-site"
      />
    );
  }
  return (
    <div
      className={`flex h-14 items-center gap-2 rounded-md border border-dashed px-6 ${
        escura ? "border-stone-600 bg-stone-900 text-stone-300" : "border-stone-400 bg-stone-100 text-stone-600"
      }`}
      data-testid="logomarca-site"
    >
      <Landmark className="h-6 w-6" />
      <span className="text-sm font-bold tracking-wide">{config.nome || "SUA LOGOMARCA"}</span>
    </div>
  );
}

export function SiteLayout() {
  const config = useSiteConfig();
  const [menuAberto, setMenuAberto] = useState(false);
  const redes = config.redes_sociais || {};

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white" data-testid="cabecalho-site">
        <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-4 md:px-8">
          <Link to="/" aria-label="Ir para a página inicial" data-testid="link-logo-home">
            <Logomarca />
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Navegação principal">
            {MENU.map((item) => (
              <NavLink
                key={item.caminho}
                to={item.caminho}
                end={item.caminho === "/"}
                data-testid={item.testid}
                className={({ isActive }) =>
                  `rounded-md px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                    isActive ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                  }`
                }
              >
                {item.rotulo}
              </NavLink>
            ))}
            <Link
              to="/financiamento"
              data-testid="link-financiamento"
              className="ml-2 rounded-md border border-stone-900 px-4 py-2 text-sm font-semibold text-stone-900 transition-colors duration-200 hover:bg-stone-900 hover:text-white"
            >
              Simular financiamento
            </Link>
          </nav>

          <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden" data-testid="botao-menu-mobile-site" aria-label="Abrir menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 bg-white">
              <SheetTitle className="sr-only">Menu do site</SheetTitle>
              <div className="mb-6 mt-2">
                <Logomarca />
              </div>
              <p className="mb-4 text-sm text-stone-500">
                Navegue pelas seções do site para conhecer nossos imóveis, conteúdos e canais de atendimento.
              </p>
              <nav className="flex flex-col gap-1" aria-label="Navegação móvel">
                {MENU.map((item) => (
                  <NavLink
                    key={item.caminho}
                    to={item.caminho}
                    end={item.caminho === "/"}
                    onClick={() => setMenuAberto(false)}
                    data-testid={`drawer-${item.testid}`}
                    className={({ isActive }) =>
                      `rounded-md px-4 py-3 text-base font-medium transition-colors duration-200 ${
                        isActive ? "bg-stone-900 text-white" : "text-stone-700 hover:bg-stone-100"
                      }`
                    }
                  >
                    {item.rotulo}
                  </NavLink>
                ))}
                <NavLink
                  to="/financiamento"
                  onClick={() => setMenuAberto(false)}
                  data-testid="drawer-link-financiamento"
                  className="rounded-md px-4 py-3 text-base font-medium text-stone-700 transition-colors duration-200 hover:bg-stone-100"
                >
                  Simular financiamento
                </NavLink>
              </nav>
              {config.telefone ? (
                <p className="mt-6 flex items-center gap-2 text-sm text-stone-600">
                  <Phone className="h-4 w-4" /> {config.telefone}
                </p>
              ) : null}
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-stone-950 text-stone-300" data-testid="rodape-site">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-3 md:px-8">
          <div>
            <Logomarca escura />
            <p className="mt-4 text-sm leading-relaxed text-stone-400">{config.footer_texto}</p>
          </div>
          <div>
            <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-white">Contato</h3>
            <ul className="mt-4 space-y-3 text-sm">
              {config.footer_endereco ? (
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" />
                  {config.footer_endereco}
                </li>
              ) : null}
              {config.telefone ? (
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-stone-500" />
                  {config.telefone}
                </li>
              ) : null}
              {config.email_contato ? (
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-stone-500" />
                  {config.email_contato}
                </li>
              ) : null}
            </ul>
          </div>
          <div>
            <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-white">Redes sociais</h3>
            <div className="mt-4 flex gap-3">
              {redes.instagram ? (
                <a href={redes.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram da imobiliária" data-testid="rede-instagram" className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-700 text-stone-300 transition-colors duration-200 hover:border-stone-400 hover:text-white">
                  <Instagram className="h-4 w-4" />
                </a>
              ) : null}
              {redes.facebook ? (
                <a href={redes.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook da imobiliária" data-testid="rede-facebook" className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-700 text-stone-300 transition-colors duration-200 hover:border-stone-400 hover:text-white">
                  <Facebook className="h-4 w-4" />
                </a>
              ) : null}
              {redes.youtube ? (
                <a href={redes.youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube da imobiliária" data-testid="rede-youtube" className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-700 text-stone-300 transition-colors duration-200 hover:border-stone-400 hover:text-white">
                  <Youtube className="h-4 w-4" />
                </a>
              ) : null}
              {redes.whatsapp ? (
                <a href={`https://wa.me/${String(redes.whatsapp).replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp da imobiliária" data-testid="rede-whatsapp" className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-700 text-stone-300 transition-colors duration-200 hover:border-stone-400 hover:text-white">
                  <Phone className="h-4 w-4" />
                </a>
              ) : null}
              {!redes.instagram && !redes.facebook && !redes.youtube && !redes.whatsapp ? (
                <p className="text-sm text-stone-500">Em breve, nossas redes sociais.</p>
              ) : null}
            </div>
            <Link to="/imoveis" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-white underline-offset-4 hover:underline" data-testid="rodape-link-imoveis">
              <Building2 className="h-4 w-4" /> Ver todos os imóveis
            </Link>
          </div>
        </div>
        <div className="border-t border-stone-800">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-stone-500 md:px-8">
            <span>© {new Date().getFullYear()} {config.nome}. Todos os direitos reservados.</span>
            <Link to="/politica-de-privacidade" className="underline-offset-4 transition-colors duration-200 hover:text-stone-300 hover:underline" data-testid="link-politica-privacidade">
              Política de Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
