export type GangGrade = {
  level: number;
  name: string;
  isboss?: boolean;
};

export type GangMember = {
  citizenid: string;
  name: string;
  grade: number;
  gradeName: string;
  isboss: boolean;
  online: boolean;
  serverId?: number;
};

export type TreasuryInfo = {
  balance: number;
  canDeposit: boolean;
  canWithdraw: boolean;
  allowCash: boolean;
  allowBank: boolean;
};

export type StashInfo = {
  id: string;
  slots: number;
  maxWeight: number;
  canAccess: boolean;
};

export type GangData = {
  hasGang: boolean;
  canManage?: boolean;
  canWithdraw?: boolean;
  canAccessStash?: boolean;
  message?: string;
  gang?: {
    name: string;
    label: string;
    grade: number;
    gradeName: string;
    isboss: boolean;
  };
  grades?: GangGrade[];
  members?: GangMember[];
  stats?: {
    total: number;
    online: number;
  };
  treasury?: TreasuryInfo | null;
  stash?: StashInfo;
  playerCitizenId?: string;
};

export type NearbyPlayer = {
  serverId: number;
  name: string;
  distance: number;
};

export type ActionResult = {
  success: boolean;
  message: string;
  balance?: number;
};
