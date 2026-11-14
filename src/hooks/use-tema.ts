import { useEffect, useState } from "react";
import { cargarTema, clasesDeTema, guardarTema, type Tema } from "@/lib/tema";

/** Estado del tema del salón; aplica las clases de paleta en <html> y persiste. */
export function useTema(): [Tema, (t: Tema) => void] {
  const [tema, setTema] = useState<Tema>(cargarTema);

  useEffect(() => {
    document.documentElement.className = clasesDeTema(tema);
    guardarTema(tema);
  }, [tema]);

  return [tema, setTema];
}
