import { createContext } from "react";
import type { UseThemeReturn } from "@/lib/hooks/useTheme";

export const ThemeContext = createContext<UseThemeReturn | undefined>(
  undefined
);
