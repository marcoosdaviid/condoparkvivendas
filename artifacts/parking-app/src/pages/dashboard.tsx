import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  CarFront, LogOut, Phone, Clock, Building2, MapPin,
  Loader2, Plus, HandHelping, CalendarDays, CheckCircle2,
  Car, KeyRound, UserCheck, CircleCheck, AlertCircle, Trash2,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  useGetAvailableSpots,
  useCreateSpot,
  useRemoveSpot,
  useExpressInterest,
  useConfirmOccupation,
  useVacateSpot,
  useGetSpotRequests,
  useCreateSpotRequest,
  useOfferSpotForRequest,
  useDeleteSpotRequest,
  getGetAvailableSpotsQueryKey,
  getGetSpotRequestsQueryKey,
  type ParkingSpot,
  type SpotRequest,
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Schemas ────────────────────────────────────────────────────────────────
const createSpotSchema = z.object({
  availableFrom: z.string().min(1, "Horário de início é obrigatório"),
  availableUntil: z.string().min(1, "Horário de término é obrigatório"),
});

const confirmSchema = z.object({
  occupantName: z.string().min(1, "Nome é obrigatório"),
  occupantApartment: z.string().min(1, "Apartamento é obrigatório"),
  carPlate: z.string().min(1, "Placa é obrigatória"),
  expectedExitTime: z.string().min(1, "Previsão de saída é obrigatória"),
});

const createRequestSchema = z.object({
  date: z.string().min(1, "Data é obrigatória"),
  startTime: z.string().min(1, "Horário de início é obrigatório"),
  endTime: z.string().min(1, "Horário de término é obrigatório"),
  reason: z.string().optional(),
});

// ─── Helpers ────────────────────────────────────────────────────────────────
const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();

