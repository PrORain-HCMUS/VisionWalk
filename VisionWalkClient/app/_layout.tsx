import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false, title: "Home" }} />

      <Stack.Screen name="routeTracking" options={{ headerShown: false, title: "Route Tracking" }} />

      <Stack.Screen name="userData" options={{ headerShown: false, title: "User Data" }} />
    </Stack>
  )
}
