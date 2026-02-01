import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeContext } from "@/lib/hooks/useThemeContext";

export function ThemeToggle() {
  const { theme, setTheme } = useThemeContext();

  const cycleTheme = () => {
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
  };

  const icon =
    theme === "light" ? (
      <Sun className="h-5 w-5" />
    ) : theme === "dark" ? (
      <Moon className="h-5 w-5" />
    ) : (
      <Monitor className="h-5 w-5" />
    );

  const label =
    theme === "light"
      ? "Light mode (click for dark)"
      : theme === "dark"
        ? "Dark mode (click for system)"
        : "System mode (click for light)";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      aria-label={label}
      title={label}
    >
      {icon}
    </Button>
  );
}
