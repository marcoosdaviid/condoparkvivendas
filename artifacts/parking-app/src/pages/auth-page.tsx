import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { CarFront, Loader2, ArrowRight } from "lucide-react";
import { useRegisterUser, useLoginUser } from "@workspace/api-client-react";

import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const loginSchema = z.object({
  phone: z.string().min(10, "Please enter a valid phone number (min 10 chars)"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  apartment: z.string().min(1, "Apartment number is required"),
  phone: z.string().min(10, "Please enter a valid phone number"),
});

export default function AuthPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  const { mutate: doLogin, isPending: isLoggingIn } = useLoginUser({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Welcome back!", description: "Successfully logged in." });
        login(data);
      },
      onError: (err: any) => {
        toast({ 
          title: "Login Failed", 
          description: err?.error || err?.message || "User not found or invalid phone.", 
          variant: "destructive" 
        });
      },
    },
  });

  const { mutate: doRegister, isPending: isRegistering } = useRegisterUser({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Account created!", description: "Successfully registered." });
        login(data);
      },
      onError: (err: any) => {
        toast({ 
          title: "Registration Failed", 
          description: err?.error || err?.message || "Could not create account.", 
          variant: "destructive" 
        });
      },
    },
  });

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: "" },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", apartment: "", phone: "" },
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 z-0" />
      <img 
        src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
        alt="Background" 
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
          <p className="text-slate-500 dark:text-slate-400 mt-2">Share and find parking spots in your building.</p>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 h-12 rounded-xl p-1 bg-slate-100/80 dark:bg-slate-800/80">
              <TabsTrigger value="login" className="rounded-lg text-sm font-semibold">Login</TabsTrigger>
              <TabsTrigger value="register" className="rounded-lg text-sm font-semibold">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-0">
              <form onSubmit={loginForm.handleSubmit((v) => doLogin({ data: v }))} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-phone" className="text-slate-700 dark:text-slate-300">Phone Number</Label>
                  <Input 
                    id="login-phone" 
                    placeholder="e.g. 555-0123" 
                    className="h-12 rounded-xl bg-white/50 dark:bg-slate-950/50"
                    {...loginForm.register("phone")} 
                  />
                  {loginForm.formState.errors.phone && (
                    <p className="text-sm text-destructive font-medium">{loginForm.formState.errors.phone.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full h-12 rounded-xl text-base shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all" disabled={isLoggingIn}>
                  {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>Sign In <ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-0">
              <form onSubmit={registerForm.handleSubmit((v) => doRegister({ data: v }))} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="reg-name" className="text-slate-700 dark:text-slate-300">Full Name</Label>
                  <Input 
                    id="reg-name" 
                    placeholder="Jane Doe" 
                    className="h-12 rounded-xl bg-white/50 dark:bg-slate-950/50"
                    {...registerForm.register("name")} 
                  />
                  {registerForm.formState.errors.name && (
                    <p className="text-sm text-destructive font-medium">{registerForm.formState.errors.name.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="reg-apt" className="text-slate-700 dark:text-slate-300">Apartment Number</Label>
                  <Input 
                    id="reg-apt" 
                    placeholder="Apt 4B" 
                    className="h-12 rounded-xl bg-white/50 dark:bg-slate-950/50"
                    {...registerForm.register("apartment")} 
                  />
                  {registerForm.formState.errors.apartment && (
                    <p className="text-sm text-destructive font-medium">{registerForm.formState.errors.apartment.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-phone" className="text-slate-700 dark:text-slate-300">Phone Number</Label>
                  <Input 
                    id="reg-phone" 
                    placeholder="e.g. 555-0123" 
                    className="h-12 rounded-xl bg-white/50 dark:bg-slate-950/50"
                    {...registerForm.register("phone")} 
                  />
                  {registerForm.formState.errors.phone && (
                    <p className="text-sm text-destructive font-medium">{registerForm.formState.errors.phone.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full h-12 rounded-xl text-base shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all" disabled={isRegistering}>
                  {isRegistering ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </motion.div>
    </div>
  );
}
