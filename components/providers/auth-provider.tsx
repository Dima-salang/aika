"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { authClient } from "@/lib/auth-client";

interface AuthContextType {
  session: any; // Matches the shape of useSession data ({ session, user })
  activeOrg: any;
  orgList: any;
  isLoading: boolean;
  refetchSession: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: sessionData, isPending: isSessionPending, refetch: refetchSession } = authClient.useSession();
  const { data: activeOrg, isPending: isOrgPending } = authClient.useActiveOrganization();
  const { data: orgList, isPending: isListPending } = authClient.useListOrganizations();

  const isLoading = isSessionPending;

  const value = {
    session: sessionData ?? null,
    activeOrg: activeOrg ?? null,
    orgList,
    isLoading,
    refetchSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
