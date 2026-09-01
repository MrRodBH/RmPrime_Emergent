import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Landmark, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api, erroApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui-kit";

interface Taxa {
  banco: string;
  modalidade: string | null;
  sistema: string;
  taxa_aa: number;
  fonte: string;
  data_referencia: string | null;
}

interface StatusScraping {
  banco: string;
  sucesso: boolean;
  detalhe: string | null;
  tentativa_em: string | null;
}

const BANCOS = ["CEF", "Itaú", "Bradesco", "Inter"];

function dataBr(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString("pt-BR") : "—";
}

export default function TaxasPage() {
  const { usuario } = useAuth();
  const admin = !!usuario && usuario.papel === "admin";
  const [taxas, setTaxas] = useState<Taxa[]>([]);
  const [status, setStatus] = useState<StatusScraping[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [banco, setBanco] = useState("CEF");
  const [modalidade, setModalidade] = useState("MCMV");
  const [sistema, setSistema] = useState("SAC");
  const [taxa, setTaxa] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const { data } = await api.get("/taxas");
      setTaxas(data);
      if (admin) {
        const resposta = await api.get("/taxas/status-scraping");
        setStatus(resposta.data);
      }
    } catch (e) {
      toast.error(erroApi(e));
    } finally {
      setCarregando(false);
    }
  }, [admin]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function atualizarAgora() {
    setAtualizando(true);
    try {
      const { data } = await api.post("/taxas/atualizar-agora");
      toast.success(data.mensagem);
      setTimeout(() => carregar(), 30000);
    } catch (e) {
      toast.error(erroApi(e));
    } finally {
      setAtualizando(false);
    }
  }

  async function salvarManual(evento: FormEvent) {
    evento.preventDefault();
    const valor = parseFloat(taxa.replace(",", "."));
    if (!Number.isFinite(valor) || valor <= 0 || valor > 30) {
      toast.error("Informe uma taxa válida entre 0 e 30 (% ao ano).");
      return;
    }
    setSalvando(true);
    try {
      const { data } = await api.put("/taxas/manual", {
        banco,
        modalidade: banco === "CEF" ? modalidade : null,
        sistema,
        taxa_aa: valor,
      });
      toast.success(data.mensagem);
      setTaxa("");
      await carregar();
    } catch (e) {
      toast.error(erroApi(e));
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <div className="flex min-h-[300px] items-center justify-center" data-testid="taxas-carregando">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="pagina-taxas">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">
            Taxas de financiamento
          </h1>
          <p className="mt-1 max-w-2xl text-stone-600">
            São as taxas que alimentam a calculadora de financiamento do site. Uma tarefa automática busca os valores
            oficiais na base do Banco Central todos os dias; se a leitura falhar, a calculadora continua usando a
            última taxa válida.
          </p>
        </div>
        <Button
          onClick={atualizarAgora}
          disabled={atualizando}
          className="h-11 bg-stone-900 text-white transition-colors duration-200 hover:bg-stone-800"
          data-testid="botao-atualizar-taxas"
        >
          {atualizando ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Iniciando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" /> Atualizar agora
            </>
          )}
        </Button>
      </div>

      <Card className="border-stone-200" data-testid="tabela-taxas-vigentes">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Taxas vigentes na calculadora</CardTitle>
        </CardHeader>
        <CardContent>
          {taxas.length === 0 ? (
            <p className="text-sm text-stone-500">
              Nenhuma taxa registrada ainda. Clique em "Atualizar agora" para buscar nos sites dos bancos ou
              cadastre uma taxa manualmente no formulário abaixo.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Banco</TableHead>
                    <TableHead>Modalidade</TableHead>
                    <TableHead>Sistema</TableHead>
                    <TableHead>Taxa (% a.a.)</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Referente a</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxas.map((item, indice) => (
                    <TableRow key={indice} data-testid={`taxa-${item.banco}-${item.modalidade || "padrao"}-${item.sistema}`}>
                      <TableCell className="font-medium text-stone-900">{item.banco}</TableCell>
                      <TableCell className="text-stone-600">{item.modalidade || "Padrão"}</TableCell>
                      <TableCell className="text-stone-600">{item.sistema}</TableCell>
                      <TableCell className="font-semibold text-stone-900">{item.taxa_aa.toFixed(2).replace(".", ",")}%</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            item.fonte === "manual"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          }
                        >
                          {item.fonte === "manual" ? "Informada manualmente" : "Banco Central (automático)"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-stone-600">{dataBr(item.data_referencia)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-stone-200" data-testid="form-taxa-manual">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Corrigir ou inserir uma taxa manualmente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-5 text-sm leading-relaxed text-stone-600">
            Use este formulário quando o valor lido automaticamente estiver desatualizado ou errado. A taxa informada
            aqui passa a valer na hora para a calculadora do site e <strong>sobrepõe a leitura automática</strong> até
            que você a revise.
          </p>
          <form onSubmit={salvarManual} className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label>Banco</Label>
              <Select value={banco} onValueChange={setBanco}>
                <SelectTrigger className="border-stone-300" data-testid="taxa-manual-banco">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BANCOS.map((b) => (
                    <SelectItem key={b} value={b}>{b === "CEF" ? "CEF (Caixa)" : b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {banco === "CEF" ? (
              <div className="space-y-2">
                <Label>Modalidade</Label>
                <Select value={modalidade} onValueChange={setModalidade}>
                  <SelectTrigger className="border-stone-300" data-testid="taxa-manual-modalidade">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MCMV">MCMV (Minha Casa Minha Vida)</SelectItem>
                    <SelectItem value="SBPE">SBPE (demais perfis)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Sistema de amortização</Label>
              <Select value={sistema} onValueChange={setSistema}>
                <SelectTrigger className="border-stone-300" data-testid="taxa-manual-sistema">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAC">SAC</SelectItem>
                  <SelectItem value="PRICE">PRICE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxa-manual-valor">Taxa (% ao ano)</Label>
              <Input
                id="taxa-manual-valor"
                inputMode="decimal"
                placeholder="Ex.: 10,5"
                value={taxa}
                onChange={(e) => setTaxa(e.target.value)}
                className="border-stone-300"
                data-testid="taxa-manual-valor"
              />
            </div>
            <Button type="submit" disabled={salvando} className="bg-stone-900 text-white hover:bg-stone-800" data-testid="botao-salvar-taxa-manual">
              {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar taxa
            </Button>
          </form>
        </CardContent>
      </Card>

      {admin ? (
        <Card className="border-stone-200" data-testid="tabela-status-scraping">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-lg">
              <Landmark className="h-5 w-5 text-stone-400" />
              Status da atualização automática
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-stone-600">
              Resultado da última tentativa de leitura em cada banco. Falhas não afetam o site: a última taxa válida
              continua em uso até a próxima leitura bem-sucedida.
            </p>
            {status.length === 0 ? (
              <p className="text-sm text-stone-500" data-testid="status-scraping-vazio">
                Nenhuma tentativa registrada ainda. A próxima ocorre hoje às 8h ou quando você clicar em "Atualizar agora".
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Banco</TableHead>
                      <TableHead>Resultado</TableHead>
                      <TableHead>Detalhe</TableHead>
                      <TableHead>Última tentativa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {status.map((item) => (
                      <TableRow key={item.banco} data-testid={`status-scraping-${item.banco}`}>
                        <TableCell className="font-medium text-stone-900">{item.banco}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              item.sucesso
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-red-200 bg-red-50 text-red-700"
                            }
                          >
                            {item.sucesso ? "Sucesso" : "Falha"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-stone-600">{item.detalhe || "—"}</TableCell>
                        <TableCell className="text-stone-600">{dataBr(item.tentativa_em)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
