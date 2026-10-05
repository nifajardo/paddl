"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Search, ShoppingCart, Plus, Minus, CreditCard, Banknote, Trash2 } from "lucide-react";

// Dummy data for initial UI build
const DUMMY_PRODUCTS = [
  { id: "1", name: "Coke Original 1.5L", price: 75, stock: 20, category: "Beverages" },
  { id: "2", name: "Sprite 1.5L", price: 75, stock: 15, category: "Beverages" },
  { id: "3", name: "Lays Classic", price: 120, stock: 10, category: "Snacks" },
  { id: "4", name: "Piattos Cheese", price: 35, stock: 50, category: "Snacks" },
  { id: "5", name: "Lucky Me! Pancit Canton", price: 18, stock: 100, category: "Food" },
  { id: "6", name: "Nescafe Original 3-in-1", price: 8, stock: 200, category: "Beverages" },
  { id: "7", name: "Tide Powder 50g", price: 12, stock: 80, category: "Household" },
  { id: "8", name: "Safeguard White", price: 45, stock: 30, category: "Household" },
];

const CATEGORIES = ["All", "Beverages", "Snacks", "Food", "Household"];

export function POSDashboard() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cart, setCart] = useState<{product: any, quantity: number}[]>([]);

  const filteredProducts = useMemo(() => {
    return DUMMY_PRODUCTS.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, selectedCategory]);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  const CartContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto py-4">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
            <ShoppingCart className="h-16 w-16 mb-4" />
            <p>Cart is empty</p>
          </div>
        ) : (
          <div className="space-y-4 pr-4">
            {cart.map(item => (
              <div key={item.product.id} className="flex justify-between items-center border-b pb-4">
                <div className="flex-1">
                  <h4 className="font-medium text-sm leading-tight">{item.product.name}</h4>
                  <p className="text-muted-foreground text-xs mt-1">₱{item.product.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => updateQuantity(item.product.id, -1)}>
                    {item.quantity === 1 ? <Trash2 className="h-4 w-4 text-destructive" /> : <Minus className="h-4 w-4" />}
                  </Button>
                  <span className="w-4 text-center font-medium">{item.quantity}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => updateQuantity(item.product.id, 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                  <span className="w-16 text-right font-bold text-sm">₱{(item.product.price * item.quantity).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 border-t mt-auto">
        <div className="flex justify-between items-center mb-6">
          <span className="font-semibold text-lg">Total</span>
          <span className="font-bold text-2xl text-primary">₱{cartTotal.toFixed(2)}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button size="lg" className="w-full bg-green-600 hover:bg-green-700 text-white" disabled={cart.length === 0}>
            <Banknote className="mr-2 h-5 w-5" /> Cash
          </Button>
          <Button size="lg" variant="outline" className="w-full" disabled={cart.length === 0}>
            <CreditCard className="mr-2 h-5 w-5" /> E-Wallet
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Main Content (Products) */}
      <div className="flex-1 flex flex-col w-full lg:w-2/3 max-w-7xl mx-auto border-r bg-white">
        {/* Header */}
        <header className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary">Peddlr Plus</h1>
            <p className="text-sm text-muted-foreground hidden sm:block">Seamless POS & Inventory</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-64 hidden sm:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products..."
                className="pl-9 bg-slate-100 border-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            {/* Mobile Cart Trigger */}
            <div className="lg:hidden">
              <Sheet>
                <SheetTrigger className="relative h-10 px-4 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Cart
                  {cart.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                      {cart.reduce((a, c) => a + c.quantity, 0)}
                    </span>
                  )}
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle>Current Order</SheetTitle>
                  </SheetHeader>
                  <CartContent />
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>

        {/* Categories Mobile Search */}
        <div className="px-4 py-3 sm:hidden">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              className="pl-9 bg-slate-100"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Categories Bar */}
        <ScrollArea className="w-full border-b bg-white">
          <div className="flex p-4 gap-2">
            {CATEGORIES.map(category => (
              <Badge 
                key={category} 
                variant={selectedCategory === category ? "default" : "secondary"}
                className="cursor-pointer text-sm px-4 py-1.5 whitespace-nowrap transition-colors"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        </ScrollArea>

        {/* Products Grid */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-50/50">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map(product => (
              <Card 
                key={product.id} 
                className="cursor-pointer hover:border-primary hover:shadow-md transition-all group overflow-hidden bg-white"
                onClick={() => addToCart(product)}
              >
                <div className="aspect-square bg-slate-100 flex items-center justify-center relative border-b group-hover:bg-slate-50 transition-colors">
                  {/* Placeholder for Product Image */}
                  <div className="text-4xl">🛒</div>
                  <Badge variant="secondary" className="absolute top-2 right-2 text-[10px] font-semibold bg-white/90 shadow-sm backdrop-blur-sm">
                    {product.stock} in stock
                  </Badge>
                </div>
                <CardContent className="p-3">
                  <h3 className="font-medium text-sm leading-tight line-clamp-2 min-h-[40px] group-hover:text-primary transition-colors">{product.name}</h3>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-bold text-lg text-primary">₱{product.price.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {filteredProducts.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-lg">No products found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Cart Sidebar */}
      <div className="hidden lg:flex flex-col w-1/3 min-w-[350px] max-w-[450px] bg-white p-6 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-20 relative">
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
          <h2 className="text-xl font-bold flex items-center">
            <ShoppingCart className="mr-2 h-5 w-5" /> Current Order
          </h2>
          <Badge variant="secondary" className="text-sm px-3 py-1 bg-slate-100">
            {cart.reduce((a, c) => a + c.quantity, 0)} items
          </Badge>
        </div>
        <CartContent />
      </div>
    </div>
  );
}
