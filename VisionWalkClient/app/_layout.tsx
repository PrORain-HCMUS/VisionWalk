import { Stack } from "expo-router";
import { SQLiteDatabase, SQLiteProvider } from "expo-sqlite";



async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const DATABASE_VERSION = 1
  let result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentDbVersion = result ? result.user_version : 0;

  if (currentDbVersion >= DATABASE_VERSION) return;

  if (currentDbVersion === 0) {
    await db.execAsync(`
          PRAGMA journal_mode = 'wal';
          CREATE TABLE history (
              id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
              imgUrl TEXT NOT NULL,
              text TEXT NOT NULL,
              audiobase64 TEXT NOT NULL
          )
      `)

    currentDbVersion = 1

    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  }
}
export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="visionwalk.db" onInit={migrateDbIfNeeded}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false, title: "Home" }} />

        <Stack.Screen name="routeTracking" options={{ headerShown: false, title: "Route Tracking" }} />

        <Stack.Screen name="userData" options={{ headerShown: false, title: "User Data" }} />

        <Stack.Screen name="editProfile" options={{ headerShown: false, title: "Edit Profile" }} />
      </Stack>
    </SQLiteProvider>
  )
}
