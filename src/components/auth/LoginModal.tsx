"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { staffList, currentStaff, loginWithPin, settings, appMode, sessionUser } = useStore();
  const [staffId, setStaffId] = useState(currentStaff.id);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const activeStaff = staffList.filter((staff) => staff.isActive);
  const selected = activeStaff.find((staff) => staff.id === staffId);
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><KeyRound size={20} /> Staff sign in</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">{settings.storeName}</p>
        <form className="space-y-4" onSubmit={(event) => {
          event.preventDefault(); setError("");
          const result = loginWithPin(staffId, pin);
          if (result.success) { setPin(""); onClose(); }
          else setError(result.error || "Unable to sign in.");
        }}>
          <label className="field-label" htmlFor="staff-profile">Staff member
            <select id="staff-profile" className="field-input" value={staffId} onChange={(event) => { setStaffId(event.target.value); setPin(""); setError(""); }}>
              {activeStaff.map((staff) => <option key={staff.id} value={staff.id}>{staff.name} - {staff.role.toLowerCase()}</option>)}
            </select>
          </label>
          <label className="field-label" htmlFor="staff-pin">Staff PIN
            <input id="staff-pin" className="field-input" type="password" inputMode="numeric" pattern="[0-9]{4,6}" maxLength={6} required autoComplete="off" value={pin} onChange={(event) => setPin(event.target.value)} />
          </label>
          {appMode === "DEMO" && selected && <p className="text-xs text-slate-500">Demo PIN for {selected.name}: {selected.pin}</p>}
          {error && <p role="alert" className="auth-message auth-error">{error}</p>}
          <button className="primary-button w-full" type="submit">Continue as {selected?.name || "staff"}</button>
        </form>
        {appMode === "PRODUCTION" && <p className="text-xs text-slate-500 break-words">Business account: {sessionUser?.email}. PINs switch the staff profile on this trusted device.</p>}
      </DialogContent>
    </Dialog>
  );
}
