const express = require('express')
const fileUpload = require('express-fileupload');
const app = express()
const port = 3001
const fs = require('fs');
const AWS = require('aws-sdk');

const dotenv = require('dotenv');
const parseResult = dotenv.config()
if (parseResult.error){
    throw parseResult.error
}

console.log(parseResult.parsed)

app.use(fileUpload({
    useTempFiles : true,
    tempFileDir : 'tmp'
}));

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

app.use(express.json())
app.use(express.urlencoded({ extended : true}))

app.post('/upload_file', function (req, res) {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
      }
      console.log(process.env.AWS_ACCESS_KEY,process.env.AWS_SECRET_ACCESS_KEY)

    console.log("filecontent:"+req.files.inputFile.tempFilePath)
    const fileContent = fs.readFileSync(req.files.inputFile.tempFilePath);
    console.log("mimetype: "+req.files.inputFile.mimetype)
    // Setting up S3 upload parameters
    const params = {
        Bucket: "cloudhwbucket1",
        Key: req.files.inputFile.name, // File,
        ContentType: req.files.inputFile.mimetype,
        Body: fileContent
    };

    // Uploading files to the bucket
    s3.upload(params, function(err, data) {
        if (err) {
            throw err;
        }
        console.log(`File uploaded successfully. ${data.Location}`);
        return res.status(200).send(`File uploaded successfully. ${data.Location}`);
    });
});

app.delete('/delete_file', function (req, res) {
    console.log("REQUEST param ", req.body);
    if (!req.body || !req.body.hasOwnProperty('deleteFile')) {
        return res.status(400).send('deleteFile missing in body');
      }

    const fileDeletePath = req.body.deleteFile
    
    // Setting up S3 delete parameters
    const params = {
        Bucket: "cloudhwbucket1",
        Key: fileDeletePath
       /*  Delete: { 
            Objects: [ 
              {
                Key: fileDeletePath 
              }
            ],
          }, This method is useful when you want to delete multiple files */
    };
    // Deleting files to the bucket
    s3.deleteObject(params, function(err, data) {
        if (err) {
            throw err;
        }
        console.log(`File deleted successfully.`);
        return res.status(200).send(`File deleted successfully.`);;
    });
});

/* app.get('/download_file', function (req, res) {
    
    // Setting up S3 upload parameters
    const params = {
        Bucket: "cloudhwbucket1",
        Key: req.files.inputFile.name, // File
        Body: fileContent
    };

    // Downloading files to the bucket
    s3.getObject(params, function(err, data) {
        if (err) {
            throw err;
        }
        console.log(`File uploaded successfully. ${data.Location}`);
        return res.status(200).send(`File uploaded successfully. ${data.Location}`);;
    });
}); */


app.listen(port, () => console.log(`cloud project app listening on port ${port}!`))