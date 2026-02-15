import { supabase } from '../lib/supabaseClient'
import * as XLSX from 'xlsx'

export const useExcelExport = () => {
    const exportToExcel = async (ownerId) => {
        try {
            // Fetch all movements
            const { data: movements, error } = await supabase
                .from('movements')
                .select(`
          created_at,
          type,
          amount,
          currency,
          category,
          observations,
          created_by
        `)
                .eq('owner_id', ownerId)
                .order('created_at', { ascending: false })

            if (error) throw error

            if (!movements || movements.length === 0) {
                alert('No hay movimientos para exportar')
                return
            }

            // Format data for Excel
            const formattedData = movements.map(m => ({
                Fecha: new Date(m.created_at).toLocaleString(),
                Tipo: m.type === 'expense' ? 'Gasto' : 'Incremento',
                Monto: m.amount,
                Moneda: m.currency,
                Categoría: m.category,
                Observaciones: m.observations || '',
                Usuario: m.created_by // TODO: Resolve to name if possible, for now ID or we rely on 'created_by' being text in original prompt but we made it UUID. 
                // Prompt says "Usuario: Automático". 
                // Ideally we join with users table but RLS might block viewing other users emails if not careful.
                // For MVP, ID is safe, or "Propietario"/"Secundario" based on ID vs OwnerID?
            }))

            // Create Worksheet
            const ws = XLSX.utils.json_to_sheet(formattedData)
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, "Movimientos")

            // Generate filename with date
            const dateStr = new Date().toISOString().split('T')[0]
            const fileName = `control_gastos_${dateStr}.xlsx`

            // Save
            XLSX.writeFile(wb, fileName)

        } catch (err) {
            console.error('Error exporting:', err)
            alert('Error al exportar: ' + err.message)
        }
    }

    return { exportToExcel }
}
