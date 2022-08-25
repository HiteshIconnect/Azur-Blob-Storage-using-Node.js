import 'dotenv/config'

import express from 'express';
import path from 'path';
const __dirname = path.resolve();
import bodyParser from 'body-parser';
// const getStream = require('into-stream');
import getStream from 'into-stream';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const app = express();

const config = {
    getStorageAccountName: () => {
        const matches = /AccountName=(.*?);/.exec(process.env.AZURE_STORAGE_CONNECTION_STRING);
        return matches[1];
    }
};


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, 'public')));

const inMemoryStorage = multer.memoryStorage();
const uploadStrategy = multer({ storage: inMemoryStorage }).single('image');



import azureStorage from 'azure-storage';
const blobService = azureStorage.createBlobService();
const containerName = 'YOUR_CONTAINER_NAME';

const getBlobName = originalName => {
    console.log('originalName', originalName);
    const identifier = uuidv4();
    return `${identifier}-${originalName}`;
}

app.post('/upload', uploadStrategy, (req, res) => {
    const blobName = getBlobName(req.file.originalname);
    const stream = getStream(req.file.buffer);
    const streamLength = req.file.buffer.length;

    blobService.createAppendBlobFromStream(containerName, blobName, stream, streamLength, err => {
        if(err){
            console.log(err);
            return;
        }
        
        res.status(200).send(`https://${config.getStorageAccountName()}.blob.core.windows.net/${containerName}/${blobName}`);
    })
})

app.get('/all', (req, res) => {
    blobService.listBlobsSegmented(containerName, null, (err, data) => {
     if(err){
        console.log(err);
        return;
     }else{
        let images = '';
        if(data.entries.length){
            data.entries.forEach(element => {
                images += `<img src="https://${config.getStorageAccountName()}.blob.core.windows.net/${containerName}/${element.name}" width="400px" height="400px"/>`;
            });

            res.send(images)
        }
     }
    });
});

app.listen(4000, () => {
    console.log('server started');
});

export default app;
