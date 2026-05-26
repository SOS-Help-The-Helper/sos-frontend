import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { orgs } from "@/lib/prototype-data";

/**
 * Shared modal kit for the prototype. Each modal owns its own field state,
 * fires a sonner toast on confirm, and closes itself. Caller controls open.
 */

// ---------- Shared primitives ----------

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/55 font-medium block mb-1.5">
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full h-10 rounded-lg bg-white/6 border border-white/10 px-3 text-[13px] text-white placeholder:text-white/35 focus:outline-none focus:border-[#89CFF0]/60 transition ${props.className ?? ""}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select
      {...props}
      className={`w-full h-10 rounded-lg bg-white/6 border border-white/10 px-3 text-[13px] text-white focus:outline-none focus:border-[#89CFF0]/60 transition ${props.className ?? ""}`}
    >
      {props.children}
    </select>
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full min-h-[80px] rounded-lg bg-white/6 border border-white/10 px-3 py-2 text-[13px] text-white placeholder:text-white/35 focus:outline-none focus:border-[#89CFF0]/60 transition resize-none ${props.className ?? ""}`}
    />
  );
}

function PrimaryBtn({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg bg-[#EF4E4B] hover:bg-[#d94340] text-white text-[13px] font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

function GhostBtn({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className="inline-flex items-center justify-center h-9 px-4 rounded-lg text-white/70 hover:text-white hover:bg-white/5 text-[13px] font-medium transition"
    >
      {children}
    </button>
  );
}

function DangerBtn({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-[#EF4E4B]/12 hover:bg-[#EF4E4B]/20 text-[#EF4E4B] text-[13px] font-semibold transition"
    >
      {children}
    </button>
  );
}

// ---------- AssignToOrgDialog ----------

export function AssignToOrgDialog({
  open,
  onOpenChange,
  subject,
  onAssigned,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  subject: string;
  onAssigned?: (orgId: string, orgName: string) => void;
}) {
  const [orgId, setOrgId] = useState(orgs[0]?.id ?? "");
  const [note, setNote] = useState("");

  function submit() {
    const org = orgs.find((o) => o.id === orgId);
    if (!org) return;
    toast.success(`Assigned to ${org.name}`, {
      description: `${subject} routed · intake contact notified.`,
    });
    onAssigned?.(org.id, org.name);
    onOpenChange(false);
    setNote("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--surface-1)] border-[var(--hairline)] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[16px]">Assign to organization</DialogTitle>
          <DialogDescription className="text-white/55 text-[12.5px]">
            Route <span className="text-white">{subject}</span> to a partner org.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div>
            <FieldLabel>Organization</FieldLabel>
            <Select value={orgId} onChange={(e) => setOrgId(e.target.value)}>
              {orgs.map((o) => (
                <option key={o.id} value={o.id} className="bg-[#0F1E2B]">
                  {o.name} — {o.counties.join(", ")}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel>Note for intake (optional)</FieldLabel>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any context the receiving org should know…"
            />
          </div>
        </div>

        <DialogFooter className="gap-1">
          <GhostBtn onClick={() => onOpenChange(false)}>Cancel</GhostBtn>
          <PrimaryBtn onClick={submit}>Send assignment</PrimaryBtn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- CreateCaseDialog ----------

export function CreateCaseDialog({
  open,
  onOpenChange,
  defaultLabel = "case",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultLabel?: string;
}) {
  const [citizen, setCitizen] = useState("");
  const [need, setNeed] = useState("HOUSING.TEMPORARY");
  const [urgency, setUrgency] = useState("medium");
  const [county, setCounty] = useState("Buncombe");

  const canSubmit = citizen.trim().length > 1;

  function submit() {
    toast.success(`New ${defaultLabel} created`, {
      description: `${citizen} · ${need.toLowerCase()} · ${county} County`,
    });
    onOpenChange(false);
    setCitizen("");
    setNeed("HOUSING.TEMPORARY");
    setUrgency("medium");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--surface-1)] border-[var(--hairline)] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[16px]">New {defaultLabel}</DialogTitle>
          <DialogDescription className="text-white/55 text-[12.5px]">
            Capture the essentials — you can fill in the rest from the case page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div>
            <FieldLabel>Citizen or household name</FieldLabel>
            <Input
              value={citizen}
              onChange={(e) => setCitizen(e.target.value)}
              placeholder="e.g. Maria Hernandez"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <FieldLabel>Primary need</FieldLabel>
              <Select value={need} onChange={(e) => setNeed(e.target.value)}>
                <option className="bg-[#0F1E2B]" value="HOUSING.TEMPORARY">Housing · Temp</option>
                <option className="bg-[#0F1E2B]" value="HOUSING.REPAIR">Housing · Repair</option>
                <option className="bg-[#0F1E2B]" value="FOOD.PANTRY">Food · Pantry</option>
                <option className="bg-[#0F1E2B]" value="FOOD.HOT_MEAL">Food · Hot meal</option>
                <option className="bg-[#0F1E2B]" value="CHILDCARE">Childcare</option>
                <option className="bg-[#0F1E2B]" value="TRANSPORT">Transport</option>
                <option className="bg-[#0F1E2B]" value="MEDICAL.SUPPLIES">Medical supplies</option>
                <option className="bg-[#0F1E2B]" value="MENTAL_HEALTH">Mental health</option>
              </Select>
            </div>
            <div>
              <FieldLabel>Urgency</FieldLabel>
              <Select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                <option className="bg-[#0F1E2B]" value="critical">Critical</option>
                <option className="bg-[#0F1E2B]" value="high">High</option>
                <option className="bg-[#0F1E2B]" value="medium">Medium</option>
                <option className="bg-[#0F1E2B]" value="low">Low</option>
              </Select>
            </div>
          </div>
          <div>
            <FieldLabel>County</FieldLabel>
            <Select value={county} onChange={(e) => setCounty(e.target.value)}>
              {["Buncombe","Henderson","McDowell","Madison","Catawba","Burke"].map((c) => (
                <option key={c} value={c} className="bg-[#0F1E2B]">{c}</option>
              ))}
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-1">
          <GhostBtn onClick={() => onOpenChange(false)}>Cancel</GhostBtn>
          <PrimaryBtn onClick={submit} disabled={!canSubmit}>Create {defaultLabel}</PrimaryBtn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- CloseCaseDialog ----------

export function CloseCaseDialog({
  open,
  onOpenChange,
  caseLabel,
  mode = "close",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  caseLabel: string;
  mode?: "close" | "reopen";
}) {
  const [reason, setReason] = useState(mode === "close" ? "fulfilled" : "new-information");

  function submit() {
    const verb = mode === "close" ? "closed" : "reopened";
    toast.success(`Case ${verb}`, { description: `${caseLabel} · ${reason.replace(/-/g, " ")}` });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--surface-1)] border-[var(--hairline)] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[16px]">
            {mode === "close" ? "Close case" : "Reopen case"}
          </DialogTitle>
          <DialogDescription className="text-white/55 text-[12.5px]">
            {mode === "close"
              ? "This will archive the case and notify the assigned org."
              : "This will move the case back to active and re-notify the assigned org."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div>
            <FieldLabel>Reason</FieldLabel>
            <Select value={reason} onChange={(e) => setReason(e.target.value)}>
              {mode === "close" ? (
                <>
                  <option className="bg-[#0F1E2B]" value="fulfilled">Fulfilled</option>
                  <option className="bg-[#0F1E2B]" value="referred-out">Referred out</option>
                  <option className="bg-[#0F1E2B]" value="duplicate">Duplicate</option>
                  <option className="bg-[#0F1E2B]" value="no-contact">Unable to contact</option>
                  <option className="bg-[#0F1E2B]" value="other">Other</option>
                </>
              ) : (
                <>
                  <option className="bg-[#0F1E2B]" value="new-information">New information</option>
                  <option className="bg-[#0F1E2B]" value="closed-in-error">Closed in error</option>
                  <option className="bg-[#0F1E2B]" value="needs-follow-up">Needs follow-up</option>
                </>
              )}
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-1">
          <GhostBtn onClick={() => onOpenChange(false)}>Cancel</GhostBtn>
          {mode === "close" ? (
            <DangerBtn onClick={submit}>Close case</DangerBtn>
          ) : (
            <PrimaryBtn onClick={submit}>Reopen case</PrimaryBtn>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- InviteTeammateDialog ----------

export function InviteTeammateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Coordinator");
  const canSubmit = /\S+@\S+\.\S+/.test(email);

  function submit() {
    toast.success("Invite sent", { description: `${email} · ${role}` });
    onOpenChange(false);
    setEmail("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--surface-1)] border-[var(--hairline)] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[16px]">Invite teammate</DialogTitle>
          <DialogDescription className="text-white/55 text-[12.5px]">
            They'll get a magic link to join your org.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div>
            <FieldLabel>Email</FieldLabel>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@yourorg.com"
              autoFocus
            />
          </div>
          <div>
            <FieldLabel>Role</FieldLabel>
            <Select value={role} onChange={(e) => setRole(e.target.value)}>
              <option className="bg-[#0F1E2B]" value="Admin">Admin</option>
              <option className="bg-[#0F1E2B]" value="Coordinator">Coordinator</option>
              <option className="bg-[#0F1E2B]" value="Volunteer">Volunteer</option>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-1">
          <GhostBtn onClick={() => onOpenChange(false)}>Cancel</GhostBtn>
          <PrimaryBtn onClick={submit} disabled={!canSubmit}>Send invite</PrimaryBtn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
