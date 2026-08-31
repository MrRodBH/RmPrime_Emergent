import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { useSeo } from "@/hooks/useSeo";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import { formatarData } from "@/lib/format";
import type { Post } from "@/types";

export default function BlogPage() {
  const config = useSiteConfig();
  const [posts, setPosts] = useState<Post[]>([]);
  const [carregando, setCarregando] = useState(true);

  useSeo({
    titulo: `Blog — dicas sobre imóveis e financiamento | ${config.nome}`,
    descricao: "Conteúdos para ajudar você a comprar, vender ou alugar imóveis com segurança.",
  });

  useEffect(() => {
    api
      .get("/blog")
      .then((r) => setPosts(r.data.itens))
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-8" data-testid="pagina-blog">
      <h1 className="font-heading text-4xl font-bold tracking-tight text-stone-950">Blog</h1>
      <p className="mt-2 text-stone-600">Dicas práticas sobre compra, venda, aluguel e financiamento de imóveis.</p>

      {carregando ? (
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-lg bg-stone-200" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <p className="mt-10 text-stone-500" data-testid="blog-vazio">Nenhum post publicado ainda.</p>
      ) : (
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3" data-testid="grade-posts">
          {posts.map((post) => (
            <Link
              key={post.id}
              to={`/blog/${post.slug}`}
              data-testid={`cartao-post-${post.slug}`}
              className="group flex flex-col overflow-hidden rounded-lg border border-stone-200 bg-white transition-colors duration-200 hover:border-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
            >
              <div className="relative h-48 overflow-hidden">
                {post.capa ? (
                  <img src={post.capa} alt={`Imagem de capa do post: ${post.titulo}`} className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                ) : (
                  <div className="absolute inset-0 bg-stone-200" />
                )}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-xs text-stone-500">{formatarData(post.criado_em)}</p>
                <h2 className="mt-1 font-heading text-lg font-semibold leading-snug tracking-tight text-stone-950">{post.titulo}</h2>
                {post.resumo ? <p className="mt-2 line-clamp-3 text-sm text-stone-600">{post.resumo}</p> : null}
                <span className="mt-4 flex items-center gap-1 text-sm font-semibold text-stone-900">
                  Ler artigo <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
