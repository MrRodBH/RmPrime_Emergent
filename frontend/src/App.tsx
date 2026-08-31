import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui-kit";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PainelLayout } from "@/layouts/PainelLayout";
import LoginPage from "@/pages/LoginPage";
import EsqueciSenhaPage from "@/pages/EsqueciSenhaPage";
import RedefinirSenhaPage from "@/pages/RedefinirSenhaPage";
import InicioPage from "@/pages/InicioPage";
import UsuariosPage from "@/pages/UsuariosPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
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
            <Route
              path="usuarios"
              element={
                <ProtectedRoute papeis={["admin", "gestor"]}>
                  <UsuariosPage />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/painel" replace />} />
        </Routes>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}
