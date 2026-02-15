
# 1. Definir rutas
$rootDir = "e:\Proyectos Antigravity\Aplicacion-autonoma-para-control-de-gastos"
$subDir = "$rootDir\Stitch-App-Gestion-Expendios"

# 2. Lista de archivos/carpetas a eliminar en la raíz (Proyecto Antiguo)
$itemsToDelete = @(
    "src",
    "public",
    "node_modules",
    "scripts",
    "supabase",
    "package.json",
    "package-lock.json",
    "vite.config.js",
    "index.html",
    "postcss.config.js",
    "tailwind.config.js",
    "eslint.config.js",
    "vercel.json",
    "README.md"
)

# 3. Eliminar items de la raíz
Write-Host "Eliminando archivos del proyecto antiguo en la raíz..."
foreach ($item in $itemsToDelete) {
    $path = "$rootDir\$item"
    if (Test-Path $path) {
        Remove-Item -Recurse -Force $path
        Write-Host "Eliminado: $item"
    }
}

# 4. Mover contenido del subdirectorio a la raíz
Write-Host "Moviendo archivos del proyecto real a la raíz..."
Get-ChildItem -Path $subDir | Move-Item -Destination $rootDir -Force

# 5. Eliminar subdirectorio vacío
if ((Get-ChildItem $subDir).Count -eq 0) {
    Remove-Item -Force $subDir
    Write-Host "Carpeta subdirectorio eliminada."
} else {
    Write-Host "ADVERTENCIA: El subdirectorio no está vacío. No se eliminó."
}

Write-Host "Reestructuración completada."
