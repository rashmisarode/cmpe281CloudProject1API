const express = require('express')
const fileUpload = require('express-fileupload');
const app = express()
let cors = require('cors');
const port = 3001
const fs = require('fs');
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-west-1'});
const dotenv = require('dotenv');
const parseResult = dotenv.config()
if (parseResult.error) {
    throw parseResult.error
}

console.log(parseResult.parsed)

app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: 'tmp'
}));

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});
const ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

app.use(express.json())
app.use(cors())
app.use(express.urlencoded({ extended: true }))

function deleteFileTemp(path) {
    try {
        fs.unlinkSync(path)
        //file removed
    } catch (err) {
        console.error("Error in deleting temp file " + path, err);
    }
}

app.post('/upload_file', function (req, res) {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }
    console.log(process.env.AWS_ACCESS_KEY, process.env.AWS_SECRET_ACCESS_KEY)

    console.log("tempFilePath:" + req.files.inputFile.tempFilePath)
    const fileContent = fs.createReadStream(req.files.inputFile.tempFilePath);
    console.log("mimetype: " + req.files.inputFile.mimetype)
    // Setting up S3 upload parameters
    const params = {
        Bucket: "cloudhwbucket1",
        Key: req.files.inputFile.name,
        ContentType: req.files.inputFile.mimetype,
        Body: fileContent
    };

    // Uploading files to the bucket
    s3.upload(params, function (err, data) {
        if (err) {
            console.log("Error in uploading file", err);
            return res.status(500).send(`Can not upload the file. ${err}`)
            // Send 500 Response 
        } else {
            deleteFileTemp(req.files.inputFile.tempFilePath);
            updateDataBase();
            console.log(`File uploaded successfully. ${data.Location}`);
            return res.status(200).send(`File uploaded successfully. ${data.Location}`)
        }
    });

    function updateDataBase(){
       
        const ddbparams = {
            TableName: 'UserData',
            Item: {
              'userId' : {S: 'rashmi'},
              'fileName' : {S: 'firstfile.png'},
              'fileCreatedTime' : {N: '4896487656'},
              'fileUpdatedTime' : {N: '498595659'}
            }
          };
          
          // Call DynamoDB to add the item to the table
          ddb.putItem(ddbparams, function(err, data) {
            if (err) {
              console.log("Error", err);
            } else {
              console.log("Success", data);
            }
          });
    }

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
    s3.deleteObject(params, function (err, data) {
        if (err) {
            console.log("Error in deleting file", err);
            return res.status(500).send(`Can not delete the file. ${err}`)
        } else {
            deleteDatabaseEntry();
            console.log(`File deleted successfully.`);
            return res.status(200).send(`File deleted successfully.`);
        }
       
    });

    function deleteDatabaseEntry(){
        const ddbparams = {
            TableName: 'UserData',
            Key: {
                "userId":{"S":"pranav"}
            
            }
          };
          
          // Call DynamoDB to delete the item from the table
          ddb.deleteItem(ddbparams, function(err, data) {
            console.log
            if (err) {
              console.log("Error", err);
            } else {
              console.log("Success", data);
            }
          });
    }
});

app.get('/getUserData', function (req, res) {
    
    var params = {
        TableName: 'UserData',
       /*  Key: {
          'userId': {N: '001'}
        },
        ProjectionExpression: 'ATTRIBUTE_NAME' */
      };
      
      // Call DynamoDB to read the item from the table
      ddb.scan(params, function(err, data) {
        if (err) {
          console.log("Error", err);
          return res.status(500).send(`Can not get the data. ${err}`)
        } else {
          console.log("Success", data.Items);
          return res.status(200).json(data.Items);
          //return res.status(200).json(data);
        }
      });
});


app.listen(port, () => console.log(`cloud project app listening on port ${port}!`))