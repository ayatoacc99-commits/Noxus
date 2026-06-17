const devMode = !(window as Window & { invokeNative?: unknown }).invokeNative;

const mockGangData = {
  hasGang: true,
  canManage: true,
  gang: {
    name: "ballas",
    label: "Ballas",
    grade: 3,
    gradeName: "Boss",
    isboss: true,
  },
  grades: [
    { level: 0, name: "Recruit" },
    { level: 1, name: "Member" },
    { level: 2, name: "Lieutenant" },
    { level: 3, name: "Boss", isboss: true },
  ],
  members: [
    {
      citizenid: "ABC123",
      name: "John Doe",
      grade: 3,
      gradeName: "Boss",
      isboss: true,
      online: true,
      serverId: 1,
    },
    {
      citizenid: "DEF456",
      name: "Jane Smith",
      grade: 2,
      gradeName: "Lieutenant",
      isboss: false,
      online: true,
      serverId: 2,
    },
    {
      citizenid: "GHI789",
      name: "Mike Johnson",
      grade: 0,
      gradeName: "Recruit",
      isboss: false,
      online: false,
    },
  ],
  stats: { total: 3, online: 2 },
  playerCitizenId: "ABC123",
};

export async function fetchNui<T>(event: string, data?: unknown): Promise<T> {
  if (devMode) {
    await new Promise((resolve) => setTimeout(resolve, 200));

    if (event === "getGangData") return mockGangData as T;
    if (event === "getNearbyPlayers") {
      return {
        players: [
          { serverId: 5, name: "Alex Rivera", distance: 3 },
          { serverId: 8, name: "Sam Carter", distance: 7 },
        ],
      } as T;
    }
    if (event === "notify") return "ok" as T;
    return { success: true, message: "Done (dev mode)" } as T;
  }

  return globalThis.fetchNui<T>(event, data);
}

export function notify(message: string, type: "success" | "error" | "primary" = "primary") {
  if (devMode) {
    console.log(`[notify:${type}]`, message);
    return;
  }

  fetchNui("notify", { message, type });
}

export { devMode };
