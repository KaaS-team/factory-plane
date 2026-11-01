// Batched diff line comments (issue #2, T2). A click adds to a batch; the next
// send prefixes the message with one quoted block per comment.

// New-side line number of the first line of a hunk: "@@ -a,b +c,d @@" -> c.
export function newStartOfHunk(header) {
  const m = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(header || "");
  return m ? Number(m[1]) : null;
}

export function createBatch() {
  let batch = [];
  let undo = null;
  return {
    get items() { return batch.slice(); },
    add(file, line, text) { batch = [...batch, { file, line, text }]; },
    remove(i) { batch = batch.filter((_, j) => j !== i); },
    // Returns the message to send and clears the batch, keeping it for undo.
    send(message) {
      const out = quote(batch) + message;
      undo = batch;
      batch = [];
      return out;
    },
    undo() { if (undo) { batch = undo; undo = null; } },
  };
}

function quote(batch) {
  if (batch.length === 0) return "";
  const quoted = batch.map((c) => `> ${c.file}:${c.line}\n> ${c.text}`).join("\n\n");
  return quoted + "\n\n";
}
