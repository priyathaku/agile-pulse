import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProgressBar } from "../components/ProgressBar";

describe("ProgressBar", () => {
  it("renders percentage text accurately", () => {
    render(<ProgressBar progress={66.7} />);
    expect(screen.getByText("67%")).toBeInTheDocument();
  });

  it("clamps 100% progress", () => {
    render(<ProgressBar progress={120} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("clamps 0% progress on negative values", () => {
    render(<ProgressBar progress={-10} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });
});
