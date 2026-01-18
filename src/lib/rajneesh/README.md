# Rajneesh Fork Notes (For AI Contributors)

This folder is the primary location for fork-specific logic. Prefer adding new
features and behavior here, and keep changes to upstream files minimal.

Guidelines:
- Put new logic under `src/lib/rajneesh/` (hooks, stores, pages, helpers).
- Expose small helpers/hooks that upstream files can call.
- Minimize edits to non-`rajneesh` files and keep them thin (just wiring).
- If you must edit upstream code, do the smallest possible change and
  keep the behavior gated/isolated.

Goal: reduce conflicts with upstream updates while keeping fork behavior clear.
