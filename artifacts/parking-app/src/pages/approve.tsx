import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, XCircle, Loader2, CarFront,
  User, Building2, Car, ShieldCheck, ShieldX,
} from "lucide-react";
import {
  useGetPendingApproval,
  useConfirmApproval,
  useDeclineApproval,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function ApprovePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const params = new URLSearchParams(window.location.search);
  const spotId = Number(params.get("spotId"));
  const token = params.get("token") ?? "";
  const isValidParams = spotId > 0 && token.length > 0;

  const { data: spot, isLoading, isError, error } = useGetPendingApproval(
    { spotId, token },
    { query: { enabled: isValidParams, retry: false } as any }
  );

  const { mutate: confirm, isPending: confirming, data: confirmed } = useConfirmApproval({
    mutation: {
      onError: (err: any) =>
        toast({ title: "Erro ao permitir", description: err?.data?.error || "Ocorreu um erro.", variant: "destructive" }),
    },
  });

  const { mutate: decline, isPending: declining, data: declined } = useDeclineApproval({
    mutation: {
      onError: (err: any) =>
        toast({ title: "Erro ao recusar", description: err?.data?.error || "Ocorreu um erro.", variant: "destructive" }),
    },
  });

  function renderContent() {
    if (!isValidParams) {
      return (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white">Link inválido</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Este link de aprovação está incompleto ou corrompido.</p>
          </div>
          <Button variant="outline" className="w-full rounded-xl h-12" onClick={() => setLocation("/")}>
            Ir ao CondoPark
          </Button>
        </motion.div>
      );
    }

    if (isLoading) {
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">Carregando solicitação...</p>
        </motion.div>
      );
    }

    if (isError) {
      const err = error as any;
      return (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white">Link expirado</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
              {err?.data?.error || "Este link de aprovação não é válido ou já foi utilizado."}
            </p>
          </div>
          <Button variant="outline" className="w-full rounded-xl h-12" onClick={() => setLocation("/")}>
            Ir ao CondoPark
          </Button>
        </motion.div>
      );
    }

    if (confirmed) {
      return (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white">Uso permitido!</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
              {confirmed.occupantName} está usando sua vaga até às {confirmed.expectedExitTime}.
            </p>
            {confirmed.carPlate && (
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                Placa: <strong>{confirmed.carPlate}</strong>
              </p>
            )}
          </div>
          <Button className="w-full rounded-xl h-12" onClick={() => setLocation("/")}>
            Ver no CondoPark
          </Button>
        </motion.div>
      );
    }

    if (declined) {
      return (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5 text-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8 text-slate-500 dark:text-slate-400" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white">Solicitação recusada</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
              Sua vaga está disponível novamente para outros moradores.
            </p>
          </div>
          <Button variant="outline" className="w-full rounded-xl h-12" onClick={() => setLocation("/")}>
            Ver no CondoPark
          </Button>
        </motion.div>
      );
    }

    if (spot) {
      return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white leading-tight">
              Permitir uso da vaga para
            </h2>
            <p className="text-2xl font-display font-extrabold text-primary mt-1">
              {spot.interestedUserName}?
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{spot.interestedUserName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Apto {spot.interestedUserApartment}
                </p>
              </div>
            </div>
            {spot.carPlate && (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 pl-1">
                <Car className="w-4 h-4 text-slate-400" />
                <span>Placa: <strong>{spot.carPlate}</strong></span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button
              variant="outline"
              className="h-12 rounded-2xl font-semibold text-sm border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-red-50 hover:border-red-300 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors gap-2"
              onClick={() => decline({ id: spotId, data: { token } })}
              disabled={declining || confirming}
            >
              {declining ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldX className="w-4 h-4" />}
              Não permitir
            </Button>

            <Button
              className="h-12 rounded-2xl font-semibold text-sm bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-500/25 gap-2"
              onClick={() => confirm({ data: { spotId, token } })}
              disabled={confirming || declining}
            >
              {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Permitir uso
            </Button>
          </div>
        </motion.div>
      );
    }

    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 mb-4">
            <CarFront className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white">CondoPark</h1>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 p-8">
          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
