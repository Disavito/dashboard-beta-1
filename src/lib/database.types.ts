export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      socio_titulares: {
        Row: {
          id: string
          dni: string
          nombres: string
          apellidoPaterno: string
          apellidoMaterno: string
          localidad: string
          distritoVivienda?: string | null
          direccionVivienda?: string | null
          distritoDNI?: string | null
          direccionDNI?: string | null
          celular?: string | null
          fechaNacimiento?: string | null
          situacionEconomica?: string | null
          mz?: string | null
          lote?: string | null
          is_lote_medido?: boolean
          isObservado?: boolean
          is_payment_observed?: boolean
          observacion?: string | null
          payment_observation_detail?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Insert: Partial<Database['public']['Tables']['socio_titulares']['Row']>
        Update: Partial<Database['public']['Tables']['socio_titulares']['Row']>
      }
      ingresos: {
        Row: {
          id: string
          date: string
          receipt_number: string
          dni: string
          full_name: string
          amount: number
          concept: string
          account?: string | null
          operation_number?: string | null
          numeroOperacion?: string | null
          transaction_type?: string
          created_at?: string
        }
        Insert: Partial<Database['public']['Tables']['ingresos']['Row']>
        Update: Partial<Database['public']['Tables']['ingresos']['Row']>
      }
      gastos: {
        Row: {
          id: string
          numero_gasto: string
          date: string
          amount: number
          category: string
          sub_category?: string | null
          description?: string | null
          receipt_type?: string | null
          receipt_number?: string | null
          presupuesto_id?: string | null
          colaborador_id?: string | null
          account?: string | null
          status?: string
          created_at?: string
        }
        Insert: Partial<Database['public']['Tables']['gastos']['Row']>
        Update: Partial<Database['public']['Tables']['gastos']['Row']>
      }
      cuentas: {
        Row: {
          id: string
          name: string
          tipo: string
          account_number?: string | null
          cci?: string | null
          balance?: number
          created_at?: string
        }
        Insert: Partial<Database['public']['Tables']['cuentas']['Row']>
        Update: Partial<Database['public']['Tables']['cuentas']['Row']>
      }
      colaboradores: {
        Row: {
          id: string
          user_id: string
          name: string
          apellidos?: string | null
          role?: string | null
          cargo?: string | null
          custom_permissions?: Record<string, boolean> | null
          created_at?: string
        }
        Insert: Partial<Database['public']['Tables']['colaboradores']['Row']>
        Update: Partial<Database['public']['Tables']['colaboradores']['Row']>
      }
      jornadas: {
        Row: {
          id: string
          user_id: string
          fecha: string
          hora_entrada?: string | null
          hora_salida?: string | null
          hora_inicio_jornada?: string | null
          hora_fin_jornada?: string | null
          hora_inicio_almuerzo?: string | null
          hora_fin_almuerzo?: string | null
          justificacion_inicio?: string | null
          justificacion_almuerzo?: string | null
          justificacion_fin?: string | null
          observaciones_inicio?: string | null
          observaciones_almuerzo?: string | null
          observaciones_fin?: string | null
          estado?: string | null
          justificacion?: string | null
          created_at?: string
        }
        Insert: Partial<Database['public']['Tables']['jornadas']['Row']>
        Update: Partial<Database['public']['Tables']['jornadas']['Row']>
      }
      registros_jornada: {
        Row: {
          id: string
          colaborador_id: string
          fecha: string
          hora_entrada?: string | null
          hora_salida?: string | null
          hora_inicio_jornada?: string | null
          hora_fin_jornada?: string | null
          hora_inicio_almuerzo?: string | null
          hora_fin_almuerzo?: string | null
          justificacion_inicio?: string | null
          justificacion_almuerzo?: string | null
          justificacion_fin?: string | null
          observaciones_inicio?: string | null
          observaciones_almuerzo?: string | null
          observaciones_fin?: string | null
          tipo_registro?: string | null
          estado?: string | null
          justificacion?: string | null
          created_at?: string
        }
        Insert: Partial<Database['public']['Tables']['registros_jornada']['Row']>
        Update: Partial<Database['public']['Tables']['registros_jornada']['Row']>
      }
      approval_requests: {
        Row: {
          id: string
          request_type: string
          amount?: number | null
          requested_by: string
          requested_by_name?: string | null
          reason?: string | null
          payload?: Json | null
          status: 'pending' | 'approved' | 'rejected'
          created_at: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Insert: Partial<Database['public']['Tables']['approval_requests']['Row']>
        Update: Partial<Database['public']['Tables']['approval_requests']['Row']>
      }
      socio_documentos: {
        Row: {
          id: string
          socio_id: string
          tipo_documento: string
          link_documento: string
          deleted_at?: string | null
          create_at?: string
          created_at?: string
        }
        Insert: Partial<Database['public']['Tables']['socio_documentos']['Row']>
        Update: Partial<Database['public']['Tables']['socio_documentos']['Row']>
      }
      pending_file_deletions: {
        Row: {
          id: string
          socio_id?: string | null
          tipo_documento?: string | null
          link_documento: string
          file_path?: string | null
          status: 'pending' | 'processed' | 'failed'
          created_at: string
          processed_at?: string | null
        }
        Insert: Partial<Database['public']['Tables']['pending_file_deletions']['Row']>
        Update: Partial<Database['public']['Tables']['pending_file_deletions']['Row']>
      }
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

export type SocioTitular = Tables<'socio_titulares'>
export type Ingreso = Tables<'ingresos'>
export type Gasto = Tables<'gastos'>
export type Cuenta = Tables<'cuentas'>
export type Colaborador = Tables<'colaboradores'>
export type ApprovalRequest = Tables<'approval_requests'>
export type SocioDocumento = Tables<'socio_documentos'>
