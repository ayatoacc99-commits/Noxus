import { useCallback, useEffect, useState } from "react";
import type { ActionResult, GangData, NearbyPlayer } from "./types";
import { fetchNui, notify } from "./lib/nui";
import "./App.css";

type Tab = "members" | "recruit" | "ranks";

export default function App() {
  const [data, setData] = useState<GangData | null>(null);
  const [nearby, setNearby] = useState<NearbyPlayer[]>([]);
  const [tab, setTab] = useState<Tab>("members");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
    payload: Record<string, unknown>,
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
          <p>Loading gang data...</p>
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>{gang.label}</h1>
        <p>
          {gang.gradeName}
          {gang.isboss ? " · Boss" : ""}
          {!data.canManage ? " · View only" : ""}
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
            <span>Your Rank</span>
            <strong>{gang.grade}</strong>
          </div>
        </div>

        <div className="refresh-bar">
          <button className="btn" onClick={loadGangData}>
            Refresh
          </button>
        </div>

        <div className="tabs">
          <button className={`tab ${tab === "members" ? "active" : ""}`} onClick={() => setTab("members")}>
            Members
          </button>
          {data.canManage && (
            <button className={`tab ${tab === "recruit" ? "active" : ""}`} onClick={() => setTab("recruit")}>
              Recruit
            </button>
          )}
          <button className={`tab ${tab === "ranks" ? "active" : ""}`} onClick={() => setTab("ranks")}>
            Ranks
          </button>
        </div>

        {tab === "members" && (
          <div className="member-list">
            {members.map((member) => {
              const isSelf = member.citizenid === data.playerCitizenId;
              const canAct = data.canManage && !isSelf && !member.isboss;

              return (
                <div className="member-card" key={member.citizenid}>
                  <div className="member-info">
                    <h3>
                      {member.name}
                      {isSelf ? " (You)" : ""}
                    </h3>
                    <div className="member-meta">
                      <span>{member.gradeName}</span>
                      <span>·</span>
                      <span className={`badge ${member.online ? "online" : "offline"}`}>
                        {member.online ? "Online" : "Offline"}
                      </span>
                      {member.isboss && <span className="badge boss">Boss</span>}
                    </div>
                  </div>

                  {canAct && (
                    <div className="member-actions">
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
          <div className="recruit-list">
            {nearby.length === 0 ? (
              <div className="empty-state">
                <p>No gangless players within 10 meters.</p>
                <button className="btn primary" onClick={loadNearby}>
                  Scan Again
                </button>
              </div>
            ) : (
              nearby.map((player) => (
                <div className="recruit-card" key={player.serverId}>
                  <div>
                    <h3>{player.name}</h3>
                    <p className="member-meta">{player.distance}m away</p>
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

        {tab === "ranks" && (
          <div className="grade-list">
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
