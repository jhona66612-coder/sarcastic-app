import type { ComponentProps, PropsWithChildren, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
export const c = {
  ink: "#24152F",
  muted: "#625969",
  plum: "#40294F",
  dark: "#271434",
  purple: "#7946AE",
  lime: "#BCF339",
  red: "#B41F21",
  pink: "#F854A7",
  paper: "#F7F8FA",
  lavender: "#EFE5FD",
  rose: "#FFE1DD",
  sand: "#FFF3D4",
};
export type Glyph = ComponentProps<typeof MaterialCommunityIcons>["name"];
export const nav = (path: string) => router.push(path as Href);
export function Icon({
  name,
  size = 21,
  color = c.ink,
}: {
  name: Glyph;
  size?: number;
  color?: string;
}) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}
export function Label({
  children,
  size = 15,
  color = c.ink,
  bold = false,
  style,
}: PropsWithChildren<{
  size?: number;
  color?: string;
  bold?: boolean;
  style?: TextStyle;
}>) {
  return (
    <Text
      style={[
        {
          fontSize: size,
          lineHeight: Math.ceil(size * 1.32),
          color,
          fontWeight: bold ? "700" : "400",
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Row({
  children,
  style,
}: PropsWithChildren<{ style?: ViewStyle }>) {
  return <View style={[s.row, style]}>{children}</View>;
}
export function Card({
  children,
  tone = "white",
  style,
}: PropsWithChildren<{ tone?: string; style?: ViewStyle }>) {
  return (
    <View style={[s.card, { backgroundColor: tone }, style]}>{children}</View>
  );
}
export function Tag({
  children,
  tone = c.lavender,
  color = c.plum,
}: PropsWithChildren<{ tone?: string; color?: string }>) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 3,
        backgroundColor: tone,
      }}
    >
      <Label size={10} bold color={color}>
        {children}
      </Label>
    </View>
  );
}
export function Button({
  children,
  onPress,
  variant = "primary",
  disabled = false,
  icon,
}: PropsWithChildren<{
  onPress: () => void;
  variant?: "primary" | "dark" | "lime" | "quiet" | "danger";
  disabled?: boolean;
  icon?: Glyph;
}>) {
  const bg = {
    primary: c.purple,
    dark: c.dark,
    lime: c.lime,
    quiet: c.lavender,
    danger: c.red,
  }[variant];
  const fg = variant === "quiet" || variant === "lime" ? c.ink : "#fff";
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        { backgroundColor: bg, opacity: disabled ? 0.48 : pressed ? 0.78 : 1 },
      ]}
    >
      {icon && <Icon name={icon} color={fg} size={18} />}
      <Label size={14} color={fg} bold>
        {children}
      </Label>
    </Pressable>
  );
}
export function Field({
  label,
  ...props
}: ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={{ gap: 5 }}>
      <Label size={12} bold>
        {label}
      </Label>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor="#776D7D"
        style={[s.input, props.style]}
      />
    </View>
  );
}
export function Meter({
  value,
  color = c.purple,
}: {
  value: number;
  color?: string;
}) {
  return (
    <View style={s.track}>
      <View
        style={{
          height: 7,
          width: `${Math.min(100, Math.max(0, value))}%`,
          backgroundColor: color,
        }}
      />
    </View>
  );
}
export function Notice({
  error,
  retry,
}: {
  error?: string;
  retry?: () => void;
}) {
  return error ? (
    <Card tone={c.rose}>
      <Text accessibilityRole="alert" style={{ color: c.red }}>
        {error}
      </Text>
      {retry && (
        <Button variant="quiet" onPress={retry}>
          Reintentar
        </Button>
      )}
    </Card>
  ) : null;
}
export function Loading() {
  return (
    <ActivityIndicator
      accessibilityLabel="Cargando"
      color={c.purple}
      style={{ margin: 24 }}
    />
  );
}
export function IconLink({
  icon,
  label,
  onPress,
}: {
  icon: Glyph;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={s.iconLink}
    >
      <Icon name={icon} color="#FFF" />
    </Pressable>
  );
}
export function Page({
  title,
  children,
  subtitle,
  header = true,
  accessories = true,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  header?: boolean;
  accessories?: boolean;
}>) {
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: header ? c.plum : c.paper }}
    >
      {header && (
        <View style={s.head}>
          <View style={{ flex: 1 }}>
            <Label color="#FFF" size={18} bold>
              {title}
            </Label>
            {subtitle && (
              <Label color={c.lime} size={11}>
                {subtitle}
              </Label>
            )}
          </View>
          {accessories && (
            <>
              <IconLink
                icon="bell-outline"
                label="Notificaciones"
                onPress={() => nav("/notificaciones")}
              />
              <IconLink
                icon="account-circle-outline"
                label="Perfil y configuración"
                onPress={() => nav("/perfil")}
              />
            </>
          )}
        </View>
      )}
      <ScrollView
        style={{ backgroundColor: c.paper }}
        contentContainerStyle={s.page}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function Section({
  icon,
  title,
  side,
}: {
  icon?: Glyph;
  title: string;
  side?: ReactNode;
}) {
  return (
    <Row>
      <View
        style={{ flex: 1, flexDirection: "row", gap: 8, alignItems: "center" }}
      >
        {icon && <Icon name={icon} color={c.purple} />}
        <Label size={17} bold>
          {title}
        </Label>
      </View>
      {side}
    </Row>
  );
}
const s = StyleSheet.create({
  page: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
    width: "100%",
    maxWidth: 580,
    alignSelf: "center",
    flexGrow: 1,
  },
  head: {
    backgroundColor: c.plum,
    paddingHorizontal: 16,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  card: {
    padding: 16,
    borderRadius: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "#2612330C",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 13,
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: 10,
    gap: 7,
  },
  iconLink: {
    height: 44,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    minHeight: 45,
    borderWidth: 1,
    borderColor: "#C6BDCD",
    backgroundColor: "white",
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: c.ink,
    fontSize: 16,
  },
  track: {
    height: 7,
    backgroundColor: "#DDD5E2",
    borderRadius: 9,
    overflow: "hidden",
  },
});
