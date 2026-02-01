import { useContext } from "react";
import { ThemeContext } from "@/lib/contexts/theme-context";
import type { UseThemeReturn } from "@/lib/hooks/useTheme";

export function useThemeContext(): UseThemeReturn {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return context;
}
