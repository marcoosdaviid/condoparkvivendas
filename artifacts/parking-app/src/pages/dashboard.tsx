import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { 
  CarFront, LogOut, Phone, Clock, Building2, MapPin, 
  Trash2, Loader2, Plus
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { 
  useGetAvailableSpots, 
  useCreateSpot, 
  useRemoveSpot,
  getGetAvailableSpotsQueryKey,
  type ParkingSpot
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
  availableFrom: z.string().min(1, "Start time is required"),
  availableUntil: z.string().min(1, "End time is required"),
});

const getInitials = (name: string) => 
  name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { data: spots, isLoading } = useGetAvailableSpots();

  const mySpot = spots?.find(s => s.userId === user?.id);
  const otherSpots = spots?.filter(s => s.userId !== user?.id) || [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      {/* HEADER */}
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
                  <p className="text-xs text-muted-foreground leading-none">Apt {user?.apartment}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:bg-destructive/10 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-md mx-auto p-4 space-y-6 mt-4">
        
        {/* WELCOME AREA */}
        <div className="px-1">
          <h2 className="text-2xl font-display font-semibold text-slate-900 dark:text-white">
            Hello, {user?.name?.split(' ')[0]} 👋
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Here are the available spots for today.</p>
        </div>

        {/* HERO ACTION / OWN LISTING */}
        <AnimatePresence mode="popLayout">
          {isLoading ? (
             <Skeleton className="h-24 w-full rounded-2xl" />
          ) : mySpot ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <ActiveListingCard spot={mySpot} />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <CreateSpotDialog userId={user!.id} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="h-px bg-slate-200 dark:bg-slate-800 w-full" />

        {/* SPOTS LIST */}
        <div className="space-y-4">
          <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2 px-1">
            <MapPin className="w-5 h-5 text-primary" /> 
            Available Today
          </h3>

          {isLoading ? (
            <div className="space-y-4">
              {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
            </div>
          ) : otherSpots.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800"
            >
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <CarFront className="w-8 h-8 text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="text-lg font-display font-semibold text-slate-900 dark:text-white">No spots right now</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-[250px] text-sm">Check back later or be the first to share your parking spot today!</p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {otherSpots.map((spot, index) => (
                <motion.div
                  key={spot.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <SpotCard spot={spot} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS ---

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
        toast({ title: "Spot shared successfully!", description: "Thank you for sharing with the community." });
        form.reset();
      },
      onError: (err: any) => {
         toast({ title: "Failed to share spot", description: err?.error || "An error occurred", variant: "destructive" });
      }
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full text-base h-16 rounded-2xl shadow-xl shadow-primary/25 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-primary/30 transition-all font-semibold relative overflow-hidden group">
          <div className="absolute inset-0 bg-white/20 w-full h-full -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out skew-x-12" />
          <Plus className="w-5 h-5 mr-2" /> Share My Spot Today
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Share Parking Spot</DialogTitle>
          <DialogDescription>
            Set the time range your spot will be empty today.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit((v) => mutate({ data: { userId, ...v } }))} className="space-y-6 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="availableFrom">Available From</Label>
              <Input 
                type="time" 
                id="availableFrom" 
                className="h-12 rounded-xl"
                {...form.register("availableFrom")} 
              />
              {form.formState.errors.availableFrom && (
                <p className="text-xs text-destructive">{form.formState.errors.availableFrom.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="availableUntil">Available Until</Label>
              <Input 
                type="time" 
                id="availableUntil" 
                className="h-12 rounded-xl"
                {...form.register("availableUntil")} 
              />
              {form.formState.errors.availableUntil && (
                <p className="text-xs text-destructive">{form.formState.errors.availableUntil.message}</p>
              )}
            </div>
          </div>
          
          <Button type="submit" className="w-full h-12 rounded-xl text-base shadow-lg shadow-primary/25" disabled={isPending}>
            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Publish Listing"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ActiveListingCard({ spot }: { spot: ParkingSpot }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { mutate: removeSpot, isPending } = useRemoveSpot({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAvailableSpotsQueryKey() });
        toast({ title: "Listing removed", description: "Your spot is no longer shared." });
      },
      onError: () => toast({ title: "Failed to remove", variant: "destructive" })
    }
  });

  return (
    <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-3xl p-5 relative overflow-hidden shadow-inner">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 dark:bg-primary/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Active Listing
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> Shared until {spot.availableUntil}
          </p>
        </div>
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="w-full h-12 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/20 shadow-sm bg-white dark:bg-slate-950" disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Remove Listing
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove listing?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately remove your spot from the available list. Other residents won't be able to contact you.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => removeSpot({ id: spot.id })} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SpotCard({ spot }: { spot: ParkingSpot }) {
  return (
    <Card className="overflow-hidden rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300 dark:bg-slate-900/50 dark:border-slate-800 dark:shadow-none bg-white">
      <div className="p-5 flex items-start gap-4">
        <Avatar className="h-12 w-12 border-2 border-slate-50 dark:border-slate-800 shadow-sm">
          <AvatarFallback className="bg-gradient-to-br from-indigo-100 to-sky-100 text-indigo-700 dark:from-indigo-900 dark:to-sky-900 dark:text-indigo-200 font-bold text-sm">
            {getInitials(spot.userName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate font-display text-lg">{spot.userName}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
            <Building2 className="w-3.5 h-3.5" /> Apt {spot.userApartment}
          </p>
          
          <div className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl px-3 py-2.5 w-fit border border-slate-200/50 dark:border-slate-700/50">
            <Clock className="w-4 h-4 text-primary" />
            {spot.availableFrom} <span className="text-slate-400 font-normal mx-1">to</span> {spot.availableUntil}
          </div>
        </div>
      </div>
      <div className="px-5 pb-5 pt-0">
        <Button asChild className="w-full font-semibold shadow-sm h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 hover:-translate-y-0.5 transition-transform" variant="default">
          <a href={`tel:${spot.userPhone}`}>
            <Phone className="w-4 h-4 mr-2" /> Contact
          </a>
        </Button>
      </div>
    </Card>
  );
}
