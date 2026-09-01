import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui-kit";
import { AuthProvider } from "@/contexts/AuthContext";
import { SiteConfigProvider } from "@/contexts/SiteConfigContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Rastreamento } from "@/components/Rastreamento";
import { PainelLayout } from "@/layouts/PainelLayout";
import { SiteLayout } from "@/site/SiteLayout";
import LoginPage from "@/pages/LoginPage";
import EsqueciSenhaPage from "@/pages/EsqueciSenhaPage";
import RedefinirSenhaPage from "@/pages/RedefinirSenhaPage";
import InicioPage from "@/pages/InicioPage";
import UsuariosPage from "@/pages/UsuariosPage";
import ImoveisPainelPage from "@/pages/painel/ImoveisPainelPage";
import CrmPage from "@/pages/painel/CrmPage";
import BlogPainelPage from "@/pages/painel/BlogPainelPage";
import ConteudoSitePage from "@/pages/painel/ConteudoSitePage";
import LandingPagesPainelPage from "@/pages/painel/LandingPagesPainelPage";
import ConfiguracoesPage from "@/pages/painel/ConfiguracoesPage";
import MarketingPage from "@/pages/painel/MarketingPage";
import HomePage from "@/pages/site/HomePage";
import ImoveisPage from "@/pages/site/ImoveisPage";
import ImovelDetalhePage from "@/pages/site/ImovelDetalhePage";
import BlogPage from "@/pages/site/BlogPage";
import BlogPostPage from "@/pages/site/BlogPostPage";
import ContatoPage from "@/pages/site/ContatoPage";
import FinanciamentoPage from "@/pages/site/FinanciamentoPage";
import PrivacidadePage from "@/pages/site/PrivacidadePage";
import LandingPage from "@/pages/site/LandingPage";

export default function App() {
  return (
    <BrowserRouter>
      <SiteConfigProvider>
        <AuthProvider>
          <Rastreamento />
          <Routes>
            <Route element={<SiteLayout />}>
              <Route index element={<HomePage />} />
              <Route path="/imoveis" element={<ImoveisPage />} />
              <Route path="/imoveis/:slug" element={<ImovelDetalhePage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />
              <Route path="/contato" element={<ContatoPage />} />
              <Route path="/financiamento" element={<FinanciamentoPage />} />
              <Route path="/politica-de-privacidade" element={<PrivacidadePage />} />
            </Route>
            <Route path="/lp/:slug" element={<LandingPage />} />
            <Route path="/entrar" element={<LoginPage />} />
            <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
            <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
            <Route
              path="/painel"
              element={
                <ProtectedRoute>
                  <PainelLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<InicioPage />} />
              <Route path="imoveis" element={<ImoveisPainelPage />} />
              <Route path="crm" element={<CrmPage />} />
              <Route
                path="usuarios"
                element={
                  <ProtectedRoute papeis={["admin", "gestor"]}>
                    <UsuariosPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="blog"
                element={
                  <ProtectedRoute papeis={["admin", "gestor"]}>
                    <BlogPainelPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="conteudo"
                element={
                  <ProtectedRoute papeis={["admin", "gestor"]}>
                    <ConteudoSitePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="landing-pages"
                element={
                  <ProtectedRoute papeis={["admin", "gestor"]}>
                    <LandingPagesPainelPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="marketing"
                element={
                  <ProtectedRoute papeis={["admin"]}>
                    <MarketingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="configuracoes"
                element={
                  <ProtectedRoute papeis={["admin", "gestor"]}>
                    <ConfiguracoesPage />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </SiteConfigProvider>
    </BrowserRouter>
  );
}
