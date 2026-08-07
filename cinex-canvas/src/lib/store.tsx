import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type {
  PortfolioCategory,
  PortfolioItem,
  Role,
  Transaction,
  User,
} from "./cinex-types";
import {
  createDataSource,
  SEED_SNAPSHOT,
  type DataSource,
  type StoreSnapshot,
} from "./data-source";

interface StoreShape extends StoreSnapshot {
  hydrated: boolean;
}

interface StoreApi extends StoreShape {
  isAuthenticated: boolean;
  register: (data: { name: string; email: string; role: Role }) => Promise<boolean>;
  login: (email: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (patch: Partial<User>) => void;
  addPortfolioItem: (item: Omit<PortfolioItem, "id">) => void;
  updatePortfolioItem: (id: string, item: Omit<PortfolioItem, "id">) => void;
  deletePortfolioItem: (id: string) => void;
  addCampaign: (data: {
    title: string;
    description: string;
    fundingTarget: number;
    mediaUrl?: string;
    category: PortfolioCategory | "";
    milestones: { description: string; amount: number }[];
  }) => string;
  contribute: (campaignId: string, amount: number) => boolean;
  voteMilestone: (campaignId: string, milestoneId: string, vote: "yes" | "no") => boolean;
  addTransaction: (t: Omit<Transaction, "id" | "timestamp">) => void;
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<StoreSnapshot>(SEED_SNAPSHOT);
  const [hydrated, setHydrated] = useState(false);

  const sourceRef = useRef<DataSource | null>(null);
  if (sourceRef.current === null) {
    sourceRef.current = createDataSource();
  }

  useEffect(() => {
    const source = sourceRef.current!;
    const unsubscribe = source.subscribe(() => setSnapshot(source.getSnapshot()));
    let cancelled = false;
    Promise.resolve(source.hydrate()).finally(() => {
      if (cancelled) return;
      setSnapshot(source.getSnapshot());
      setHydrated(true);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const api = useMemo<StoreApi>(() => {
    const source = sourceRef.current!;
    return {
      ...snapshot,
      hydrated,
      isAuthenticated: !!snapshot.user,
      register: (data) => source.register(data),
      login: (email) => source.login(email),
      logout: () => source.logout(),
      updateUser: (patch) => source.updateUser(patch),
      addPortfolioItem: (item) => source.addPortfolioItem(item),
      updatePortfolioItem: (id, item) => source.updatePortfolioItem(id, item),
      deletePortfolioItem: (id) => source.deletePortfolioItem(id),
      addCampaign: (data) => source.addCampaign(data),
      contribute: (campaignId, amount) => source.contribute(campaignId, amount),
      voteMilestone: (campaignId, milestoneId, vote) =>
        source.voteMilestone(campaignId, milestoneId, vote),
      addTransaction: (t) => source.addTransaction(t),
    };
  }, [snapshot, hydrated]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
