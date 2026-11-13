import { useState } from "react";
import { Redirect, type Href } from "expo-router";
import { View } from "react-native";
import { request, type User } from "../lib/api";
import { useSession } from "../lib/session";
import { useAction } from "../lib/data";
import {
  Button,
  Card,
  c,
  Field,
  Icon,
  Label,
  Loading,
  Notice,
  Page,
  Row,
  Tag,
} from "../ui/kit";
const benefits = [
  [
    "robot-outline",
    "IA tóxica con cero empatía",
    "SlothBot examina tus excusas y te ayuda a empezar.",
  ],
  [
    "qrcode-scan",
    "Alarma QR",
    "Escanea tu código para registrar que te levantaste.",
  ],
  [
    "sword-cross",
    "Duelos de productividad",
    "Reta a tus amigos y compara su progreso.",
  ],
] as const;
export default function Welcome() {
  const { session, enter, loading, error, retry } = useSession();
  const [mode, setMode] = useState<"welcome" | "login" | "register">("welcome");
  const [name, setName] = useState(""),
    [username, setUsername] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  const action = useAction();
  if (loading) return <Loading />;
  if (error)
    return (
      <Page title="Sesión" header={false}>
        <Notice error={error} retry={retry} />
      </Page>
    );
  if (session) return <Redirect href={"/inicio" as Href} />;
  const register = mode === "register";
  const submit = () =>
    action.run(async () => {
      const body = register
        ? {
            name: name.trim(),
            username: username.trim(),
            email: email.trim(),
            password,
          }
        : { email: email.trim(), password };
      const s = await request<{ token: string; user: User }>(
        "/auth/" + (register ? "register" : "login"),
        "",
        "POST",
        body,
      );
      await enter(s);
      setPassword("");
    });
  return (
    <Page title="Bienvenida" header={false}>
      <Tag tone={c.rose} color={c.red}>
        ⚠ ADVERTENCIA · DAÑO AL EGO REVERSIBLE
      </Tag>
      <Card
        tone={c.lavender}
        style={{ alignItems: "center", paddingVertical: 24 }}
      >
        <View
          style={{
            width: 78,
            height: 78,
            borderRadius: 40,
            backgroundColor: c.dark,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Label size={45}>🦥</Label>
        </View>
        <Tag tone={c.dark} color={c.lime}>
          SLOTHBOT · 0% PIEDAD
        </Tag>
        <Label size={13}>Tu peor pesadilla con una lista de pendientes.</Label>
      </Card>
      {mode === "welcome" ? (
        <>
          <View>
            <Label size={31} bold>
              Deja de mentirte.
            </Label>
            <Label size={31} color={c.purple} bold>
              Sé productivo a la fuerza.
            </Label>
          </View>
          <Label color={c.muted}>
            La única app de productividad que destruye tus excusas y expone tus
            trampas con sarcasmo.
          </Label>
          <Card>
            {benefits.map(([icon, title, description], i) => (
              <Row key={title}>
                <View
                  style={{
                    backgroundColor: [c.dark, c.lavender, c.lime][i],
                    padding: 9,
                    borderRadius: 9,
                  }}
                >
                  <Icon name={icon} color={i === 0 ? "white" : c.ink} />
                </View>
                <View style={{ flex: 1 }}>
                  <Label bold>{title}</Label>
                  <Label size={12} color={c.muted}>
                    {description}
                  </Label>
                </View>
              </Row>
            ))}
          </Card>
          <Button onPress={() => setMode("register")}>
            Aceptar el castigo (Empezar) ⚡
          </Button>
          <Button variant="quiet" onPress={() => setMode("login")}>
            Ya tengo cuenta y pocas esperanzas
          </Button>
        </>
      ) : (
        <Card>
          <Label size={23} bold>
            {register ? "Crear mi cuenta" : "Iniciar sesión"}
          </Label>
          {register && (
            <>
              <Field label="Nombre" value={name} onChangeText={setName} />
              <Field
                label="Nombre de usuario"
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
              />
            </>
          )}
          <Field
            label={
              register ? "Correo electrónico" : "Correo o nombre de usuario"
            }
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType={register ? "email-address" : "default"}
            value={email}
            onChangeText={setEmail}
          />
          <Field
            label="Contraseña"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={() => {
              if (
                email.trim() &&
                password &&
                (!register ||
                  (name.trim() && username.trim() && password.length >= 6))
              )
                void submit();
            }}
          />
          {register && (
            <Label size={12} color={c.muted}>
              Usa al menos 6 caracteres.
            </Label>
          )}
          <Notice error={action.error} />
          <Button
            disabled={
              action.busy ||
              !email.trim() ||
              !password ||
              (register &&
                (!name.trim() || !username.trim() || password.length < 6))
            }
            onPress={submit}
          >
            {action.busy ? "Conectando…" : register ? "Registrarme" : "Entrar"}
          </Button>
          <Button variant="quiet" onPress={() => setMode("welcome")}>
            Volver
          </Button>
        </Card>
      )}
    </Page>
  );
}
