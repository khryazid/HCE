import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ThemeToggle } from "./theme-toggle";

const mockSetTheme = vi.fn();
let mockTheme = "light";

vi.mock("@/lib/hooks/use-theme", () => ({
  useTheme: () => ({
    theme: mockTheme,
    setTheme: mockSetTheme,
  }),
}));

describe("ThemeToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTheme = "light";
  });

  it("renders all theme options when mounted", () => {
    render(<ThemeToggle />);
    expect(screen.getByText("Claro")).toBeInTheDocument();
    expect(screen.getByText("Oscuro")).toBeInTheDocument();
    expect(screen.getByText("Sistema")).toBeInTheDocument();
  });

  it("highlights the active theme", () => {
    mockTheme = "dark";
    render(<ThemeToggle />);
    const darkButton = screen.getByRole("button", { name: /oscuro/i });
    expect(darkButton).toHaveAttribute("aria-pressed", "true");
    
    const lightButton = screen.getByRole("button", { name: /claro/i });
    expect(lightButton).toHaveAttribute("aria-pressed", "false");
  });

  it("calls setTheme on click", () => {
    render(<ThemeToggle />);
    const systemButton = screen.getByRole("button", { name: /sistema/i });
    fireEvent.click(systemButton);
    expect(mockSetTheme).toHaveBeenCalledWith("system");
  });
});
