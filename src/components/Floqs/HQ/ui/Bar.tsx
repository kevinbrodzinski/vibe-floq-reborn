export default function Bar({ value }: { value: number }) {
  return (
    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-rose-500"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}