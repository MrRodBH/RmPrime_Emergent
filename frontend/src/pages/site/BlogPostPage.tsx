import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { useSeo } from "@/hooks/useSeo";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import { formatarData } from "@/lib/format";
import type { Post } from "@/types";

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const config = useSiteConfig();
  const [post, setPost] = useState<Post | null>(null);
  const [naoEncontrado, setNaoEncontrado] = useState(false);

  useSeo({
    titulo: post ? `${post.titulo} | Blog ${config.nome}` : undefined,
    descricao: post?.resumo || post?.conteudo?.slice(0, 155),
    imagem: post?.capa || undefined,
    jsonLd: post
      ? {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.titulo,
          description: post.resumo || post.conteudo.slice(0, 155),
          image: post.capa,
          datePublished: post.criado_em,
          author: { "@type": "Organization", name: config.nome },
        }
      : undefined,
  });

  useEffect(() => {
    setPost(null);
    setNaoEncontrado(false);
    api
      .get(`/blog/${slug}`)
      .then((r) => setPost(r.data))
      .catch(() => setNaoEncontrado(true));
  }, [slug]);

  if (naoEncontrado) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center" data-testid="post-nao-encontrado">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-stone-950">Post não encontrado</h1>
        <Link to="/blog" className="mt-6 inline-block rounded-md bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-stone-800">
          Voltar para o blog
        </Link>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="h-64 animate-pulse rounded-lg bg-stone-200" />
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-12" data-testid="pagina-post">
      <Link to="/blog" className="flex items-center gap-2 text-sm font-medium text-stone-600 transition-colors duration-200 hover:text-stone-900" data-testid="link-voltar-blog">
        <ArrowLeft className="h-4 w-4" /> Voltar para o blog
      </Link>
      <p className="mt-8 text-sm text-stone-500">{formatarData(post.criado_em)}</p>
      <h1 className="mt-2 font-heading text-4xl font-bold tracking-tight text-stone-950">{post.titulo}</h1>
      {post.resumo ? <p className="mt-3 text-lg text-stone-600">{post.resumo}</p> : null}
      {post.capa ? (
        <img src={post.capa} alt={`Imagem de capa do post: ${post.titulo}`} className="mt-8 w-full rounded-lg border border-stone-200 object-cover" />
      ) : null}
      <div className="mt-8 space-y-4 text-lg leading-relaxed text-stone-800" data-testid="conteudo-post">
        {post.conteudo.split("\n").filter(Boolean).map((paragrafo, i) => (
          <p key={i}>{paragrafo}</p>
        ))}
      </div>
    </article>
  );
}
