import { render, screen } from "@testing-library/react";
import { DashboardView } from "../DashboardView";

describe("DashboardView", () => {
  it("renders tracking cards with correct data", () => {
    render(<DashboardView />);

    expect(screen.getByText("Route Tracking")).toBeInTheDocument();
    expect(screen.getByText("7km, 1h45m")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("User Data")).toBeInTheDocument();
  });
});
