// A root boundary is required because the client auth provider initializes at
// runtime. It is intentionally empty: individual routes provide shell-matched
// loading states, so navigation never swaps to a generic marketing page.
export default function Loading() {
  return null;
}
