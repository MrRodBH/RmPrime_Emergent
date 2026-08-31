import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import type { ReactElement } from "react";
import { useAuth, type Papel } from "@/contexts/AuthContext";

interface Props {
  children: ReactElement;
  papeis?: Papel[];
}

export function ProtectedRoute({ children, papeis }: Props) {
  const { usuario } = useAuth();

  if (usuario === null) {
    return (
      <div
        data-testid="carregando-sessao"
        className="flex min-h-screen items-center justify-center bg-stone-50"
      >
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }
  if (usuario === false) {
    return <Navigate to="/entrar" replace />;
  }
  if (papeis && !papeis.includes(usuario.papel)) {
    return <Navigate to="/painel" replace />;
  }
  return children;
}
