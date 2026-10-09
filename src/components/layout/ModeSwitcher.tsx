"use client";
import { useState } from "react";
import { useStore } from "@/context/StoreContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ALL_SHOP_PRESETS, type ShopPreset } from "@/data/shopPresets";
import { industryGuides } from "@/data/industryGuides";
import { BriefcaseBusiness, Sparkles } from "lucide-react";

export function ModeSwitcher({ onClose }: { onClose: () => void }) {
  const { appMode, currentShopPreset, switchAppMode } = useStore();
  const [industry, setIndustry] = useState<ShopPreset["id"]>(currentShopPreset);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl p-6">
        <DialogHeader>
          <DialogTitle>Choose your mode</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">
          Demo and Production records are saved separately. Your products,
          sales, and saved orders stay with their workspace.
        </p>
        <label className="text-sm font-semibold" htmlFor="mode-industry">
          Business industry
        </label>
        <select
          id="mode-industry"
          className="mode-select"
          value={industry}
          onChange={(e) => setIndustry(e.target.value as ShopPreset["id"])}
        >
          {Object.values(ALL_SHOP_PRESETS).map((preset) => (
            <option key={preset.id} value={preset.id}>
              {industryGuides[preset.id].title}
            </option>
          ))}
        </select>
        <div className="mode-options">
          <button
            onClick={() => {
              if (switchAppMode("DEMO", industry)) onClose();
            }}
            className="mode-option"
          >
            <Sparkles size={24} />
            <strong>Demo Mode {appMode === "DEMO" && "· Current"}</strong>
            <p>
              Explore industry presets, sample sales, customers, and guided
              workflows.
            </p>
            <span>Open demo →</span>
          </button>
          <button
            onClick={() => {
              if (switchAppMode("PRODUCTION", industry)) onClose();
            }}
            className="mode-option"
          >
            <BriefcaseBusiness size={24} />
            <strong>
              Production Mode {appMode === "PRODUCTION" && "· Current"}
            </strong>
            <p>
              Set up your business with empty records, your own staff, and a
              focused workspace for client testing.
            </p>
            <span>Open business →</span>
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Production requires your business account. Changes save on this
          device first and automatically save online when connected.
        </p>
      </DialogContent>
    </Dialog>
  );
}

export function ProductionSetup() {
  const { setupProduction, currentShopPreset } = useStore();
  const [storeName, setStoreName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [pin, setPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      className="production-setup"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        if (pin !== confirmation) {
          setError("The PINs do not match.");
          return;
        }
        if (!setupProduction({ storeName, ownerName, pin, address, phone }))
          setError("Check your details and try again.");
      }}
    >
      <div className="eyebrow">
        PRODUCTION MODE · {industryGuides[currentShopPreset].title}
      </div>
      <h1>Set up your business</h1>
      <p>
        Start with your own products and customers. All balances and sales begin
        at zero.
      </p>
      <label>
        Business name
        <input
          autoComplete="organization"
          required
          maxLength={100}
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          placeholder="Your business name"
        />
      </label>
      <label>
        Owner name
        <input
          autoComplete="name"
          required
          maxLength={100}
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
        />
      </label>
      <div className="setup-grid">
        <label>
          Owner PIN
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]{6}"
            minLength={6}
            maxLength={6}
            required
            autoComplete="new-password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="6 digits"
          />
        </label>
        <label>
          Confirm PIN
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoComplete="new-password"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </label>
      </div>
      <label>
        Address <small>Optional · appears on receipts</small>
        <input
          autoComplete="street-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </label>
      <label>
        Contact number <small>Optional</small>
        <input
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <button className="primary-button" type="submit">
        Create business workspace →
      </button>
      <p className="text-xs text-slate-500">
        Your business account controls online access. The owner PIN is used
        for local staff switching and approvals on this device.
      </p>
    </form>
  );
}
