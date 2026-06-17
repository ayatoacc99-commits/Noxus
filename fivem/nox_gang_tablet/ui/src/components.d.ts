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

declare global {
  var settings: Settings;
  var setPopUp: (popUp: PopUp) => void;
  var fetchNui: <T>(eventName: string, data?: unknown) => Promise<T>;
  var onNuiEvent: <T>(eventName: string, cb: (data: T) => void) => void;
}

export {};
