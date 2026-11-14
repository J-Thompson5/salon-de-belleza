import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useTema } from "@/hooks/use-tema";
import { Agenda } from "@/components/Agenda";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Agenda de citas — Salón de belleza" },
      { name: "description", content: "Agenda de citas del salón: calendario por día y semana, equipo y reportes en Excel." },
      { property: "og:title", content: "Agenda de citas — Salón de belleza" },
      { property: "og:description", content: "Calendario de citas, equipo y reportes de ganancia del salón." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  useTema();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <div className="salon">
      {session === undefined ? null : session ? (
        <Agenda onLogout={() => supabase.auth.signOut()} />
      ) : (
        <Login />
      )}
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    setOk(false);
    setMsg(error ? "Correo o contraseña incorrectos." : "");
  }
  async function crearClave() {
    if (!email) {
      setOk(false);
      return setMsg("Escribe tu correo arriba primero.");
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/restablecer",
    });
    setOk(!error);
    setMsg(error ? "No se pudo enviar el correo. Intenta de nuevo." : "Te enviamos un enlace a tu correo para crear tu contraseña.");
  }

  return (
    <div className="auth">
      <div className="auth-art">
        <div className="brand">
          <span className="brand-dot">✦</span> Salón
        </div>
        <div>
          <h1>
            Tu agenda,
            <br />
            <em>siempre impecable.</em>
          </h1>
          <p>Citas, equipo y ganancias del salón en un solo lugar, actualizados al momento.</p>
        </div>
        <span />
      </div>
      <div className="auth-form">
        <form className="auth-card" onSubmit={entrar}>
          <h2>Bienvenida</h2>
          <p className="sub">Entra con tu correo del salón.</p>
          <label htmlFor="email">Correo</label>
          <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <label htmlFor="pass">Contraseña</label>
          <input id="pass" type="password" autoComplete="current-password" required value={pass} onChange={(e) => setPass(e.target.value)} />
          <button className="btn btn-primary full">Entrar</button>
          <button type="button" className="linkbtn" onClick={crearClave}>
            ¿Primera vez aquí u olvidaste tu contraseña?
          </button>
          <p className={"msg" + (ok ? " ok" : "")} role="alert">
            {msg}
          </p>
        </form>
      </div>
    </div>
  );
}
