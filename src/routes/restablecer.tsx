import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/restablecer")({
  head: () => ({
    meta: [
      { title: "Crear contraseña — Agenda de citas" },
      { name: "description", content: "Crea o cambia tu contraseña para entrar a la agenda del salón." },
      { property: "og:title", content: "Crear contraseña — Agenda de citas" },
      { property: "og:description", content: "Crea o cambia tu contraseña de la agenda del salón." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Restablecer,
});

function Restablecer() {
  const navigate = useNavigate();
  const [listo, setListo] = useState(false);
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === "PASSWORD_RECOVERY" || s) setListo(true);
    });
    supabase.auth.getSession().then(({ data }) => data.session && setListo(true));
    return () => data.subscription.unsubscribe();
  }, []);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: pass });
    if (error) return setMsg("No se pudo guardar: " + error.message);
    navigate({ to: "/" });
  }

  return (
    <div className="salon">
      <main className="auth-form" style={{ minHeight: "100vh" }}><div className="auth-card">
        <h2>Crear contraseña</h2>
        {listo ? (
          <form className="card" style={{ marginTop: 20 }} onSubmit={guardar}>
            <label htmlFor="np">Nueva contraseña</label>
            <input id="np" type="password" autoComplete="new-password" minLength={8} required value={pass} onChange={(e) => setPass(e.target.value)} />
            <button className="btn btn-primary full">Guardar y entrar</button>
            <p className="msg" role="alert">{msg}</p>
          </form>
        ) : (
          <div className="card" style={{ marginTop: 20 }}>
            <p>Abre esta página desde el enlace que te enviamos por correo.</p>
            <Link to="/">Volver a entrar</Link>
          </div>
        )}
      </div></main>
    </div>
  );
}
