/// <reference types="vite/client" />

interface Window {
  taskbarNova?: {
    loadSave(): Promise<unknown>;
    writeSave(data: unknown): Promise<boolean>;
    setAlwaysOnTop(enabled: boolean): Promise<void>;
    setOpacity(opacity: number): Promise<void>;
    collapse(collapsed: boolean): Promise<void>;
    toggleClickThrough(): Promise<boolean>;
    onClickThroughChanged(listener: (enabled: boolean) => void): () => void;
    minimize(): Promise<void>;
    close(): Promise<void>;
  };
}
