const express = require("express")
const multer = require("multer")
const dotenv = require("dotenv")
const path = require("path")

// Solicitar los servicios de AWS S3 (Subir achivos)
//otorgar nuevo permiso de "lectura"
const {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command
} = require("@aws-sdk/client-s3")

//DynamoDB - Servicio BD NoSQL
const {
  DynamoDBClient,
  PutItemCommand,
} = require("@aws-sdk/client-dynamodb")


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
//forcePathStyle: true (modo compatibilidad)
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT_URL,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },
  forcePathStyle: true
})

//Cliente Dynamo
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT_URL,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
})

//Archivo estático aplicación => frontend
app.use(express.static(path.join(__dirname, "public")))

//Ruta => ir a ruta raiz.
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"))
})

// Ruta para listar => http://localhost:3000/lista
app.get("/lista", (req,res) => {
  res.sendFile(path.join(__dirname, "public", "lista.html"))
})


//Cuando el cliente suba un archivo, se utilizaran 2 servicios
//S3    : Alojar el archivo binario (PDF, JPG, etc.)
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

    //También... utilizaremos el DynamoDB (Metadatos)
    const id = `${Date.now()}-${Math.random().toString(36).substring(2,8)}`
    const dynamoCommand = new PutItemCommand({
      TableName: process.env.AWS_DYNAMODB_TABLE,
      Item: {
        id: {S:id},
        nombre: {S:fileName},
        tipo: {S:req.file.mimetype},
        tamano: {N:req.file.size.toString()},
        fecha: {S: new Date().toISOString()},
        s3Key: {S:key}
      }
    })

    //Ejecutar el dynamoCommand
    await dynamoClient.send(dynamoCommand)
    console.log("Registro creado en DynamoDB")

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

//Nueva operación (LECTURA desde AWS S3)
app.get("/api/archivos", async(req, res) => {
  try {
    //Comando para leer los archivos
    const command = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: PREFIX
    })

    //Consulta S3
    const data = await s3Client.send(command)

    //Si existen los archivos
    //1() => retorna un arreglo incluso si no existen archivos
    //2() => filtra la colección
    //3() => retorna los datos ya filtrados
    const archivos = (data.Contents || [])
    .filter(objeto => objeto.Key !== PREFIX)
    .map(objeto => ({
      nombre: objeto.Key.replace(PREFIX, ""),
      key: objeto.Key,
      tamano: objeto.Size,
      fecha: objeto.LastModified
    }))

    //Retornamos los datos
    res.json({
      sucess: true,
      bucket: BUCKET,
      prefijo: PREFIX,
      total: archivos.length,
      archivos: archivos
    })

  } catch (e) {
    console.error(`Error al lista archivos: `, e)
    res.status(500).json({
      success:false,
      messagge:'No se puede acceder a los archivos',
      error: e.messagge
    })
  }
})

//Iniciar el servidor
app.listen(PORT, ()=>{
  console.log(`Servidor iniciado en: http://localhost:${PORT}`)
})