import { useState, useEffect, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { EconomicSituationOption } from '@/lib/types';
import { Loader2, CalendarIcon, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, differenceInYears, isValid, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import ConfirmationDialog from '@/components/ui-custom/ConfirmationDialog';
import { DialogFooter } from '@/components/ui/dialog';
import axios from 'axios';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { DateMaskInput } from '@/components/ui/date-mask-input';

// --- Zod Schemas ---
const personalDataSchema = z.object({
  dni: z.string().min(8, { message: 'El DNI debe tener 8 dígitos.' }).max(8, { message: 'El DNI debe tener 8 dígitos.' }).regex(/^\d{8}$/, { message: 'El DNI debe ser 8 dígitos numéricos.' }),
  nombres: z.string().min(1, { message: 'Los nombres son requeridos.' }).max(255, { message: 'Los nombres son demasiado largos.' }),
  apellidoPaterno: z.string().min(1, { message: 'El apellido paterno es requerido.' }).max(255, { message: 'El apellido paterno es demasiado largo.' }),
  apellidoMaterno: z.string().min(1, { message: 'El apellido materno es requerido.' }).max(255, { message: 'El apellido materno es demasiado largo.' }),
  fechaNacimiento: z.string().min(1, { message: 'La fecha de nacimiento es requerida.' }),
  edad: z.number().int().min(0, { message: 'La edad no puede ser negativa.' }).optional().nullable(),
  celular: z.string()
    .max(15, { message: 'El celular es demasiado largo.' })
    .optional()
    .nullable()
    .refine((val) => {
      if (val === null || val === undefined || val === '') {
        return true; 
      }
      return /^\d+$/.test(val); 
    }, {
      message: 'El celular debe contener solo números si está presente.',
    }),
  situacionEconomica: z.enum(['Pobre', 'Extremo Pobre'], { message: 'La situación económica es requerida.' }),
  direccionDNI: z.string().min(1, { message: 'La dirección DNI es requerida.' }).max(255, { message: 'La dirección DNI es demasiado larga.' }),
  regionDNI: z.string().min(1, { message: 'La región DNI es requerida.' }).max(255, { message: 'La región DNI es demasiado larga.' }),
  provinciaDNI: z.string().min(1, { message: 'La provincia DNI es requerida.' }).max(255, { message: 'La provincia DNI es demasiado larga.' }),
  distritoDNI: z.string().min(1, { message: 'El distrito DNI es requerido.' }).max(255, { message: 'El distrito DNI es demasiado larga.' }),
  localidad: z.string().min(1, { message: 'La localidad es requerida.' }).max(255, { message: 'La localidad es demasiado larga.' }),
  
  isObservado: z.boolean().default(false),
  observacion: z.string().max(1000, { message: 'La observación es demasiado larga.' }).optional().nullable(),

  isPaymentObserved: z.boolean().default(false),
  paymentObservationDetail: z.string().max(1000, { message: 'El detalle de la observación de pago es demasiado largo.' }).optional().nullable(),

}).superRefine((data, ctx) => {
  if (data.isObservado && (!data.observacion || data.observacion.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La observación administrativa es requerida si el socio está marcado como "Observado".',
      path: ['observacion'],
    });
  }
  if (data.isPaymentObserved && (!data.paymentObservationDetail || data.paymentObservationDetail.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'El detalle de la observación de pago es requerido si el pago está marcado como "Observado".',
      path: ['paymentObservationDetail'],
    });
  }
});

const addressDataSchema = z.object({
  regionVivienda: z.string().optional().nullable(),
  provinciaVivienda: z.string().optional().nullable(),
  distritoVivienda: z.string().optional().nullable(),
  direccionVivienda: z.string().optional().nullable(),
  mz: z.string().optional().nullable(),
  lote: z.string().optional().nullable(),
});

const formSchema = z.intersection(personalDataSchema, addressDataSchema);

type SocioTitularFormValues = z.infer<typeof formSchema>;

