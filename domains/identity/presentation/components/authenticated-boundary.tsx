"use client";

import type { ReactNode } from "react";
import { ProtectedPage } from "./auth-guard";

export const AuthenticatedBoundary = ({ children }: { readonly children: ReactNode }) => (
  <ProtectedPage>{() => children}</ProtectedPage>
);
