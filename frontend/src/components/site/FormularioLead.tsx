import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { api, erroApi } from "@/lib/api";
import { gerarEventoId, rastrearLead } from "@/lib/tracking";
import { Button, Input, Label, Textarea } from "@/components/ui-kit";

interface Props {
  origem: "site" | "landing_page" | "agendamento";
  imovelId?: string;
  titulo?: string;
  textoBotao?: string;
  mensagemPadrao?: string;
}

export function FormularioLead({ origem, imovelId, titulo, textoBotao, mensagemPadrao }: Props) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [mensagem, setMensagem] = useState(mensagemPadrao || "");
  const [dataVisita, setDataVisita] = useState("");
  const [consentimento, setConsentimento] = useState(false);
  const [eventoId, setEventoId] = useState(() => gerarEventoId());
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const idBase = `lead-${origem}`;

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro("");
    if (!consentimento) {
      setErro("É necessário aceitar a Política de Privacidade para enviar o formulário.");
      return;
    }
    setEnviando(true);
    try {
      await api.post("/leads", {
        nome,
        telefone,
        email: email || null,
        mensagem: mensagem || null,
        origem,
        imovel_id: imovelId || null,
        consentimento_lgpd: consentimento,
        data_visita: origem === "agendamento" ? dataVisita || null : null,
        evento_id: eventoId,
      });
      rastrearLead(eventoId, origem);
      setEventoId(gerarEventoId());
      setEnviado(true);
    } catch (e) {
      setErro(erroApi(e));
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div
        className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center"
        data-testid={`${idBase}-sucesso`}
        role="status"
      >
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <p className="mt-3 font-heading text-lg font-semibold text-emerald-900">Contato enviado!</p>
        <p className="mt-1 text-sm text-emerald-800">
          Recebemos seus dados. Em breve um de nossos corretores falará com você.
        </p>
        <p className="mt-2 text-xs text-emerald-700">
          Seus dados são tratados conforme a nossa{" "}
          <Link to="/politica-de-privacidade" className="font-medium underline underline-offset-2">
            Política de Privacidade
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={aoEnviar} className="space-y-4" data-testid={`form-${idBase}`}>
      {titulo ? (
        <h3 className="font-heading text-xl font-semibold tracking-tight text-stone-950">{titulo}</h3>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor={`${idBase}-nome`}>Nome completo</Label>
        <Input
          id={`${idBase}-nome`}
          required
          placeholder="Seu nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="h-11 border-stone-300 bg-white focus-visible:ring-2 focus-visible:ring-stone-900"
          data-testid={`${idBase}-nome`}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${idBase}-telefone`}>Telefone / WhatsApp</Label>
          <Input
            id={`${idBase}-telefone`}
            required
            type="tel"
            placeholder="(11) 99999-9999"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            className="h-11 border-stone-300 bg-white focus-visible:ring-2 focus-visible:ring-stone-900"
            data-testid={`${idBase}-telefone`}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idBase}-email`}>E-mail (opcional)</Label>
          <Input
            id={`${idBase}-email`}
            type="email"
            placeholder="voce@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 border-stone-300 bg-white focus-visible:ring-2 focus-visible:ring-stone-900"
            data-testid={`${idBase}-email`}
          />
        </div>
      </div>
      {origem === "agendamento" ? (
        <div className="space-y-2">
          <Label htmlFor={`${idBase}-data`}>Data preferida para a visita</Label>
          <Input
            id={`${idBase}-data`}
            type="date"
            required
            value={dataVisita}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDataVisita(e.target.value)}
            className="h-11 border-stone-300 bg-white focus-visible:ring-2 focus-visible:ring-stone-900"
            data-testid={`${idBase}-data-visita`}
          />
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor={`${idBase}-mensagem`}>Mensagem (opcional)</Label>
        <Textarea
          id={`${idBase}-mensagem`}
          rows={3}
          placeholder="Conte um pouco do que você procura..."
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          className="border-stone-300 bg-white focus-visible:ring-2 focus-visible:ring-stone-900"
          data-testid={`${idBase}-mensagem`}
        />
      </div>

      <div className="flex items-start gap-3 rounded-md border border-stone-200 bg-stone-50 p-3">
        <input
          id={`${idBase}-consentimento`}
          type="checkbox"
          checked={consentimento}
          onChange={(e) => setConsentimento(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-stone-900"
          data-testid={`${idBase}-consentimento`}
        />
        <Label htmlFor={`${idBase}-consentimento`} className="cursor-pointer text-xs font-normal leading-relaxed text-stone-600">
          Autorizo o contato da imobiliária e o uso dos meus dados conforme a{" "}
          <Link to="/politica-de-privacidade" target="_blank" className="font-medium text-stone-900 underline underline-offset-2" data-testid={`${idBase}-link-politica`}>
            Política de Privacidade
          </Link>{" "}
          (LGPD — Lei nº 13.709/2018).
        </Label>
      </div>

      {erro ? (
        <div role="alert" data-testid={`${idBase}-erro`} className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      ) : null}

      <Button
        type="submit"
        disabled={enviando || !consentimento}
        className="h-12 w-full bg-stone-900 text-base text-white transition-colors duration-200 hover:bg-stone-800 disabled:opacity-50"
        data-testid={`${idBase}-submit`}
      >
        {enviando ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
          </>
        ) : (
          textoBotao || "Quero ser atendido"
        )}
      </Button>
    </form>
  );
}
