# Configuración de Google Drive

Este directorio almacena los archivos **no versionados** que permiten
conectar el backend con Google Drive.

Archivos esperados (se crean manualmente después de clonar el repo):

1. `google-credentials.json`
   - Descárgalo desde Google Cloud Console al crear un OAuth Client ID
     del tipo "Aplicación de escritorio".
   - Guarda el archivo completo aquí sin modificar su nombre.

2. `google-token.json`
   - Se genera automáticamente la primera vez que autorices la app.
   - El backend guardará y renovará este token en el mismo archivo.

Ambos archivos están ignorados en Git (`.gitignore`) para evitar exponer
credenciales reales. Consulta el README principal para conocer el flujo
completo de configuración.
