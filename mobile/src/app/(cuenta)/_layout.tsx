import { Redirect, Stack } from "expo-router";
import { useSession } from "../../lib/session";
import { Loading } from "../../ui/kit";
import { View } from "react-native";
import { SlothAssistant } from "../../ui/SlothAssistant";
export default function ProtectedLayout() {
  const { session, loading } = useSession();
  if (loading) return <Loading />;
  if (!session) return <Redirect href="/" />;
  return <View style={{ flex: 1 }}><Stack screenOptions={{ headerShown: false }} /><SlothAssistant key={session.user.id} /></View>;
}
