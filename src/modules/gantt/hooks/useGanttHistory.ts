"use client";

import { useRef, useState, useCallback } from "react";

export interface HistoryAction {
  description: string;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

export function useGanttHistory() {
  const past = useRef<HistoryAction[]>([]);
  const future = useRef<HistoryAction[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const push = useCallback((action: HistoryAction) => {
    past.current.push(action);
    future.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const undo = useCallback(async () => {
    const action = past.current.pop();
    if (!action) return;
    await action.undo();
    future.current.push(action);
    setCanUndo(past.current.length > 0);
    setCanRedo(true);
  }, []);

  const redo = useCallback(async () => {
    const action = future.current.pop();
    if (!action) return;
    await action.redo();
    past.current.push(action);
    setCanUndo(true);
    setCanRedo(future.current.length > 0);
  }, []);

  return { push, undo, redo, canUndo, canRedo };
}
