import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/context/UserContext';
import { useSearchParams } from 'react-router-dom';
import DeletionRequestsTable from '@/components/documents/DeletionRequestsTable';
import DocumentManager from '@/components/documents/DocumentManager';
import { Loader2, FolderOpen, FileWarning } from 'lucide-react';

const PartnerDocumentsPage = () => {
    const { roles, loading } = useUser();
    const [searchParams, setSearchParams] = useSearchParams();
    
    const isAdmin = roles?.includes('admin');
    // Si es admin, por defecto va a 'requests', si no, a 'my-documents'
    const initialTab = searchParams.get('tab') || 'my-documents';

    const handleTabChange = (value: string) => {
        setSearchParams({ tab: value }, { replace: true });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Gestión de Documentos</h1>
                <p className="text-muted-foreground text-lg">Administra los planos y memorias descriptivas de los socios.</p>
            </div>
            
            <Tabs value={initialTab} onValueChange={handleTabChange} className="w-full space-y-6">
                <TabsList className="grid w-full max-w-md grid-cols-2 p-1 bg-muted/80 border border-border rounded-lg">
                    <TabsTrigger 
                        value="my-documents" 
                        className="data-[state=active]:bg-card dark:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-sm font-medium transition-all"
                    >
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Repositorio
                    </TabsTrigger>
                    {isAdmin && (
                        <TabsTrigger 
                            value="requests" 
                            className="data-[state=active]:bg-card dark:bg-slate-900 data-[state=active]:text-red-600 data-[state=active]:shadow-sm font-medium transition-all"
                        >
                            <FileWarning className="w-4 h-4 mr-2" />
                            Solicitudes de Eliminación
                        </TabsTrigger>
                    )}
                </TabsList>
                
                <TabsContent value="my-documents" className="outline-none animate-in fade-in-50 duration-300">
                    <DocumentManager isAdmin={!!isAdmin} />
                </TabsContent>
                
                {isAdmin && (
                    <TabsContent value="requests" className="outline-none animate-in fade-in-50 duration-300">
                        <div className="bg-card dark:bg-slate-900 rounded-xl border border-border shadow-sm p-6">
                            <DeletionRequestsTable />
                        </div>
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
};

export default PartnerDocumentsPage;
