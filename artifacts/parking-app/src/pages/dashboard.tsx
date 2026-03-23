import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  CarFront, LogOut, Phone, Clock, Building2, MapPin,
  Loader2, Plus, HandHelping, CalendarDays, CheckCircle2,
  Car, KeyRound, UserCheck, CircleCheck, AlertCircle, Trash2,
  MessageCircle, Settings, RotateCcw, X,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  useGetAvailableSpots,
  useGetMySpot,
  useCreateSpot,
  useRemoveSpot,
  useExpressInterest,
  useConfirmOccupation,
  useDeclineApproval,
  useVacateSpot,
  useGetSpotRequests,
  useCreateSpotRequest,
  useOfferSpotForRequest,
  useDeleteSpotRequest,
  useUpdateProfile,
  useChangePassword,
  getGetAvailableSpotsQueryKey,
  getGetMySpotQueryKey,
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
import { Switch } from "@/components/ui/switch";
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
  spotType: z.enum(["ONE_TIME", "RECURRING"]),
  daysOfWeek: z.array(z.string()).optional(),
  date: z.string().optional(),
  endDate: z.string().optional(),
  availableFrom: z.string().min(1, "Horário de início é obrigatório"),
  availableUntil: z.string().min(1, "Horário de término é obrigatório"),
}).superRefine((data, ctx) => {
  if (data.spotType === "RECURRING" && (!data.daysOfWeek || data.daysOfWeek.length === 0)) {
    ctx.addIssue({ code: "custom", path: ["daysOfWeek"], message: "Selecione pelo menos um dia" });
  }
  if (data.spotType === "ONE_TIME" && !data.date) {
    ctx.addIssue({ code: "custom", path: ["date"], message: "Data de início é obrigatória" });
  }
  if (data.spotType === "ONE_TIME" && data.date && data.endDate && data.endDate < data.date) {
    ctx.addIssue({ code: "custom", path: ["endDate"], message: "Término não pode ser antes do início" });
  }
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

const profileSchema = z.object({
  carPlate: z.string().optional(),
  wantsToRequestSpot: z.boolean().optional(),
  hasParkingSpot: z.boolean().optional(),
  parkingSpotNumber: z.string().optional(),
});
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual é obrigatória"),
  newPassword: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(1, "Confirme a nova senha"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

// ─── Helpers ────────────────────────────────────────────────────────────────
const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();

const todayStr = () => new Date().toISOString().slice(0, 10);

const DAYS_OF_WEEK = [
  { key: "sun", label: "Dom" },
  { key: "mon", label: "Seg" },
  { key: "tue", label: "Ter" },
  { key: "wed", label: "Qua" },
  { key: "thu", label: "Qui" },
  { key: "fri", label: "Sex" },
  { key: "sat", label: "Sáb" },
];

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  AVAILABLE: { label: "Disponível", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  PENDING_CONFIRMATION: { label: "Aguard. confirmação", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  OCCUPIED: { label: "Ocupada", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  FINISHED: { label: "Encerrada", color: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" },
};

const invalidateSpots = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: getGetAvailableSpotsQueryKey() });
  qc.invalidateQueries({ queryKey: getGetMySpotQueryKey() });
};

const invalidateRequests = (qc: ReturnType<typeof useQueryClient>) =>
  qc.invalidateQueries({ queryKey: getGetSpotRequestsQueryKey() });

// ─── Dashboard ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, logout, login } = useAuth();
  const { data: spots, isLoading: spotsLoading } = useGetAvailableSpots();
  const { data: requests, isLoading: requestsLoading } = useGetSpotRequests();

  const mySpots = spots?.filter((s) => s.userId === user?.id) || [];
  const otherSpots = spots?.filter((s) => s.userId !== user?.id) || [];
  const myOccupiedSpot = otherSpots.find((s) => s.interestedUserId === user?.id && s.status === "OCCUPIED");
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
            <h1 className="font-display font-bold text-lg tracking-tight">CondoPark Vivendas</h1>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="focus:outline-none hover:opacity-80 transition-opacity relative">
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
                {user?.carPlate && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Car className="w-3 h-3" /> {user.carPlate}
                  </p>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ProfileEditTrigger
                userId={user!.id}
                currentCarPlate={user?.carPlate}
                currentWants={user?.wantsToRequestSpot}
                currentHasSpot={user?.hasParkingSpot}
                currentParkingSpotNumber={user?.parkingSpotNumber}
                onUpdate={login}
              />
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:bg-destructive/10 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="max-w-md mx-auto p-4 space-y-5 mt-4">
        <div className="px-1">
          <h2 className="text-2xl font-display font-semibold text-slate-900 dark:text-white">
            Olá, {user?.name?.split(" ")[0]} 👋
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Compartilhe ou encontre uma vaga hoje.</p>
        </div>

        {/* BOTÕES DE AÇÃO RÁPIDA */}
        <div className="w-full">
          <AnimatePresence mode="popLayout">
            <motion.div key="create-spot-btn" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <CreateSpotDialog
                userId={user!.id}
                parkingSpotNumber={user?.parkingSpotNumber}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* MINHAS VAGAS — CARDS DETALHADOS */}
        {mySpots.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2 px-1">
              <h3 className="text-lg font-display font-semibold text-slate-900 dark:text-white">Minhas vagas publicadas</h3>
            </div>
            <AnimatePresence>
              {mySpots.map(spot => (
                <motion.div key={`owner-card-${spot.id}`} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <OwnerSpotCard spot={spot} parkingSpotNumber={user?.parkingSpotNumber} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* VAGA QUE ESTOU USANDO — CARD DO OCUPANTE */}
        <AnimatePresence>
          {myOccupiedSpot && (
            <motion.div key="occupant-card" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <OccupantSpotCard spot={myOccupiedSpot} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full">
          <div className="flex items-center gap-2 mb-4 px-1">
            <MapPin className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-display font-semibold text-slate-900 dark:text-white">Vagas Disponíveis</h3>
          </div>

          <div className="space-y-4">
            {spotsLoading ? (
              <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}</div>
            ) : otherSpots.length === 0 ? (
              <EmptyState icon={<CarFront className="w-8 h-8 text-slate-400" />} title="Nenhuma vaga por aqui" desc="Seja o primeiro a compartilhar sua vaga hoje!" />
            ) : (
              <div className="space-y-4">
                {otherSpots.map((spot, i) => (
                  <motion.div key={spot.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <SpotCard spot={spot} currentUser={user!} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Profile Edit ────────────────────────────────────────────────────────────
function ProfileEditTrigger({ userId, currentCarPlate, currentWants, currentHasSpot, currentParkingSpotNumber, onUpdate }: {
  userId: number;
  currentCarPlate?: string | null;
  currentWants?: boolean;
  currentHasSpot?: boolean;
  currentParkingSpotNumber?: string | null;
  onUpdate: (user: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const { mutate, isPending } = useUpdateProfile({
    mutation: {
      onSuccess: (data) => {
        setOpen(false);
        toast({ title: "Perfil atualizado!" });
        onUpdate(data);
      },
      onError: (err: any) => toast({ title: "Erro", description: err?.data?.error || "Ocorreu um erro.", variant: "destructive" }),
    },
  });

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      carPlate: currentCarPlate ?? "",
      wantsToRequestSpot: currentWants ?? false,
      hasParkingSpot: currentHasSpot ?? false,
      parkingSpotNumber: currentParkingSpotNumber ?? "",
    },
  });

  const watchHasSpot = form.watch("hasParkingSpot");

  return (
    <>
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setOpen(true); }} className="cursor-pointer">
        <Settings className="mr-2 h-4 w-4" /> Editar perfil
      </DropdownMenuItem>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">Editar Perfil</DialogTitle>
            <DialogDescription>Atualize suas preferências de vaga.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit((v) =>
              mutate({
                id: userId,
                data: {
                  carPlate: v.carPlate || null,
                  wantsToRequestSpot: v.wantsToRequestSpot,
                  hasParkingSpot: v.hasParkingSpot,
                  parkingSpotNumber: v.hasParkingSpot ? (v.parkingSpotNumber || null) : null,
                },
              })
            )}
            className="space-y-4 mt-4"
          >
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Car className="w-4 h-4" /> Placa do carro</Label>
              <Input placeholder="ABC1D23" className="h-12 rounded-xl uppercase" {...form.register("carPlate")} />
              <p className="text-xs text-muted-foreground">Obrigatória para solicitar vagas</p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-semibold">Quero solicitar vagas</p>
                </div>
                <Controller
                  control={form.control}
                  name="wantsToRequestSpot"
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">Possuo vaga para compartilhar</p>
                  </div>
                  <Controller
                    control={form.control}
                    name="hasParkingSpot"
                    render={({ field }) => (
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                </div>

                <AnimatePresence>
                  {watchHasSpot && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 text-sm">
                          <MapPin className="w-3.5 h-3.5" /> Número da vaga
                        </Label>
                        <Input
                          placeholder="Ex: 42 ou A-15"
                          className="h-11 rounded-xl"
                          {...form.register("parkingSpotNumber")}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <ChangePasswordDialog userId={userId} />
            </div>

            <Button type="submit" className="w-full h-12 rounded-xl" disabled={isPending}>
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ChangePasswordDialog({ userId }: { userId: number }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const { mutate, isPending } = useChangePassword({
    mutation: {
      onSuccess: () => {
        setOpen(false);
        toast({ title: "Senha alterada com sucesso!" });
        form.reset();
      },
      onError: (err: any) => {
        toast({
          title: "Erro ao alterar senha",
          description: err?.data?.error || "Verifique sua senha atual.",
          variant: "destructive"
        });
      },
    },
  });

  const form = useForm<z.infer<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start text-primary h-10 px-3 hover:bg-primary/5 rounded-xl gap-2 font-medium">
          <KeyRound className="w-4 h-4" /> Alterar Senha de Acesso
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Segurança</DialogTitle>
          <DialogDescription>Altere sua senha de acesso para maior segurança.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((v) =>
            mutate({
              id: userId,
              data: {
                currentPassword: v.currentPassword,
                newPassword: v.newPassword,
              },
            })
          )}
          className="space-y-4 mt-4"
        >
          <div className="space-y-2">
            <Label htmlFor="current-pw">Senha Atual</Label>
            <Input id="current-pw" type="password" placeholder="••••••" className="h-11 rounded-xl" {...form.register("currentPassword")} />
            {form.formState.errors.currentPassword && <p className="text-xs text-destructive">{form.formState.errors.currentPassword.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-pw">Nova Senha</Label>
            <Input id="new-pw" type="password" placeholder="Mínimo 6 caracteres" className="h-11 rounded-xl" {...form.register("newPassword")} />
            {form.formState.errors.newPassword && <p className="text-xs text-destructive">{form.formState.errors.newPassword.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-pw">Confirmar Nova Senha</Label>
            <Input id="confirm-pw" type="password" placeholder="Repita a nova senha" className="h-11 rounded-xl" {...form.register("confirmPassword")} />
            {form.formState.errors.confirmPassword && <p className="text-xs text-destructive">{form.formState.errors.confirmPassword.message}</p>}
          </div>
          <Button type="submit" className="w-full h-12 rounded-xl mt-2" disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Mudança"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
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

// Botão rápido do dono

function RemoveSpotAction({ spotId }: { spotId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { mutate, isPending } = useRemoveSpot({
    mutation: {
      onSuccess: () => { invalidateSpots(queryClient); toast({ title: "Anúncio removido" }); },
      onError: () => toast({ title: "Erro ao remover", variant: "destructive" }),
    },
  });
  return (
    <AlertDialogAction onClick={() => mutate({ id: spotId })} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isPending}>
      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remover"}
    </AlertDialogAction>
  );
}

function CancelInterestButton({ spotId, userId }: { spotId: number; userId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const handleCancel = async () => {
    setIsPending(true);
    try {
      const res = await fetch(`/api/spots/${spotId}/cancel-interest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao cancelar");
      }
      invalidateSpots(queryClient);
      toast({ title: "Solicitação cancelada", description: "A vaga voltou a estar disponível." });
    } catch (e: any) {
      toast({ title: "Erro ao cancelar", description: e.message, variant: "destructive" });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full h-10 rounded-2xl font-semibold text-sm gap-2 border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-400 dark:hover:bg-rose-900/20"
          disabled={isPending}
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><X className="w-4 h-4" /> Cancelar solicitação</>}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar solicitação?</AlertDialogTitle>
          <AlertDialogDescription>
            A vaga voltará a estar disponível e outros vizinhos poderão solicitá-la.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Manter solicitação</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white"
            disabled={isPending}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sim, cancelar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Card detalhado do dono
function OwnerSpotCard({ spot, parkingSpotNumber }: { spot: ParkingSpot; parkingSpotNumber?: string | null }) {
  const st = STATUS_LABEL[spot.status] ?? { label: spot.status, color: "" };

  const recurringLabel = spot.spotType === "RECURRING" && spot.daysOfWeek
    ? spot.daysOfWeek.map((d) => DAYS_OF_WEEK.find((x) => x.key === d)?.label ?? d).join(", ")
    : null;

  return (
    <Card className="rounded-3xl border border-primary/15 bg-primary/5 dark:bg-primary/10 p-5 space-y-3 shadow-inner overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={`border-0 text-xs font-bold uppercase tracking-wider ${st.color}`}>{st.label}</Badge>
        {spot.spotType === "RECURRING" && (
          <Badge variant="outline" className="text-xs font-semibold text-primary border-primary/30">
            <RotateCcw className="w-3 h-3 mr-1" /> Recorrente
          </Badge>
        )}
        {parkingSpotNumber && (
          <Badge variant="outline" className="text-xs font-semibold text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600">
            <MapPin className="w-3 h-3 mr-1" /> Vaga {parkingSpotNumber}
          </Badge>
        )}
        <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> {spot.availableFrom} às {spot.availableUntil}
        </span>
        {spot.date && (
          <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5" /> {spot.date.split("-").reverse().join("/")}
          </span>
        )}
      </div>

      <div className="absolute top-2 right-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Remover esta publicação?</AlertDialogTitle>
              <AlertDialogDescription>Esta data específica será removida da lista de disponibilidade imediatamente.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
              <RemoveSpotAction spotId={spot.id} />
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {recurringLabel && (
        <p className="text-xs text-primary/80 font-medium">{recurringLabel}</p>
      )}

      {spot.status === "PENDING_CONFIRMATION" && spot.interestedUserName && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl border border-yellow-200 dark:border-yellow-800 space-y-1">
          <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 uppercase tracking-wider">Interessado</p>
          <p className="font-semibold text-slate-900 dark:text-slate-100">{spot.interestedUserName} · Apto {spot.interestedUserApartment}</p>
          {Array.isArray(spot.requestedDays) && spot.requestedDays.length > 0 && (
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
              Solicitou usar: {spot.requestedDays.map((d: string) => DAYS_OF_WEEK.find(x => x.key === d)?.label || d).join(", ")}
            </p>
          )}
          {(spot as any).requestedFrom && (spot as any).requestedUntil && (
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> No horário: {(spot as any).requestedFrom} às {(spot as any).requestedUntil}
            </p>
          )}
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
          {Array.isArray(spot.requestedDays) && spot.requestedDays.length > 0 && (
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Dias ativos: {spot.requestedDays.map((d: string) => DAYS_OF_WEEK.find(x => x.key === d)?.label || d).join(", ")}
            </p>
          )}
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

// Card do ocupante — mostrado quando o usuário está usando a vaga de outra pessoa
function OccupantSpotCard({ spot }: { spot: ParkingSpot }) {
  return (
    <Card className="rounded-3xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-5 space-y-3 shadow-inner overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-green-400/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <p className="font-bold text-green-800 dark:text-green-300 text-sm leading-tight">Você está usando esta vaga</p>
          <p className="text-xs text-green-600 dark:text-green-500">Sua previsão de saída: {spot.expectedExitTime || spot.availableUntil}</p>
        </div>
      </div>

      <div className="p-3 bg-white/60 dark:bg-slate-900/40 rounded-2xl border border-green-100 dark:border-green-800/50 space-y-1.5">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Dono da vaga</p>
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8 border border-primary/10">
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
              {getInitials(spot.userName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white text-sm leading-tight">{spot.userName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Building2 className="w-3 h-3" /> Apto {spot.userApartment}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {spot.availableFrom} – {spot.availableUntil}</span>
          {spot.carPlate && <span className="flex items-center gap-1"><Car className="w-3 h-3" /> {spot.carPlate}</span>}
        </div>
      </div>

      <VacateButton
        spot={spot}
        triggerCls="border-green-400 bg-green-600 text-white hover:bg-green-700 w-full h-11"
        triggerLabel="Desocupar vaga"
        triggerIcon={<KeyRound className="w-4 h-4 mr-2" />}
        asInline
      />
    </Card>
  );
}

// ─── Dialogs ─────────────────────────────────────────────────────────────────
function CreateSpotDialog({ userId, parkingSpotNumber }: {
  userId: number;
  parkingSpotNumber?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof createSpotSchema>>({
    resolver: zodResolver(createSpotSchema),
    defaultValues: {
      spotType: "ONE_TIME",
      daysOfWeek: [],
      date: todayStr(),
      endDate: "",
      availableFrom: "09:00",
      availableUntil: "17:00",
    },
  });

  const spotType = form.watch("spotType");
  const selectedDays = form.watch("daysOfWeek") ?? [];

  const { mutate, isPending } = useCreateSpot({
    mutation: {
      onSuccess: () => {
        invalidateSpots(queryClient);
        setOpen(false);
        toast({ title: "Vaga compartilhada!", description: "Obrigado por ajudar o condomínio." });
        form.reset({ spotType: "ONE_TIME", daysOfWeek: [], date: todayStr(), endDate: "", availableFrom: "09:00", availableUntil: "17:00" });
      },
      onError: (err: any) => toast({ title: "Erro ao compartilhar", description: err?.data?.error || "Ocorreu um erro.", variant: "destructive" }),
    },
  });

  function handleOpenChange(v: boolean) {
    if (v && !parkingSpotNumber) {
      toast({
        title: "Cadastre o número da sua vaga",
        description: "Acesse 'Editar perfil' e informe o número da sua vaga antes de compartilhar.",
        variant: "destructive",
      });
      return;
    }
    setOpen(v);
  }

  function toggleDay(day: string) {
    const current = form.getValues("daysOfWeek") ?? [];
    const updated = current.includes(day) ? current.filter((d) => d !== day) : [...current, day];
    form.setValue("daysOfWeek", updated, { shouldValidate: true });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full h-14 rounded-2xl shadow-lg shadow-primary/25 font-semibold text-sm relative overflow-hidden group flex-col gap-0.5 px-3">
          <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out skew-x-12" />
          <Plus className="w-4 h-4 mb-0.5" />
          <span className="leading-tight">Publicar minha vaga</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Publicar Vaga</DialogTitle>
          <DialogDescription>Defina quando sua vaga estará disponível.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit((v) => {
          let dates: string[] = [];
          if (v.spotType === "ONE_TIME" && v.date) {
            const start = new Date(`${v.date}T12:00:00Z`);
            const end = v.endDate ? new Date(`${v.endDate}T12:00:00Z`) : start;
            let cur = new Date(start);
            while (cur <= end) {
              dates.push(cur.toISOString().split("T")[0]);
              cur.setDate(cur.getDate() + 1);
            }
          }
          mutate({ data: { userId, spotType: v.spotType, daysOfWeek: v.daysOfWeek, availableFrom: v.availableFrom, availableUntil: v.availableUntil, dates } as any });
        })} className="space-y-5 mt-4">
          {/* Tipo de disponibilidade */}
          <div className="grid grid-cols-2 gap-2">
            {(["ONE_TIME", "RECURRING"] as const).map((type) => {
              const isSelected = spotType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => form.setValue("spotType", type, { shouldValidate: true })}
                  className={`p-3 rounded-2xl border-2 text-sm font-semibold transition-all text-left ${isSelected
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary/40"
                    }`}
                >
                  {type === "ONE_TIME" ? (
                    <><CalendarDays className="w-4 h-4 mb-1" /><br />Pontual</>
                  ) : (
                    <><RotateCcw className="w-4 h-4 mb-1" /><br />Recorrente</>
                  )}
                </button>
              );
            })}
          </div>

          {/* Dias da semana (RECURRING) */}
          <AnimatePresence mode="wait">
            {spotType === "RECURRING" ? (
              <motion.div key="recurring" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="space-y-2">
                  <Label>Dias da semana</Label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((d) => {
                      const active = selectedDays.includes(d.key);
                      return (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => toggleDay(d.key)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${active
                            ? "bg-primary text-white border-primary"
                            : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary/40"
                            }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                  {form.formState.errors.daysOfWeek && (
                    <p className="text-xs text-destructive">{form.formState.errors.daysOfWeek.message}</p>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div key="onetime" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="spot-date">De <span className="text-[10px] text-slate-400 font-normal ml-1">Início</span></Label>
                    <Input
                      type="date"
                      id="spot-date"
                      min={todayStr()}
                      className="h-12 rounded-xl"
                      {...form.register("date")}
                    />
                    {form.formState.errors.date && (
                      <p className="text-xs text-destructive">{form.formState.errors.date.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="spot-end-date">Até <span className="text-[10px] text-slate-400 font-normal ml-1">Fim (Opcional)</span></Label>
                    <Input
                      type="date"
                      id="spot-end-date"
                      min={form.watch("date") || todayStr()}
                      className="h-12 rounded-xl"
                      {...form.register("endDate")}
                    />
                    {form.formState.errors.endDate && (
                      <p className="text-xs text-destructive">{form.formState.errors.endDate.message}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Horário */}
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
            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Publicar minha vaga"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmOccupationDialog({
  spot, triggerCls, triggerLabel, triggerIcon, asInline,
}: { spot: ParkingSpot; triggerCls: string; triggerLabel: string; triggerIcon: React.ReactNode; asInline?: boolean }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { mutate: confirmMutate, isPending: confirming } = useConfirmOccupation({
    mutation: {
      onSuccess: () => {
        invalidateSpots(queryClient);
        toast({ title: "Uso confirmado!", description: "A vaga está agora ocupada." });
      },
      onError: (err: any) => toast({ title: "Erro", description: err?.data?.error || "Ocorreu um erro.", variant: "destructive" }),
    },
  });
  const { mutate: declineMutate, isPending: declining } = useDeclineApproval({
    mutation: {
      onSuccess: () => {
        invalidateSpots(queryClient);
        toast({ title: "Solicitação recusada", description: "A vaga voltou a estar disponível." });
      },
      onError: (err: any) => toast({ title: "Erro", description: err?.data?.error || "Ocorreu um erro.", variant: "destructive" }),
    },
  });

  const handleConfirm = () => {
    const data = {
      occupantName: spot.interestedUserName ?? "",
      occupantApartment: spot.interestedUserApartment ?? "",
      carPlate: spot.carPlate ?? "",
      expectedExitTime: spot.availableUntil,
    };
    confirmMutate({ id: spot.id, data });
  };

  const handleDecline = () => {
    declineMutate({ id: spot.id, data: { token: spot.approvalToken ?? "" } });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={asInline ? "default" : "outline"} size="lg"
          className={asInline
            ? `rounded-2xl font-semibold text-sm flex items-center justify-center ${triggerCls}`
            : `w-full h-14 rounded-2xl font-semibold text-sm flex-col gap-0.5 px-3 ${triggerCls}`
          }>
          {triggerIcon}
          <span className="leading-tight">{triggerLabel}</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-3xl max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-display">Permitir uso da vaga para</AlertDialogTitle>
          <AlertDialogDescription className="text-lg font-semibold text-primary pt-2">
            {spot.interestedUserName}?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 space-y-3 my-2 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{spot.interestedUserName}</p>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Interessado</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Building2 className="w-3 h-3" /> Apto {spot.interestedUserApartment}
          </p>
          {((spot as any).requestedFrom || (spot as any).requestedUntil) && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Horário Solicitado</p>
              <p className="text-sm font-bold text-primary flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> {(spot as any).requestedFrom || '--:--'} às {(spot as any).requestedUntil || '--:--'}
              </p>
            </div>
          )}
        </div>
        <AlertDialogFooter className="grid grid-cols-2 gap-2">
          <AlertDialogCancel
            onClick={handleDecline}
            disabled={declining || confirming}
            className="rounded-2xl h-11 font-semibold text-sm border-slate-300 dark:border-slate-600"
          >
            {declining ? <Loader2 className="w-4 h-4 animate-spin" /> : "Não permitir"}
          </AlertDialogCancel>
          <Button
            onClick={handleConfirm}
            disabled={confirming || declining}
            className="rounded-2xl h-11 font-semibold text-sm bg-green-600 hover:bg-green-700 text-white"
          >
            {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : "Permitir uso"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
        const msg = data?.status === "AVAILABLE" ? "Vaga de volta como disponível!" : "Vaga marcada como encerrada.";
        toast({ title: "Vaga desocupada", description: msg });
      },
      onError: (err: any) => toast({ title: "Erro", description: err?.data?.error || "Ocorreu um erro.", variant: "destructive" }),
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
          <AlertDialogTitle>Desocupar vaga?</AlertDialogTitle>
          <AlertDialogDescription>A vaga ficará disponível novamente se ainda estiver dentro do horário.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => mutate({ id: spot.id })} className="rounded-xl">Confirmar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── SpotCard ────────────────────────────────────────────────────────────────
function RequestSpotDialog({ spot, currentUser }: { spot: ParkingSpot; currentUser: { id: number; carPlate?: string | null } }) {
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [reqFrom, setReqFrom] = useState(spot.availableFrom);
  const [reqUntil, setReqUntil] = useState(spot.availableUntil);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const todayDayOfWeek = () => {
    const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    return DAYS[new Date().getDay()];
  };

  const { mutate, isPending: expressing } = useExpressInterest({
    mutation: {
      onSuccess: (data: any) => {
        invalidateSpots(queryClient);
        const token = data?.approvalToken;
        if (token) {
          const base = import.meta.env.BASE_URL ?? "/";
          const approvalUrl = `${window.location.origin}${base}approve?spotId=${data.id}&token=${token}`;
          const msg = `Oi! Solicitei sua vaga no CondoPark Vivendas.\nPara aprovar, confirme no link abaixo:\n${approvalUrl}`;
          const phone = (data.userPhone ?? "").replace(/\D/g, "");
          const a = document.createElement("a");
          a.href = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(msg)}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          toast({ title: "Solicitação enviada!", description: "Continue pelo WhatsApp para confirmar." });
        }
      },
      onError: (err: any) =>
        toast({ title: "Erro", description: err?.data?.error || "Ocorreu um erro.", variant: "destructive" }),
    },
  });

  const isRecurring = spot.spotType === "RECURRING";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className="w-full h-11 rounded-2xl font-semibold text-sm gap-2 bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-500/20"
        >
          <MessageCircle className="w-4 h-4" /> Solicitar vaga
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Solicitar Vaga</DialogTitle>
          <DialogDescription>
            {isRecurring ? "Escolha os dias que você pretende usar esta vaga." : "Confirme o interesse nesta vaga pontual."}
          </DialogDescription>
        </DialogHeader>

        {isRecurring && (
          <div className="space-y-4 py-4">
            <Label className="text-sm font-semibold">Dias disponíveis:</Label>
            <div className="grid grid-cols-2 gap-2">
              {spot.daysOfWeek?.map((day: string) => {
                const dayLabel = DAYS_OF_WEEK.find(d => d.key === day)?.label || day;
                const isSelected = selectedDays.includes(day);
                return (
                  <Button
                    key={day}
                    variant={isSelected ? "default" : "outline"}
                    className={`h-11 rounded-xl transition-all ${isSelected ? "bg-primary shadow-lg shadow-primary/20" : ""}`}
                    onClick={() => {
                      setSelectedDays(prev =>
                        prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
                      );
                    }}
                  >
                    {dayLabel}
                  </Button>
                );
              })}
            </div>
            {selectedDays.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Selecione pelo menos um dia para continuar.</p>
            )}
          </div>
        )}

        {!isRecurring && (
          <div className="py-6 flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CarFront className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">Vaga pontual: {spot.date}</p>
              <p className="text-sm text-slate-500">{spot.availableFrom} às {spot.availableUntil}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 py-4 border-t border-slate-100 dark:border-slate-800 mt-2">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">De (Horário)</Label>
            <Input
              type="time"
              value={reqFrom}
              min={spot.availableFrom}
              max={spot.availableUntil}
              onChange={(e) => setReqFrom(e.target.value)}
              className="rounded-xl h-11"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Até (Horário)</Label>
            <Input
              type="time"
              value={reqUntil}
              min={reqFrom}
              max={spot.availableUntil}
              onChange={(e) => setReqUntil(e.target.value)}
              className="rounded-xl h-11"
            />
          </div>
        </div>

        <Button
          className="w-full h-12 rounded-xl text-base shadow-lg shadow-primary/25"
          disabled={expressing || (isRecurring && selectedDays.length === 0)}
          onClick={() => {
            if (!currentUser.carPlate) {
              toast({ title: "Cadastre sua placa", description: "Acesse 'Editar perfil' e cadastre sua placa.", variant: "destructive" });
              return;
            }
            mutate({
              id: spot.id,
              data: {
                interestedUserId: currentUser.id,
                requestedDays: isRecurring ? selectedDays : null,
                requestedFrom: reqFrom,
                requestedUntil: reqUntil,
              } as any
            });
          }}
        >
          {expressing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar e avisar pelo WhatsApp"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function SpotCard({ spot, currentUser }: { spot: ParkingSpot; currentUser: { id: number; carPlate?: string | null } }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isInterestedUser = spot.interestedUserId === currentUser.id;
  const st = STATUS_LABEL[spot.status] ?? { label: spot.status, color: "" };

  const RECURRING_MAP: Record<string, string> = {
    mon: "às segundas-feiras",
    tue: "às terças-feiras",
    wed: "às quartas-feiras",
    thu: "às quintas-feiras",
    fri: "às sextas-feiras",
    sat: "aos sábados",
    sun: "aos domingos"
  };

  const recurringLabel = spot.spotType === "RECURRING" && spot.daysOfWeek
    ? spot.daysOfWeek.map((d) => RECURRING_MAP[d] ?? d).join(", ")
    : null;

  const { mutate: renotify, isPending: renotifying } = useExpressInterest({
    mutation: {
      onSuccess: (data: any) => {
        const token = data?.approvalToken;
        if (token) {
          const base = import.meta.env.BASE_URL ?? "/";
          const approvalUrl = `${window.location.origin}${base}approve?spotId=${data.id}&token=${token}`;
          const msg = `Oi! Reenviando minha solicitação da sua vaga no CondoPark Vivendas.\nConfirme aqui:\n${approvalUrl}`;
          const phone = (data.userPhone ?? "").replace(/\D/g, "");
          window.open(`whatsapp://send?phone=${phone}&text=${encodeURIComponent(msg)}`, "_blank");
          toast({ title: "Link reenviado!", description: "Continue pelo WhatsApp." });
        }
      },
      onError: (err: any) =>
        toast({ title: "Erro", description: err?.data?.error || "Ocorreu um erro.", variant: "destructive" }),
    },
  });

  function handleReSendWhatsApp() {
    renotify({ id: spot.id, data: { interestedUserId: currentUser.id, requestedDays: spot.requestedDays } as any });
  }

  return (
    <Card className="rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary/10 border-2 border-primary/20 text-primary font-bold text-lg flex items-center justify-center shadow-sm">
              {spot.userParkingSpotNumber ?? "--"}
            </div>
            <div>
              <p className="font-display font-semibold text-slate-900 dark:text-white text-lg leading-tight truncate max-w-[12rem]">
                Vaga {spot.userParkingSpotNumber ?? "Não Informada"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                <Building2 className="w-3 h-3" /> Apto {spot.userApartment}
              </p>
            </div>
          </div>
          <Badge className={`border-0 text-xs font-bold ${st.color} shrink-0`}>{st.label}</Badge>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <Clock className="w-5 h-5 text-primary shrink-0" />
            <span className="text-xl font-display font-bold">
              {spot.availableFrom} – {spot.availableUntil}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            {spot.spotType === "RECURRING" ? (
              <span className="flex items-center gap-1.5 text-primary font-medium text-[15px]">
                <RotateCcw className="w-4 h-4" /> {recurringLabel}
              </span>
            ) : spot.date ? (
              <span className="flex items-center gap-1.5 font-medium text-[15px]">
                <CalendarDays className="w-4 h-4" /> {spot.date.split("-").reverse().join("/")}
              </span>
            ) : null}
          </div>
        </div>

        {spot.status === "AVAILABLE" && (
          <div className="mt-4">
            {isInterestedUser ? (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl">
                <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">Aguardando aprovação</span>
              </div>
            ) : (
              <RequestSpotDialog spot={spot} currentUser={currentUser} />
            )}
          </div>
        )}

        {spot.status === "PENDING_CONFIRMATION" && (
          <div className="mt-4 space-y-2">
            {isInterestedUser ? (
              <>
                <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl">
                  <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
                  <span className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">Aguardando confirmação do dono</span>
                </div>
                <Button
                  variant="outline"
                  className="w-full h-10 rounded-2xl font-semibold text-sm gap-2 border-yellow-300 text-yellow-700 hover:bg-yellow-50 dark:border-yellow-700 dark:text-yellow-400 dark:hover:bg-yellow-900/20"
                  onClick={handleReSendWhatsApp}
                  disabled={renotifying}
                >
                  {renotifying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <><MessageCircle className="w-4 h-4" /> Reenviar pelo WhatsApp</>
                  )}
                </Button>
                <CancelInterestButton spotId={spot.id} userId={currentUser.id} />
              </>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl">
                <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm text-yellow-700 dark:text-yellow-300">Aguardando confirmação do dono</span>
              </div>
            )}
          </div>
        )}

        {spot.status === "OCCUPIED" && (
          <div className="mt-4 space-y-2">
            {isInterestedUser ? (
              <>
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-2xl">
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                  <span className="text-sm text-green-700 dark:text-green-300 font-medium">Você está usando esta vaga</span>
                </div>
                <VacateButton
                  spot={spot}
                  triggerCls="border-green-400 bg-green-600 text-white hover:bg-green-700 w-full h-10"
                  triggerLabel="Desocupar vaga"
                  triggerIcon={<KeyRound className="w-4 h-4 mr-2" />}
                  asInline
                />
              </>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-2xl">
                <Car className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-sm text-red-700 dark:text-red-300 font-medium">Ocupada no momento</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Request Dialogs ─────────────────────────────────────────────────────────
function ActiveRequestButton({ request }: { request: SpotRequest }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { mutate, isPending } = useDeleteSpotRequest({
    mutation: {
      onSuccess: () => {
        invalidateRequests(queryClient);
        toast({ title: "Pedido cancelado" });
      },
      onError: () => toast({ title: "Erro ao cancelar", variant: "destructive" }),
    },
  });
  const isMatched = request.status === "matched";
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="lg" className={`w-full h-14 rounded-2xl font-semibold text-sm flex-col gap-0.5 px-3 ${isMatched
          ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-700 dark:bg-green-950/30 dark:text-green-400"
          : "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
          }`}>
          <HandHelping className="w-4 h-4 mb-0.5" />
          <span className="leading-tight">{isMatched ? "Vaga encontrada!" : "Pedido ativo"}</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar pedido?</AlertDialogTitle>
          <AlertDialogDescription>Seu pedido de vaga será removido.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Manter</AlertDialogCancel>
          <AlertDialogAction onClick={() => mutate({ id: request.id })} className="rounded-xl bg-destructive hover:bg-destructive/90" disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancelar pedido"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CreateRequestDialog({ userId }: { userId: number }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const form = useForm<z.infer<typeof createRequestSchema>>({
    resolver: zodResolver(createRequestSchema),
    defaultValues: { date: todayStr(), startTime: "09:00", endTime: "17:00", reason: "" },
  });
  const { mutate, isPending } = useCreateSpotRequest({
    mutation: {
      onSuccess: () => {
        invalidateRequests(queryClient);
        setOpen(false);
        toast({ title: "Pedido publicado!", description: "Aguarde um morador oferecer sua vaga." });
        form.reset({ date: todayStr(), startTime: "09:00", endTime: "17:00", reason: "" });
      },
      onError: (err: any) => toast({ title: "Erro ao publicar", description: err?.data?.error || "Ocorreu um erro.", variant: "destructive" }),
    },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="w-full h-14 rounded-2xl font-semibold text-sm flex-col gap-0.5 px-3 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400">
          <HandHelping className="w-4 h-4 mb-0.5" />
          <span className="leading-tight">Preciso de vaga</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Solicitar Vaga</DialogTitle>
          <DialogDescription>Publique seu pedido para que outros moradores vejam.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutate({ data: { userId, ...v } }))} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" min={todayStr()} className="h-12 rounded-xl" {...form.register("date")} />
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
            <Label>Motivo (opcional)</Label>
            <Input className="h-12 rounded-xl" placeholder="Ex: visita, mudança..." {...form.register("reason")} />
          </div>
          <Button type="submit" className="w-full h-12 rounded-xl shadow-lg shadow-primary/25" disabled={isPending}>
            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Publicar Pedido"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RequestCard({ request, currentUserId }: { request: SpotRequest; currentUserId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isOwn = request.userId === currentUserId;
  const isMatched = request.status === "matched";

  const { mutate: offerSpot, isPending: offering } = useOfferSpotForRequest({
    mutation: {
      onSuccess: () => {
        invalidateRequests(queryClient);
        toast({ title: "Vaga oferecida!", description: "O solicitante foi notificado." });
      },
      onError: (err: any) => toast({ title: "Erro", description: err?.data?.error || "Ocorreu um erro.", variant: "destructive" }),
    },
  });

  const { mutate: deleteRequest, isPending: deleting } = useDeleteSpotRequest({
    mutation: {
      onSuccess: () => { invalidateRequests(queryClient); toast({ title: "Pedido removido" }); },
      onError: () => toast({ title: "Erro ao remover", variant: "destructive" }),
    },
  });

  return (
    <Card className={`rounded-3xl overflow-hidden border bg-white dark:bg-slate-900 shadow-sm ${isMatched ? "border-green-200 dark:border-green-800" : "border-slate-200/80 dark:border-slate-800"
      }`}>
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-blue-100 shadow-sm">
              <AvatarFallback className="bg-blue-50 text-blue-600 font-bold text-sm">{getInitials(request.userName)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">{request.userName}</p>
              <p className="text-xs text-slate-500 flex items-center gap-1"><Building2 className="w-3 h-3" /> Apto {request.userApartment}</p>
            </div>
          </div>
          <Badge className={`border-0 text-xs font-bold shrink-0 ${isMatched ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"}`}>
            {isMatched ? "Atendido" : "Aberto"}
          </Badge>
        </div>

        <div className="text-sm text-slate-500 dark:text-slate-400 space-y-1">
          <p className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> {request.date}</p>
          <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {request.startTime} – {request.endTime}</p>
          {request.reason && <p className="text-xs italic">{request.reason}</p>}
        </div>

        {isMatched && request.offeredByUserName && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800">
            <p className="text-xs font-semibold text-green-700 dark:text-green-400">Vaga oferecida por</p>
            <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{request.offeredByUserName}</p>
            <a href={`tel:${request.offeredByUserPhone}`} className="flex items-center gap-1 text-sm text-primary hover:underline mt-1">
              <Phone className="w-3.5 h-3.5" /> {request.offeredByUserPhone}
            </a>
          </div>
        )}

        {!isOwn && !isMatched && (
          <Button size="sm" className="w-full h-10 rounded-2xl font-semibold gap-2" onClick={() => offerSpot({ id: request.id, data: { offeredByUserId: currentUserId } })} disabled={offering}>
            {offering ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Oferecer minha vaga</>}
          </Button>
        )}

        {isOwn && (
          <Button variant="ghost" size="sm" className="w-full h-9 rounded-2xl text-destructive hover:bg-destructive/10" onClick={() => deleteRequest({ id: request.id })} disabled={deleting}>
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4 mr-1.5" /> Cancelar pedido</>}
          </Button>
        )}
      </div>
    </Card>
  );
}
