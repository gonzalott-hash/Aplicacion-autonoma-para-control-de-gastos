import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

export const downloadExcel = (data, fileName) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Gastos");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const fetchAndExportExpenses = async (initiativeId) => {
    try {
        if (!initiativeId) throw new Error("No hay iniciativa seleccionada.");

        const { data: expenses, error } = await supabase
            .from('expenses')
            .select(`
                created_at,
                description,
                amount,
                currency,
                category,
                profiles:user_id (full_name, email)
            `)
            .eq('initiative_id', initiativeId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        if (!expenses || expenses.length === 0) throw new Error("No hay gastos registrados para exportar.");

        // Formatear datos para el Excel
        const formattedData = expenses.map(exp => ({
            Fecha: new Date(exp.created_at).toLocaleDateString() + ' ' + new Date(exp.created_at).toLocaleTimeString(),
            Concepto: exp.description,
            Monto: (exp.category === 'INGRESO' ? '+' : '-') + exp.amount,
            Moneda: exp.currency,
            Categoría: exp.category || 'General',
            'Registrado Por': exp.profiles?.full_name || exp.profiles?.email || 'Desconocido'
        }));

        const fileName = `Reporte_Gastos_${new Date().toISOString().split('T')[0]}`;
        downloadExcel(formattedData, fileName);
        return { success: true, count: formattedData.length };

    } catch (error) {
        console.error('Error exportando Excel:', error);
        return { success: false, error: error.message };
    }
};
