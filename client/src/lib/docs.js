// Insert or replace a document, ignoring events older than what's already on screen
export const upsertDoc = (list, incoming) => {
  const i = list.findIndex((d) => d._id === incoming._id);
  if (i === -1) return [incoming, ...list];
  if (new Date(incoming.updatedAt) < new Date(list[i].updatedAt)) return list; // stale event
  const next = [...list];
  next[i] = incoming;
  return next;
};