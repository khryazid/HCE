import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/stripe/webhook/route";
import * as serverLogger from "@/lib/observability/server-logger";

vi.mock("server-only", () => ({}));

const {
  mockConstructEvent,
  mockRetrieveSubscription,
  mockSelect,
  mockEq,
  mockUpdate,
  mockInsert,
  mockMaybeSingle,
  mockDelete,
  mockIn,
} = vi.hoisted(() => {
  const mEq = vi.fn();
  const mSelect = vi.fn().mockReturnValue({ eq: mEq });
  const mMaybeSingle = vi.fn();
  mEq.mockReturnValue({ maybeSingle: mMaybeSingle, eq: mEq });
  
  const mUpdate = vi.fn().mockReturnValue({ eq: mEq });
  const mIn = vi.fn();
  const mDelete = vi.fn().mockReturnValue({ in: mIn });
  const mInsert = vi.fn().mockResolvedValue({ error: null });

  // For Update, `.eq()` returns `{ error: null }` as a promise!
  // Wait, no, mEq is used by select AND update.
  // For update, `.eq()` is the end of the chain, so it needs to return a promise resolving to { error: null }
  // We can just make mEq return a promise that resolves to { error: null, maybeSingle: mMaybeSingle, eq: mEq }
  mEq.mockImplementation(() => {
    const chain = Promise.resolve({ error: null });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (chain as any).maybeSingle = mMaybeSingle;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (chain as any).eq = mEq;
    return chain;
  });

  return {
    mockConstructEvent: vi.fn(),
    mockRetrieveSubscription: vi.fn(),
    mockSelect: mSelect,
    mockEq: mEq,
    mockUpdate: mUpdate,
    mockInsert: mInsert,
    mockMaybeSingle: mMaybeSingle,
    mockDelete: mDelete,
    mockIn: mIn,
  };
});

vi.mock("stripe", () => {
  const StripeClass = class {
    webhooks = { constructEvent: mockConstructEvent };
    subscriptions = { retrieve: mockRetrieveSubscription };
  };
  return { default: StripeClass };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn().mockReturnValue({
    from: vi.fn((table) => {
      if (table === "stripe_webhook_events") return { select: mockSelect, insert: mockInsert };
      if (table === "profiles") return { update: mockUpdate, select: mockSelect };
      if (table === "clinic_members") return { select: mockSelect, delete: mockDelete };
      return {};
    }),
  }),
}));

// Suppress logs during tests but print errors to debug
vi.spyOn(serverLogger.serverLog, "withRequestId").mockReturnValue({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn((ctx, msg, data) => console.log("LOG.ERROR:", msg, data)),
  critical: vi.fn((ctx, msg, data) => console.log("LOG.CRITICAL:", msg, data)),
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);

function buildRequest(body: string, signature: string = "test_sig") {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: {
      "stripe-signature": signature,
    },
    body,
  });
}

describe("stripe webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost";
    mockMaybeSingle.mockResolvedValue({ data: null }); // no existing idempotency event by default
  });

  it("returns 400 without signature", async () => {
    const res = await POST(new Request("http://localhost/api/stripe/webhook", { method: "POST" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid signature", async () => {
    mockConstructEvent.mockImplementationOnce(() => { throw new Error("bad sig"); });
    const res = await POST(buildRequest("{}", "bad_sig"));
    expect(res.status).toBe(400);
  });

  it("ignores duplicate events idempotently", async () => {
    mockConstructEvent.mockReturnValue({ id: "evt_123", type: "dummy" });
    mockMaybeSingle.mockResolvedValueOnce({ data: { stripe_event_id: "evt_123" } });
    
    const res = await POST(buildRequest("{}"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.duplicate).toBe(true);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("handles customer.subscription.updated", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_123",
      type: "customer.subscription.updated",
      data: {
        object: {
          customer: "cus_123",
          status: "active",
          id: "sub_123",
          items: {
            data: [{ current_period_end: 100000, price: { metadata: { plan: "clinic" } } }],
          },
        },
      },
    });

    const res = await POST(buildRequest("{}"));
    if (res.status !== 200) console.log(await res.json());
    expect(res.status).toBe(200);
    
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      subscription_status: "active",
      plan: "clinic",
    }));
    expect(mockEq).toHaveBeenCalledWith("stripe_customer_id", "cus_123");
    expect(mockInsert).toHaveBeenCalledWith({ stripe_event_id: "evt_123" });
  });
});
