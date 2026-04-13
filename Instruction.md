Rewrite the root README.md with the EXACT installation guide 
for the end client on Windows. Use the real project structure 
discovered below.

---

## Real project facts (use these, do not invent anything)

WHAT THE CLIENT RECEIVES (3 files):
  1. Dulce Colonial Setup 1.0.0.exe   ← 222MB installer
  2. INSTALAR.bat                     ← runs once to set up the DB
  3. README.md                        ← this guide (printed or sent)

WHAT HAPPENS AUTOMATICALLY:
- The .exe contains: compiled backend, frontend, and Electron runtime
- INSTALAR.bat runs setup-env.js which AUTO-CREATES the .env file
- The .env is created with: postgres:postgres@localhost:5432/dulce_colonial
- JWT_SECRET is randomly generated automatically
- Therefore: the client does NOT need to create any .env file manually

THE ONLY REQUIREMENT:
- During PostgreSQL installation, the client MUST use exactly 
  "postgres" as the password (no quotes)
- Port must be 5432 (default)
- Everything else is automatic

GOOGLE DRIVE (optional feature):
- After installation, the admin can connect Google Drive 
  from Settings → Google Drive inside the app
- This is optional and does not affect basic functionality

---

## README.md structure

Write in friendly Spanish for a non-technical Windows user.
Time estimate: 15-20 minutes total.

---

# 🍫 Dulce Colonial — Guía de Instalación

Add a friendly intro:
  Este proceso solo se hace UNA VEZ.
  Tiempo estimado: 15-20 minutos.
  Sigue los pasos en orden y no tendrás ningún problema.

Add a checklist of what they will install:
  □ Paso 1 — Node.js
  □ Paso 2 — PostgreSQL  
  □ Paso 3 — Ejecutar INSTALAR.bat
  □ Paso 4 — Instalar la aplicación
  □ Paso 5 — ¡Listo para usar!

---

## PASO 1 — Instalar Node.js

### Descargar
  1. Abre Chrome o Edge
  2. Ve a: https://nodejs.org
  3. Haz clic en el botón verde que dice "20.x.x LTS"
     (LTS = versión estable recomendada)
  4. Se descarga: node-v20.x.x-x64.msi
  5. Espera que termine la descarga

### Instalar paso a paso (cada pantalla del instalador)
  Pantalla 1 — "Welcome to the Node.js Setup Wizard"
    → Clic en: Next

  Pantalla 2 — "End-User License Agreement"  
    → Marca: "I accept the terms in the License Agreement"
    → Clic en: Next

  Pantalla 3 — "Destination Folder"
    → NO cambies nada
    → Clic en: Next

  Pantalla 4 — "Custom Setup"
    → NO cambies nada
    → Clic en: Next

  Pantalla 5 — "Tools for Native Modules"
    → NO marques nada
    → Clic en: Next

  Pantalla 6 — "Ready to install"
    → Clic en: Install
    → Si Windows pregunta "¿Permitir cambios?" → Clic en: Sí
    → Espera 1-2 minutos

  Pantalla 7 — "Completed"
    → Clic en: Finish

### Verificar instalación
  1. Presiona: Windows + R
  2. Escribe: cmd → Enter
  3. En la ventana negra escribe: node --version
  4. Debe aparecer: v20.x.x
  
  ✅ Si ves el número → Node.js instalado correctamente
  ❌ Si ves error → Reinicia el computador e intenta de nuevo

---

## PASO 2 — Instalar PostgreSQL

### ⚠️ ANTES DE EMPEZAR — Lee esto
  
  ┌─────────────────────────────────────────────────────┐
  │  IMPORTANTE: Durante la instalación te pedirá       │
  │  crear una contraseña.                              │
  │                                                     │
  │  Debes escribir EXACTAMENTE esta contraseña:        │
  │                                                     │
  │              postgres                               │
  │                                                     │
  │  (en minúsculas, sin espacios, sin comillas)        │
  │                                                     │
  │  Si usas otra contraseña la aplicación              │
  │  NO funcionará.                                     │
  └─────────────────────────────────────────────────────┘

### Descargar
  1. Ve a: https://www.postgresql.org/download/windows/
  2. Haz clic en: "Download the installer"
  3. En la tabla busca la fila "16.x"
  4. Haz clic en el ícono de descarga columna "Windows x86-64"
  5. Se descarga: postgresql-16.x-windows-x64.exe

### Instalar paso a paso (cada pantalla del instalador)
  Pantalla 1 — "Setup - PostgreSQL"
    → Clic en: Next

  Pantalla 2 — "Installation Directory"
    → NO cambies nada
    → Clic en: Next

  Pantalla 3 — "Select Components"
    → Deja todas las casillas marcadas como están
    → Clic en: Next

  Pantalla 4 — "Data Directory"
    → NO cambies nada
    → Clic en: Next

  Pantalla 5 — ⚠️ "Password" (MUY IMPORTANTE)
    → En "Password" escribe:        postgres
    → En "Retype password" escribe: postgres
    → Clic en: Next

  Pantalla 6 — "Port"
    → Debe mostrar: 5432
    → NO cambies nada
    → Clic en: Next

  Pantalla 7 — "Advanced Options"
    → NO cambies nada
    → Clic en: Next

  Pantalla 8 — "Pre Installation Summary"
    → Verifica que Port = 5432
    → Clic en: Next

  Pantalla 9 — "Ready to Install"
    → Clic en: Next
    → Espera 3-5 minutos (barra de progreso)

  Pantalla 10 — "Completing the PostgreSQL Setup Wizard"
    → DESMARCA "Launch Stack Builder at exit"
    → Clic en: Finish

