"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

const TOKEN_KEY = "sos-citizen-token";
const PERSON_KEY = "sos-person-id";
const NAME_KEY = "sos-display-name";

interface CitizenAuth {
  personId: string | null;
  token: string | null;
  displayName: string | null;
  isAuthenticated: boolean;
  signOut: () => void;
}

const CitizenAuthContext = createContext<CitizenAuth | null>(null);

export function useCitizenAuth(): CitizenAuth {
  const ctx = useContext(CitizenAuthContext);
  if (!ctx) throw new Error("useCitizenAuth must be used within <CitizenAuthGate>");
  return ctx;
}

interface VerifyResponse {
  token: string;
  person_id: string;
  display_name: string;
  is_new: boolean;
}

export default function CitizenAuthGate({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Sign-in form state
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    setToken(localStorage.getItem(TOKEN_KEY));
    setPersonId(localStorage.getItem(PERSON_KEY));
    setDisplayName(localStorage.getItem(NAME_KEY));
    setHydrated(true);
  }, []);

  const signOut = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PERSON_KEY);
    localStorage.removeItem(NAME_KEY);
    setToken(null);
    setPersonId(null);
    setDisplayName(null);
    setStep("phone");
    setPhone("");
    setCode("");
  };

  // Normalize to E.164 with US default (+1)
  const toE164 = (raw: string) => {
    const digits = raw.replace(/[^\d+]/g, "");
    if (digits.startsWith("+")) return digits;
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    return digits ? `+${digits}` : "";
  };

  const sendCode = async () => {
    const e164 = toE164(phone);
    if (e164.length < 8) return setError("Enter a valid phone number");
    setBusy(true);
    setError(null);
    try {
      await api.efCall("citizen-auth", { mode: "send", phone: e164 });
      setStep("code");
      setTimeout(() => codeRefs.current[0]?.focus(), 50);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send code");
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (fullCode: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.efCall<VerifyResponse>("citizen-auth", {
        mode: "verify",
        phone: toE164(phone),
        code: fullCode,
      });
      localStorage.setItem(TOKEN_KEY, res.token);
      localStorage.setItem(PERSON_KEY, res.person_id);
      localStorage.setItem(NAME_KEY, res.display_name ?? "");
      setToken(res.token);
      setPersonId(res.person_id);
      setDisplayName(res.display_name ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid code");
      setCode("");
      codeRefs.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  };

  const onCodeDigit = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = (code.padEnd(6, " ").substring(0, idx) + (digit || " ") + code.padEnd(6, " ").substring(idx + 1)).trimEnd();
    setCode(next);
    if (digit && idx < 5) codeRefs.current[idx + 1]?.focus();
    if (next.replace(/\s/g, "").length === 6) verifyCode(next.replace(/\s/g, ""));
  };

  if (token && personId) {
    return (
      <CitizenAuthContext.Provider value={{ personId, token, displayName, isAuthenticated: true, signOut }}>
        {children}
      </CitizenAuthContext.Provider>
    );
  }

  // Avoid SSR flash of the sign-in form before we read localStorage
  if (!hydrated) return <div className="min-h-screen bg-[#0F1E2B]" />;

  return (
    <div className="min-h-screen bg-[#0F1E2B] text-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src="/logomark.svg" alt="SOS" className="w-14 h-14 mb-4" />
          <h1 className="text-xl font-serif">Sign in with your phone</h1>
          <p className="text-sm text-white/50 mt-2 text-center font-sans">
            {step === "phone"
              ? "We'll text you a 6-digit code."
              : `Enter the code sent to ${toE164(phone)}`}
          </p>
        </div>

        {step === "phone" ? (
          <div className="space-y-3">
            <div className="flex items-center bg-white/5 border border-white/10 rounded-lg overflow-hidden focus-within:border-[#EF4E4B]">
              <span className="px-3 py-3 text-white/50 text-sm border-r border-white/10">+1</span>
              <input
                type="tel"
                inputMode="tel"
                autoFocus
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendCode()}
                placeholder="(555) 123-4567"
                className="flex-1 bg-transparent px-3 py-3 text-base outline-none placeholder:text-white/30"
              />
            </div>
            <button
              onClick={sendCode}
              disabled={busy}
              className="w-full bg-[#EF4E4B] hover:bg-red-600 disabled:opacity-50 rounded-lg py-3 font-semibold transition-colors"
            >
              {busy ? "Sending…" : "Send code"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <input
                  key={i}
                  ref={(el) => { codeRefs.current[i] = el; }}
                  type="tel"
                  inputMode="numeric"
                  maxLength={1}
                  value={code[i] ?? ""}
                  onChange={(e) => onCodeDigit(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !code[i] && i > 0) codeRefs.current[i - 1]?.focus();
                  }}
                  className="w-full aspect-square text-center text-xl font-semibold bg-white/5 border border-white/10 rounded-lg outline-none focus:border-[#EF4E4B]"
                />
              ))}
            </div>
            <button
              onClick={() => { setStep("phone"); setCode(""); setError(null); }}
              className="text-sm text-white/50 hover:text-white/80"
            >
              ← Use a different number
            </button>
          </div>
        )}

        {error && <p className="text-[#EF4E4B] text-sm mt-3 text-center">{error}</p>}
      </div>
    </div>
  );
}
