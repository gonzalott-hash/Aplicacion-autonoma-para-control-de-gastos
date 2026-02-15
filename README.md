# Aplicación Autónoma para Control de Gastos

Un sistema moderno y seguro para la gestión de finanzas personales, diseñado para Propietarios y usuarios secundarios (familia/pareja).

## Características (Versión 0.1)

- **Gestión de Roles**: 
  - **Propietario**: Control total, configuración de monedas y permisos.
  - **Usuario Secundario**: Acceso restringido, requiere validación diaria.
- **Seguridad**: Validación de contraseñas y permisos diarios.
- **Multimoneda**: Soporte para Soles (PEN) y Dólares (USD).
- **Dashboard en Tiempo Real**: Visualización de saldos y últimos movimientos.
- **Exportación de Datos**: Copia de seguridad en formato Excel.
- **Diseño Glassmorphism**: Interfaz moderna y responsiva.

## Tecnologías

- **Frontend**: React + Vite
- **Estilos**: Tailwind CSS + Lucide Icons
- **Backend**: Supabase (Auth, Database, Realtime)
- **Estado**: Zustand

## Instalación

1.  Clonar el repositorio.
2.  Instalar dependencias: `npm install`
3.  Configurar variables de entorno en `.env` (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).
4.  Ejecutar: `npm run dev`
