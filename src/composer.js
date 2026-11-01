// Composer state: chips, Ask or Build, steer queue with Undo (issue #1, T4). No rendering.

export function createComposer({ repos = [], branches = [], agents = [], runners = [], mode = "build", onSend } = {}) {
  const state = {
    repo: repos.length === 1 ? repos[0] : "",
    branch: branches[0] ?? "",
    agent: agents[0] ?? "",
    runner: runners[0] ?? "",
    mode: mode === "ask" ? "ask" : "build",
    queue: [],
  };
  let nextId = 1;
  const api = {
    state,
    setMode(m) { state.mode = m === "ask" ? "ask" : "build"; },
    pick(chip, value) {
      if (!["repo", "branch", "agent", "runner"].includes(chip)) throw new Error(`unknown chip ${chip}`);
      state[chip] = value;
    },
    // With more than one repo served, a repo must be picked first.
    canSend(text) {
      return String(text ?? "").trim() !== "" && (repos.length <= 1 || state.repo !== "");
    },
    // Ask files a factory:ask task, Build a ready task.
    send(text) {
      if (!api.canSend(text)) return null;
      const task = {
        kind: state.mode === "ask" ? "factory:ask" : "ready",
        text: String(text).trim(),
        repo: state.repo, branch: state.branch, agent: state.agent, runner: state.runner,
      };
      if (onSend) onSend(task);
      return task;
    },
    steer(text) {
      const t = String(text ?? "").trim();
      if (!t) return null;
      const item = { id: nextId++, text: t };
      state.queue.push(item);
      return item;
    },
    undo(id) {
      const i = state.queue.findIndex((q) => q.id === id);
      if (i < 0) return false;
      state.queue.splice(i, 1);
      return true;
    },
    delivered(id) { api.undo(id); },
  };
  return api;
}
