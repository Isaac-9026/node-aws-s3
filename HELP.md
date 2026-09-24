# Guía de Configuración: Entorno Local AWS con Floci

Esta guía detalla los pasos para configurar un entorno de desarrollo local emulando servicios de AWS utilizando Floci y Docker, culminando con la preparación de una aplicación web en Node.js para consumir dichos servicios.

---

## Glosario Básico

* **CLI**: Interfaz de línea de comandos (*Command Line Interface*).
* **GUI**: Interfaz gráfica de usuario (*Graphical User Interface*).

---

## Requisitos Previos

0. Tener instalado y en ejecución **Docker Desktop**.

---

## Fase 1: Instalación y Configuración

### 1. Instalar Floci
Abre **PowerShell como Administrador** y ejecuta el siguiente comando:

```powershell
iwr https://floci.io/install.ps1 | iex
```

> **Nota:** Al finalizar, cierra y vuelve a abrir PowerShell (como Administrador).

### 2. Iniciar Floci
Ejecuta el siguiente comando para descargar y configurar el contenedor:

```powershell
floci start
```

> **Verificación:** Abre Docker Desktop y verifica que el nuevo contenedor de Floci esté en ejecución.

### 3. Gestionar Credenciales AWS (AWS CLI)
Instala la interfaz de comandos de AWS ejecutando en PowerShell:

```powershell
irm https://awscli.amazonaws.com/v2/install.ps1 | iex
```

> **Nota:** Al finalizar, cierra y vuelve a abrir PowerShell (como Administrador).

Verifica la instalación:
```powershell
aws --version
```

### 4. Configurar AWS CLI para Floci
Configura las variables de entorno para redirigir el tráfico hacia Floci:

```powershell
floci env --shell powershell
floci env --shell powershell | Invoke-Expression
```

### 5. Verificar las variables de entorno
Comprueba que las variables apunten al entorno local:

```powershell
$env:AWS_ENDPOINT_URL
# Resultado esperado: http://localhost.floci.io:4566

$env:AWS_DEFAULT_REGION
# Resultado esperado: us-east-1
```

> ⚠️ **Solución de problemas (Alternativa de configuración directa):**  
> Si el comando `Invoke-Expression` arrojó excepciones o errores, declara las variables manualmente en PowerShell:
>
> ```powershell
> $env:AWS_ENDPOINT_URL = 'http://localhost.floci.io:4566'
> $env:AWS_ACCESS_KEY_ID = 'test'
> $env:AWS_SECRET_ACCESS_KEY = 'test'
> $env:AWS_DEFAULT_REGION = 'us-east-1'
> ```

---

## 📌 Resumen de Punto de Control

Hasta este punto se ha logrado:
- [x] Instalar los componentes requeridos: Python, AWS CLI, Floci, PowerShell actualizado y Docker Desktop.
- [x] Configurar Floci, AWS y las variables de entorno.
- [x] Conocer los comandos básicos de Floci:
  - `floci start` — Iniciar servicio.
  - `floci stop` — Detener servicio.
  - `floci doctor` — Diagnóstico detallado del contenedor (*debe mostrar siempre: "All checks passed"*).

**Servicios integrables localmente:**
`S3`, `DynamoDB`, `Lambda`, `API Gateway`, `SQS`, `IAM`.

---

## ☁️ Fase 2: Pruebas con AWS S3 Local

### 6. Prueba de conexión AWS
La sintaxis base es: `aws [servicio] [acción]`.

```powershell
aws s3 ls
```
*(Retorna vacío si no existen buckets previamente creados).*

### 7. Creación de un "Bucket" (Contenedor en S3)

```powershell
aws s3 mb s3://laboratorio-floci
```
**Resultado esperado:** `make_bucket: laboratorio-floci`

#### Flujo de Trabajo (Workflow)
```text
PC ──> AWS CLI ──> AWS_ENDPOINT_URL (http://localhost...) ──> FLOCI ──> S3 ──> laboratorio-floci
```

### 8. Testing de operaciones en S3

1. **Crear un archivo de prueba local:**
   ```powershell
   "este es un mensaje contenido en un archivo de texto" | Out-File mensaje.txt
   ```

2. **Subir el archivo al Bucket de AWS S3:**
   ```powershell
   aws s3 cp mensaje.txt s3://laboratorio-floci
   ```
   **Resultado esperado:** `upload: .\mensaje.txt to s3://laboratorio-floci/mensaje.txt`

3. **Verificar que el archivo se encuentre en el Bucket:**
   ```powershell
   aws s3 ls s3://laboratorio-floci
   ```

> 🎉 **¡FLOCI Y TODOS LOS SERVICIOS ESTÁN ONLINE!**

---

### Conceptos clave de S3
- **Bucket**: Contenedor raíz donde se almacenan los objetos.
- **Object**: Archivo físico almacenado.
- **Key**: Nombre o ruta lógica del archivo dentro del bucket.
  - *Ejemplo:*
    - **Bucket**: `laboratorio-floci`
    - **Object**: `laptop.jpg`
    - **Key**: `imagenes/productos/laptop.jpg`

### 📝 Tarea Práctica
1. Utilizando PowerShell, sube 3 archivos al Bucket (formatos `.pdf`, `.jpg`, `.txt`).
2. Lista y verifica los archivos existentes en el bucket.
3. Descarga el archivo de prueba localmente:
   ```powershell
   aws s3 cp s3://laboratorio-floci/mensaje.txt .\mensaje.txt
   ```

---

## 💻 Fase 3: Construir App Web para consumir AWS S3

Preparación de un proyecto en **Node.js** con **Express** para interactuar con el bucket local.

### 1. Inicializar el proyecto
Crea una carpeta de trabajo, ábrela en VS Code y en la terminal integrada ejecuta:

```bash
npm init -y
```

### 2. Instalar dependencias
Instala los paquetes necesarios:

```bash
npm install express multer dotenv @aws-sdk/client-s3
```

**Descripción de paquetes:**
- `express`: Framework backend para crear la API/servidor HTTP.
- `multer`: Middleware para la gestión de subida de archivos binarios (`multipart/form-data`).
- `dotenv`: Manejo de variables de entorno mediante archivos `.env`.
- `@aws-sdk/client-s3`: SDK oficial de AWS para interactuar con la API de Amazon S3.

### 3. Configurar variables de entorno
Crea un archivo `.env` en la raíz del proyecto con la siguiente configuración:

```env
PORT=3000
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test

# Apunta al emulador local de Floci
AWS_ENDPOINT_URL=http://localhost.floci.io:4566

# Configuración del Bucket
AWS_S3_BUCKET=laboratorio-floci
AWS_S3_PREFIX=mi-aplicacion/archivos/
```
