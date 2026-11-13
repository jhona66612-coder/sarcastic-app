import { Tabs } from "expo-router";
import { c, Icon, type Glyph } from "../../../ui/kit";
const screens: [string, string, Glyph][] = [
  ["inicio", "Inicio", "home-outline"],
  ["agenda", "Agenda", "calendar-month-outline"],
  ["rachas", "Rachas", "fire"],
  ["roast", "Roast", "emoticon-devil-outline"],
  ["social", "Social", "account-group-outline"],
];
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: c.plum, borderTopWidth: 0 },
        tabBarActiveTintColor: c.lime,
        tabBarInactiveTintColor: "#D8CCDF",
        tabBarHideOnKeyboard: true,
      }}
    >
      {screens.map(([name, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ focused }) => <Icon name={icon} color={focused ? c.lime : "#D8CCDF"} />,
          }}
        />
      ))}
    </Tabs>
  );
}
