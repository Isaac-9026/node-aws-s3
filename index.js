const express = require("express")
const multer = require("multer")
const dotenv = require("dotenv")
const path = require("path")

// Solicitar los servicios de AWS S3 (Subir achivos)
const {
  S3Client,
  PutObjectCommand
} = require("@aws-sdk/client-s3")


//Cargar las variables de entorno
dotenv.config()

//Habilitar Framework Backend
const app = express()

//Leer algunas configuraciones
const PORT = process.env.PORT || 3000
const BUCKET = process.env.AWS_S3_BUCKET
const PREFIX = process.env.AWS_S3_PREFIX || ""

//Configuración de multer (gestionar|subir archivos)
const upload = multer({
  storage: multer.memoryStorage()
})

//Cliente S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT_URL,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },
  forcePathStyle: true
})

//Archivo estático aplicación => frontend
app.use(express.static(path.join(__dirname, "public")))

//Ruta => ir a ruta raiz.
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"))
})

//Ruta para subir archivos
app.post('/upload', upload.single("archivo"), async(req, res) => {
  try {

    //Verificar que se haya seleccionado un archivo
    if(!req.file){
      return res.status(400).json({
        success: false,
        messagge: 'No adjuntaste el archivo'
      })
    }

    //!!! = Hace falta considerar otros tipos de validación

    //Obtener el nombre del archivo
    const fileName = req.file.originalname

    //Ruta del archivo
    const key = `${PREFIX}${fileName}`

    //subir el archivo
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    })

    //Ejecutar el comando
    await s3Client.send(command)

    console.log(`Archivo subido: ${key}`)

    //Retornar un JSON informando del proceso
    res.json({
      sucess: true,
      messagge: 'Archivo subido correctamente',
      bucket: BUCKET,
      key: key
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({
      sucess: false,
      messagge: 'No se pudo subir el archivo',
      error:error.messagge
    })
  }
})

//Iniciar el servidor
app.listen(PORT, ()=>{
  console.log(`Servidor iniciado en: http://localhost:${PORT}`)
})