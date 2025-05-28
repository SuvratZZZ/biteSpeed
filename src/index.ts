import express from 'express';
import identifyRouter from './routes/identify.router'

const app = express();
app.use(express.json());

app.use('/identify',identifyRouter);
app.use('/', (req:any,res:any)=>{
    return res.send("BITESPEED route => /indentify");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));