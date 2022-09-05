import express, { query } from 'express';
import cors from "cors";
import joi from "joi";
import { MongoClient, ObjectId  } from "mongodb";
import dayjs from 'dayjs';


const server = express();

server.use(cors());
server.use(express.json());

const mongoClient = new MongoClient("mongodb://localhost:27017")

let db;

mongoClient.connect().then(() => {

   db = mongoClient.db("batePapoUol")

})

const userSchema = joi.object({
    name: joi.string().required()
})

const msgSchema = joi.object({
    
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid('message','private_message').required(),
})
 


server.post("/participants", async (req, res) => {
  
    const {name} = req.body
    const time = dayjs().format('HH:mm:ss');
    const validation = userSchema.validate({name}) 
   
    if(validation.error){
        res.status(409).send({message:'Erro de usuarioName'})
    }
    
    try{
                         
        const userExiste = await db.collection("participants").findOne({name});
        
        if(userExiste){
            res.status(409).send({message:"Usuario ja existe"})
            return
          }
        
         await db.collection('participants').insertOne({ name:name, lastStatus: Date.now()})   
        
         await db.collection('messages').insertOne({
            from: name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: time
        });

        res.sendStatus(201)
    }catch{
        res.sendStatus(422)
        
    }   
})

server.get('/participants', async (req, res) =>{

    try{
        const participantes = await db.collection('participants').find().toArray()
        res.status(200).send(participantes)
    }catch(err){
        res.status(500).send(err.message)
    }
})

server.post('/messages', async (req, res ) => {
    const {to, text, type} = req.body
    const  user = req.headers.user
    const time = dayjs().format('HH:mm:ss');
    const validation = msgSchema.validate({to, text, type})

    if(validation.error){
        res.status(422).send('Erro de menssagem')
    }

    try{
       const userExiste = await db.collection('participants').findOne({name:user})

       if(userExiste){
        await db.collection('messages').insertOne({
            from:user,
            to,
            text,
            type,
            time:time,
       })
       res.sendStatus(201)
       }else{
        res.status(422).send('Usuario não cadastrado')
       }
    }catch(err){
        res.sendStatus(500)
    }
})


server.get('/messages', async (req, res) => {
   const  user = req.headers.user
   const {limit} = req.query
   const participantes = await db.collection('messages').find().toArray();
   
   try{
    const menssagens = participantes.filter(messages => messages.to === user || messages.from === user ||  messages.to === "Todos" );
    res.status(200).send(menssagens.splice(-limit))  
   }catch(err){
    res.status(500).send('message aqui')
   }
}) 

server.post('/status', async (req, res) => {
    const user = req.headers.user
    const time = dayjs().format('HH:mm:ss');

    try{
        const userExiste = await db.collection('participants').findOne({name:user})
 
        if(userExiste){
            await db.collection("participants").updateOne({name: user}, { $set: {lastStatus: time} });
            res.sendStatus(200);    
        }
            res.sendStatus(404)
     }catch(err){
            res.sendStatus(404)
     }
})

setInterval( async () => {  
    
    const time = dayjs().format('HH:mm:ss');
    
    const participantes = await db.collection('participants').find().toArray();

    const segundos = Date.now() - 10 * 1000;

    participantes.forEach(participante => {
        if(participante.lastStatus > segundos){

             db.collection('participants').deleteOne({_id: ObjectId(participante._id)})

             db.collection('messages').insertOne({
                 from: participante.name,
                 to: 'Todos',  
                 text: 'sai da sala...', 
                 type: 'status', 
                 time:time})
        }
    })
}, 15000) 


server.listen(5000, () => console.log('Escutando na porta 5000'))