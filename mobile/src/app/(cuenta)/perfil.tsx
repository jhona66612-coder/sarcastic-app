import { useState } from "react";
import { View } from "react-native";
import { useSession } from "../../lib/session";
import { useResource, useAction } from "../../lib/data";
import { type User, type Experience } from "../../lib/api";
import {
  Button,
  Card,
  c,
  Field,
  Label,
  Loading,
  nav,
  Notice,
  Page,
  Row,
  Section,
  Tag,
} from "../../ui/kit";
type Item = {
  id: string;
  name: string;
  description: string;
  equipped: boolean;
  item_id: string;
};
type Catalog = { id: string; name: string; description: string };
async function load(api: ReturnType<typeof useSession>["api"]) {
  const [user, xp, streak, tokens, settings, items, catalog, awards] =
    await Promise.all([
      api<User>("/auth/me"),
      api<Experience>("/experience"),
      api<{ current_streak: number }>("/streaks"),
      api<{ available_tokens: number }>("/streak-tokens"),
      api<{ sarcasm_level: number }>("/users/me/settings"),
      api<Item[]>("/inventory"),
      api<Catalog[]>("/inventory-items"),
      api<Catalog[]>("/users/me/achievements"),
    ]);
  return { user, xp, streak, tokens, settings, items, catalog, awards };
}
export default function Profile() {
  const { api, leave } = useSession(),
    r = useResource(load),
    a = useAction(),
    d = r.data;
  const [edit, setEdit] = useState(false),
    [name, setName] = useState(""),
    [username, setUsername] = useState(""),
    [email, setEmail] = useState("");
  function change(job: () => Promise<unknown>) {
    return a.run(async () => {
      await job();
      await r.refresh();
    });
  }
  return (
    <Page title="Perfil y configuración" accessories={false}>
      <Notice error={r.error} retry={r.refresh} />
      <Notice error={a.error} />
      {!d && !r.error && <Loading />}
      {d && (
        <>
          <Card>
            <Row>
              <Label size={46}>🦥</Label>
              <View style={{ flex: 1 }}>
                <Label bold size={23}>
                  {d.user.name}
                </Label>
                <Label>@{d.user.username}</Label>
                <Tag tone={c.lime}>
                  NIV. {d.xp.level} · {d.xp.rank}
                </Tag>
              </View>
            </Row>
            <Row>
              <Tag>{d.streak.current_streak} días de racha</Tag>
              <Tag>{d.tokens.available_tokens} comodines</Tag>
              <Tag tone={c.rose}>{d.xp.experience_points} XP</Tag>
            </Row>
            <Button
              variant="quiet"
              onPress={() => {
                setName(d.user.name);
                setUsername(d.user.username);
                setEmail(d.user.email);
                setEdit(!edit);
              }}
            >
              {edit ? "Cancelar" : "Editar perfil"}
            </Button>
            {edit && (
              <>
                <Field label="Nombre" value={name} onChangeText={setName} />
                <Field
                  label="Usuario"
                  autoCapitalize="none"
                  value={username}
                  onChangeText={setUsername}
                />
                <Field
                  label="Correo"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
                <Button
                  disabled={
                    a.busy || !name.trim() || !username.trim() || !email.trim()
                  }
                  onPress={() =>
                    change(async () => {
                      await api("/users/me", "PUT", {
                        name: name.trim(),
                        username: username.trim(),
                        email: email.trim(),
                      });
                      setEdit(false);
                    })
                  }
                >
                  Guardar cambios
                </Button>
              </>
            )}
          </Card>
          <Card>
            <Section icon="hanger" title="Armario y Vergüenzas" />
            <Label size={12} color={c.muted}>
              Viste al perezoso con tus fracasos y pequeños logros.
            </Label>
            <Row>
              {d.catalog.map((item) => {
                const owned = d.items.find((i) => i.item_id === item.id);
                return (
                  <Card
                    key={item.id}
                    tone={owned ? c.lavender : "#F1F0F2"}
                    style={{ width: "47%" }}
                  >
                    <Tag>
                      {owned
                        ? owned.equipped
                          ? "EQUIPADO"
                          : "DISPONIBLE"
                        : "BLOQUEADO"}
                    </Tag>
                    <Label bold>{item.name}</Label>
                    <Label size={12}>{item.description}</Label>
                    {owned && (
                      <Button
                        variant="quiet"
                        disabled={a.busy}
                        onPress={() =>
                          change(() =>
                            api("/inventory/" + owned.id + "/equip", "PATCH", {
                              equipped: !owned.equipped,
                            }),
                          )
                        }
                      >
                        {owned.equipped ? "Quitar" : "Equipar"}
                      </Button>
                    )}
                  </Card>
                );
              })}
            </Row>
          </Card>
          <Card tone={c.dark}>
            <Label size={19} bold color="white">
              Agresividad IA
            </Label>
            <Label color={c.lime}>{d.settings.sarcasm_level}/10</Label>
            <Row>
              {(
                [
                  ["Suave", 0],
                  ["Moderado", 4],
                  ["Crudo", 8],
                  ["Sin filtro", 10],
                ] as const
              ).map(([label, value]) => (
                <Button
                  key={label}
                  disabled={a.busy}
                  variant={
                    d.settings.sarcasm_level === value ? "lime" : "quiet"
                  }
                  onPress={() =>
                    change(() =>
                      api("/users/me/settings", "PUT", {
                        sarcasm_level: value,
                      }),
                    )
                  }
                >
                  {label}
                </Button>
              ))}
            </Row>
          </Card>
          <Card>
            <Section icon="medal-outline" title="Mis logros" />
            {d.awards.length ? (
              d.awards.map((x) => (
                <Label key={x.id}>
                  {x.name} · {x.description}
                </Label>
              ))
            ) : (
              <Label color={c.muted}>
                Completa tu primera tarea o sesión de enfoque para desbloquear
                un logro.
              </Label>
            )}
          </Card>
          <Card>
            <Section icon="alarm" title="Zona de sanciones" />
            <Button variant="danger" onPress={() => nav("/alarma")}>
              Configurar alarma QR
            </Button>
            <Button variant="quiet" onPress={() => nav("/rachas")}>
              Pausa de piedad · Comodines
            </Button>
          </Card>
          <Button
            variant="quiet"
            disabled={a.busy}
            onPress={() => a.run(leave)}
          >
            Cerrar sesión
          </Button>
          <Button variant="quiet" onPress={() => nav("/inicio")}>
            Volver a Inicio
          </Button>
        </>
      )}
    </Page>
  );
}
