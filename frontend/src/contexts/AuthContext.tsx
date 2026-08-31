import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";

export type Papel = "admin" | "gestor" | "corretor";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  telefone?: string | null;
  foto?: string | null;
  papel: Papel;
  ativo: boolean;
  criado_em?: string;
}

interface AuthContextoTipo {
  usuario: Usuario | null | false;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
  definirUsuario: (u: Usuario | false) => void;
}

const AuthContexto = createContext<AuthContextoTipo>({
  usuario: null,
  entrar: async () => {},
  sair: async () => {},
  definirUsuario: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null | false>(null);

  useEffect(() => {
    api
      .get("/auth/me")
      .then((resposta) => setUsuario(resposta.data))
      .catch(() => setUsuario(false));
  }, []);

  async function entrar(email: string, senha: string) {
    const { data } = await api.post("/auth/login", { email, senha });
    setUsuario(data);
  }

  async function sair() {
    try {
      await api.post("/auth/logout");
    } finally {
      setUsuario(false);
    }
  }

  return (
    <AuthContexto.Provider
      value={{ usuario, entrar, sair, definirUsuario: setUsuario }}
    >
      {children}
    </AuthContexto.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContexto);
}
