"use client";
import { useState } from "react";
import {
  ArrowRight,
  Coffee,
  HardDrive,
  LockKeyhole,
  Pill,
  ShoppingBag,
  Wrench,
} from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { ALL_SHOP_PRESETS, type ShopPreset } from "@/data/shopPresets";
import { industryGuides } from "@/data/industryGuides";
import { LoginModal } from "./LoginModal";
import { BusinessLogin } from "./BusinessLogin";
import {
  ModeSwitcher,
  ProductionSetup,
} from "@/components/layout/ModeSwitcher";
const icons = {
  SARI_SARI: ShoppingBag,
  MOTOR_SHOP: Wrench,
  PHARMACY: Pill,
  MILK_TEA: Coffee,
};
export function LoginScreen() {
  const {
    loadShopPreset,
    quickDemoLogin,
    appMode,
    productionNeedsSetup,
    settings,
    sessionUser,
    passwordRecovery,
    syncError,
    logout,
    syncCloud,
  } = useStore();
  const [login, setLogin] = useState(false);
  const [modes, setModes] = useState(false);
  function open(key: ShopPreset["id"]) {
    if (loadShopPreset(key)) quickDemoLogin("OWNER");
  }
  return (
    <div className="welcome">
      <header className="welcome-header">
        <div className="brand">
          <span className="brand-mark">
            p<span>·</span>
          </span>
          <span>
            paddl<span className="text-emerald-500">.</span>
          </span>
        </div>
        <div className="flex gap-2">
          <button className="secondary-button" onClick={() => setModes(true)}>
            {appMode === "DEMO" ? "Demo Mode" : "Explore demo"}
          </button>
          {appMode === "DEMO" && <button className="secondary-button" onClick={() => setLogin(true)}>
            <LockKeyhole size={15} /> Staff sign in
          </button>}
        </div>
      </header>
      {appMode === "PRODUCTION" ? (
        <main className="welcome-main auth-layout">
          <section className="auth-intro">
            <div className="eyebrow">PADDL FOR BUSINESS</div>
            <h1>More time for<br /><span>your business.</span></h1>
            <p>A clear view of your sales, stock, and customers, in one everyday workspace.</p>
            <div className="auth-benefits">
              <span><ShoppingBag size={20} /> Simple checkout and inventory</span>
              <span><HardDrive size={20} /> Automatic saving to your account</span>
              <span><LockKeyhole size={20} /> Separate records for each business owner</span>
            </div>
            <small>New here? Try an industry demo before setting up your business.</small>
          </section>
          <div className="auth-card-area">
            {!sessionUser || passwordRecovery ? <BusinessLogin /> : productionNeedsSetup ? <>
              {syncError && <div role="alert" className="auth-message mb-4">{syncError}<button className="auth-retry" onClick={() => syncCloud()}>Retry connection</button></div>}
              <ProductionSetup />
              <button className="auth-signout" onClick={logout}>Signed in as {sessionUser.email} - Sign out</button>
            </> : <div className="production-setup"><h1>{settings.storeName}</h1><p>Choose your staff profile and enter its PIN to unlock this device.</p>{syncError && <p role="alert" className="auth-message">{syncError}</p>}<button className="primary-button" onClick={() => setLogin(true)}>Unlock workspace</button><button className="secondary-button" onClick={logout}>Sign out of account</button></div>}
          </div>
        </main>
      ) : (
        <main className="welcome-main">
          <div className="welcome-intro">
            <div className="eyebrow">SMALL BUSINESS. BIG POSSIBILITIES.</div>
            <h1>
              Your business, a little easier.
              <br />
              <span className="text-emerald-600">Every single day.</span>
            </h1>
            <p>
              Sales, stock, cash, and your suki — together in one workspace.
              <br />
              Choose an industry to explore Paddl with a ready-to-use demo.
            </p>
          </div>
          <div className="industry-grid">
            {Object.values(ALL_SHOP_PRESETS).map((p) => {
              const Icon = icons[p.id];
              const guide = industryGuides[p.id];
              return (
                <button
                  className="industry-card"
                  onClick={() => open(p.id)}
                  key={p.id}
                >
                  <span
                    className={
                      "metric-icon " +
                      (p.id === "SARI_SARI"
                        ? "green"
                        : p.id === "MOTOR_SHOP"
                          ? "orange"
                          : p.id === "PHARMACY"
                            ? "blue"
                            : "purple")
                    }
                  >
                    <Icon size={22} />
                  </span>
                  <h2>{guide.title}</h2>
                  <p>{guide.short}</p>
                  <p className="mt-2">
                    {p.products.length} products · Sample sales · Customers &
                    credit
                  </p>
                  <div className="card-footer">
                    <span>Explore this workspace</span>
                    <ArrowRight size={17} />
                  </div>
                </button>
              );
            })}
          </div>
          <p className="welcome-note flex items-center justify-center gap-2">
            <HardDrive size={14} /> Demo workspaces save separately on this
            device. Come back anytime.
          </p>
        </main>
      )}
      {login && <LoginModal isOpen onClose={() => setLogin(false)} />}
      {modes && <ModeSwitcher onClose={() => setModes(false)} />}
    </div>
  );
}
