import type { PropsWithChildren } from "react";
import { useTheme } from "@/lib/hooks/useTheme";
import { ThemeContext } from "./theme-context";

export function ThemeProvider({ children }: PropsWithChildren) {
  const themeState = useTheme();

  return (
    <ThemeContext.Provider value={themeState}>{children}</ThemeContext.Provider>
  );
}