const todayStr = () => new Date().toISOString().slice(0, 10);

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  AVAILABLE:            { label: "Disponível",           color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  PENDING_CONFIRMATION: { label: "Aguard. confirmação",  color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  OCCUPIED:             { label: "Ocupada",              color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  FINISHED:             { label: "Encerrada",            color: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" },
};

const invalidateSpots = (qc: ReturnType<typeof useQueryClient>) =>
  qc.invalidateQueries({ queryKey: getGetAvailableSpotsQueryKey() });

// ─── Dashboard ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, logout } = useAuth();
  const { data: spots, isLoading: spotsLoading } = useGetAvailableSpots();
  const { data: requests, isLoading: requestsLoading } = useGetSpotRequests();

  // Owner's active spot (any non-FINISHED status)
  const mySpot = spots?.find(
    (s) => s.userId === user?.id && s.status !== "FINISHED"
  );
  const otherSpots = spots?.filter((s) => s.userId !== user?.id) || [];
  const myRequest = requests?.find((r) => r.userId === user?.id);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      {/* CABEÇALHO */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-md shadow-primary/20">
              <CarFront className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-display font-bold text-lg tracking-tight">CondoPark</h1>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="focus:outline-none hover:opacity-80 transition-opacity">
                <Avatar className="h-8 w-8 border-2 border-white dark:border-slate-800 shadow-sm">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                    {user?.name ? getInitials(user.name) : "U"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-semibold">{user?.name}</p>
                <p className="text-xs text-muted-foreground">Apto {user?.apartment}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:bg-destructive/10 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="max-w-md mx-auto p-4 space-y-6 mt-4">
        <div className="px-1">
          <h2 className="text-2xl font-display font-semibold text-slate-900 dark:text-white">
            Olá, {user?.name?.split(" ")[0]} 👋
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Compartilhe ou encontre uma vaga hoje.</p>
        </div>

        {/* BOTÕES DE AÇÃO RÁPIDA */}
        <div className="grid grid-cols-2 gap-3">
          <AnimatePresence mode="popLayout">
            {spotsLoading ? (
              <Skeleton className="h-14 rounded-2xl" />
            ) : mySpot ? (
              <motion.div key="my-spot-btn" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <MySpotQuickButton spot={mySpot} userId={user!.id} />
              </motion.div>
            ) : (
              <motion.div key="create-spot-btn" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <CreateSpotDialog userId={user!.id} />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="popLayout">
            {requestsLoading ? (
              <Skeleton className="h-14 rounded-2xl" />
            ) : myRequest ? (
              <motion.div key="my-req-btn" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <ActiveRequestButton request={myRequest} />
              </motion.div>
            ) : (
              <motion.div key="create-req-btn" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <CreateRequestDialog userId={user!.id} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* MINHA VAGA — CARD DE ESTADO DETALHADO (apenas dono) */}
        <AnimatePresence>
          {mySpot && (
            <motion.div key="owner-card" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <OwnerSpotCard spot={mySpot} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ABAS: VAGAS / PEDIDOS */}
        <Tabs defaultValue="spots" className="w-full">
          <TabsList className="w-full grid grid-cols-2 rounded-xl h-11 bg-slate-100/80 dark:bg-slate-800/80 p-1">
            <TabsTrigger value="spots" className="rounded-lg text-sm font-semibold">
              <MapPin className="w-4 h-4 mr-1.5" /> Vagas
            </TabsTrigger>
            <TabsTrigger value="requests" className="rounded-lg text-sm font-semibold">
              <HandHelping className="w-4 h-4 mr-1.5" /> Pedidos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="spots" className="mt-4 space-y-4">
            {spotsLoading ? (
              <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)}</div>
            ) : otherSpots.length === 0 ? (
              <EmptyState icon={<CarFront className="w-8 h-8 text-slate-400" />} title="Nenhuma vaga por aqui" desc="Seja o primeiro a compartilhar sua vaga hoje!" />
            ) : (
              <div className="space-y-4">
                {otherSpots.map((spot, i) => (
                  <motion.div key={spot.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <SpotCard spot={spot} currentUserId={user!.id} />
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests" className="mt-4 space-y-4">
            {requestsLoading ? (
              <div className="space-y-4">{[1, 2].map((i) => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}</div>
            ) : !requests || requests.length === 0 ? (
              <EmptyState icon={<HandHelping className="w-8 h-8 text-slate-400" />} title="Nenhum pedido ainda" desc="Nenhum morador solicitou vaga por enquanto." />
            ) : (
              <div className="space-y-4">
                {requests.map((req, i) => (
                  <motion.div key={req.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <RequestCard request={req} currentUserId={user!.id} />
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ─── Componentes de suporte ─────────────────────────────────────────────────

function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-14 px-4 text-center bg-white dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
      <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">{icon}</div>
      <h3 className="text-lg font-display font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-[250px] text-sm">{desc}</p>
    </motion.div>
  );
}

// Botão rápido do dono que reflete o status atual
function MySpotQuickButton({ spot, userId }: { spot: ParkingSpot; userId: number }) {
  const statusConfig = {
    AVAILABLE:            { label: "Minha vaga ativa",        icon: <CheckCircle2 className="w-4 h-4 mb-0.5" />, cls: "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10" },
    PENDING_CONFIRMATION: { label: "Confirmar uso",           icon: <UserCheck className="w-4 h-4 mb-0.5" />,    cls: "border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400" },
    OCCUPIED:             { label: "Desocupar vaga",          icon: <KeyRound className="w-4 h-4 mb-0.5" />,     cls: "border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-700 dark:bg-red-950/30 dark:text-red-400" },
    FINISHED:             { label: "Encerrada",               icon: <CircleCheck className="w-4 h-4 mb-0.5" />,  cls: "border-slate-200 bg-slate-50 text-slate-500" },
  }[spot.status] ?? { label: spot.status, icon: null, cls: "" };

  if (spot.status === "PENDING_CONFIRMATION") {
    return <ConfirmOccupationDialog spot={spot} triggerCls={statusConfig.cls} triggerLabel={statusConfig.label} triggerIcon={statusConfig.icon} />;
  }
  if (spot.status === "OCCUPIED") {
    return <VacateButton spot={spot} triggerCls={statusConfig.cls} triggerLabel={statusConfig.label} triggerIcon={statusConfig.icon} />;
  }
  // AVAILABLE → allow remove
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="lg" className={`w-full h-14 rounded-2xl font-semibold text-sm flex-col gap-0.5 px-3 ${statusConfig.cls}`}>
          {statusConfig.icon}
          <span className="leading-tight text-center">{statusConfig.label}</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Remover anúncio?</AlertDialogTitle>
          <AlertDialogDescription>Sua vaga será removida da lista imediatamente.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
          <RemoveSpotAction spotId={spot.id} />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function RemoveSpotAction({ spotId }: { spotId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { mutate, isPending } = useRemoveSpot({
    mutation: {
      onSuccess: () => {
        invalidateSpots(queryClient);
        toast({ title: "Anúncio removido" });
      },
      onError: () => toast({ title: "Erro ao remover", variant: "destructive" }),
    },
  });
  return (
    <AlertDialogAction onClick={() => mutate({ id: spotId })} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isPending}>
      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remover"}
    </AlertDialogAction>
  );
}

// Card de status detalhado só para o dono
function OwnerSpotCard({ spot }: { spot: ParkingSpot }) {
  const st = STATUS_LABEL[spot.status] ?? { label: spot.status, color: "" };

  return (
    <Card className="rounded-3xl border border-primary/15 bg-primary/5 dark:bg-primary/10 p-5 space-y-3 shadow-inner overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

      <div className="flex items-center gap-2">
        <Badge className={`border-0 text-xs font-bold uppercase tracking-wider ${st.color}`}>
          {st.label}
        </Badge>
        <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> {spot.availableFrom} às {spot.availableUntil}
        </span>
      </div>

      {spot.status === "PENDING_CONFIRMATION" && spot.interestedUserName && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl border border-yellow-200 dark:border-yellow-800 space-y-1">
          <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 uppercase tracking-wider">Interessado</p>
          <p className="font-semibold text-slate-900 dark:text-slate-100">{spot.interestedUserName} · Apto {spot.interestedUserApartment}</p>
          <a href={`tel:${spot.interestedUserPhone}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
            <Phone className="w-3.5 h-3.5" /> {spot.interestedUserPhone}
          </a>
          <ConfirmOccupationDialog spot={spot}
            triggerCls="border-yellow-400 bg-yellow-400 text-white hover:bg-yellow-500 mt-2 w-full h-11"
            triggerLabel="Confirmar uso" triggerIcon={<UserCheck className="w-4 h-4 mr-2" />} asInline />
        </div>
      )}

      {spot.status === "OCCUPIED" && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 space-y-1">
          <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider">Em uso</p>
          <p className="font-semibold text-slate-900 dark:text-slate-100">{spot.occupantName} · Apto {spot.occupantApartment}</p>
          <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1"><Car className="w-3.5 h-3.5" /> {spot.carPlate}</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Saída: {spot.expectedExitTime}</span>
          </div>
          <VacateButton spot={spot}
            triggerCls="border-red-400 bg-red-500 text-white hover:bg-red-600 mt-2 w-full h-11"
            triggerLabel="Marcar como desocupada" triggerIcon={<CheckCircle2 className="w-4 h-4 mr-2" />} asInline />
        </div>
      )}
    </Card>
  );
}

// ─── Dialogs / Actions ──────────────────────────────────────────────────────

function CreateSpotDialog({ userId }: { userId: number }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const form = useForm<z.infer<typeof createSpotSchema>>({
    resolver: zodResolver(createSpotSchema),
    defaultValues: { availableFrom: "09:00", availableUntil: "17:00" },
  });
  const { mutate, isPending } = useCreateSpot({
    mutation: {
      onSuccess: () => {
        invalidateSpots(queryClient);
        setOpen(false);
        toast({ title: "Vaga compartilhada!", description: "Obrigado por ajudar o condomínio." });
        form.reset();
      },
      onError: (err: any) => toast({ title: "Erro ao compartilhar", description: err?.error || "Ocorreu um erro.", variant: "destructive" }),
    },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full h-14 rounded-2xl shadow-lg shadow-primary/25 font-semibold text-sm relative overflow-hidden group flex-col gap-0.5 px-3">
          <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out skew-x-12" />
          <Plus className="w-4 h-4 mb-0.5" />
          <span className="leading-tight">Liberar minha vaga</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Liberar Vaga</DialogTitle>
          <DialogDescription>Informe o horário em que sua vaga estará livre hoje.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutate({ data: { userId, ...v } }))} className="space-y-6 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="availableFrom">Disponível das</Label>
              <Input type="time" id="availableFrom" className="h-12 rounded-xl" {...form.register("availableFrom")} />
              {form.formState.errors.availableFrom && <p className="text-xs text-destructive">{form.formState.errors.availableFrom.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="availableUntil">Até</Label>
              <Input type="time" id="availableUntil" className="h-12 rounded-xl" {...form.register("availableUntil")} />
              {form.formState.errors.availableUntil && <p className="text-xs text-destructive">{form.formState.errors.availableUntil.message}</p>}
            </div>
          </div>
          <Button type="submit" className="w-full h-12 rounded-xl text-base shadow-lg shadow-primary/25" disabled={isPending}>
            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Publicar Anúncio"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmOccupationDialog({
  spot, triggerCls, triggerLabel, triggerIcon, asInline,
}: { spot: ParkingSpot; triggerCls: string; triggerLabel: string; triggerIcon: React.ReactNode; asInline?: boolean }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const form = useForm<z.infer<typeof confirmSchema>>({
    resolver: zodResolver(confirmSchema),
    defaultValues: {
      occupantName: spot.interestedUserName ?? "",
      occupantApartment: spot.interestedUserApartment ?? "",
      carPlate: "",
      expectedExitTime: spot.availableUntil,
    },
  });
  const { mutate, isPending } = useConfirmOccupation({
    mutation: {
      onSuccess: () => {
        invalidateSpots(queryClient);
        setOpen(false);
        toast({ title: "Uso confirmado!", description: "A vaga está agora ocupada." });
      },
      onError: (err: any) => toast({ title: "Erro", description: err?.error || "Ocorreu um erro.", variant: "destructive" }),
    },
  });
  const trigger = (
    <Button variant={asInline ? "default" : "outline"} size="lg"
      className={asInline
        ? `rounded-2xl font-semibold text-sm flex items-center justify-center ${triggerCls}`
        : `w-full h-14 rounded-2xl font-semibold text-sm flex-col gap-0.5 px-3 ${triggerCls}`
      }>
      {triggerIcon}
      <span className="leading-tight">{triggerLabel}</span>
    </Button>
  );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Confirmar Uso da Vaga</DialogTitle>
          <DialogDescription>Preencha os dados de quem vai usar a vaga.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutate({ id: spot.id, data: v }))} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Nome do usuário</Label>
            <Input className="h-12 rounded-xl" placeholder="Nome completo" {...form.register("occupantName")} />
            {form.formState.errors.occupantName && <p className="text-xs text-destructive">{form.formState.errors.occupantName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Apartamento</Label>
            <Input className="h-12 rounded-xl" placeholder="Apto 4B" {...form.register("occupantApartment")} />
            {form.formState.errors.occupantApartment && <p className="text-xs text-destructive">{form.formState.errors.occupantApartment.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Placa do carro</Label>
              <Input className="h-12 rounded-xl uppercase" placeholder="ABC1D23" {...form.register("carPlate")} />
              {form.formState.errors.carPlate && <p className="text-xs text-destructive">{form.formState.errors.carPlate.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Previsão de saída</Label>
              <Input type="time" className="h-12 rounded-xl" {...form.register("expectedExitTime")} />
              {form.formState.errors.expectedExitTime && <p className="text-xs text-destructive">{form.formState.errors.expectedExitTime.message}</p>}
            </div>
          </div>
          <Button type="submit" className="w-full h-12 rounded-xl text-base" disabled={isPending}>
            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar Uso"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function VacateButton({
  spot, triggerCls, triggerLabel, triggerIcon, asInline,
}: { spot: ParkingSpot; triggerCls: string; triggerLabel: string; triggerIcon: React.ReactNode; asInline?: boolean }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { mutate, isPending } = useVacateSpot({
    mutation: {
      onSuccess: (data: any) => {
        invalidateSpots(queryClient);
        const msg = data?.status === "AVAILABLE"
          ? "Vaga de volta como disponível!"
          : "Vaga marcada como encerrada.";
        toast({ title: "Vaga desocupada", description: msg });
      },
      onError: (err: any) => toast({ title: "Erro", description: err?.error || "Ocorreu um erro.", variant: "destructive" }),
    },
  });
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={asInline ? "default" : "outline"} size="lg"
          className={asInline
            ? `rounded-2xl font-semibold text-sm flex items-center justify-center ${triggerCls}`
            : `w-full h-14 rounded-2xl font-semibold text-sm flex-col gap-0.5 px-3 ${triggerCls}`
          } disabled={isPending}>
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : triggerIcon}
          <span className="leading-tight">{triggerLabel}</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Marcar como desocupada?</AlertDialogTitle>
          <AlertDialogDescription>
            Se o horário de disponibilidade ainda não terminou, a vaga voltará a ficar <strong>Disponível</strong> automaticamente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => mutate({ id: spot.id })} className="rounded-xl">Confirmar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── SpotCard para outros usuários ──────────────────────────────────────────
function SpotCard({ spot, currentUserId }: { spot: ParkingSpot; currentUserId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isInterestedUser = spot.interestedUserId === currentUserId;
  const st = STATUS_LABEL[spot.status] ?? { label: spot.status, color: "" };

  const { mutate: expressInterest, isPending: expressing } = useExpressInterest({
    mutation: {
      onSuccess: () => {
        invalidateSpots(queryClient);
        toast({ title: "Interesse expresso!", description: "Aguarde a confirmação do dono." });
      },
      onError: (err: any) => toast({ title: "Erro", description: err?.error || "Ocorreu um erro.", variant: "destructive" }),
    },
  });

  return (
    <Card className="overflow-hidden rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-slate-900/50 dark:border-slate-800">
      <div className="p-5 flex items-start gap-4">
        <Avatar className="h-12 w-12 border-2 border-slate-50 dark:border-slate-800 shadow-sm">
          <AvatarFallback className="bg-gradient-to-br from-indigo-100 to-sky-100 text-indigo-700 dark:from-indigo-900 dark:to-sky-900 dark:text-indigo-200 font-bold text-sm">
            {getInitials(spot.userName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 font-display text-lg">{spot.userName}</h3>
            <Badge className={`border-0 text-xs font-semibold ${st.color}`}>{st.label}</Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
            <Building2 className="w-3.5 h-3.5" /> Apto {spot.userApartment}
          </p>
          <div className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl px-3 py-2.5 w-fit border border-slate-200/50 dark:border-slate-700/50">
            <Clock className="w-4 h-4 text-primary" />
            {spot.availableFrom} <span className="text-slate-400 font-normal mx-1">às</span> {spot.availableUntil}
          </div>

          {/* Ocupante visível para todos */}
          {spot.status === "OCCUPIED" && spot.occupantName && (
            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5" /> {spot.carPlate} · saída {spot.expectedExitTime}
            </div>
          )}
        </div>
      </div>

      <div className="px-5 pb-5 pt-0">
        {spot.status === "AVAILABLE" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="w-full font-semibold shadow-sm h-12 rounded-xl hover:-translate-y-0.5 transition-transform" disabled={expressing}>
                {expressing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <AlertCircle className="w-4 h-4 mr-2" />}
                Tenho interesse
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar interesse?</AlertDialogTitle>
                <AlertDialogDescription>
                  O dono da vaga ({spot.userName}) será notificado e poderá confirmar o uso.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => expressInterest({ id: spot.id, data: { interestedUserId: currentUserId } })} className="rounded-xl">
                  Confirmar interesse
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {spot.status === "PENDING_CONFIRMATION" && isInterestedUser && (
          <div className="flex items-center justify-center gap-2 h-12 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 text-sm font-medium">
            <Loader2 className="w-4 h-4 animate-spin" /> Aguardando confirmação do dono...
          </div>
        )}

        {spot.status === "PENDING_CONFIRMATION" && !isInterestedUser && (
          <div className="flex items-center justify-center gap-2 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 text-sm">
            Reservada — aguardando confirmação
          </div>
        )}

        {spot.status === "OCCUPIED" && (
          <div className="flex items-center justify-center gap-2 h-12 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium">
            <Car className="w-4 h-4" /> Ocupada no momento
          </div>
        )}

        {spot.status === "FINISHED" && (
          <div className="flex items-center justify-center gap-2 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 text-sm">
            <CircleCheck className="w-4 h-4" /> Encerrada
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Pedidos ─────────────────────────────────────────────────────────────────

function CreateRequestDialog({ userId }: { userId: number }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const form = useForm<z.infer<typeof createRequestSchema>>({
    resolver: zodResolver(createRequestSchema),
    defaultValues: { date: todayStr(), startTime: "08:00", endTime: "18:00", reason: "" },
  });
  const { mutate, isPending } = useCreateSpotRequest({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSpotRequestsQueryKey() });
        setOpen(false);
        toast({ title: "Pedido enviado!" });
        form.reset({ date: todayStr(), startTime: "08:00", endTime: "18:00", reason: "" });
      },
      onError: (err: any) => toast({ title: "Erro ao enviar pedido", description: err?.error || "Ocorreu um erro.", variant: "destructive" }),
    },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" variant="outline" className="w-full h-14 rounded-2xl border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400 font-semibold text-sm flex-col gap-0.5 px-3">
          <HandHelping className="w-4 h-4 mb-0.5" />
          <span className="leading-tight">Preciso de vaga</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Solicitar Vaga</DialogTitle>
          <DialogDescription>Informe quando você precisa de uma vaga.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutate({ data: { userId, ...v, reason: v.reason || null } }))} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" className="h-12 rounded-xl" {...form.register("date")} />
            {form.formState.errors.date && <p className="text-xs text-destructive">{form.formState.errors.date.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Das</Label>
              <Input type="time" className="h-12 rounded-xl" {...form.register("startTime")} />
            </div>
            <div className="space-y-2">
              <Label>Até</Label>
              <Input type="time" className="h-12 rounded-xl" {...form.register("endTime")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Motivo <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Input placeholder="ex: visita, mudança..." className="h-12 rounded-xl" {...form.register("reason")} />
          </div>
          <Button type="submit" className="w-full h-12 rounded-xl text-base" disabled={isPending}>
            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enviar Pedido"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ActiveRequestButton({ request }: { request: SpotRequest }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { mutate, isPending } = useDeleteSpotRequest({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSpotRequestsQueryKey() });
        toast({ title: "Pedido removido" });
      },
      onError: () => toast({ title: "Erro ao remover", variant: "destructive" }),
    },
  });
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="lg" variant="outline" className="w-full h-14 rounded-2xl border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400 font-semibold text-sm flex-col gap-0.5 px-3" disabled={isPending}>
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mb-0.5" />}
          <span className="leading-tight">Meu pedido ativo</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar pedido?</AlertDialogTitle>
          <AlertDialogDescription>Seu pedido será removido da lista.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Manter</AlertDialogCancel>
          <AlertDialogAction onClick={() => mutate({ id: request.id })} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Cancelar pedido
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function RequestCard({ request, currentUserId }: { request: SpotRequest; currentUserId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isOwner = request.userId === currentUserId;
  const isMatched = request.status === "matched";

  const { mutate: offerSpot, isPending } = useOfferSpotForRequest({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSpotRequestsQueryKey() });
        toast({ title: "Vaga oferecida!", description: "O morador foi combinado com você." });
      },
      onError: (err: any) => toast({ title: "Erro", description: err?.error || "Ocorreu um erro.", variant: "destructive" }),
    },
  });

  return (
    <Card className={`overflow-hidden rounded-3xl border shadow-sm bg-white dark:bg-slate-900/50 ${isMatched ? "border-green-200 dark:border-green-800" : "border-amber-100 dark:border-amber-900/50"}`}>
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="h-11 w-11 border-2 border-slate-50 dark:border-slate-800 shadow-sm shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700 dark:from-amber-900 dark:to-orange-900 dark:text-amber-200 font-bold text-sm">
              {getInitials(request.userName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 font-display">{request.userName}</h3>
              <Badge className={`border-0 text-xs px-2 ${isMatched ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"}`}>
                {isMatched ? "Atendido" : "Em aberto"}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
              <Building2 className="w-3.5 h-3.5" /> Apto {request.userApartment}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2.5 mb-3">
          <CalendarDays className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="font-medium">{new Date(request.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}</span>
          <span className="text-slate-400 mx-1">·</span>
          <Clock className="w-4 h-4 text-amber-500 shrink-0" />
          <span>{request.startTime} às {request.endTime}</span>
        </div>

        {request.reason && (
          <p className="text-sm text-slate-500 dark:text-slate-400 px-1 italic mb-3">"{request.reason}"</p>
        )}

        {isMatched && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-800 space-y-2 mb-2">
            <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Combinado! Contactem-se:
            </p>
            <a href={`tel:${request.userPhone}`} className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200 hover:text-primary">
              <Phone className="w-3.5 h-3.5 text-primary" /> {request.userName}: {request.userPhone}
            </a>
            {request.offeredByUserPhone && (
              <a href={`tel:${request.offeredByUserPhone}`} className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200 hover:text-primary">
                <Phone className="w-3.5 h-3.5 text-primary" /> {request.offeredByUserName}: {request.offeredByUserPhone}
              </a>
            )}
          </div>
        )}

        {!isOwner && !isMatched && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-sm hover:-translate-y-0.5 transition-transform" disabled={isPending}>
                {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <HandHelping className="w-4 h-4 mr-2" />}
                Oferecer minha vaga
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Oferecer sua vaga?</AlertDialogTitle>
                <AlertDialogDescription>Você e {request.userName} receberão os telefones um do outro para combinar.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => offerSpot({ id: request.id, data: { offeredByUserId: currentUserId } })} className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white">
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {isOwner && isMatched && (
          <p className="text-center text-sm text-green-700 dark:text-green-400 font-medium">
            Um morador ofereceu a vaga! Entre em contato acima.
          </p>
        )}
      </div>
    </Card>
  );
}
