'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';

export type WorkspaceType = 'semijoias' | 'casa_itauna';

interface WorkspaceContextValue {
  workspace: WorkspaceType;
  setWorkspace: (ws: WorkspaceType) => void;
  toggleWorkspace: () => void;
  isCasaItauna: boolean;
  isSemijoias: boolean;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
}

const WorkspaceContext = React.createContext<WorkspaceContextValue | undefined>(undefined);

const COOKIE_NAME = 'gestao_workspace';

export function WorkspaceProvider({
  children,
  initialWorkspace = 'semijoias',
}: {
  children: React.ReactNode;
  initialWorkspace?: WorkspaceType;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [workspace, setWorkspaceState] = React.useState<WorkspaceType>(initialWorkspace);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Determina se a rota atual é da Casa Itaúna
  const isItaunaRoute = pathname.startsWith('/itauna');

  // Inicializa a partir de cookie ou URL no primeiro carregamento
  React.useEffect(() => {
    if (isItaunaRoute && workspace !== 'casa_itauna') {
      setWorkspaceState('casa_itauna');
      return;
    }

    const saved = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${COOKIE_NAME}=`))
      ?.split('=')[1] as WorkspaceType | undefined;

    if (saved === 'casa_itauna' || saved === 'semijoias') {
      setWorkspaceState(saved);
    }
  }, [isItaunaRoute, workspace]);

  // Aplica classe CSS de tema no HTML com transição suave
  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-semijoias', 'theme-casa-itauna');
    root.classList.add(`theme-${workspace}`);
    document.cookie = `${COOKIE_NAME}=${workspace}; path=/; max-age=31536000; SameSite=Lax`;
  }, [workspace]);

  const setWorkspace = React.useCallback(
    (nextWs: WorkspaceType) => {
      setWorkspaceState(nextWs);
      document.cookie = `${COOKIE_NAME}=${nextWs}; path=/; max-age=31536000; SameSite=Lax`;

      // Redireciona para o dashboard correto de acordo com a gestão selecionada
      if (nextWs === 'casa_itauna' && !pathname.startsWith('/itauna')) {
        router.push('/itauna');
      } else if (nextWs === 'semijoias' && pathname.startsWith('/itauna')) {
        router.push('/');
      }
    },
    [pathname, router]
  );

  const toggleWorkspace = React.useCallback(() => {
    setWorkspace(workspace === 'semijoias' ? 'casa_itauna' : 'semijoias');
  }, [workspace, setWorkspace]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        setWorkspace,
        toggleWorkspace,
        isCasaItauna: workspace === 'casa_itauna',
        isSemijoias: workspace === 'semijoias',
        isModalOpen,
        setIsModalOpen,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = React.useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace deve ser utilizado dentro de um WorkspaceProvider');
  }
  return context;
}
