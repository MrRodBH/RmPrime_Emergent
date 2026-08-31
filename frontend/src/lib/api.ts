import axios, { AxiosError, AxiosRequestConfig } from "axios";

export const api = axios.create({
  baseURL: `${process.env.REACT_APP_BACKEND_URL}/api`,
  withCredentials: true,
});

let renovacao: Promise<void> | null = null;

api.interceptors.response.use(
  (resposta) => resposta,
  async (erro: AxiosError) => {
    const original = erro.config as (AxiosRequestConfig & { _tentouRenovar?: boolean }) | undefined;
    const url = original?.url || "";
    if (
      erro.response?.status === 401 &&
      original &&
      !original._tentouRenovar &&
      !url.startsWith("/auth/")
    ) {
      original._tentouRenovar = true;
      try {
        if (!renovacao) {
          renovacao = api
            .post("/auth/refresh")
            .then(() => undefined)
            .finally(() => {
              renovacao = null;
            });
        }
        await renovacao;
        return api(original);
      } catch {
        // sessão expirada — o ProtectedRoute redireciona para o login
      }
    }
    return Promise.reject(erro);
  }
);

export function erroApi(erro: unknown): string {
  if (axios.isAxiosError(erro)) {
    const detalhe = (erro.response?.data as { detail?: unknown } | undefined)?.detail;
    if (typeof detalhe === "string") return detalhe;
    if (Array.isArray(detalhe)) {
      return detalhe
        .map((item) => (item && typeof item.msg === "string" ? item.msg : JSON.stringify(item)))
        .filter(Boolean)
        .join(" ");
    }
  }
  return "Ocorreu um erro inesperado. Tente novamente.";
}
