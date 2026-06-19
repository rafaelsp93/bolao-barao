import { describe, it, expect } from "vitest";
import { isMatchLocked, areBetsLocked } from "./locks";

describe("isMatchLocked", () => {
  const kickoff = new Date("2026-06-20T18:00:00Z");
  it("is open before kickoff", () => {
    expect(isMatchLocked(kickoff, new Date("2026-06-20T17:59:59Z"))).toBe(false);
  });
  it("is locked exactly at kickoff", () => {
    expect(isMatchLocked(kickoff, new Date("2026-06-20T18:00:00Z"))).toBe(true);
  });
  it("is locked after kickoff", () => {
    expect(isMatchLocked(kickoff, new Date("2026-06-20T20:00:00Z"))).toBe(true);
  });
});

describe("areBetsLocked", () => {
  it("is open when the user has never logged in", () => {
    expect(areBetsLocked(null, new Date("2026-06-20T00:00:00Z"))).toBe(false);
  });
  it("is open later the same UTC day as first login", () => {
    const first = new Date("2026-06-20T08:00:00Z");
    expect(areBetsLocked(first, new Date("2026-06-20T23:59:00Z"))).toBe(false);
  });
  it("is locked the next UTC day", () => {
    const first = new Date("2026-06-20T08:00:00Z");
    expect(areBetsLocked(first, new Date("2026-06-21T00:01:00Z"))).toBe(true);
  });
});
