import { describe, it, expect, vi, afterEach } from "vitest";
import { MAIPClient } from "../src/client.js";
afterEach(() => vi.unstubAllGlobals());
const config = {apiUrl:"https://fixture.test/v1", apiKey:"fixture", tenantId:"ignored", maxRetries:3};
describe("verified receipt transport", () => {
 it("does not accept a status label as proof", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({status:"valid", valid:true, verdict:"VALID"}),{status:200})));
  const result = await new MAIPClient(config).verifyReceipt("maip-receipt:qa");
  expect(result.valid).toBe(false);
 });
 it("uses the signature endpoint and rejects write replay", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({valid:true,verdict:"VALID",signature_verified:true,transparency_verified:false}),{status:200}));
  vi.stubGlobal("fetch",fetcher);
  expect((await new MAIPClient(config).verifyReceipt("maip-receipt:qa")).valid).toBe(true);
  expect(fetcher.mock.calls[0][0]).toBe("https://fixture.test/v1/agent-receipts/verify/maip-receipt%3Aqa");
  fetcher.mockReset().mockImplementation(() => Promise.resolve(new Response("{}",{status:503})));
  await expect(new MAIPClient(config).createReceipt({agent_id:"maip:qa",action:"qa",receipt_type:"action",payload:{qa:true}})).rejects.toThrow();
  expect(fetcher).toHaveBeenCalledTimes(1);
  const init=fetcher.mock.calls[0][1];
  expect(init.redirect).toBe("error");
  expect(init.headers["X-Tenant-ID"]).toBeUndefined();
  expect(JSON.parse(init.body).metadata).toEqual({qa:true});
 });
});
