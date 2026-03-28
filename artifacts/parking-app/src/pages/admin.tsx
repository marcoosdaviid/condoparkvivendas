import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Users,
    Trash2,
    RefreshCcw,
    UserPlus,
    Search,
    LogOut,
    ShieldCheck,
    Phone,
    Home,
    ParkingCircle,
    Loader2,
    AlertCircle,
    BarChart3,
    CheckCircle2,
    MessageSquare,
    Clock,
    CalendarDays,
    Building2,
    ArrowRight,
} from "lucide-react";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ADMIN_CREDENTIALS = {
    username: "mdbestmd",
    password: "Pck6486@.asd"
};

function formatDate(dateStr: string | null | undefined) {
    if (!dateStr) return "–";
    // ISO datetime
    if (dateStr.includes("T")) {
        const d = new Date(dateStr);
        return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }
    // plain date YYYY-MM-DD
    return dateStr.split("-").reverse().join("/");
}

function EventRow({ event }: { event: any }) {
    const isPermission = event.event_type === "PERMISSION_GRANTED";
    return (
        <TableRow className="group hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors border-slate-50 dark:border-slate-800">
            <TableCell>
                {event.event_type === "PERMISSION_GRANTED" ? (
                    <Badge className="gap-1.5 bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 font-semibold border">
                        <CheckCircle2 className="w-3 h-3" /> Permissão
                    </Badge>
                ) : event.event_type === "SPOT_REQUESTED" ? (
                    <Badge className="gap-1.5 bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 font-semibold border">
                        <MessageSquare className="w-3 h-3" /> Solicitação
                    </Badge>
                ) : (
                    <Badge className="gap-1.5 bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800 font-semibold border">
                        <X className="w-3 h-3" /> {event.event_type === "REQUEST_CANCELLED" ? "Cancelado" : "Recusado"}
                    </Badge>
                )}
            </TableCell>
            <TableCell>
                <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-sm">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{event.owner_name ?? "–"}</span>
                        <span className="text-slate-400">Apto {event.owner_apartment ?? "–"}</span>
                    </div>
                    {event.spot_number && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-sky-200 bg-sky-50 text-sky-600 dark:border-sky-800 dark:bg-sky-900/10 dark:text-sky-400">
                            <ParkingCircle className="w-2.5 h-2.5 mr-0.5" /> Vaga {event.spot_number}
                        </Badge>
                    )}
                </div>
            </TableCell>
            <TableCell>
                <ArrowRight className="w-4 h-4 text-slate-400" />
            </TableCell>
            <TableCell>
                <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-sm">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{event.requester_name ?? "–"}</span>
                        <span className="text-slate-400">Apto {event.requester_apartment ?? "–"}</span>
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-1 text-slate-500 text-sm">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {event.date ? formatDate(event.date) : "Recorrente"}
                </div>
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 text-sm font-medium">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    {event.available_from ?? "–"} – {event.available_until ?? "–"}
                </div>
            </TableCell>
            <TableCell>
                <div className="text-xs text-slate-400">
                    {formatDate(event.created_at)}
                </div>
            </TableCell>
        </TableRow>
    );
}

