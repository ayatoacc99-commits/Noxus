const devMode = !(window as Window & { invokeNative?: unknown }).invokeNative;

const mockGangData = {
  hasGang: true,
  canManage: true,
  canWithdraw: true,
  canAccessStash: true,
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
  ],
  stats: { total: 2, online: 2 },
  treasury: {
    balance: 125000,
    canDeposit: true,
    canWithdraw: true,
    allowCash: true,
    allowBank: true,
  },
  stash: {
    id: "nox_gang_ballas",
    slots: 50,
    maxWeight: 100000,
    canAccess: true,
  },
  playerCitizenId: "ABC123",
};

export async function fetchNui<T>(event: string, data?: unknown): Promise<T> {
  if (devMode) {
    await new Promise((resolve) => setTimeout(resolve, 180));

    if (event === "getGangData") return mockGangData as T;
    if (event === "getNearbyPlayers") {
      return {
        players: [{ serverId: 5, name: "Alex Rivera", distance: 4 }],
      } as T;
    }
    if (event === "notify") return "ok" as T;
    if (event === "openStash") return { success: true, message: "Stash opened (dev)" } as T;
    return { success: true, message: "Done (dev mode)", balance: 130000 } as T;
  }

  return globalThis.fetchNui<T>(event, data);
}

export function notify(message: string, type: "success" | "error" | "inform" = "inform") {
  if (devMode) {
    console.log(`[notify:${type}]`, message);
    return;
  }

  fetchNui("notify", { message, type });
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export { devMode };
