"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Field, Notice } from "@/components/ui";
import { api, asApiError } from "@/lib/api";

const DEMO_USERS = [
  { label: "Estudiante", email: "estudiante@demo.edu" },
  { label: "Empresa", email: "empresa@demo.edu" },
  { label: "Coordinador", email: "coordinador@demo.edu" },
];
const DEMO_PASSWORD = "Demo2026!";

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/auth/login", { method: "POST", body: { email, password } });
      const next = params.get("next");
      window.location.assign(next?.startsWith("/") && !next.startsWith("//") ? next : "/");
    } catch (reason) {
      setError(asApiError(reason).message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <Notice tone="danger">{error}</Notice>}
      <Field label="Correo">
        {(props) => <input {...props} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />}
      </Field>
      <Field label="Contraseña">
        {(props) => <input {...props} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}
      </Field>
      <Button type="submit" busy={busy} className="w-full">
        Iniciar sesión
      </Button>
      <div className="border-t border-line pt-4">
        <p className="mb-2 text-sm text-muted">Usuarios de prueba</p>
        <div className="grid grid-cols-3 gap-2">
          {DEMO_USERS.map((user) => (
            <Button
              key={user.email}
              variant="secondary"
              className="px-1"
              onClick={() => {
                setEmail(user.email);
                setPassword(DEMO_PASSWORD);
              }}
            >
              {user.label}
            </Button>
          ))}
        </div>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="flex flex-col justify-center bg-accent-strong px-6 py-10 text-white sm:px-12">
        <p className="text-lg font-bold">PractiConecta</p>
        <h1 className="mt-3 max-w-md text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          Tu práctica profesional, en un solo lugar.
        </h1>
        <p className="mt-3 max-w-md text-white/80">
          Estudiantes, empresas y coordinación siguen cada oferta y postulación sin correos ni hojas de cálculo.
        </p>
      </section>
      <section className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <h2 className="mb-5 text-2xl font-bold tracking-tight">Inicia sesión</h2>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
