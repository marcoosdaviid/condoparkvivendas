import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { CarFront, Loader2, ArrowRight, Phone, ShieldCheck, Car, RefreshCw, MapPin } from "lucide-react";
import {
  useRegisterUser,
  useLoginUser,
  useSendOtp,
  useVerifyOtp,
  type User,
} from "@workspace/api-client-react";

import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const loginSchema = z.object({
  phone: z.string().min(10, "Informe um número de telefone válido (mín. 10 dígitos)"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  apartment: z.string().min(1, "Número do apartamento é obrigatório"),
  phone: z.string().min(10, "Informe um número de telefone válido"),
  wantsToRequestSpot: z.boolean().optional(),
  carPlate: z.string().optional(),
  hasParkingSpot: z.boolean().optional(),
  parkingSpotNumber: z.string().optional(),
});

const otpSchema = z.object({
  code: z.string().length(6, "O código tem 6 dígitos"),
});

export default function AuthPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"login" | "register">("register");
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [wantsToRequest, setWantsToRequest] = useState(false);
  const [hasSpot, setHasSpot] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const { mutate: doLogin, isPending: isLoggingIn } = useLoginUser({
    mutation: {
      onSuccess: (data) => {
        if (!data.phoneVerified) {
          setPendingUser(data);
          triggerSendOtp(data.phone);
        } else {
          toast({ title: "Bem-vindo(a) de volta!" });
          login(data);
        }
      },
      onError: (err: any) => {
        toast({
          title: "Falha no login",
          description: err?.error || "Telefone não encontrado.",
          variant: "destructive",
        });
      },
    },
  });

  const { mutate: doRegister, isPending: isRegistering } = useRegisterUser({
    mutation: {
      onSuccess: (data) => {
        setPendingUser(data);
        triggerSendOtp(data.phone);
      },
      onError: (err: any) => {
        toast({
          title: "Falha no cadastro",
          description: err?.error || "Não foi possível criar a conta.",
          variant: "destructive",
        });
      },
    },
  });

  const { mutate: doSendOtp, isPending: isSendingOtp } = useSendOtp({
    mutation: {
      onSuccess: (data) => {
        setOtpSent(true);
        toast({
          title: "Código enviado!",
          description: `Código (desenvolvimento): ${data.devOtp}`,
        });
      },
      onError: (err: any) => {
        toast({
          title: "Erro ao enviar código",
          description: err?.error || "Tente novamente.",
          variant: "destructive",
        });
      },
    },
  });

  const { mutate: doVerifyOtp, isPending: isVerifying } = useVerifyOtp({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Telefone verificado!", description: "Bem-vindo(a) ao CondoPark." });
        login(data);
      },
      onError: (err: any) => {
        toast({
          title: "Código inválido",
          description: err?.error || "Verifique e tente novamente.",
          variant: "destructive",
        });
      },
    },
  });

  function triggerSendOtp(phone: string) {
    setOtpSent(false);
    doSendOtp({ data: { phone } });
  }

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: "" },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", apartment: "", phone: "", wantsToRequestSpot: false, carPlate: "", hasParkingSpot: false, parkingSpotNumber: "" },
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: "" },
  });

  if (pendingUser) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md mx-auto"
        >
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 mb-6">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white">Verificar Telefone</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
              Enviamos um código para <strong>{pendingUser.phone}</strong>
            </p>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 space-y-6">
            <AnimatePresence mode="wait">
              {!otpSent ? (
                <motion.div key="sending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <p className="text-slate-500 text-sm">Enviando código...</p>
                </motion.div>
              ) : (
                <motion.form
                  key="otp-form"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onSubmit={otpForm.handleSubmit((v) =>
                    doVerifyOtp({ data: { phone: pendingUser.phone, code: v.code } })
                  )}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <Label htmlFor="otp-code" className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Phone className="w-4 h-4" /> Código de verificação
                    </Label>
                    <Input
                      id="otp-code"
                      placeholder="000000"
                      maxLength={6}
                      className="h-14 rounded-xl text-center text-2xl tracking-[0.4em] font-mono bg-white/50 dark:bg-slate-950/50"
                      {...otpForm.register("code")}
                    />
                    {otpForm.formState.errors.code && (
                      <p className="text-sm text-destructive font-medium">{otpForm.formState.errors.code.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl text-base shadow-lg shadow-primary/25"
                    disabled={isVerifying}
                  >
                    {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verificar código"}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full text-slate-500"
                    onClick={() => triggerSendOtp(pendingUser.phone)}
                    disabled={isSendingOtp}
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    {isSendingOtp ? "Enviando..." : "Reenviar código"}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>

            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xl text-slate-500"
              onClick={() => { setPendingUser(null); setOtpSent(false); }}
            >
              Voltar
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 z-0" />
      <img
        src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
        alt="Fundo"
        className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay pointer-events-none z-0"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md mx-auto"
      >
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 mb-6">
            <CarFront className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white">CondoPark</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Compartilhe e encontre vagas no seu condomínio.</p>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 h-12 rounded-xl p-1 bg-slate-100/80 dark:bg-slate-800/80">
              <TabsTrigger value="login" className="rounded-lg text-sm font-semibold">Entrar</TabsTrigger>
              <TabsTrigger value="register" className="rounded-lg text-sm font-semibold">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-0">
              <form onSubmit={loginForm.handleSubmit((v) => doLogin({ data: v }))} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-phone" className="text-slate-700 dark:text-slate-300">Número de Telefone</Label>
                  <Input
                    id="login-phone"
                    placeholder="ex: 11 99999-0000"
                    className="h-12 rounded-xl bg-white/50 dark:bg-slate-950/50"
                    {...loginForm.register("phone")}
                  />
                  {loginForm.formState.errors.phone && (
                    <p className="text-sm text-destructive font-medium">{loginForm.formState.errors.phone.message}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl text-base shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all"
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>Entrar <ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-0">
              <form
                onSubmit={registerForm.handleSubmit((v) =>
                  doRegister({
                    data: {
                      name: v.name,
                      apartment: v.apartment,
                      phone: v.phone,
                      carPlate: v.wantsToRequestSpot && v.carPlate ? v.carPlate : undefined,
                      wantsToRequestSpot: v.wantsToRequestSpot,
                      hasParkingSpot: v.hasParkingSpot,
                      parkingSpotNumber: v.hasParkingSpot && v.parkingSpotNumber ? v.parkingSpotNumber : undefined,
                    },
                  })
                )}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Label htmlFor="reg-name" className="text-slate-700 dark:text-slate-300">Nome Completo</Label>
                  <Input
                    id="reg-name"
                    placeholder="João da Silva"
                    className="h-12 rounded-xl bg-white/50 dark:bg-slate-950/50"
                    {...registerForm.register("name")}
                  />
                  {registerForm.formState.errors.name && (
                    <p className="text-sm text-destructive font-medium">{registerForm.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-apt" className="text-slate-700 dark:text-slate-300">Número do Apartamento</Label>
                  <Input
                    id="reg-apt"
                    placeholder="Apto 4B"
                    className="h-12 rounded-xl bg-white/50 dark:bg-slate-950/50"
                    {...registerForm.register("apartment")}
                  />
                  {registerForm.formState.errors.apartment && (
                    <p className="text-sm text-destructive font-medium">{registerForm.formState.errors.apartment.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-phone" className="text-slate-700 dark:text-slate-300">Número de Telefone</Label>
                  <Input
                    id="reg-phone"
                    placeholder="ex: 11 99999-0000"
                    className="h-12 rounded-xl bg-white/50 dark:bg-slate-950/50"
                    {...registerForm.register("phone")}
                  />
                  {registerForm.formState.errors.phone && (
                    <p className="text-sm text-destructive font-medium">{registerForm.formState.errors.phone.message}</p>
                  )}
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Quero solicitar vagas</p>
                      <p className="text-xs text-slate-500 mt-0.5">Requer cadastro de placa</p>
                    </div>
                    <Switch
                      checked={wantsToRequest}
                      onCheckedChange={(v) => {
                        setWantsToRequest(v);
                        registerForm.setValue("wantsToRequestSpot", v);
                      }}
                    />
                  </div>

                  <AnimatePresence>
                    {wantsToRequest && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-2 pt-1">
                          <Label htmlFor="reg-plate" className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Car className="w-4 h-4" /> Placa do carro
                          </Label>
                          <Input
                            id="reg-plate"
                            placeholder="ABC1D23"
                            className="h-12 rounded-xl bg-white/50 dark:bg-slate-950/50 uppercase"
                            {...registerForm.register("carPlate")}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Possuo vaga para compartilhar</p>
                        <p className="text-xs text-slate-500 mt-0.5">Requer número da vaga</p>
                      </div>
                      <Switch
                        checked={hasSpot}
                        onCheckedChange={(v) => {
                          setHasSpot(v);
                          registerForm.setValue("hasParkingSpot", v);
                        }}
                      />
                    </div>

                    <AnimatePresence>
                      {hasSpot && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-2 pt-3">
                            <Label htmlFor="reg-spot-number" className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <MapPin className="w-4 h-4" /> Número da vaga
                            </Label>
                            <Input
                              id="reg-spot-number"
                              placeholder="Ex: 42 ou A-15"
                              className="h-12 rounded-xl bg-white/50 dark:bg-slate-950/50"
                              {...registerForm.register("parkingSpotNumber")}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl text-base shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all"
                  disabled={isRegistering}
                >
                  {isRegistering ? <Loader2 className="w-5 h-5 animate-spin" /> : "Criar Conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </motion.div>
    </div>
  );
}
