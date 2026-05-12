'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export interface AppCommand {
  target: 'map' | 'match' | 'manage';
  action: string;
  payload: Record<string, any>;
}

interface AppCommandContextValue {
  lastCommand: AppCommand | null;
  dispatch: (cmd: AppCommand) => void;
}

const AppCommandContext = createContext<AppCommandContextValue>({
  lastCommand: null,
  dispatch: () => {},
});

export function AppCommandProvider({ children }: { children: React.ReactNode }) {
  const [lastCommand, setLastCommand] = useState<AppCommand | null>(null);

  const dispatch = useCallback((cmd: AppCommand) => {
    setLastCommand(cmd);
  }, []);

  return (
    <AppCommandContext.Provider value={{ lastCommand, dispatch }}>
      {children}
    </AppCommandContext.Provider>
  );
}

export function useAppCommand(target: string, handler: (cmd: AppCommand) => void) {
  const { lastCommand, dispatch } = useContext(AppCommandContext);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (lastCommand && lastCommand.target === target) {
      handlerRef.current(lastCommand);
      dispatch({ ...lastCommand, action: '__handled__' });
    }
  }, [lastCommand, target, dispatch]);
}

export function useAppCommandDispatch() {
  return useContext(AppCommandContext).dispatch;
}
