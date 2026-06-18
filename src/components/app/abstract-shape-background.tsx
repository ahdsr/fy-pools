export function AbstractShapeBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <div className="absolute -right-24 top-24 h-80 w-[34rem] rotate-[-10deg] rounded-[4rem] bg-brand-coral/42 blur-2xl [clip-path:polygon(7%_18%,100%_0,88%_78%,0_100%)]" />
      <div className="absolute right-10 top-52 h-64 w-[29rem] rotate-6 rounded-[5rem] bg-brand-warning/62 blur-xl [clip-path:polygon(0_8%,80%_0,100%_72%,22%_100%)]" />
      <div className="absolute -left-20 top-96 h-72 w-[30rem] rotate-[-16deg] rounded-[4rem] bg-brand-sky/58 blur-2xl [clip-path:polygon(18%_0,100%_20%,72%_100%,0_78%)]" />
    </div>
  );
}
