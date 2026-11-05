"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/toast";
import { Button, Card, Field, LinkButton, Notice, PageHeader } from "@/components/ui";
import { api, type ApiError, asApiError } from "@/lib/api";
import { CAREERS, MODALITIES, SCHEDULES } from "@/lib/catalogs";
import { todayLocal } from "@/lib/format";

const EMPTY = { title: "", description: "", careerCode: "", modality: "", schedule: "", deadline: "" };

const Options = ({ options }: { options: Record<string, string> }) => (
  <>
    <option value="">Selecciona una opción</option>
    {Object.entries(options).map(([value, label]) => (
      <option key={value} value={value}>{label}</option>
    ))}
  </>
);

export default function NewOfferPage() {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [failure, setFailure] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  const bind = (name: keyof typeof EMPTY) => ({
    value: form[name],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm({ ...form, [name]: event.target.value }),
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setFailure(null);
    try {
      await api("/company/offers", { method: "POST", body: form });
      toast("Oferta enviada a revisión de la coordinación.");
      router.push("/empresa/ofertas");
    } catch (reason) {
      setFailure(asApiError(reason));
      setBusy(false);
    }
  };

  const fields = failure?.fields ?? {};

  return (
    <>
      <PageHeader
        title="Nueva oferta"
        description="La coordinación la revisará antes de que los estudiantes puedan verla."
        crumbs={[{ label: "Mis ofertas", href: "/empresa/ofertas" }, { label: "Nueva oferta" }]}
      />
      <Card className="max-w-2xl">
        <form onSubmit={submit} noValidate className="space-y-4">
          {failure && !failure.fields && <Notice tone="danger">{failure.message}</Notice>}
          <Field label="Puesto" error={fields.title}>
            {(props) => <input {...props} {...bind("title")} placeholder="Ejemplo: Practicante de desarrollo web" />}
          </Field>
          <Field label="Descripción" error={fields.description}>
            {(props) => <textarea {...props} {...bind("description")} rows={5} placeholder="Actividades, aprendizajes y requisitos" />}
          </Field>
          <Field label="Carrera requerida" error={fields.careerCode}>
            {(props) => <select {...props} {...bind("careerCode")}><Options options={CAREERS} /></select>}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Modalidad" error={fields.modality}>
              {(props) => <select {...props} {...bind("modality")}><Options options={MODALITIES} /></select>}
            </Field>
            <Field label="Jornada" error={fields.schedule}>
              {(props) => <select {...props} {...bind("schedule")}><Options options={SCHEDULES} /></select>}
            </Field>
          </div>
          <Field label="Fecha límite" error={fields.deadline} hint="Último día para postularse.">
            {(props) => <input {...props} {...bind("deadline")} type="date" min={todayLocal()} />}
          </Field>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <LinkButton href="/empresa/ofertas" variant="secondary">Cancelar</LinkButton>
            <Button type="submit" busy={busy}>Enviar a revisión</Button>
          </div>
        </form>
      </Card>
    </>
  );
}
