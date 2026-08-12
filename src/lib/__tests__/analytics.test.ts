import { afterEach, describe, expect, it, vi } from "vitest";
import { track } from "../analytics";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("track", () => {
  it("is a no-op when analytics is unavailable", () => {
    vi.stubGlobal("window", {});
    expect(track("copy_tariff_result", { denomination: "ZWG" })).toBe(false);
  });

  it("passes only the supplied fixed event contract through", () => {
    const tapiwaTrack = vi.fn(() => true);
    vi.stubGlobal("window", { tapiwaTrack });
    expect(track("share", {
      method: "WhatsApp",
      content_type: "tariff_result",
      item_id: "zesa_tariff_result",
    })).toBe(true);
    expect(tapiwaTrack).toHaveBeenCalledWith("share", {
      method: "WhatsApp",
      content_type: "tariff_result",
      item_id: "zesa_tariff_result",
    });
  });

  it("never throws into a product action", () => {
    vi.stubGlobal("window", { tapiwaTrack: () => { throw new Error("blocked"); } });
    expect(() => track("buy_token_intent", { payment_mode: "paynow" })).not.toThrow();
    expect(track("buy_token_intent", { payment_mode: "paynow" })).toBe(false);
  });
});
