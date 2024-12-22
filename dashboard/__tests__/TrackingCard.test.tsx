import { render, screen } from "@testing-library/react";
import { TrackingCard } from "../TrackingCard";

describe("TrackingCard", () => {
  const mockProps = {
    icon: "test-icon.png",
    title: "Test Title",
    subtitle: "Test Subtitle",
  };

  it("renders with provided props", () => {
    render(<TrackingCard {...mockProps} />);

    expect(screen.getByText(mockProps.title)).toBeInTheDocument();
    expect(screen.getByText(mockProps.subtitle)).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute("src", mockProps.icon);
  });
});
