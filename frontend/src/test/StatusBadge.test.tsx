import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatusBadge } from "../components/StatusBadge";

describe("StatusBadge", () => {
  it("renders Done status correctly", () => {
    render(<StatusBadge status="Done" />);
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("renders In Progress status correctly", () => {
    render(<StatusBadge status="In Progress" />);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("renders Backlog status correctly", () => {
    render(<StatusBadge status="Backlog" />);
    expect(screen.getByText("Backlog")).toBeInTheDocument();
  });
});
