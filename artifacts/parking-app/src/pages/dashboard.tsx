import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { 
  CarFront, LogOut, Phone, Clock, Building2, MapPin, 
  Trash2, Loader2, Plus, HandHelping, CalendarDays, CheckCircle2
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { 
  useGetAvailableSpots, 
  useCreateSpot, 
  useRemoveSpot,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const createSpotSchema = z.object({
  availableFrom: z.string().min(1, "Horário de início é obrigatório"),
  availableUntil: z.string().min(1, "Horário de término é obrigatório"),
});

const createRequestSchema = z.object({
  date: z.string().min(1, "Data é obrigatória"),
  startTime: z.string().min(1, "Horário de início é obrigatório"),
  endTime: z.string().min(1, "Horário de término é obrigatório"),
  reason: z.string().optional(),
});

const getInitials = (name: string) => 
  name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { data: spots, isLoading: spotsLoading } = useGetAvailableSpots();
  const { data: requests, isLoading: requestsLoading } = useGetSpotRequests();

  const mySpot = spots?.find(s => s.userId === user?.id);
  const otherSpots = spots?.filter(s => s.userId !== user?.id) || [];
  const myRequest = requests?.find(r => r.userId === user?.id);

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
              <button className="flex items-center gap-2 focus:outline-none hover:opacity-80 transition-opacity">
                <Avatar className="h-8 w-8 border-2 border-white dark:border-slate-800 shadow-sm">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                    {user?.name ? getInitials(user.name) : "U"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold leading-none">{user?.name}</p>
                  <p className="text-xs text-muted-foreground leading-none">Apto {user?.apartment}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:bg-destructive/10 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="max-w-md mx-auto p-4 space-y-6 mt-4">

        {/* BOAS-VINDAS */}
        <div className="px-1">
          <h2 className="text-2xl font-display font-semibold text-slate-900 dark:text-white">
            Olá, {user?.name?.split(' ')[0]} 👋
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Compartilhe ou encontre uma vaga hoje.</p>
        </div>

        {/* BOTÕES DE AÇÃO */}
        <div className="grid grid-cols-2 gap-3">
          <AnimatePresence mode="popLayout">
            {spotsLoading ? (
              <Skeleton className="h-14 rounded-2xl col-span-1" />
            ) : mySpot ? (
              <motion.div key="active-spot" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <ActiveSpotButton spot={mySpot} />
              </motion.div>
            ) : (
              <motion.div key="create-spot" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <CreateSpotDialog userId={user!.id} />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="popLayout">
            {requestsLoading ? (
              <Skeleton className="h-14 rounded-2xl col-span-1" />
            ) : myRequest ? (
              <motion.div key="active-req" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <ActiveRequestButton request={myRequest} />
              </motion.div>
            ) : (
              <motion.div key="create-req" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <CreateRequestDialog userId={user!.id} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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

          {/* ABA VAGAS */}
          <TabsContent value="spots" className="mt-4 space-y-4">
            {spotsLoading ? (
              <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}</div>
            ) : otherSpots.length === 0 ? (
              <EmptyState icon={<CarFront className="w-8 h-8 text-slate-400" />} title="Nenhuma vaga por aqui" desc="Volte mais tarde ou seja o primeiro a compartilhar sua vaga hoje!" />
            ) : (
              <div className="space-y-4">
                {otherSpots.map((spot, i) => (
                  <motion.div key={spot.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <SpotCard spot={spot} />
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ABA PEDIDOS */}
          <TabsContent value="requests" className="mt-4 space-y-4">
            {requestsLoading ? (
              <div className="space-y-4">{[1,2].map(i => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}</div>
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

// --- SUBCOMPONENTES ---

function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-14 px-4 text-center bg-white dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
      <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">{icon}</div>
      <h3 className="text-lg font-display font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-[250px] text-sm">{desc}</p>
    </motion.div>
  );
}

function CreateSpotDialog({ userId }: { userId: number }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const form = useForm<z.infer<typeof createSpotSchema>>({
    resolver: zodResolver(createSpotSchema),
    defaultValues: { availableFrom: "09:00", availableUntil: "17:00" }
  });
  const { mutate, isPending } = useCreateSpot({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAvailableSpotsQueryKey() });
        setOpen(false);
        toast({ title: "Vaga compartilhada!", description: "Obrigado por ajudar o condomínio." });
        form.reset();
      },
      onError: (err: any) => toast({ title: "Erro ao compartilhar", description: err?.error || "Ocorreu um erro.", variant: "destructive" })
    }
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full h-14 rounded-2xl shadow-lg shadow-primary/25 font-semibold text-sm relative overflow-hidden group flex-col gap-0.5 px-3">
          <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out skew-x-12" />
          <Plus className="w-4 h-4 mb-0.5" />
          <span className="leading-tight">Tenho uma vaga</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Compartilhar Vaga</DialogTitle>
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

function ActiveSpotButton({ spot }: { spot: ParkingSpot }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { mutate: removeSpot, isPending } = useRemoveSpot({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAvailableSpotsQueryKey() });
        toast({ title: "Anúncio removido", description: "Sua vaga não está mais disponível." });
      },
      onError: () => toast({ title: "Erro ao remover", variant: "destructive" })
    }
  });
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="lg" className="w-full h-14 rounded-2xl border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 font-semibold text-sm flex-col gap-0.5 px-3" disabled={isPending}>
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mb-0.5" />}
          <span className="leading-tight">Minha vaga ativa</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Remover anúncio?</AlertDialogTitle>
          <AlertDialogDescription>Sua vaga será removida da lista imediatamente.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => removeSpot({ id: spot.id })} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
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
    defaultValues: { date: todayStr(), startTime: "08:00", endTime: "18:00", reason: "" }
  });
  const { mutate, isPending } = useCreateSpotRequest({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSpotRequestsQueryKey() });
        setOpen(false);
        toast({ title: "Pedido enviado!", description: "Os moradores serão notificados." });
        form.reset({ date: todayStr(), startTime: "08:00", endTime: "18:00", reason: "" });
      },
      onError: (err: any) => toast({ title: "Erro ao enviar pedido", description: err?.error || "Ocorreu um erro.", variant: "destructive" })
    }
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
          <DialogDescription>Informe quando você precisa de uma vaga e o motivo (opcional).</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutate({ data: { userId, ...v, reason: v.reason || null } }))} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="req-date">Data</Label>
            <Input type="date" id="req-date" className="h-12 rounded-xl" {...form.register("date")} />
            {form.formState.errors.date && <p className="text-xs text-destructive">{form.formState.errors.date.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="req-start">Das</Label>
              <Input type="time" id="req-start" className="h-12 rounded-xl" {...form.register("startTime")} />
              {form.formState.errors.startTime && <p className="text-xs text-destructive">{form.formState.errors.startTime.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="req-end">Até</Label>
              <Input type="time" id="req-end" className="h-12 rounded-xl" {...form.register("endTime")} />
              {form.formState.errors.endTime && <p className="text-xs text-destructive">{form.formState.errors.endTime.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="req-reason">Motivo <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Input id="req-reason" placeholder="ex: visita, mudança, conserto..." className="h-12 rounded-xl" {...form.register("reason")} />
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
  const { mutate: deleteRequest, isPending } = useDeleteSpotRequest({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSpotRequestsQueryKey() });
        toast({ title: "Pedido removido" });
      },
      onError: () => toast({ title: "Erro ao remover pedido", variant: "destructive" })
    }
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
          <AlertDialogAction onClick={() => deleteRequest({ id: request.id })} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">Cancelar pedido</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SpotCard({ spot }: { spot: ParkingSpot }) {
  return (
    <Card className="overflow-hidden rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300 dark:bg-slate-900/50 dark:border-slate-800 bg-white">
      <div className="p-5 flex items-start gap-4">
        <Avatar className="h-12 w-12 border-2 border-slate-50 dark:border-slate-800 shadow-sm">
          <AvatarFallback className="bg-gradient-to-br from-indigo-100 to-sky-100 text-indigo-700 dark:from-indigo-900 dark:to-sky-900 dark:text-indigo-200 font-bold text-sm">
            {getInitials(spot.userName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate font-display text-lg">{spot.userName}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
            <Building2 className="w-3.5 h-3.5" /> Apto {spot.userApartment}
          </p>
          <div className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl px-3 py-2.5 w-fit border border-slate-200/50 dark:border-slate-700/50">
            <Clock className="w-4 h-4 text-primary" />
            {spot.availableFrom} <span className="text-slate-400 font-normal mx-1">às</span> {spot.availableUntil}
          </div>
        </div>
      </div>
      <div className="px-5 pb-5 pt-0">
        <Button asChild className="w-full font-semibold shadow-sm h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 hover:-translate-y-0.5 transition-transform" variant="default">
          <a href={`tel:${spot.userPhone}`}><Phone className="w-4 h-4 mr-2" /> Entrar em Contato</a>
        </Button>
      </div>
    </Card>
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
      onError: (err: any) => toast({ title: "Erro", description: err?.error || "Ocorreu um erro.", variant: "destructive" })
    }
  });

  return (
    <Card className={`overflow-hidden rounded-3xl border shadow-sm transition-shadow duration-300 bg-white dark:bg-slate-900/50 ${isMatched ? "border-green-200 dark:border-green-800" : "border-amber-100 dark:border-amber-900/50"}`}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="h-11 w-11 border-2 border-slate-50 dark:border-slate-800 shadow-sm shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700 dark:from-amber-900 dark:to-orange-900 dark:text-amber-200 font-bold text-sm">
              {getInitials(request.userName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 font-display">{request.userName}</h3>
              {isMatched ? (
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 border-0 text-xs px-2">Atendido</Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-0 text-xs px-2">Em aberto</Badge>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
              <Building2 className="w-3.5 h-3.5" /> Apto {request.userApartment}
            </p>
          </div>
        </div>

        {/* Detalhes */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2.5">
            <CalendarDays className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="font-medium">{new Date(request.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}</span>
            <span className="text-slate-400 mx-1">·</span>
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{request.startTime} às {request.endTime}</span>
          </div>
          {request.reason && (
            <p className="text-sm text-slate-500 dark:text-slate-400 px-1 italic">"{request.reason}"</p>
          )}
        </div>

        {/* Quando atendido: mostrar ambos os telefones */}
        {isMatched && (
          <div className="space-y-2 mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-800">
            <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Combinado! Contactem-se:
            </p>
            <a href={`tel:${request.userPhone}`} className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200 hover:text-primary transition-colors">
              <Phone className="w-3.5 h-3.5 text-primary" /> {request.userName}: {request.userPhone}
            </a>
            {request.offeredByUserPhone && (
              <a href={`tel:${request.offeredByUserPhone}`} className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200 hover:text-primary transition-colors">
                <Phone className="w-3.5 h-3.5 text-primary" /> {request.offeredByUserName}: {request.offeredByUserPhone}
              </a>
            )}
          </div>
        )}

        {/* Botão: oferecer vaga (apenas outros usuários em pedidos em aberto) */}
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
                <AlertDialogDescription>
                  Você e {request.userName} receberão os números de telefone um do outro para combinar os detalhes.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => offerSpot({ id: request.id, data: { offeredByUserId: currentUserId } })}
                  className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white"
                >
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Mensagem para o dono do pedido quando matched */}
        {isOwner && isMatched && (
          <p className="text-center text-sm text-green-700 dark:text-green-400 font-medium">
            Um morador ofereceu a vaga! Entre em contato acima.
          </p>
        )}
      </div>
    </Card>
  );
}