interface SocioTitularRegistrationFormProps {
  socioId?: string; 
  onClose: () => void;
  onSuccess: () => void;
}

const economicSituationOptions: EconomicSituationOption[] = [
  { value: 'Pobre', label: 'Pobre' },
  { value: 'Extremo Pobre', label: 'Extremo Pobre' },
];

const calculateAge = (dobString: string): number | null => {
  if (!dobString) return null;
  try {
    const dob = parseISO(dobString);
    return differenceInYears(new Date(), dob);
  } catch (e) {
    return null;
  }
};

function SocioTitularRegistrationForm({ socioId, onClose, onSuccess }: SocioTitularRegistrationFormProps) {
  const [activeTab, setActiveTab] = useState<'personal' | 'address'>('personal'); 
  const [isDniSearching, setIsDniSearching] = useState(false);
  const [isReniecSearching, setIsReniecSearching] = useState(false); 
  const [dateInput, setDateInput] = useState('');

  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [dataToConfirm, setDataToConfirm] = useState<SocioTitularFormValues | null>(null);
  const [isConfirmingSubmission, setIsConfirmingSubmission] = useState(false);

  const [localitiesSuggestions, setLocalitiesSuggestions] = useState<string[]>([]);
  const [localityAddressMap, setLocalityAddressMap] = useState<Record<string, { regionVivienda: string; provinciaVivienda: string; distritoVivienda: string }>>({}); 
  const [isLocalitiesLoading, setIsLocalitiesLoading] = useState(false);
  const [openLocalitiesPopover, setOpenLocalitiesPopover] = useState(false);

  const form = useForm<SocioTitularFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dni: '',
      nombres: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      fechaNacimiento: '',
      edad: null,
      celular: '',
      situacionEconomica: undefined,
      direccionDNI: '',
      regionDNI: '',
      provinciaDNI: '',
      distritoDNI: '',
      localidad: '',
      isObservado: false,
      observacion: '',
      isPaymentObserved: false,
      paymentObservationDetail: '',
      regionVivienda: '',
      provinciaVivienda: '',
      distritoVivienda: '',
      direccionVivienda: '',
      mz: '',
      lote: '',
    },
    shouldFocusError: true,
  });

  const { handleSubmit, setValue, watch, reset, register, control, formState: { errors } } = form;
  const watchedDni = watch('dni');
  const watchedFechaNacimiento = watch('fechaNacimiento');
  const watchedLocalidad = watch('localidad'); 
  const watchedIsObservado = watch('isObservado');
  const watchedIsPaymentObserved = watch('isPaymentObserved');

  // Sincronizar input manual cuando cambia el valor interno
  useEffect(() => {
    if (watchedFechaNacimiento) {
      setDateInput(format(parseISO(watchedFechaNacimiento), 'dd/MM/yyyy'));
    }
  }, [watchedFechaNacimiento]);

  const handleManualDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDateInput(val);
    
    // Intentar parsear si tiene longitud completa DD/MM/YYYY
    if (val.length === 10) {
      const parsedDate = parse(val, 'dd/MM/yyyy', new Date());
      if (isValid(parsedDate)) {
        setValue('fechaNacimiento', format(parsedDate, 'yyyy-MM-dd'));
      }
    }
  };

  const onInvalid = useCallback((errors: any) => {
    const errorKeys = Object.keys(errors);
    if (errorKeys.length === 0) return;
    const addressFields = ['regionVivienda', 'provinciaVivienda', 'distritoVivienda', 'direccionVivienda', 'mz', 'lote'];
    const firstErrorKey = errorKeys[0];
    const isAddressError = addressFields.includes(firstErrorKey);

    if (isAddressError && activeTab !== 'address') {
      setActiveTab('address');
    } else if (!isAddressError && activeTab !== 'personal') {
      setActiveTab('personal');
    }

    setTimeout(() => {
      const errorElement = document.getElementsByName(firstErrorKey)[0] || document.getElementById(firstErrorKey);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        errorElement.focus();
      }
      toast.error('Por favor, completa los campos obligatorios marcados en rojo.');
    }, 100);
  }, [activeTab]);

  useEffect(() => {
    if (watchedFechaNacimiento) {
      const calculatedAge = calculateAge(watchedFechaNacimiento);
      setValue('edad', calculatedAge);
    } else {
      setValue('edad', null);
    }
  }, [watchedFechaNacimiento, setValue]);

  const fetchUniqueLocalities = useCallback(async () => {
    setIsLocalitiesLoading(true);
    const { data, error } = await supabase
      .from('socio_titulares')
      .select('localidad, regionVivienda, provinciaVivienda, distritoVivienda')
      .neq('localidad', '')
      .order('localidad', { ascending: true });

    if (!error && data) {
      const uniqueLocalities: string[] = [];
      const addressMap: Record<string, { regionVivienda: string; provinciaVivienda: string; distritoVivienda: string }> = {};

      data.forEach(item => {
        const loc = item.localidad;
        if (!loc) return;
        if (!addressMap[loc]) {
          uniqueLocalities.push(loc);
          // Guardar los datos de la primera entrada que tenga info de vivienda
          addressMap[loc] = {
            regionVivienda: item.regionVivienda || '',
            provinciaVivienda: item.provinciaVivienda || '',
            distritoVivienda: item.distritoVivienda || '',
          };
        } else {
          // Si la entrada actual tiene datos más completos, actualizar
          const existing = addressMap[loc];
          if (!existing.regionVivienda && item.regionVivienda) existing.regionVivienda = item.regionVivienda;
          if (!existing.provinciaVivienda && item.provinciaVivienda) existing.provinciaVivienda = item.provinciaVivienda;
          if (!existing.distritoVivienda && item.distritoVivienda) existing.distritoVivienda = item.distritoVivienda;
        }
      });

      setLocalitiesSuggestions(uniqueLocalities);
      setLocalityAddressMap(addressMap);
    }
    setIsLocalitiesLoading(false);
  }, []);

  useEffect(() => {
    fetchUniqueLocalities();
  }, [fetchUniqueLocalities]);

  const renderInputField = (
    id: keyof SocioTitularFormValues,
    label: string,
    placeholder: string,
    type: string = 'text',
    readOnly: boolean = false,
    isSearching: boolean = false,
    onBlur?: () => void
  ) => {
    return (
      <div className="flex flex-col sm:grid sm:grid-cols-4 sm:items-center gap-2 sm:gap-4">
        <Label htmlFor={id} className="sm:text-right text-textSecondary">
          {label}
        </Label>
        <div className="col-span-full sm:col-span-3 relative">
          <Input
            id={id}
            type={type}
            {...register(id, { valueAsNumber: id === 'edad' ? true : false })}
            className={cn(
              "uppercase rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300",
              errors[id] && "border-error ring-1 ring-error/20"
            )}
            placeholder={placeholder}
            readOnly={readOnly}
            onBlur={onBlur}
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
          )}
        </div>
        {errors[id] && <p className="col-span-full sm:col-span-4 text-right text-error text-sm font-medium animate-in fade-in slide-in-from-top-1">{errors[id]?.message}</p>}
      </div>
    );
  };

  const renderTextareaField = (
    id: keyof SocioTitularFormValues,
    label: string,
    placeholder: string,
    readOnly: boolean = false,
    isSearching: boolean = false
  ) => {
    return (
      <div className="flex flex-col sm:grid sm:grid-cols-4 sm:items-center gap-2 sm:gap-4">
        <Label htmlFor={id} className="sm:text-right text-textSecondary">
          {label}
        </Label>
        <div className="col-span-full sm:col-span-3 relative">
          <Textarea
            id={id}
            {...register(id)}
            className={cn(
              "uppercase flex-grow rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300",
              errors[id] && "border-error ring-1 ring-error/20"
            )}
            placeholder={placeholder}
            readOnly={readOnly}
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
          )}
        </div>
        {errors[id] && <p className="col-span-full sm:col-span-4 text-right text-error text-sm font-medium animate-in fade-in slide-in-from-top-1">{errors[id]?.message}</p>}
      </div>
    );
  };

  const renderRadioGroupField = (
    id: keyof SocioTitularFormValues,
    label: string,
    options: { value: string; label: string }[]
  ) => {
    return (
      <FormField
        control={control}
        name={id}
        render={({ field }) => (
          <FormItem className="flex flex-col sm:grid sm:grid-cols-4 sm:items-center gap-2 sm:gap-4">
            <FormLabel className="sm:text-right text-textSecondary">{label}</FormLabel>
            <FormControl className="col-span-full sm:col-span-3">
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value as string}
                className="flex flex-row space-x-4"
              >
                {options.map(option => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`${id}-${option.value}`} />
                    <Label htmlFor={`${id}-${option.value}`}>{option.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </FormControl>
            {errors[id] && <FormMessage className="col-span-full sm:col-span-4 text-right" />}
          </FormItem>
        )}
      />
    );
  };

  const fetchReniecDataAndPopulate = useCallback(async (dni: string): Promise<boolean> => {
    if (!dni || dni.length !== 8) return false;
    setIsReniecSearching(true);
    
    const formatDateToISO = (dateStr: string | undefined) => {
      if (!dateStr) return '';
      if (dateStr.includes('-')) return dateStr;
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month}-${day}`;
      }
      return dateStr;
    };

    let dataFound = false;
    const hasMissingCriticalData = () => !form.getValues('nombres') || !form.getValues('fechaNacimiento') || !form.getValues('direccionDNI');

    try {
      // Usamos el endpoint local que hemos creado en server.js
      // Este endpoint internamente inyecta el token de forma segura
      const response = await axios.post(`/api/reniec`, {
        type_document: "dni",
        document_number: dni,
      }, { timeout: 10000 });

      const data = response.data.data;
        if (response.data?.success && data) {
          if (data.name || data.nombres) setValue('nombres', data.name || data.nombres);
          
          let pPaterno = data.apellido_paterno || data.ape_paterno || '';
          let pMaterno = data.apellido_materno || data.ape_materno || '';
          
          if (!pPaterno && data.surname) {
            const particles = ['DE', 'DEL', 'LA', 'LAS', 'LOS', 'SAN', 'SANTA', 'VDA.', 'VDA', 'VIUDA'];
            const words = data.surname.trim().split(/\s+/);
            const parts = [];
            for (let i = 0; i < words.length; i++) {
              let currentPart = [];
              while (i < words.length && particles.includes(words[i].toUpperCase())) {
                currentPart.push(words[i]);
                i++;
              }
              if (i < words.length) {
                currentPart.push(words[i]);
              }
              if (currentPart.length > 0) {
                parts.push(currentPart.join(' '));
              }
            }
            pPaterno = parts[0] || '';
            pMaterno = parts.slice(1).join(' ') || '';
          }
          
          if (pPaterno) setValue('apellidoPaterno', pPaterno);
          if (pMaterno) setValue('apellidoMaterno', pMaterno);
          if (data.date_of_birth) setValue('fechaNacimiento', data.date_of_birth);
          if (data.address) setValue('direccionDNI', data.address);
          if (data.department) setValue('regionDNI', data.department);
          if (data.province) setValue('provinciaDNI', data.province);
          if (data.district) setValue('distritoDNI', data.district);
          dataFound = true;
        }
    } catch (e) { console.warn('API 1 falló'); }


    if (!dataFound || hasMissingCriticalData()) {
      try {
        const { data: tData, error } = await supabase.rpc('consultar_dni_externo', { p_dni: dni });
        if (!error && tData) {
          if (!form.getValues('nombres')) setValue('nombres', tData.NOMBRES || '');
          if (!form.getValues('apellidoPaterno')) setValue('apellidoPaterno', tData.AP_PAT || '');
          if (!form.getValues('apellidoMaterno')) setValue('apellidoMaterno', tData.AP_MAT || '');
          if (tData.FECHA_NAC && (!form.getValues('fechaNacimiento') || form.getValues('fechaNacimiento') === '')) {
             setValue('fechaNacimiento', formatDateToISO(tData.FECHA_NAC));
          }
          if (!form.getValues('direccionDNI')) setValue('direccionDNI', tData.DIRECCION || '');
          dataFound = true;
        }
      } catch (e) { console.error('Error DB:', e); }
    }

    setIsReniecSearching(false);
    if (dataFound) toast.success('Datos recuperados de Reniec');
    return dataFound;
  }, [setValue, form]);

  const searchSocioByDni = useCallback(async (dni: string) => {
    if (!dni || dni.length !== 8) return;
    setIsDniSearching(true);
    let dataFoundInDb = false;
    try {
      const { data } = await supabase
        .from('socio_titulares')
        .select('nombres, apellidoPaterno, apellidoMaterno, fechaNacimiento, edad, celular, direccionDNI, regionDNI, provinciaDNI, distritoDNI, localidad') 
        .eq('dni', dni)
        .maybeSingle();

      if (data) {
        setValue('nombres', data.nombres);
        setValue('apellidoPaterno', data.apellidoPaterno);
        setValue('apellidoMaterno', data.apellidoMaterno);
        setValue('fechaNacimiento', data.fechaNacimiento ? format(parseISO(data.fechaNacimiento), 'yyyy-MM-dd') : '');
        setValue('edad', data.edad);
        setValue('celular', data.celular);
        setValue('direccionDNI', data.direccionDNI);
        setValue('regionDNI', data.regionDNI);
        setValue('provinciaDNI', data.provinciaDNI);
        setValue('distritoDNI', data.distritoDNI);
        setValue('localidad', data.localidad);
        dataFoundInDb = true;
        toast.success('Socio encontrado en base de datos');
      }
    } catch (e) { console.error("Error buscando en DB:", e); }

    if (!dataFoundInDb) await fetchReniecDataAndPopulate(dni);
    setIsDniSearching(false);
  }, [setValue, fetchReniecDataAndPopulate]);

  useEffect(() => {
    const fetchSocio = async () => {
      if (socioId !== undefined) {
        const { data } = await supabase
          .from('socio_titulares')
          .select('*, isObservado, observacion, is_payment_observed, payment_observation_detail') 
          .eq('id', socioId)
          .maybeSingle();

        if (data) {
          reset({
            ...data,
            fechaNacimiento: data.fechaNacimiento ? format(parseISO(data.fechaNacimiento), 'yyyy-MM-dd') : '',
            situacionEconomica: data.situacionEconomica || undefined,
            isObservado: data.isObservado || false,
            observacion: data.observacion || '',
            isPaymentObserved: data.is_payment_observed || false,
            paymentObservationDetail: data.payment_observation_detail || '',
          });
        }
      }
    };
    fetchSocio();
  }, [socioId, reset]);

  const handleCloseConfirmationOnly = () => {
    setIsConfirmDialogOpen(false);
    setDataToConfirm(null);
    setIsConfirmingSubmission(false);
  };

  const onValidSubmit = async (values: SocioTitularFormValues) => {
    // Sanitizar campos de texto: Mayúsculas y sin espacios extra al inicio/final
    const sanitizedValues = { ...values } as any;
    Object.keys(sanitizedValues).forEach(key => {
      if (typeof sanitizedValues[key] === 'string') {
        sanitizedValues[key] = sanitizedValues[key].toUpperCase().trim();
      }
    });

    if (!sanitizedValues.isObservado) sanitizedValues.observacion = null;
    if (!sanitizedValues.isPaymentObserved) sanitizedValues.paymentObservationDetail = null;
    setDataToConfirm(sanitizedValues);
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (!dataToConfirm) return;
    setIsConfirmingSubmission(true);
    try {
      const { data: existingSocios } = await supabase
        .from('socio_titulares')
        .select('id')
        .eq('dni', dataToConfirm.dni);

      const isDuplicateDni = existingSocios && existingSocios.length > 0 &&
                             (socioId === undefined || existingSocios[0].id !== socioId);

      if (isDuplicateDni) {
        toast.error('Este DNI ya está registrado.');
        setIsConfirmDialogOpen(false);
        setIsConfirmingSubmission(false);
        return;
      }

      const { isPaymentObserved, paymentObservationDetail, ...restOfData } = dataToConfirm;
      const dataToSave = {
        ...restOfData,
        is_payment_observed: isPaymentObserved,
        payment_observation_detail: isPaymentObserved ? paymentObservationDetail : null,
        observacion: dataToConfirm.isObservado ? dataToConfirm.observacion : null,
      };
      
      if (socioId !== undefined) {
        const { error } = await supabase.from('socio_titulares').update(dataToSave).eq('id', socioId);
        if (error) throw error;
        toast.success('Socio actualizado');
        onSuccess();
        onClose();
      } else {
        const { error } = await supabase.from('socio_titulares').insert(dataToSave);
        if (error) throw error;
        toast.success('Socio registrado exitosamente. Puedes registrar otro.');
        reset();
        handleCloseConfirmationOnly();
        setActiveTab('personal');
      }
    } catch (e: any) {
      toast.error('Error al guardar: ' + e.message);
    } finally {
      setIsConfirmingSubmission(false);
    }
  };

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form onSubmit={handleSubmit(onValidSubmit, onInvalid)} className="space-y-6">
          <div className="flex border-b border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setActiveTab('personal')}
              className={cn(
                "py-2 px-4 text-lg font-semibold transition-colors duration-300",
                activeTab === 'personal' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              Datos Personales
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setActiveTab('address')}
              className={cn(
                "py-2 px-4 text-lg font-semibold transition-colors duration-300",
                activeTab === 'address' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              Datos de Vivienda
            </Button>
          </div>

          <div className="p-4 space-y-4 overflow-y-auto max-h-[70vh] scroll-smooth">
            {activeTab === 'personal' && (
              <div className="space-y-4 animate-in fade-in duration-500">
                <div className="flex flex-col sm:grid sm:grid-cols-4 sm:items-center gap-2 sm:gap-4">
                  <Label htmlFor="dni" className="sm:text-right text-textSecondary">DNI</Label>
                  <div className="col-span-full sm:col-span-3 relative flex items-center gap-2">
                    <Input
                      id="dni"
                      {...register('dni')}
                      className={cn(
                        "uppercase flex-grow rounded-lg border-border bg-background",
                        errors.dni && "border-error ring-1 ring-error/20"
                      )}
                      placeholder="Ej: 12345678"
                      readOnly={isDniSearching || isReniecSearching}
                      onBlur={() => searchSocioByDni(watchedDni)}
                    />
                    {(isDniSearching || isReniecSearching) && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
                    )}
                  </div>
                  {errors.dni && <p className="col-span-full sm:col-span-4 text-right text-error text-sm font-medium">{errors.dni?.message}</p>}
                </div>
                {renderInputField('nombres', 'Nombres', 'Ej: Juan Carlos', 'text', isReniecSearching)}
                {renderInputField('apellidoPaterno', 'Apellido Paterno', 'Ej: García', 'text', isReniecSearching)}
                {renderInputField('apellidoMaterno', 'Apellido Materno', 'Ej: Pérez', 'text', isReniecSearching)}
                
                <FormField
                  control={form.control}
                  name="fechaNacimiento"
                  render={({ field }) => (
                    <FormItem className="flex flex-col sm:grid sm:grid-cols-4 sm:items-center gap-2 sm:gap-4">
                      <FormLabel className="sm:text-right text-textSecondary">Fecha Nacimiento</FormLabel>
                      <div className="col-span-full sm:col-span-3 flex gap-2">
                        <FormControl>
                          <DateMaskInput
                            value={dateInput}
                            onChange={handleManualDateChange}
                            className={cn(
                              "rounded-lg border-border bg-background",
                              errors.fechaNacimiento && "border-error ring-1 ring-error/20"
                            )}
                            disabled={isReniecSearching}
                          />
                        </FormControl>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className="px-3 rounded-lg border-border bg-background"
                              disabled={isReniecSearching}
                            >
                              <CalendarIcon className="h-4 w-4 text-primary" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-card border-border rounded-xl shadow-lg" align="end">
                            <Calendar
                              mode="single"
                              selected={field.value ? parseISO(field.value) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  field.onChange(format(date, 'yyyy-MM-dd'));
                                }
                              }}
                              initialFocus
                              locale={es}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <FormMessage className="col-span-full sm:col-span-4 text-right" />
                    </FormItem>
                  )}
                />
                {renderInputField('edad', 'Edad', 'Ej: 35', 'number', true)}

                <FormField
                  control={form.control}
                  name="localidad"
                  render={({ field }) => (
                    <FormItem className="flex flex-col sm:grid sm:grid-cols-4 sm:items-center gap-2 sm:gap-4">
                      <FormLabel className="sm:text-right text-textSecondary">Localidad</FormLabel>
                      <Popover open={openLocalitiesPopover} onOpenChange={setOpenLocalitiesPopover}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "col-span-full sm:col-span-3 w-full justify-between rounded-lg border-border bg-background",
                                errors.localidad && "border-error ring-1 ring-error/20"
                              )}
                              disabled={isReniecSearching || isLocalitiesLoading}
                            >
                              {field.value || "Selecciona o escribe una localidad..."}
                              <Loader2 className={cn("ml-2 h-4 w-4 shrink-0 opacity-0", isLocalitiesLoading && "animate-spin opacity-100")} />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-card border-border rounded-xl shadow-lg">
                          <Command>
                            <CommandInput
                              placeholder="Buscar localidad..."
                              value={field.value}
                              onValueChange={(search) => field.onChange(search)}
                            />
                            <CommandList>
                              <CommandEmpty>No se encontró localidad.</CommandEmpty>
                              <CommandGroup>
                                {localitiesSuggestions
                                  .filter(loc => loc.toLowerCase().includes((watchedLocalidad || '').toLowerCase()))
                                  .map((loc) => (
                                    <CommandItem
                                      value={loc}
                                      key={loc}
                                      onSelect={(currentValue) => {
                                        field.onChange(currentValue);
                                        setOpenLocalitiesPopover(false);
                                        // Auto-rellenar región, provincia y distrito de vivienda
                                        const addressData = localityAddressMap[currentValue];
                                        if (addressData) {
                                          if (addressData.regionVivienda) setValue('regionVivienda', addressData.regionVivienda);
                                          if (addressData.provinciaVivienda) setValue('provinciaVivienda', addressData.provinciaVivienda);
                                          if (addressData.distritoVivienda) setValue('distritoVivienda', addressData.distritoVivienda);
                                        }
                                      }}
                                    >
                                      <Check className={cn("mr-2 h-4 w-4", field.value === loc ? "opacity-100" : "opacity-0")} />
                                      {loc}
                                    </CommandItem>
                                  ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage className="col-span-full sm:col-span-4 text-right" />
                    </FormItem>
                  )}
                />

                {renderTextareaField('direccionDNI', 'Dirección DNI', 'Ej: Av. Los Girasoles 123', isReniecSearching)}
                {renderInputField('regionDNI', 'Región DNI', 'Ej: Lima', 'text', isReniecSearching)}
                {renderInputField('provinciaDNI', 'Provincia DNI', 'Ej: Lima', 'text', isReniecSearching)}
                {renderInputField('distritoDNI', 'Distrito DNI', 'Ej: Miraflores', 'text', isReniecSearching)}
                {renderInputField('celular', 'Celular (Opcional)', 'Ej: 987654321', 'tel', isReniecSearching)}
                {renderRadioGroupField('situacionEconomica', 'Situación Económica', economicSituationOptions)}
                
                <div className="space-y-4 pt-6 border-t border-border mt-6">
                  <h3 className="text-xl font-semibold text-primary">Estado de Observación Administrativa</h3>
                  <FormField
                    control={control}
                    name="isObservado"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-xl border border-primary/50 p-4 shadow-lg bg-primary/10">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-1 h-5 w-5" />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-lg font-semibold text-primary">Marcar como Socio Observado</FormLabel>
                          <p className="text-sm text-textSecondary">Active esta opción si hay alguna discrepancia administrativa.</p>
                        </div>
                      </FormItem>
                    )}
                  />
                  {watchedIsObservado && (
                    <FormField
                      control={control}
                      name="observacion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-textSecondary">Detalle de Observación Administrativa</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Razón de la observación..." 
                              className={cn("min-h-[100px]", errors.observacion && "border-error ring-1 ring-error/20")} 
                              {...field} 
                              value={field.value || ''} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="space-y-4 pt-6 border-t border-border mt-6">
                  <h3 className="text-xl font-semibold text-accent">Estado de Observación Financiera</h3>
                  <FormField
                    control={control}
                    name="isPaymentObserved"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-xl border border-accent/50 p-4 shadow-lg bg-accent/10">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-1 h-5 w-5" />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-lg font-semibold text-accent">Marcar Pago Observado</FormLabel>
                          <p className="text-sm text-textSecondary">Active esta opción si hay problemas de conciliación de pagos.</p>
                        </div>
                      </FormItem>
                    )}
                  />
                  {watchedIsPaymentObserved && (
                    <FormField
                      control={control}
                      name="paymentObservationDetail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-textSecondary">Detalle de Observación de Pago</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Razón de la observación financiera..." 
                              className={cn("min-h-[100px]", errors.paymentObservationDetail && "border-error ring-1 ring-error/20")} 
                              {...field} 
                              value={field.value || ''} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                
                <div className="flex justify-end mt-6">
                  <Button type="button" onClick={() => setActiveTab('address')} className="bg-secondary text-secondary-foreground">
                    Siguiente: Datos de Vivienda
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'address' && (
              <div className="space-y-4 animate-in fade-in duration-500">
                <h3 className="text-xl font-bold text-primary mb-4 border-b border-border pb-2">Ubicación de la Vivienda</h3>
                {renderTextareaField('direccionVivienda', 'Dirección (Vivienda)', 'Ej: Calle Las Flores 456')}
                {renderInputField('mz', 'MZ (Manzana)', 'Ej: A')}
                {renderInputField('lote', 'Lote', 'Ej: 15')}
                {renderInputField('regionVivienda', 'Región', 'Ej: Lima')}
                {renderInputField('provinciaVivienda', 'Provincia', 'Ej: Lima')}
                {renderInputField('distritoVivienda', 'Distrito', 'Ej: San Juan de Lurigancho')}
              </div>
            )}
          </div>

          <DialogFooter className="p-6 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">{socioId !== undefined ? 'Guardar Cambios' : 'Registrar Socio'}</Button>
          </DialogFooter>
        </form>
      </Form>

      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        onClose={handleCloseConfirmationOnly}
        onConfirm={handleConfirmSubmit}
        title={socioId !== undefined ? 'Confirmar Edición' : 'Confirmar Registro'}
        description="Revisa los detalles antes de confirmar."
        data={dataToConfirm || {}}
        confirmButtonText="Confirmar"
        isConfirming={isConfirmingSubmission}
      />
    </FormProvider>
  );
}

export default SocioTitularRegistrationForm;
