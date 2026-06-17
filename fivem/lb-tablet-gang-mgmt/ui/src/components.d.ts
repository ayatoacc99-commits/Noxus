type Settings = {
  display: {
    theme: "light" | "dark";
  };
};

type PopUp = {
  title: string;
  description?: string;
  buttons: {
    title: string;
    cb?: () => void;
    color?: "red" | "blue";
    bold?: boolean;
  }[];
};

type ContextMenu = {
  title?: string;
  buttons: {
    title: string;
    color?: "red" | "blue";
    disabled?: boolean;
    cb?: () => void;
  }[];
};

declare global {
  var resourceName: string;
  var appName: string;
  var settings: Settings;

  var closeApp: () => void;
  var setPopUp: (popUp: PopUp) => void;
  var setContextMenu: (contextMenu: ContextMenu) => void;
  var fetchNui: <T>(eventName: string, data?: unknown) => Promise<T>;
  var onNuiEvent: <T>(eventName: string, cb: (data: T) => void) => void;
}

export {};
