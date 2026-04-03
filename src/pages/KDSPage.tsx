import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Clock, ChefHat, CheckCircle2, AlertCircle, MessageSquare, Package, ArrowLeft, Utensils, Hand } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type KDSMode = "kitchen" | "server";

interface KDSTicket {
  id: string;
  name: string;
  quantity: number;
  status: string;
  notes: string | null;
  fired_at: string | null;
  combo_items: any;
  orderId: string;
  tableNumber: string | null;
  serviceMode: string;
  collectionNumber?: string;
  modifiers: { name: string; price: number }[];
}

const statusConfig: Record<string, { label: string; border: string; bg: string; text: string; icon: React.FC<{ className?: string }> }> = {
  new: { label: "NEW", border: "border-primary", bg: "bg-status-blue-light", text: "text-primary", icon: Clock },
  preparing: { label: "PREPARING", border: "border-status-amber", bg: "bg-status-amber-light", text: "text-status-amber", icon: ChefHat },
  ready: { label: "READY", border: "border-status-green", bg: "bg-status-green-light", text: "text-status-green", icon: CheckCircle2 },
};

function getElapsedMin(firedAt?: string | null) {
  if (!firedAt) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(firedAt).getTime()) / 60000));
}

function getTimerColor(elapsed: number): string {
  if (elapsed <= 5) return "text-status-green";
  if (elapsed <= 10) return "text-status-amber";
  return "text-status-red";
}

