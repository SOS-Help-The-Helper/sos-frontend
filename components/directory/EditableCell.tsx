import { Lock, Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type BaseProps = {
  value: string;
  editable: boolean;
  onCommit?: (next: string) => void;
  placeholder?: string;
  className?: string;
};

export function EditableCell({ value, editable, onCommit, placeholder, className = "" }: BaseProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(value);
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [editing, value]);

  if (!editable) {
    return (
      <span className={`inline-flex items-center gap-1 text-white/55 ${className}`}>
        <Lock size={10} className="text-white/25 shrink-0" />
        <span className="truncate">{value || <span className="text-white/25">—</span>}</span>
      </span>
    );
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== value) onCommit?.(draft);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (draft !== value) onCommit?.(draft);
            setEditing(false);
          } else if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        placeholder={placeholder}
        className={`h-6 -my-0.5 px-1.5 rounded bg-white/10 text-white text-[13px] outline-none ring-1 ring-[#89CFF0]/60 w-full max-w-[220px] ${className}`}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      className={`group inline-flex items-center gap-1 text-left max-w-full rounded px-1 -mx-1 hover:bg-white/[0.06] transition ${className}`}
    >
      <span className="truncate">{value || <span className="text-white/30">—</span>}</span>
      <Pencil size={9} className="text-white/0 group-hover:text-white/40 transition shrink-0" />
    </button>
  );
}

type SelectProps = BaseProps & { options: readonly string[] };

export function EditableSelect({ value, editable, onCommit, options, className = "" }: SelectProps) {
  if (!editable) {
    return (
      <span className={`inline-flex items-center gap-1 text-white/55 ${className}`}>
        <Lock size={10} className="text-white/25 shrink-0" />
        <span className="truncate">{value || "—"}</span>
      </span>
    );
  }
  return (
    <select
      value={value}
      onChange={(e) => onCommit?.(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      className={`h-6 -my-0.5 px-1 rounded bg-transparent hover:bg-white/[0.06] focus:bg-white/10 text-white text-[13px] outline-none cursor-pointer ${className}`}
    >
      {options.map((o) => (
        <option key={o} value={o} className="bg-[#1a1a1a]">
          {o}
        </option>
      ))}
    </select>
  );
}
