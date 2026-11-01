// Approval-card rules (issue #7).
//  1. A card shows at most MAX_FIELDS fields.
//  2. A card whose last approved action failed carries a retry banner.
//  3. Only the latest card of a run can be acted on; older cards are stale.
//  4. A failed approved action is posted back to the run.

export const MAX_FIELDS = 12;

export function buildCard({ runId, seq, title, fields = [], banner = null }) {
  const list = fields.slice(0, MAX_FIELDS);
  return {
    id: `${runId}#${seq}`,
    runId,
    seq,
    title,
    fields: list,
    hiddenFields: fields.length - list.length,
    banner,
    status: "open",
  };
}

export function retryBanner(error, attempt) {
  return { kind: "retry", attempt, message: `Action failed: ${error}. You can approve again.` };
}

// postBack(runId, message) is injected so the transport stays out of the rules.
export function createCardStore({ postBack }) {
  const latest = new Map(); // runId -> card
  const all = new Map(); // cardId -> card
  const attempts = new Map(); // runId -> failed attempt count

  function issue(runId, spec) {
    const prev = latest.get(runId);
    const card = buildCard({ runId, seq: prev ? prev.seq + 1 : 1, ...spec });
    if (prev) prev.status = "stale";
    latest.set(runId, card);
    all.set(card.id, card);
    return card;
  }

  async function act(cardId, decision, execute) {
    const card = all.get(cardId);
    if (!card) return { ok: false, reason: "unknown" };
    if (card !== latest.get(card.runId) || card.status === "stale") {
      return { ok: false, reason: "stale" };
    }
    if (decision !== "approve") {
      card.status = "rejected";
      return { ok: true };
    }
    try {
      await execute();
    } catch (e) {
      const n = (attempts.get(card.runId) ?? 0) + 1;
      attempts.set(card.runId, n);
      const error = e instanceof Error ? e.message : String(e);
      card.banner = retryBanner(error, n);
      await postBack(card.runId, `Approved action failed (attempt ${n}): ${error}`);
      return { ok: false, reason: "failed", error };
    }
    card.status = "approved";
    card.banner = null;
    return { ok: true };
  }

  return { issue, act, latest: (runId) => latest.get(runId) };
}
