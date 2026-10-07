"use client";
import { useState } from "react";
import { ArrowRight, Coffee, HardDrive, LockKeyhole, Pill, ShoppingBag, Wrench } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { ALL_SHOP_PRESETS, type ShopPreset } from "@/data/shopPresets";
import { industryGuides } from "@/data/industryGuides";
import { LoginModal } from "./LoginModal";
const icons = { SARI_SARI: ShoppingBag, MOTOR_SHOP: Wrench, PHARMACY: Pill, MILK_TEA: Coffee };
export function LoginScreen() {
  const { loadShopPreset, quickDemoLogin } = useStore();
  const [login, setLogin] = useState(false);
  function open(key: ShopPreset["id"]) { loadShopPreset(key); quickDemoLogin("OWNER"); }
  return <div className="welcome"><header className="welcome-header"><div className="brand"><span className="brand-mark">p<span>·</span></span><span>paddl<span className="text-emerald-500">.</span></span></div><button className="secondary-button" onClick={() => setLogin(true)}><LockKeyhole size={15} /> Staff sign in</button></header><main className="welcome-main"><div className="welcome-intro"><div className="eyebrow">SMALL BUSINESS. BIG POSSIBILITIES.</div><h1>Your business, a little easier.<br /><span className="text-emerald-600">Every single day.</span></h1><p>Sales, stock, cash, and your suki — together in one workspace.<br />Choose an industry to explore Paddl with a ready-to-use demo.</p></div><div className="industry-grid">{Object.values(ALL_SHOP_PRESETS).map(p => { const Icon = icons[p.id]; const guide = industryGuides[p.id]; return <button className="industry-card" onClick={() => open(p.id)} key={p.id}><span className={"metric-icon " + (p.id === "SARI_SARI" ? "green" : p.id === "MOTOR_SHOP" ? "orange" : p.id === "PHARMACY" ? "blue" : "purple")}><Icon size={22} /></span><h2>{guide.title}</h2><p>{guide.short}</p><p className="mt-2">{p.products.length} products · Sample sales · Customers & credit</p><div className="card-footer"><span>Explore this workspace</span><ArrowRight size={17} /></div></button>; })}</div><p className="welcome-note flex items-center justify-center gap-2"><HardDrive size={14} /> Demo workspaces save separately on this device. Come back anytime.</p></main>{login && <LoginModal isOpen onClose={() => setLogin(false)} />}</div>;
}
