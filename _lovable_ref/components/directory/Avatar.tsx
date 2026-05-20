import { avatarColor, initials } from "@/lib/directory-data";

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold text-white shrink-0"
      style={{ width: size, height: size, background: avatarColor(name), fontSize: size * 0.4 }}
    >
      {initials(name)}
    </div>
  );
}