function AnalyticsTab({ isAuthenticated }: { isAuthenticated: boolean }) {
    const [activeType, setActiveType] = useState<"ALL" | "PERMISSION_GRANTED" | "SPOT_REQUESTED">("ALL");

    const { data: events, isLoading } = useQuery({
        queryKey: ["admin", "events", activeType],
        queryFn: async () => {
            const url = activeType === "ALL"
                ? "/api/spots/events"
                : `/api/spots/events?type=${activeType}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error("Falha ao buscar eventos");
            return res.json();
        },
        enabled: isAuthenticated,
        refetchInterval: 30000,
    });

    const permissions = events?.filter((e: any) => e.event_type === "PERMISSION_GRANTED") ?? [];
    const requests = events?.filter((e: any) => e.event_type === "SPOT_REQUESTED") ?? [];
    const cancellations = events?.filter((e: any) => ["REQUEST_CANCELLED", "REQUEST_DECLINED"].includes(e.event_type)) ?? [];
    const filtered = activeType === "ALL" ? (events ?? []) : events?.filter((e: any) => e.event_type === activeType) ?? [];

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-white dark:bg-slate-900 border-none shadow-sm rounded-3xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-primary" /> Total de Eventos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900 dark:text-white">{events?.length ?? 0}</div>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-slate-900 border-none shadow-sm rounded-3xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" /> Permissões Concedidas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600 dark:text-green-400">{permissions.length}</div>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-slate-900 border-none shadow-sm rounded-3xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                            <X className="w-4 h-4 text-rose-500" /> Cancelamentos / Recusas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-rose-600 dark:text-rose-400">{cancellations.length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-primary" /> Registro de Atividades
                    </h2>
                    <div className="flex gap-2">
                        {(["ALL", "PERMISSION_GRANTED", "SPOT_REQUESTED", "REQUEST_CANCELLED", "REQUEST_DECLINED"] as const).map(type => (
                            <Button
                                key={type}
                                size="sm"
                                variant={activeType === type ? "default" : "outline"}
                                className="rounded-xl text-xs"
                                onClick={() => setActiveType(type as any)}
                            >
                                {type === "ALL" ? "Todos" : 
                                 type === "PERMISSION_GRANTED" ? "Permissões" : 
                                 type === "SPOT_REQUESTED" ? "Solicitações" :
                                 type === "REQUEST_CANCELLED" ? "Cancelados" : "Recusados"}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50/50 dark:bg-slate-800/30">
                            <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
                                <TableHead className="font-bold py-4">Tipo</TableHead>
                                <TableHead className="font-bold">Dono da Vaga</TableHead>
                                <TableHead className="font-bold w-8"></TableHead>
                                <TableHead className="font-bold">Solicitante</TableHead>
                                <TableHead className="font-bold">Data</TableHead>
                                <TableHead className="font-bold">Horário</TableHead>
                                <TableHead className="font-bold">Registrado em</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-64 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary opacity-50" />
                                        <p className="text-sm text-slate-400 mt-2">Carregando eventos...</p>
                                    </TableCell>
                                </TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-64 text-center text-slate-400">
                                        <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                        <p>Nenhum evento registrado ainda.</p>
                                        <p className="text-xs mt-1">Os eventos aparecerão aqui assim que houver solicitações ou permissões de vagas.</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((event: any) => (
                                    <EventRow key={event.id} event={event} />
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loginForm, setLoginForm] = useState({ username: "", password: "" });
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [newUser, setNewUser] = useState({
        name: "",
        phone: "",
        apartment: "",
        password: "123456",
        parkingSpotNumber: "",
        hasParkingSpot: false
    });

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (loginForm.username === ADMIN_CREDENTIALS.username && loginForm.password === ADMIN_CREDENTIALS.password) {
            setIsAuthenticated(true);
            toast({ title: "Login administrativo realizado" });
        } else {
            toast({
                title: "Falha na autenticação",
                description: "Usuário ou senha inválidos",
                variant: "destructive"
            });
        }
    };

    const { data: users, isLoading } = useQuery({
        queryKey: ["admin", "users"],
        queryFn: async () => {
            const res = await fetch("/api/users");
            if (!res.ok) throw new Error("Falha ao buscar usuários");
            return res.json();
        },
        enabled: isAuthenticated
    });

    const deleteMutation = useMutation({
        mutationFn: async (userId: number) => {
            const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Falha ao excluir usuário");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
            toast({ title: "Usuário excluído com sucesso" });
        }
    });

    const resetMutation = useMutation({
        mutationFn: async (userId: number) => {
            const res = await fetch(`/api/users/${userId}/reset-password`, { method: "POST" });
            if (!res.ok) throw new Error("Falha ao resetar senha");
            return res.json();
        },
        onSuccess: (data) => {
            toast({ title: "Senha resetada", description: data.message });
        }
    });

    const addMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch("/api/users/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Falha ao cadastrar usuário");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
            setIsAddUserOpen(false);
            setNewUser({ name: "", phone: "", apartment: "", password: "123456", parkingSpotNumber: "", hasParkingSpot: false });
            toast({ title: "Usuário cadastrado com sucesso" });
        },
        onError: (err: Error) => {
            toast({ title: "Erro no cadastro", description: err.message, variant: "destructive" });
        }
    });

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <Card className="w-full max-w-md border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                    <div className="h-2 bg-primary w-full" />
                    <CardHeader className="space-y-1 pt-8">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 mx-auto text-primary">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-center">Área Administrativa</CardTitle>
                        <CardDescription className="text-center">Acesso restrito ao síndico/administrador</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="admin-user">Usuário</Label>
                                <Input
                                    id="admin-user"
                                    value={loginForm.username}
                                    onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                                    placeholder="Seu login"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="admin-pass">Senha</Label>
                                <Input
                                    id="admin-pass"
                                    type="password"
                                    value={loginForm.password}
                                    onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                                    placeholder="Sua senha"
                                />
                            </div>
                            <Button type="submit" className="w-full h-11 mt-2 font-semibold">
                                Entrar no Painel
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const filteredUsers = users?.filter((u: any) =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phone.includes(searchTerm) ||
        u.apartment.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Painel Administrativo</h1>
                            <p className="text-slate-500 text-sm">CondoPark Vivendas · Síndico</p>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                            <DialogTrigger asChild>
                                <Button className="flex-1 sm:flex-none gap-2 rounded-xl">
                                    <UserPlus className="w-4 h-4" /> Novo Usuário
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-3xl max-w-lg">
                                <DialogHeader>
                                    <DialogTitle>Cadastrar Novo Morador</DialogTitle>
                                </DialogHeader>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Nome Completo</Label>
                                        <Input
                                            placeholder="Ex: João Silva"
                                            value={newUser.name}
                                            onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Telefone</Label>
                                        <Input
                                            placeholder="Ex: 48999999999"
                                            value={newUser.phone}
                                            onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Apartamento</Label>
                                        <Input
                                            placeholder="Ex: 402B"
                                            value={newUser.apartment}
                                            onChange={e => setNewUser({ ...newUser, apartment: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Número da Vaga (Opcional)</Label>
                                        <Input
                                            placeholder="Ex: 15"
                                            value={newUser.parkingSpotNumber}
                                            onChange={e => setNewUser({ ...newUser, parkingSpotNumber: e.target.value, hasParkingSpot: !!e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                        <AlertCircle className="w-3 h-3 inline mr-1 text-primary" />
                                        A senha padrão inicial será: <span className="text-slate-900 dark:text-slate-200 font-bold">123456</span>.
                                        Recomenda-se que o usuário altere a senha no primeiro acesso.
                                    </p>
                                </div>
                                <DialogFooter className="mt-4 gap-2">
                                    <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>Cancelar</Button>
                                    <Button
                                        onClick={() => addMutation.mutate(newUser)}
                                        disabled={addMutation.isPending}
                                    >
                                        {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Cadastro"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                        <Button variant="outline" size="icon" className="rounded-xl border-slate-200 dark:border-slate-800" onClick={() => setIsAuthenticated(false)}>
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="users">
                    <TabsList className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm p-1 h-12">
                        <TabsTrigger value="users" className="rounded-xl gap-2 font-semibold data-[state=active]:shadow-sm">
                            <Users className="w-4 h-4" /> Moradores
                        </TabsTrigger>
                        <TabsTrigger value="analytics" className="rounded-xl gap-2 font-semibold data-[state=active]:shadow-sm">
                            <BarChart3 className="w-4 h-4" /> Analytics
                        </TabsTrigger>
                    </TabsList>

                    {/* USERS TAB */}
                    <TabsContent value="users" className="space-y-6 mt-6">
                        {/* Stats Card */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="bg-white dark:bg-slate-900 border-none shadow-sm rounded-3xl">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-slate-500">Total de Moradores</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-slate-900 dark:text-white">{users?.length || 0}</div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Search & Table */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                            <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Lista de Moradores</h2>
                                <div className="relative w-full md:w-72">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="Pesquisar morador..."
                                        className="pl-10 h-10 bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-slate-50/50 dark:bg-slate-800/30">
                                        <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
                                            <TableHead className="font-bold py-4">Morador</TableHead>
                                            <TableHead className="font-bold">WhatsApp</TableHead>
                                            <TableHead className="font-bold">Apartamento</TableHead>
                                            <TableHead className="font-bold">Vaga</TableHead>
                                            <TableHead className="font-bold text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-64 text-center">
                                                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary opacity-50" />
                                                    <p className="text-sm text-slate-400 mt-2">Carregando moradores...</p>
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredUsers?.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-64 text-center text-slate-400">
                                                    Nenhum morador encontrado.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredUsers?.map((user: any) => (
                                                <TableRow key={user.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors border-slate-50 dark:border-slate-800">
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 uppercase">
                                                                {user.name.charAt(0)}
                                                            </div>
                                                            <span className="font-semibold text-slate-700 dark:text-slate-200">{user.name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2 text-slate-500">
                                                            <Phone className="w-3.5 h-3.5" /> {user.phone}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2 text-slate-500">
                                                            <Home className="w-3.5 h-3.5" /> {user.apartment}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {user.hasParkingSpot ? (
                                                            <Badge variant="outline" className="gap-1.5 py-1 px-3 border-sky-100 dark:border-sky-900/30 bg-sky-50 dark:bg-sky-900/10 text-sky-600 dark:text-sky-400 rounded-full font-medium">
                                                                <ParkingCircle className="w-3 h-3" /> {user.parkingSpotNumber}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-slate-400 text-sm">--</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                className="w-8 h-8 rounded-lg hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-900/20"
                                                                title="Resetar Senha"
                                                                onClick={() => resetMutation.mutate(user.id)}
                                                                disabled={resetMutation.isPending}
                                                            >
                                                                {resetMutation.isPending && resetMutation.variables === user.id ?
                                                                    <Loader2 className="w-3 h-3 animate-spin" /> :
                                                                    <RefreshCcw className="w-3 h-3" />
                                                                }
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                className="w-8 h-8 rounded-lg hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20"
                                                                title="Excluir Usuário"
                                                                onClick={() => {
                                                                    if (confirm(`Tem certeza que deseja excluir ${user.name}?`)) {
                                                                        deleteMutation.mutate(user.id)
                                                                    }
                                                                }}
                                                                disabled={deleteMutation.isPending}
                                                            >
                                                                {deleteMutation.isPending && deleteMutation.variables === user.id ?
                                                                    <Loader2 className="w-3 h-3 animate-spin" /> :
                                                                    <Trash2 className="w-3 h-3" />
                                                                }
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </TabsContent>

                    {/* ANALYTICS TAB */}
                    <TabsContent value="analytics" className="mt-6">
                        <AnalyticsTab isAuthenticated={isAuthenticated} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
