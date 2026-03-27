# Dulce-colonial
# 🍰 Dulce Colonial

**Dulce Colonial** es una aplicación de administración interna diseñada para una tienda de repostería y productos dulces.  
Su propósito es digitalizar y centralizar procesos administrativos del negocio, especialmente el control de inventario, productos, movimientos y reportes, funcionando de manera **local** en un solo equipo.

La solución está pensada para operar con una **base de datos PostgreSQL instalada localmente**, permitiendo que el negocio trabaje sin depender completamente de internet. Como apoyo adicional, el sistema puede realizar **respaldos periódicos o envío de registros a Google Drive**, con el fin de proteger la información importante y facilitar su conservación.

---

## 📌 Descripción del proyecto

Dulce Colonial nace como una solución para mejorar la organización interna de un negocio de repostería.  
Muchos procesos administrativos en pequeños negocios suelen manejarse manualmente, lo que genera desorden, duplicidad de información, errores en el control del inventario y riesgo de pérdida de datos.

Esta aplicación busca reemplazar esos procesos manuales por un sistema centralizado, práctico y escalable, que permita al negocio llevar un mejor control de su operación diaria.

---

## 🎯 Objetivo general

Desarrollar una aplicación local de administración para **Dulce Colonial**, orientada a la gestión interna del negocio, que permita controlar inventario, productos, movimientos y reportes, utilizando una base de datos PostgreSQL local y mecanismos de respaldo periódico en Google Drive.

---

## ✅ Objetivos específicos

- Digitalizar la gestión administrativa básica del negocio.
- Controlar entradas, salidas y disponibilidad de productos e insumos.
- Centralizar la información en un único sistema.
- Reducir el riesgo de pérdida de información.
- Permitir el almacenamiento y generación de reportes.
- Implementar respaldos periódicos hacia Google Drive.
- Mantener una estructura preparada para futuras ampliaciones.

---

## ❗ Problema que resuelve

El proyecto busca solucionar necesidades comunes en negocios pequeños que administran su operación de forma manual o con herramientas dispersas:

- Falta de control claro del inventario.
- Dificultad para registrar movimientos de productos e insumos.
- Riesgo de pérdida de información importante.
- Desorganización en reportes y registros administrativos.
- Dependencia de métodos manuales poco escalables.
- Ausencia de una base tecnológica para crecer en el futuro.

---

## 🧩 Alcance funcional inicial

La primera versión de **Dulce Colonial** estará enfocada en la gestión interna del negocio e incluirá los siguientes módulos:

### 1. Gestión de productos
Permite registrar, consultar, editar y desactivar productos disponibles en el negocio.

**Ejemplos de datos:**
- nombre
- categoría
- descripción
- precio
- stock
- estado

### 2. Gestión de inventario e insumos
Permite controlar ingredientes, materias primas o insumos necesarios para la operación.

**Ejemplos de datos:**
- nombre del insumo
- cantidad disponible
- unidad de medida
- stock mínimo
- observaciones

### 3. Registro de movimientos
Permite registrar cambios en el inventario, como entradas, salidas, ajustes o pérdidas.

**Tipos de movimiento sugeridos:**
- entrada
- salida
- ajuste
- merma o pérdida

### 4. Reportes
Permite generar, consultar o almacenar reportes importantes del sistema.

**Ejemplos:**
- stock actual
- productos con bajo inventario
- historial de movimientos
- exportación de reportes

### 5. Respaldo y sincronización de archivos
Permite generar respaldos periódicos o exportar reportes y almacenarlos en Google Drive como apoyo externo.

---

## 🏗️ Enfoque técnico

La solución está planteada con una arquitectura orientada al uso local, sencilla pero escalable.

### Arquitectura base
- **Aplicación local** ejecutada en un equipo del negocio.
- **Base de datos PostgreSQL local** instalada en la misma máquina.
- **Operación principal sin dependencia total de internet**.
- **Google Drive** como apoyo para respaldos, reportes o archivos importantes.

### Principios técnicos
- funcionamiento local y estable
- facilidad de despliegue en Windows
- respaldo externo de información
- estructura preparada para crecimiento futuro
- separación clara entre lógica, datos e interfaz

---

## 💻 Funcionamiento esperado

1. El usuario abre la aplicación en el equipo del negocio.
2. Inicia sesión en el sistema.
3. Consulta o registra productos, insumos y movimientos.
4. El sistema actualiza la información en PostgreSQL local.
5. Periódicamente, el sistema genera un respaldo o exporta registros importantes.
6. Dichos archivos se almacenan en Google Drive como medida de seguridad adicional.

---

## 🔐 Seguridad y buenas prácticas

Para garantizar una operación más segura y ordenada, el sistema debe considerar:

- autenticación de usuarios
- contraseñas cifradas
- control de acceso por roles
- validación de formularios y datos
- registro de cambios importantes
- respaldo automático de información
- estructura organizada del proyecto
- uso de variables de entorno para configuraciones sensibles

---

## 📂 Posibles módulos futuros

Aunque la primera versión estará centrada en la administración interna básica, el sistema podrá escalar a nuevos módulos como:

- ventas
- clientes
- proveedores
- estadísticas
- panel de control
- alertas automáticas
- historial de actividad
- soporte para múltiples equipos o sedes

---

## 🛠️ Tecnologías base propuestas

Estas tecnologías representan una base coherente para el proyecto:

- **PostgreSQL** como base de datos local
- **Google Drive API** para respaldos o carga de archivos
- **Backend local** para lógica del sistema
- **Frontend o aplicación de escritorio** para la interfaz de usuario

> La elección exacta del stack de desarrollo puede definirse según el enfoque de implementación, pero la base del sistema será una aplicación local conectada a PostgreSQL y con integración de respaldo hacia Google Drive.

---

## 📁 Estructura general esperada

```bash
dulce-colonial/
├── app/
├── backend/
├── database/
├── backups/
├── reports/
├── config/
├── docs/
└── README.md