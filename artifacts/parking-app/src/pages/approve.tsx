import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, CarFront } from "lucide-react";
import { useApproveBooking } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";

export default function ApprovePage() {
  const [, setLocation] = useLocation();

  const params = new URLSearchParams(window.location.search);
  const spotId = Number(params.get("spotId"));
  const token = params.get("token") ?? "";
  const isValidParams = spotId > 0 && token.length > 0;

  const { data, isLoading, isError, error } = useApproveBooking(
    { spotId, token },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { query: { enabled: isValidParams, retry: false } as any }
  );

  const err = error as any;

  function renderContent() {
    if (!isValidParams) {
      return (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4 text-center">
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
          <p className="text-slate-600 dark:text-slate-400 font-medium">Aprovando reserva...</p>
        </motion.div>
      );
    }

    if (isError) {
      return (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white">Não foi possível aprovar</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
              {err?.error || "Este link de aprovação não é válido ou já foi utilizado."}
            </p>
          </div>
          <Button variant="outline" className="w-full rounded-xl h-12" onClick={() => setLocation("/")}>
            Ir ao CondoPark
          </Button>
        </motion.div>
      );
    }

    if (data) {
      return (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white">Reserva aprovada!</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
              {data.occupantName} está usando sua vaga até às {data.expectedExitTime}.
            </p>
            {data.carPlate && (
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                Placa: <strong>{data.carPlate}</strong>
              </p>
            )}
          </div>
          <Button className="w-full rounded-xl h-12" onClick={() => setLocation("/")}>
            Ver no CondoPark
          </Button>
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
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
