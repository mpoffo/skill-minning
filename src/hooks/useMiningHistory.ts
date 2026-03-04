import { useState, useCallback } from "react";

export interface MiningHistoryEntry {
  id: string;
  createdAt: string;
  mode: "traditional" | "ai";
  // Traditional mode
  jobName?: string;
  requiredSkills?: { name: string; proficiency: number }[];
  rankedUsers?: any[];
  // AI mode
  aiQuery?: string;
  aiResult?: any;
}

const HISTORY_KEY = "talent-mining-history";
const MAX_ENTRIES = 20;

function loadHistory(): MiningHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: MiningHistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
}

export function useMiningHistory() {
  const [history, setHistory] = useState<MiningHistoryEntry[]>(loadHistory);

  const addEntry = useCallback((entry: Omit<MiningHistoryEntry, "id" | "createdAt">) => {
    const newEntry: MiningHistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setHistory((prev) => {
      const updated = [newEntry, ...prev].slice(0, MAX_ENTRIES);
      saveHistory(updated);
      return updated;
    });
    return newEntry.id;
  }, []);

  const removeEntry = useCallback((id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      saveHistory(updated);
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  }, []);

  return { history, addEntry, removeEntry, clearHistory };
}
