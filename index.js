import express from 'express';
import cors from "cors";
import joi from "joi";
import { MongoClient } from "mongodb";
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
    name: joi.string().empty().required()
})



server.post("/participants", async (req, res) => {
  
    const {name} = req.body
    const time = dayjs().format('HH:mm:ss');
    const validation = userSchema.validate({name}) 
   
    if(validation.error){
        res.status(409).send({message:"deu erro aqui"})
    }
    
    try{

        const userExiste = await db.collection("participants").findOne({name:name});
        
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
        res.status(422)
        
    }   
})

server.listen(5000, () => console.log('Escutando na porta 5000'))