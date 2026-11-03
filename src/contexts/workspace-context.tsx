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
}: {
  children: React.ReactNode;
  initialWorkspace?: WorkspaceType;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // A rota é a fonte única da verdade: evita race condition, desincronia e loop
  const isCasaItauna = pathname.startsWith('/itauna');
  const workspace: WorkspaceType = isCasaItauna ? 'casa_itauna' : 'semijoias';

  // Sincroniza classes no elemento raiz HTML e cookie conforme a rota atual
  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-semijoias', 'theme-casa-itauna', 'theme-casa_itauna');
    root.classList.add(isCasaItauna ? 'theme-casa-itauna' : 'theme-semijoias');
    document.cookie = `${COOKIE_NAME}=${workspace}; path=/; max-age=31536000; SameSite=Lax`;
  }, [isCasaItauna, workspace]);

  const setWorkspace = React.useCallback(
    (nextWs: WorkspaceType) => {
      // 1. Atualiza cookie
      document.cookie = `${COOKIE_NAME}=${nextWs}; path=/; max-age=31536000; SameSite=Lax`;

      // 2. Atualiza classes CSS no DOM imediatamente para transição sem delay
      const root = document.documentElement;
      root.classList.remove('theme-semijoias', 'theme-casa-itauna', 'theme-casa_itauna');
      root.classList.add(nextWs === 'casa_itauna' ? 'theme-casa-itauna' : 'theme-semijoias');

      // 3. Navega para o destino correspondente apenas se não estiver nele
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
        isCasaItauna,
        isSemijoias: !isCasaItauna,
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

