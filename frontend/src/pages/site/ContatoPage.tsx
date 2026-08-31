import { Mail, MapPin, Phone } from "lucide-react";
import { useSeo } from "@/hooks/useSeo";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import { FormularioLead } from "@/components/site/FormularioLead";

export default function ContatoPage() {
  const config = useSiteConfig();

  useSeo({
    titulo: `Contato | ${config.nome}`,
    descricao: "Fale com a nossa equipe de corretores: tire dúvidas, agende visitas e anuncie seu imóvel.",
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-8" data-testid="pagina-contato">
      <h1 className="font-heading text-4xl font-bold tracking-tight text-stone-950">Fale com a gente</h1>
      <p className="mt-2 max-w-2xl text-stone-600">
        Quer comprar, vender ou alugar? Deixe seus dados e um corretor especializado retorna o contato rapidinho.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          {[
            { icone: Phone, rotulo: "Telefone / WhatsApp", valor: config.telefone, testid: "contato-telefone" },
            { icone: Mail, rotulo: "E-mail", valor: config.email_contato, testid: "contato-email" },
            { icone: MapPin, rotulo: "Endereço", valor: config.endereco || config.footer_endereco, testid: "contato-endereco" },
          ].map((item) => (
            <div key={item.rotulo} className="flex items-start gap-4 rounded-lg border border-stone-200 bg-white p-5" data-testid={item.testid}>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-stone-900 text-white">
                <item.icone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-900">{item.rotulo}</p>
                <p className="mt-0.5 text-sm text-stone-600">{item.valor || "Configure em Painel → Configurações"}</p>
              </div>
            </div>
          ))}
          <div className="rounded-lg bg-stone-950 p-5 text-sm leading-relaxed text-stone-300">
            <p className="font-heading text-base font-semibold text-white">Horário de atendimento</p>
            <p className="mt-1">Segunda a sexta, das 9h às 18h. Sábado, das 9h às 13h.</p>
          </div>
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-6 md:p-8 lg:col-span-3" data-testid="formulario-contato-site">
          <FormularioLead origem="site" titulo="Envie sua mensagem" textoBotao="Enviar mensagem" />
        </div>
      </div>
    </div>
  );
}
