import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";

import Dashboard from "@/pages/dashboard";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: true,
      staleTime: 1000 * 60,
      throwOnError: false,
    },
    mutations: {
      throwOnError: false,
    },
  },
});

function FullScreenLoader() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
      <p className="text-slate-500 font-medium">Carregando CondoPark...</p>
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) return <FullScreenLoader />;
  if (!user) return null;

  return <Component />;
}

function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) return <FullScreenLoader />;
  if (user) return null;

  return <Component />;
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/auth">
        <PublicRoute component={AuthPage} />
      </Route>
      <Route path="/">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRouter />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
