import { useUser } from '@/context/UserContext';
import { useQuery } from '@tanstack/react-query';
import { getColaboradorProfile } from '@/lib/api/jornadaApi';
import { Loader2, UserX, Clock } from 'lucide-react';
import ClockManager from '@/components/jornada/ClockManager';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminJornadaView from '@/components/jornada/AdminJornadaView';
import AdminClockManager from '@/components/jornada/AdminClockManager';

const JornadaPage = () => {
  const { user, roles, customPermissions } = useUser();
  const isAdminOrFinanzas = roles?.includes('admin') || roles?.includes('finanzas_senior');
  const isAdmin = isAdminOrFinanzas || !!customPermissions?.can_manage_jornada;

  const { data: colaborador, isLoading, isError } = useQuery({
    queryKey: ['colaboradorProfile', user?.id],
    queryFn: () => getColaboradorProfile(user!.id),
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#4892CC]" />
      </div>
    );
  }

  if (isError || !colaborador) {
    return (
      <div className="max-w-md mx-auto mt-10">
        <Alert variant="destructive" className="rounded-2xl border-none shadow-lg">
          <UserX className="h-5 w-5" />
          <AlertTitle className="font-black uppercase tracking-tight">Error de Perfil</AlertTitle>
          <AlertDescription className="font-medium">
            No se encontró un perfil de colaborador vinculado a tu cuenta. Contacta a soporte.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background page-enter pb-10">
      <div className="w-full bg-card dark:bg-slate-900 border-b border-border/50 py-12 px-8 shadow-sm mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-black text-foreground tracking-tight uppercase">Jornada y Accesos</h1>
                <p className="text-muted-foreground font-medium mt-1">Control de asistencias y registro de horas laborales.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6 px-4 md:px-8">
        {isAdmin ? (
          <Tabs defaultValue="mi-jornada" className="w-full">
            <TabsList className="bg-card dark:bg-slate-900/80 backdrop-blur-md border border-border p-1.5 rounded-2xl h-14 shadow-sm mb-6 flex overflow-x-auto max-w-full scrollbar-none shrink-0 justify-start sm:justify-center">
              <TabsTrigger value="mi-jornada" className="rounded-xl px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-muted-foreground transition-all">Mi Jornada</TabsTrigger>
              <TabsTrigger value="seguimiento" className="rounded-xl px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-muted-foreground transition-all">Seguimiento</TabsTrigger>
              <TabsTrigger value="registro-manual" className="rounded-xl px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-muted-foreground transition-all">Admin</TabsTrigger>
            </TabsList>
            
            <TabsContent value="mi-jornada" className="mt-0">
              <div className="flex justify-center items-start pt-4">
                <ClockManager colaborador={colaborador} />
              </div>
            </TabsContent>
            
            <TabsContent value="seguimiento" className="mt-0">
              <AdminJornadaView />
            </TabsContent>
            
            <TabsContent value="registro-manual" className="mt-0">
              <div className="flex justify-center items-start pt-4">
                <AdminClockManager />
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex justify-center items-start pt-10">
            <ClockManager colaborador={colaborador} />
          </div>
        )}
      </div>
    </div>
  );
};

export default JornadaPage;
