import { useState } from "react";
import { Share, View } from "react-native";
import { dateKey, daysFrom, type Task } from "../../../lib/api";
import { useResource, useAction } from "../../../lib/data";
import { useSession } from "../../../lib/session";
import {
  Button,
  Card,
  c,
  Label,
  Loading,
  Meter,
  Notice,
  Page,
  Row,
  Section,
  Tag,
} from "../../../ui/kit";
type Focus = { start_time: string; end_time: string; status: string };
async function load(api: ReturnType<typeof useSession>["api"]) {
  const [tasks, sessions, messages] = await Promise.all([
    api<Task[]>("/tasks"),
    api<Focus[]>("/focus-sessions"),
    api<{ sender: string; message: string }[]>("/ai/messages?limit=12"),
  ]);
  return {
    tasks,
    sessions,
    quote: messages.find((m) => m.sender === "bot")?.message,
  };
}
export default function Roast() {
  const { api } = useSession(),
    r = useResource(load),
    a = useAction();
  const [offset, setOffset] = useState(0);
  const now = daysFrom(offset * 7),
    from = daysFrom(-((now.getDay() + 6) % 7), now);
  from.setHours(0, 0, 0, 0);
  const end = daysFrom(7, from),
    d = r.data;
  const inWeek = (v: string | null) =>
    !!v && v.slice(0, 10) >= dateKey(from) && v.slice(0, 10) < dateKey(end);
  const planned =
    d?.tasks.filter(
      (t) =>
        inWeek(t.deadline) ||
        inWeek(t.creation_date) ||
        inWeek(t.completion_date),
    ) ?? [];
  const completed = planned.filter((t) => inWeek(t.completion_date)).length;
  const avoidance = planned.length
    ? Math.round(100 * (1 - completed / planned.length))
    : 0;
  const focus =
    d?.sessions
      .filter((s) => inWeek(s.start_time) && s.status === "completed")
      .reduce(
        (total, s) =>
          total +
          Math.max(
            0,
            (Date.parse(s.end_time) - Date.parse(s.start_time)) / 60000,
          ),
        0,
      ) ?? 0;
  const summary =
    "Semana del " +
    from.toLocaleDateString("es-BO") +
    ": " +
    completed +
    " de " +
    planned.length +
    " tareas y " +
    Math.round(focus) +
    " minutos de enfoque.";
  return (
    <Page title="Roast" subtitle="Reporte semanal">
      <Notice error={r.error} retry={r.refresh} />
      <Notice error={a.error} />
      <Tag tone={c.rose} color={c.red}>
        ⚠ AUDITORÍA DOMINICAL
      </Tag>
      <Label size={29} color={c.red} bold>
        Tu Patética Semana
      </Label>
      <Label color={c.muted}>
        Reporte de rendimiento, apatía y evasión quirúrgica.
      </Label>
      <Row>
        <Button variant="quiet" onPress={() => setOffset((o) => o - 1)}>
          ← Semana previa
        </Button>
        <Button
          variant="quiet"
          disabled={!offset}
          onPress={() => setOffset((o) => o + 1)}
        >
          Siguiente →
        </Button>
      </Row>
      <Tag>
        {from.toLocaleDateString("es-BO")} –{" "}
        {daysFrom(6, from).toLocaleDateString("es-BO")}
      </Tag>
      {!d && !r.error && <Loading />}
      {d && (
        <>
          <Card tone={c.dark}>
            <Label color="white" size={12}>
              TASA DE EVASIÓN ABSOLUTA
            </Label>
            <Label size={40} bold color={c.pink}>
              {planned.length ? avoidance + "%" : "Sin datos"}
            </Label>
            <Meter value={avoidance} color={c.red} />
            <Label color="white">
              {completed} completadas de {planned.length} · {Math.round(focus)}{" "}
              min de enfoque
            </Label>
          </Card>
          <Card tone={c.rose}>
            <Tag tone="white">S.A.R.C.A.S.M. AI</Tag>
            <Label size={18} bold>
              {d.quote ||
                "Todavía no hay un roast. Dale algo de trabajo a tu supervisor."}
            </Label>
            <Button
              disabled={a.busy}
              onPress={() =>
                a.run(async () => {
                  await api("/ai/chat", "POST", {
                    message:
                      "Haz un roast breve y útil sobre este reporte: " +
                      summary,
                  });
                  await r.refresh();
                })
              }
            >
              {a.busy ? "Preparando roast…" : "Pedir mi roast semanal"}
            </Button>
          </Card>
          <Card>
            <Section title="Mapa de Culpa Diario" />
            <Row style={{ justifyContent: "space-between" }}>
              {Array.from({ length: 7 }, (_, i) => {
                const day = daysFrom(i, from),
                  n = planned.filter(
                    (t) => t.completion_date?.slice(0, 10) === dateKey(day),
                  ).length;
                return (
                  <View key={i} style={{ alignItems: "center", gap: 4 }}>
                    <Label size={11}>
                      {["L", "M", "X", "J", "V", "S", "D"][i]}
                    </Label>
                    <Tag tone={n ? c.lime : c.rose}>{n}</Tag>
                  </View>
                );
              })}
            </Row>
            <Label size={12} color={c.muted}>
              Tareas completadas por día
            </Label>
          </Card>
          <Card>
            <Section title="No sufras en silencio" />
            <Button
              icon="share-variant-outline"
              onPress={() =>
                a.run(async () => {
                  await Share.share({ message: summary });
                })
              }
            >
              Compartir mi reporte
            </Button>
          </Card>
        </>
      )}
    </Page>
  );
}
