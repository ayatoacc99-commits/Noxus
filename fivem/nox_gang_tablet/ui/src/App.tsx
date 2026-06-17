import { useCallback, useEffect, useState } from "react";
import type { ActionResult, GangData, NearbyPlayer } from "./types";
import { fetchNui, formatMoney, notify } from "./lib/nui";

type Tab = "members" | "recruit" | "treasury" | "stash" | "ranks";

export default function App() {
  const [data, setData] = useState<GangData | null>(null);
  const [nearby, setNearby] = useState<NearbyPlayer[]>([]);
  const [tab, setTab] = useState<Tab>("members");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [amount, setAmount] = useState("1000");
  const [accountType, setAccountType] = useState<"cash" | "bank">("cash");

  const loadGangData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchNui<GangData>("getGangData");
      setData(result);
    } catch (error) {
      console.error(error);
      setData({ hasGang: false, message: "Failed to load gang data" });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadNearby = useCallback(async () => {
    const result = await fetchNui<{ players: NearbyPlayer[] }>("getNearbyPlayers");
    setNearby(result.players || []);
  }, []);

  useEffect(() => {
    loadGangData();
  }, [loadGangData]);

  useEffect(() => {
    const refresh = () => loadGangData();
    globalThis.onNuiEvent?.("gangUpdated", refresh);
    globalThis.onNuiEvent?.("appOpened", refresh);
  }, [loadGangData]);

  useEffect(() => {
    if (tab === "recruit" && data?.canManage) {
      loadNearby();
    }
  }, [tab, data?.canManage, loadNearby]);

  const runAction = async (
    key: string,
    event: string,
    payload?: Record<string, unknown>,
    confirm?: { title: string; description: string }
  ) => {
    const execute = async () => {
      setActionLoading(key);
      try {
        const result = await fetchNui<ActionResult>(event, payload);
        notify(result.message, result.success ? "success" : "error");
        if (result.success) {
          await loadGangData();
          if (tab === "recruit") await loadNearby();
        }
      } finally {
        setActionLoading(null);
      }
    };

    if (confirm && globalThis.setPopUp) {
      globalThis.setPopUp({
        title: confirm.title,
        description: confirm.description,
        buttons: [
          { title: "Cancel" },
          { title: "Confirm", color: "blue", bold: true, cb: execute },
        ],
      });
      return;
    }

    await execute();
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading-state">
          <p>Loading gang hub...</p>
        </div>
      </div>
    );
  }

  if (!data?.hasGang) {
    return (
      <div className="app">
        <div className="empty-state">
          <h2>No Gang</h2>
          <p>{data?.message || "You are not currently part of a gang."}</p>
        </div>
      </div>
    );
  }

  const gang = data.gang!;
  const members = data.members || [];
  const stats = data.stats || { total: members.length, online: 0 };
  const treasury = data.treasury;
  const stash = data.stash;

  return (
    <div className="app">
      <header className="app-header">
        <h1>{gang.label}</h1>
        <p>
          {gang.gradeName}
          {gang.isboss ? " · Boss" : ""}
        </p>
      </header>

      <div className="app-content">
        <div className="stats-grid">
          <div className="stat-card">
            <span>Members</span>
            <strong>{stats.total}</strong>
          </div>
          <div className="stat-card">
            <span>Online</span>
            <strong>{stats.online}</strong>
          </div>
          <div className="stat-card">
            <span>Treasury</span>
            <strong>{formatMoney(treasury?.balance || 0)}</strong>
          </div>
        </div>

        <div className="toolbar">
          <div className="tabs">
            <button className={`tab ${tab === "members" ? "active" : ""}`} onClick={() => setTab("members")}>
              Members
            </button>
            {data.canManage && (
              <button className={`tab ${tab === "recruit" ? "active" : ""}`} onClick={() => setTab("recruit")}>
                Recruit
              </button>
            )}
            {treasury && (
              <button className={`tab ${tab === "treasury" ? "active" : ""}`} onClick={() => setTab("treasury")}>
                Treasury
              </button>
            )}
            {stash && (
              <button className={`tab ${tab === "stash" ? "active" : ""}`} onClick={() => setTab("stash")}>
                Stash
              </button>
            )}
            <button className={`tab ${tab === "ranks" ? "active" : ""}`} onClick={() => setTab("ranks")}>
              Ranks
            </button>
          </div>
          <button className="btn" onClick={loadGangData}>
            Refresh
          </button>
        </div>

        {tab === "members" && (
          <div className="list">
            {members.map((member) => {
              const isSelf = member.citizenid === data.playerCitizenId;
              const canAct = data.canManage && !isSelf && !member.isboss;

              return (
                <div className="row-card" key={member.citizenid}>
                  <div>
                    <h3>
                      {member.name}
                      {isSelf ? " (You)" : ""}
                    </h3>
                    <div className="meta">
                      <span>{member.gradeName}</span>
                      <span>·</span>
                      <span className={`badge ${member.online ? "online" : "offline"}`}>
                        {member.online ? "Online" : "Offline"}
                      </span>
                      {member.isboss && <span className="badge boss">Boss</span>}
                    </div>
                  </div>

                  {canAct && (
                    <div className="actions">
                      <button
                        className="btn"
                        disabled={actionLoading === `promote-${member.citizenid}`}
                        onClick={() =>
                          runAction(`promote-${member.citizenid}`, "promoteMember", {
                            citizenid: member.citizenid,
                          })
                        }
                      >
                        Promote
                      </button>
                      <button
                        className="btn"
                        disabled={actionLoading === `demote-${member.citizenid}`}
                        onClick={() =>
                          runAction(`demote-${member.citizenid}`, "demoteMember", {
                            citizenid: member.citizenid,
                          })
                        }
                      >
                        Demote
                      </button>
                      <button
                        className="btn danger"
                        disabled={actionLoading === `kick-${member.citizenid}`}
                        onClick={() =>
                          runAction(
                            `kick-${member.citizenid}`,
                            "kickMember",
                            { citizenid: member.citizenid },
                            {
                              title: "Remove Member",
                              description: `Remove ${member.name} from ${gang.label}?`,
                            }
                          )
                        }
                      >
                        Kick
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === "recruit" && data.canManage && (
          <div className="list">
            {nearby.length === 0 ? (
              <div className="empty-state">
                <p>No gangless players nearby.</p>
                <button className="btn primary" onClick={loadNearby}>
                  Scan Again
                </button>
              </div>
            ) : (
              nearby.map((player) => (
                <div className="row-card" key={player.serverId}>
                  <div>
                    <h3>{player.name}</h3>
                    <p className="meta">{player.distance}m away</p>
                  </div>
                  <button
                    className="btn primary"
                    disabled={actionLoading === `invite-${player.serverId}`}
                    onClick={() =>
                      runAction(
                        `invite-${player.serverId}`,
                        "invitePlayer",
                        { serverId: player.serverId },
                        {
                          title: "Recruit Player",
                          description: `Recruit ${player.name} to ${gang.label}?`,
                        }
                      )
                    }
                  >
                    Recruit
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "treasury" && treasury && (
          <div className="panel">
            <h2>Gang Treasury</h2>
            <div className="balance">{formatMoney(treasury.balance)}</div>

            <div className="form-grid">
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount"
              />
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as "cash" | "bank")}
              >
                {treasury.allowCash && <option value="cash">Cash</option>}
                {treasury.allowBank && <option value="bank">Bank</option>}
              </select>
              <button
                className="btn primary"
                disabled={!treasury.canDeposit || actionLoading === "deposit"}
                onClick={() =>
                  runAction("deposit", "depositTreasury", {
                    amount: Number(amount),
                    accountType,
                  })
                }
              >
                Deposit
              </button>
            </div>

            {treasury.canWithdraw ? (
              <button
                className="btn"
                disabled={actionLoading === "withdraw"}
                onClick={() =>
                  runAction(
                    "withdraw",
                    "withdrawTreasury",
                    { amount: Number(amount), accountType },
                    {
                      title: "Withdraw Funds",
                      description: `Withdraw $${amount} from ${gang.label} treasury?`,
                    }
                  )
                }
              >
                Withdraw
              </button>
            ) : (
              <p className="hint">Only leadership can withdraw from the treasury.</p>
            )}
          </div>
        )}

        {tab === "stash" && stash && (
          <div className="panel">
            <h2>Gang Stash</h2>
            <div className="stash-meta">
              <div>
                <span>Slots</span>
                <strong>{stash.slots}</strong>
              </div>
              <div>
                <span>Max Weight</span>
                <strong>{stash.maxWeight.toLocaleString()}</strong>
              </div>
            </div>
            {stash.canAccess ? (
              <button
                className="btn primary"
                disabled={actionLoading === "stash"}
                onClick={() => runAction("stash", "openStash")}
              >
                Open Stash
              </button>
            ) : (
              <p className="hint">Your rank cannot access the gang stash.</p>
            )}
          </div>
        )}

        {tab === "ranks" && (
          <div className="list">
            {(data.grades || []).map((grade) => (
              <div className="grade-row" key={grade.level}>
                <span>
                  Level {grade.level} · {grade.name}
                </span>
                <span>{grade.isboss ? "Boss rank" : "Member rank"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