### Verificar que PostgreSQL está corriendo
  1. Presiona: Windows + R
  2. Escribe: services.msc → Enter
  3. En la lista busca: postgresql-x64-16
  4. La columna "Status" debe decir: Running

  💡 Si no dice Running:
     → Clic derecho sobre postgresql-x64-16
     → Clic en: Start

---

## PASO 3 — Ejecutar INSTALAR.bat (solo una vez)

Este archivo configura la base de datos automáticamente.
No necesitas hacer nada más que ejecutarlo.

  1. Busca el archivo: INSTALAR.bat
     (está en la misma carpeta que recibiste)
  
  2. Haz DOBLE CLIC sobre INSTALAR.bat
  
  3. Si Windows pregunta "¿Permitir cambios?" → Clic en: Sí
  
  4. Se abre una ventana negra. Verás estos mensajes:

     ╔══════════════════════════════════════╗
     ║     Instalación de Dulce Colonial    ║
     ╚══════════════════════════════════════╝

     ✓ Node.js encontrado
     ✓ PostgreSQL encontrado
     Instalando dependencias...
     ✓ Dependencias instaladas
     ✓ Archivo .env creado
     ✓ Base de datos creada
     ✓ Migraciones completadas

     ╔══════════════════════════════════════╗
     ║   ✅ Instalación completada          ║
     ╚══════════════════════════════════════╝
     Presione cualquier tecla para continuar...

  5. Presiona cualquier tecla → la ventana se cierra

  ✅ Si ves "Instalación completada" → todo correcto
  ❌ Si ves texto en rojo → ve a "Solución de problemas"

  💡 Este paso solo se hace UNA VEZ.
     La próxima vez que uses la app NO necesitas ejecutarlo.

---

## PASO 4 — Instalar la aplicación Dulce Colonial

  1. Busca: Dulce Colonial Setup 1.0.0.exe
  
  2. Haz DOBLE CLIC
  
  3. Es posible que Windows muestre:
     "Windows protegió su equipo"
     → Clic en: "Más información"
     → Clic en: "Ejecutar de todas formas"
  
  4. Se abre el instalador:

     Pantalla 1:
       → Clic en: Siguiente

     Pantalla 2 — Carpeta de instalación:
       → Puedes dejar: C:\Program Files\Dulce Colonial\
       → Clic en: Instalar
       → Espera 1-2 minutos

     Pantalla 3 — Completado:
       → Clic en: Finalizar

  5. Aparece en tu escritorio: 🍫 Dulce Colonial

---

## PASO 5 — Abrir y usar la aplicación

### Uso diario
  1. Haz DOBLE CLIC en el ícono del escritorio:
     🍫 Dulce Colonial
  
  2. Aparece pantalla marrón:
     "🍫 Dulce Colonial — Iniciando sistema..."
     Espera 5-15 segundos (la primera vez puede tardar más)
  
  3. Aparece la pantalla de inicio de sesión
     → Ingresa con las credenciales que te dio el administrador

  ✅ ¡Listo! La instalación está completa.

### Para que PostgreSQL inicie automático con Windows
  1. Presiona: Windows + R → escribe: services.msc → Enter
  2. Busca: postgresql-x64-16
  3. Doble clic → "Startup type" → selecciona: Automatic
  4. Clic en: OK

---

## SOLUCIÓN DE PROBLEMAS

| ❌ Problema | 🔍 Causa | ✅ Solución |
|------------|---------|------------|
| "No se pudo conectar con el servidor" | PostgreSQL no está corriendo | services.msc → postgresql-x64-16 → Start |
| INSTALAR.bat muestra error rojo | Contraseña de PostgreSQL no es "postgres" | Reinstalar PostgreSQL usando contraseña: postgres |
| La app no abre | Puerto 3000 ocupado | Reiniciar el computador |
| Pantalla en blanco | Error interno | Cerrar y volver a abrir la app |
| "Windows protegió su equipo" | App sin firma digital | Clic "Más información" → "Ejecutar de todas formas" |
| INSTALAR.bat se cierra instantáneamente | Sin permisos | Clic derecho → "Ejecutar como administrador" |

---

## FUNCIÓN OPCIONAL — Google Drive

La aplicación puede guardar reportes automáticamente en Google Drive.

Para activarlo (solo el administrador):
  1. Abre la aplicación
  2. Ve a: Configuración → Google Drive
  3. Clic en: "Conectar Google Drive"
  4. Se abre Google en el navegador → autoriza el acceso
  5. Listo — los reportes se guardarán automáticamente

💡 Esta función es opcional. La app funciona perfectamente sin ella.

---

## DESINSTALACIÓN

Si necesitas desinstalar:
  Windows → Configuración → Aplicaciones → 
  Dulce Colonial → Desinstalar

  ⚠️ Tus datos en la base de datos NO se eliminan.
     Quedan guardados en PostgreSQL.

---

## SOPORTE TÉCNICO

  📧 Email:    [EMAIL]
  📱 WhatsApp: [NÚMERO]
  🕐 Horario:  Lunes a viernes 8am - 6pm

  Al escribir incluye:
  → Una foto del error que aparece en pantalla
  → En qué paso se detuvo

---

## Rules
- Write everything in friendly simple Spanish
- No technical jargon whatsoever
- Every installer screen must be described exactly as it appears
- The PostgreSQL password "postgres" must be highlighted 
  prominently with a warning box in PASO 2
- Make clear INSTALAR.bat only runs ONCE
- The .env is created AUTOMATICALLY — never tell the client 
  to create it manually
- Use markdown tables for troubleshooting
- Add a table of contents at the top with anchor links
- Total README should be thorough but scannable
- Replace [EMAIL] and [NÚMERO] with placeholder text