import bodyParser from 'body-parser';
import express from 'express'
import { authenticateToken } from './middleware/auth';


const app = express();
const PORT = process.env.PORT || '3000';

 //Middleware
 app.use(bodyParser.json());


app.get('/', (req, res) => {
    res.send('Online Marketplace Backend is Running!')
})

//Protected Routes
// app.use('/items', authenticateToken, itemsRouter);


app.listen(PORT, () => {
    console.log(`Serving is running at ${PORT}`)
})
