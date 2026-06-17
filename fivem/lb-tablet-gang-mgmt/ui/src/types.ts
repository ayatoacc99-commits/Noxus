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

export type GangData = {
  hasGang: boolean;
  canManage?: boolean;
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
};
