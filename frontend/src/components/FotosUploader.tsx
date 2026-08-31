import { useRef, useState, type DragEvent } from "react";
import { ArrowLeft, ArrowRight, GripVertical, ImagePlus, Link2, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, erroApi } from "@/lib/api";
import { Button, Input } from "@/components/ui-kit";

interface Props {
  valor: string[];
  onChange: (fotos: string[]) => void;
}

export function FotosUploader({ valor, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [arrastandoArquivo, setArrastandoArquivo] = useState(false);
  const [urlManual, setUrlManual] = useState("");
  const indiceArrastado = useRef<number | null>(null);

  async function enviarArquivos(arquivos: FileList | File[]) {
    const lista = Array.from(arquivos).filter((a) => a.type.startsWith("image/"));
    if (!lista.length) {
      toast.error("Selecione apenas arquivos de imagem (JPG, PNG, WEBP ou GIF).");
      return;
    }
    setEnviando(true);
    const novas = [...valor];
    try {
      for (const arquivo of lista) {
        const formData = new FormData();
        formData.append("arquivo", arquivo);
        const { data } = await api.post("/uploads", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        novas.push(data.url);
      }
      onChange(novas);
      toast.success(lista.length === 1 ? "Foto enviada com sucesso." : `${lista.length} fotos enviadas com sucesso.`);
    } catch (e) {
      toast.error(erroApi(e));
    } finally {
      setEnviando(false);
    }
  }

  function aoSoltarArquivo(evento: DragEvent) {
    evento.preventDefault();
    setArrastandoArquivo(false);
    if (evento.dataTransfer?.files?.length) enviarArquivos(evento.dataTransfer.files);
  }

  function mover(indice: number, direcao: -1 | 1) {
    const destino = indice + direcao;
    if (destino < 0 || destino >= valor.length) return;
    const novas = [...valor];
    [novas[indice], novas[destino]] = [novas[destino], novas[indice]];
    onChange(novas);
  }

  function aoSoltarItem(indiceAlvo: number) {
    if (indiceArrastado.current === null || indiceArrastado.current === indiceAlvo) return;
    const novas = [...valor];
    const [movida] = novas.splice(indiceArrastado.current, 1);
    novas.splice(indiceAlvo, 0, movida);
    indiceArrastado.current = null;
    onChange(novas);
  }

  function adicionarPorUrl() {
    const url = urlManual.trim();
    if (!url) return;
    if (!/^https?:\/\//.test(url)) {
      toast.error("Cole um link completo, começando com http:// ou https://");
      return;
    }
    onChange([...valor, url]);
    setUrlManual("");
  }

  return (
    <div className="space-y-3" data-testid="uploader-fotos">
      <div
        role="button"
        tabIndex={0}
        aria-label="Área para arrastar e soltar fotos do imóvel"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastandoArquivo(true);
        }}
        onDragLeave={() => setArrastandoArquivo(false)}
        onDrop={aoSoltarArquivo}
        data-testid="dropzone-fotos"
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 ${
          arrastandoArquivo ? "border-stone-900 bg-stone-100" : "border-stone-300 bg-stone-50 hover:border-stone-500"
        }`}
      >
        {enviando ? (
          <Loader2 className="h-8 w-8 animate-spin text-stone-500" />
        ) : (
          <ImagePlus className="h-8 w-8 text-stone-400" />
        )}
        <p className="text-sm font-medium text-stone-700">
          {enviando ? "Enviando fotos..." : "Arraste as fotos aqui ou clique para escolher"}
        </p>
        <p className="text-xs text-stone-500">JPG, PNG, WEBP ou GIF — até 10 MB cada. Você pode enviar várias de uma vez.</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          data-testid="input-arquivo-fotos"
          onChange={(e) => {
            if (e.target.files) enviarArquivos(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {valor.length > 0 ? (
        <ul className="space-y-2" data-testid="lista-fotos">
          {valor.map((foto, indice) => (
            <li
              key={`${foto}-${indice}`}
              draggable
              onDragStart={() => {
                indiceArrastado.current = indice;
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => aoSoltarItem(indice)}
              data-testid={`foto-item-${indice}`}
              className="flex items-center gap-3 rounded-md border border-stone-200 bg-white p-2"
            >
              <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-stone-400" aria-label="Arrastar para reordenar" />
              <img src={foto} alt={`Foto ${indice + 1} do imóvel`} className="h-12 w-16 shrink-0 rounded object-cover" loading="lazy" />
              <span className="min-w-0 flex-1 truncate text-xs text-stone-500">
                {indice === 0 ? <strong className="text-stone-700">Capa · </strong> : null}
                {foto}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => mover(indice, -1)} disabled={indice === 0} aria-label={`Mover foto ${indice + 1} para antes`} data-testid={`botao-foto-esquerda-${indice}`} className="rounded p-1.5 text-stone-500 transition-colors duration-200 hover:bg-stone-100 disabled:opacity-30">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => mover(indice, 1)} disabled={indice === valor.length - 1} aria-label={`Mover foto ${indice + 1} para depois`} data-testid={`botao-foto-direita-${indice}`} className="rounded p-1.5 text-stone-500 transition-colors duration-200 hover:bg-stone-100 disabled:opacity-30">
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => onChange(valor.filter((_, i) => i !== indice))} aria-label={`Remover foto ${indice + 1}`} data-testid={`botao-remover-foto-${indice}`} className="rounded p-1.5 text-red-500 transition-colors duration-200 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-stone-500">Nenhuma foto adicionada ainda. A primeira foto da lista vira a capa do anúncio.</p>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Ou cole aqui o link (URL) de uma foto..."
          value={urlManual}
          onChange={(e) => setUrlManual(e.target.value)}
          className="h-10 border-stone-300 text-sm"
          data-testid="input-url-foto"
        />
        <Button type="button" variant="outline" onClick={adicionarPorUrl} className="h-10 shrink-0 border-stone-300" data-testid="botao-adicionar-url-foto">
          <Link2 className="mr-1.5 h-4 w-4" /> Adicionar
        </Button>
      </div>
    </div>
  );
}