const KDSPage: React.FC = () => {
  const [mode, setMode] = useState<KDSMode>("kitchen");
  const [tickets, setTickets] = useState<KDSTicket[]>([]);

  const loadTickets = useCallback(async () => {
    const { data: orders } = await supabase
      .from("orders")
      .select("id, table_number, service_mode")
      .not("status", "in", '("paid","void")');

    if (!orders || orders.length === 0) { setTickets([]); return; }

    const orderIds = orders.map(o => o.id);
    const orderMap = new Map(orders.map(o => [o.id, o]));

    const { data: items } = await supabase
      .from("order_items")
      .select("*")
      .in("order_id", orderIds)
      .neq("status", "served");

    if (!items || items.length === 0) { setTickets([]); return; }

    const itemIds = items.map(i => i.id);
    const { data: mods } = await supabase
      .from("order_item_modifiers")
      .select("*")
      .in("order_item_id", itemIds);

    const result: KDSTicket[] = items.map(item => {
      const order = orderMap.get(item.order_id);
      return {
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        status: item.status,
        notes: item.notes,
        fired_at: item.fired_at,
        combo_items: item.combo_items,
        orderId: item.order_id,
        tableNumber: order?.table_number || null,
        serviceMode: order?.service_mode || "dine-in",
        modifiers: (mods || []).filter(m => m.order_item_id === item.id).map(m => ({ name: m.name, price: Number(m.price) })),
      };
    });
    setTickets(result);
  }, []);

  useEffect(() => {
    loadTickets();
    const channel = supabase
      .channel("kds-operational")
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => loadTickets())
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadTickets())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadTickets]);

  const updateItemStatus = async (itemId: string, newStatus: string) => {
    const now = new Date().toISOString();
    const updates: Record<string, any> = { status: newStatus as any };
    if (newStatus === "preparing") updates.fired_at = now;
    await supabase.from("order_items").update(updates).eq("id", itemId);
    loadTickets();
  };

  // Kitchen mode: show new + preparing columns
  // Server mode: show ready column only
  const kitchenStatuses = ["new", "preparing", "ready"] as const;
  const serverTickets = tickets.filter(t => t.status === "ready");

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Link to="/" className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center hover:bg-accent/80 transition-colors">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Kitchen Display</h1>
            <p className="text-[12px] text-muted-foreground">{tickets.length} active tickets</p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-1 bg-accent rounded-lg p-1">
          <button
            onClick={() => setMode("kitchen")}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-medium transition-all",
              mode === "kitchen" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            <ChefHat className="h-4 w-4" /> Kitchen
          </button>
          <button
            onClick={() => setMode("server")}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-medium transition-all",
              mode === "server" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            <Utensils className="h-4 w-4" /> Server / Collection
          </button>
        </div>
      </div>

      {mode === "kitchen" ? (
        <div className="grid grid-cols-3 gap-5">
          {kitchenStatuses.map(status => {
            const config = statusConfig[status];
            const statusTickets = tickets.filter(t => t.status === status);
            return (
              <div key={status}>
                <div className="flex items-center gap-2 mb-3">
                  <config.icon className={`h-4 w-4 ${config.text}`} />
                  <span className="section-label">{config.label}</span>
                  <span className={`ml-auto text-[11px] font-bold px-2 py-0.5 rounded-md ${config.bg} ${config.text}`}>
                    {statusTickets.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {statusTickets.map(ticket => (
                    <TicketCard
                      key={ticket.id}
                      ticket={ticket}
                      config={config}
                      mode="kitchen"
                      onAction={updateItemStatus}
                    />
                  ))}
                  {statusTickets.length === 0 && (
                    <div className="uniweb-card p-8 flex items-center justify-center">
                      <span className="text-[12px] text-muted-foreground">No tickets</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Hand className="h-4 w-4 text-status-green" />
            <span className="section-label">READY FOR PICKUP / SERVE</span>
            <span className="ml-2 text-[11px] font-bold px-2 py-0.5 rounded-md bg-status-green-light text-status-green">
              {serverTickets.length}
            </span>
          </div>
          {serverTickets.length === 0 ? (
            <div className="uniweb-card p-12 text-center">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground text-[13px]">All items served</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {serverTickets.map(ticket => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  config={statusConfig.ready}
                  mode="server"
                  onAction={updateItemStatus}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function TicketCard({ ticket, config, mode, onAction }: {
  ticket: KDSTicket;
  config: typeof statusConfig["new"];
  mode: KDSMode;
  onAction: (id: string, status: string) => void;
}) {
  const elapsed = getElapsedMin(ticket.fired_at);
  const timerColor = getTimerColor(elapsed);
  const isUrgent = elapsed > 10;
  const comboItems = Array.isArray(ticket.combo_items) ? ticket.combo_items : [];

  const isDineIn = ticket.serviceMode === "dine-in";
  const locationLabel = isDineIn
    ? (ticket.tableNumber ? `T${ticket.tableNumber}` : "—")
    : ticket.serviceMode.toUpperCase();

  return (
    <div className={cn("uniweb-card border-l-4 p-4", config.border, isUrgent && ticket.status !== "ready" && "animate-pulse")}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-foreground text-[14px]">{locationLabel}</span>
          <span className="text-[10px] text-muted-foreground font-mono uppercase">{ticket.serviceMode}</span>
        </div>
        <span className={cn("text-[11px] font-bold font-mono", timerColor)}>
          {elapsed}m
        </span>
      </div>

      <div className="flex items-start justify-between mb-1">
        <span className="text-[14px] font-semibold text-foreground leading-tight">{ticket.name}</span>
        <span className="text-[13px] font-bold text-foreground bg-accent px-2 py-0.5 rounded-md ml-2 shrink-0">×{ticket.quantity}</span>
      </div>

      {comboItems.length > 0 && (
        <div className="mt-2 mb-1 pl-2 border-l-2 border-primary/20 space-y-0.5">
          <div className="flex items-center gap-1 mb-1">
            <Package className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-wide">Combo</span>
          </div>
          {comboItems.map((ci: any, idx: number) => (
            <div key={idx} className="text-[12px] text-foreground">
              <span className="text-muted-foreground">{ci.groupName}:</span> <span className="font-medium">{ci.name}</span>
            </div>
          ))}
        </div>
      )}

      {ticket.modifiers.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {ticket.modifiers.map((m, idx) => (
            <span key={idx} className="text-[11px] bg-accent text-foreground px-2 py-0.5 rounded-md font-medium">
              {m.name}
            </span>
          ))}
        </div>
      )}

      {ticket.notes && (
        <div className="mt-2 flex items-start gap-1.5 bg-status-amber-light/50 rounded-md px-2.5 py-1.5">
          <MessageSquare className="h-3 w-3 text-status-amber mt-0.5 shrink-0" />
          <span className="text-[11px] text-foreground font-medium leading-snug">{ticket.notes}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-3">
        {mode === "kitchen" && ticket.status === "new" && (
          <Button size="sm" className="w-full" onClick={() => onAction(ticket.id, "preparing")}>
            <ChefHat className="h-3.5 w-3.5 mr-1.5" /> Start
          </Button>
        )}
        {mode === "kitchen" && ticket.status === "preparing" && (
          <Button size="sm" variant="outline" className="w-full border-status-green text-status-green hover:bg-status-green-light" onClick={() => onAction(ticket.id, "ready")}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Done
          </Button>
        )}
        {mode === "server" && ticket.status === "ready" && (
          <Button size="sm" className="w-full bg-status-green hover:bg-status-green/90 text-white" onClick={() => onAction(ticket.id, "served")}>
            <Utensils className="h-3.5 w-3.5 mr-1.5" /> {isDineIn ? "Served" : "Collected"}
          </Button>
        )}
      </div>
    </div>
  );
}

export default KDSPage;
