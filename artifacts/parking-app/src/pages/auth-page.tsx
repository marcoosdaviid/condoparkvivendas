import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { CarFront, Loader2, ArrowRight, Car, MapPin, Eye, EyeOff } from "lucide-react";
import {
  useRegisterUser,
  useLoginUser,
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
  password: z.string().min(1, "Informe sua senha"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  apartment: z.string().min(1, "Número do apartamento é obrigatório"),
  phone: z.string().min(10, "Informe um número de telefone válido"),
  phoneConfirm: z.string().min(10, "Confirme seu número de telefone"),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
  passwordConfirm: z.string().min(1, "Confirme sua senha"),
  wantsToRequestSpot: z.boolean().optional(),
  carPlate: z.string().optional(),
  hasParkingSpot: z.boolean().optional(),
  parkingSpotNumber: z.string().optional(),
}).refine((d) => d.phone === d.phoneConfirm, {
  message: "Os números de telefone não coincidem",
  path: ["phoneConfirm"],
}).refine((d) => d.password === d.passwordConfirm, {
  message: "As senhas não coincidem",
  path: ["passwordConfirm"],
});

function PasswordInput({ id, placeholder, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { id: string; placeholder: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        className="h-12 rounded-xl bg-white/50 dark:bg-slate-950/50 pr-11"
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function AuthPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"login" | "register">("register");
  const [wantsToRequest, setWantsToRequest] = useState(false);
  const [hasSpot, setHasSpot] = useState(false);

  const { mutate: doLogin, isPending: isLoggingIn } = useLoginUser({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Bem-vindo(a) de volta!" });
        login(data);
      },
      onError: (err: any) => {
        toast({
          title: "Falha no login",
          description: err?.data?.error || "Telefone ou senha incorretos.",
          variant: "destructive",
        });
      },
    },
  });

  const { mutate: doRegister, isPending: isRegistering } = useRegisterUser({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Bem-vindo(a) ao CondoPark Vivendas!", description: "Conta criada com sucesso." });
        login(data);
      },
      onError: (err: any) => {
        toast({
          title: "Falha no cadastro",
          description: err?.data?.error || "Não foi possível criar a conta.",
          variant: "destructive",
        });
      },
    },
  });

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: "", password: "" },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "", apartment: "", phone: "", phoneConfirm: "",
      password: "", passwordConfirm: "",
      wantsToRequestSpot: false, carPlate: "", hasParkingSpot: false, parkingSpotNumber: "",
    },
  });

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
          <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white">CondoPark Vivendas</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Compartilhe e encontre vagas no seu condomínio.</p>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 h-12 rounded-xl p-1 bg-slate-100/80 dark:bg-slate-800/80">
              <TabsTrigger value="login" className="rounded-lg text-sm font-semibold">Entrar</TabsTrigger>
              <TabsTrigger value="register" className="rounded-lg text-sm font-semibold">Cadastrar</TabsTrigger>
            </TabsList>

            {/* ─── LOGIN ─── */}
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

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password" className="text-slate-700 dark:text-slate-300">Senha</Label>
                    <a
                      href={(() => {
                        const phone = "5548996818495";
                        const text = "Olá, sou o morador [NOME] do apartamento [NÚMERO] e preciso resetar minha senha no CondoPark Vivendas.";
                        const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
                        return isMobile
                          ? `whatsapp://send?phone=${phone}&text=${encodeURIComponent(text)}`
                          : `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
                      })()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Esqueci minha senha
                    </a>
                  </div>
                  <PasswordInput
                    id="login-password"
                    placeholder="Sua senha"
                    {...loginForm.register("password")}
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-destructive font-medium">{loginForm.formState.errors.password.message}</p>
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

            {/* ─── CADASTRO ─── */}
            <TabsContent value="register" className="mt-0">
              <form
                onSubmit={registerForm.handleSubmit((v) =>
                  doRegister({
                    data: {
                      name: v.name,
                      apartment: v.apartment,
                      phone: v.phone,
                      password: v.password,
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

                {/* Telefone (2x) */}
                <div className="space-y-3">
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
                  <div className="space-y-2">
                    <Label htmlFor="reg-phone-confirm" className="text-slate-700 dark:text-slate-300">Confirmar Telefone</Label>
                    <Input
                      id="reg-phone-confirm"
                      placeholder="Digite o telefone novamente"
                      className="h-12 rounded-xl bg-white/50 dark:bg-slate-950/50"
                      {...registerForm.register("phoneConfirm")}
                    />
                    {registerForm.formState.errors.phoneConfirm && (
                      <p className="text-sm text-destructive font-medium">{registerForm.formState.errors.phoneConfirm.message}</p>
                    )}
                  </div>
                </div>

                {/* Senha (2x) */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="reg-password" className="text-slate-700 dark:text-slate-300">Senha</Label>
                    <PasswordInput
                      id="reg-password"
                      placeholder="Mínimo 6 caracteres"
                      {...registerForm.register("password")}
                    />
                    {registerForm.formState.errors.password && (
                      <p className="text-sm text-destructive font-medium">{registerForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password-confirm" className="text-slate-700 dark:text-slate-300">Confirmar Senha</Label>
                    <PasswordInput
                      id="reg-password-confirm"
                      placeholder="Digite a senha novamente"
                      {...registerForm.register("passwordConfirm")}
                    />
                    {registerForm.formState.errors.passwordConfirm && (
                      <p className="text-sm text-destructive font-medium">{registerForm.formState.errors.passwordConfirm.message}</p>
                    )}
                  </div>
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
