import type { Papel } from "@/contexts/AuthContext";

export const ROTULOS_PAPEL: Record<Papel, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  corretor: "Corretor",
};

export const CORES_PAPEL: Record<Papel, string> = {
  admin: "border-purple-200 bg-purple-100 text-purple-800",
  gestor: "border-blue-200 bg-blue-100 text-blue-800",
  corretor: "border-orange-200 bg-orange-100 text-orange-800",
};
