
// Global variables //
var storedFile = null;
var shadedPixelCount = 0; // Declare the shadedPixelCount integer globally with the ability to be changed
var contourIdsPoints = [];


// Get host IP
const { networkInterfaces } = require('os');
const nets = networkInterfaces();
const results = {};
for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
        // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
        if (net.family === 'IPv4' && !net.internal) {
            if (!results[name]) {
                results[name] = [];
            }
            results[name].push(net.address);
        }
    }
}
const HostIP = results[Object.keys(results)[0]][0] || "localhost";


// Database initialisation //
const fs = require('fs');
const dbFile = './database.db';
const exists = fs.existsSync(dbFile);
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(dbFile);

db.serialize(() => {
    /*db.exec("DROP TABLE StyrocutData");
    db.exec("DROP TABLE Instructions");*/
    
    db.exec("CREATE TABLE IF NOT EXISTS StyrocutData (id INTEGER PRIMARY KEY AUTOINCREMENT, cutting BOOLEAN, fileName TEXT, fileSize FLOAT, progress INTEGER, points LONGTEXT, formattedPoints LONGTEXT)");
    db.exec("CREATE TABLE IF NOT EXISTS Instructions (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT, message LONGTEXT)")
    //db.run(`INSERT INTO Instructions (id, action, message) VALUES (NULL, '', '')`);

    console.log("Database initialised.");
});


// Web Server //
var express = require('express'); // Require the 'express' npm library for use in this script
const ejs = require('ejs'); // Require the 'ejs' npm library to allow for dynamic rendering of pages
var app = express(); // Start an express server

app.use(express.static('public')); // Run a static express server on the 'public' folder directory
app.set('view engine', 'ejs'); // Set the view engine to use ejs

const server = require('http').createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: `${HostIP}`,
        methods: ["GET", "POST"],
        allowedHeaders: ["header-auth"],
        credentials: true
    }
});

io.on('connection', (socket) => {
    console.log("socket.io connection established");

    /*socket.on('event', (data) => {
        console.log(data);
    });*/ // EXAMPLE
});
io.on('disconnect', () => {
    console.log("socket.io disconnected");
});

server.listen(8080, () => {console.log(`Server started on ${HostIP}:8080`)}); // Listen to port 8080


const multer = require('multer'); // Require the 'multer' npm library for use in this script

app.get('/', (req, res) => { // Detect when user attempts to call web page with the directory of '/'
    res.redirect(`http://${HostIP}:8080/home`) // Redirect to the home page on the user's screen
});

app.get(`/home`, (req, res) => {
    res.render('pages/home');
});


app.get('/MCActions', (req, res) => {
    db.serialize(() => {
        db.all("SELECT * FROM Instructions", (err, rows) => { // Retrieves the records from the Instructions table
            res.send(JSON.stringify(rows[0]));
        });
    });
});

function updateMCActions(action, message) {
    let actionVar = action || ""; // | 'idle' | 'processing' | 'processed' | 'cutting' | 'warning' | 'error' |
    let messageVar = message || "";

    db.serialize(() => {
        db.each(`SELECT * FROM Instructions WHERE cutting='1'`, (error, row) => {
            db.run(`UPDATE Instructions SET action='${actionVar}', message='${messageVar}' WHERE id='1'`)
        });
    });
}
//updateMCActions();

// Get the current instructions from the database -- Microcontroller reads from this
app.get('/MCInstructions', (req, res) => {
    const dataPacketId = req.query.id;
    if (!dataPacketId) {
        db.serialize(() => {
            db.all("SELECT * FROM StyrocutData ORDER BY id DESC LIMIT 1", (err, rows) => { // Retrieves the records from the StyrocutData table in descending order of value id
                res.send(JSON.stringify(rows[0])); // Gets the latest record from the StyrocutData table
            });
        });
    } else {
        db.serialize(() => {
            db.all("SELECT * FROM StyrocutData ORDER BY id DESC LIMIT 1", (err, rows) => {
                let response = "";
                const formattedPoints = JSON.parse(rows[0].formattedPoints);
                const fPointsLength = formattedPoints.length;
                
                if (dataPacketId >= fPointsLength) {
                    return res.send("error");
                }

                response = formattedPoints[dataPacketId];
                
                //console.log(response);
                res.send(response);
            });
        })
    }
});

// View a list of ALL instructions saved to the database for the microcontroller to read -- Debug purposes
app.get('/MCInstructionsList', (req, res) => {
    let formattedResponse = ``;
    db.serialize(() => {
        db.all("SELECT * FROM StyrocutData", (err, rows) => { // Retrieves all records from the StyrocutTable data
            rows.forEach(row => {
                formattedResponse += `${JSON.stringify(row)}<br>`;
            });
        });
    });
    function waitForResponse() {
        if(formattedResponse === ``) {
            setTimeout(waitForResponse, 50);
            return;
        }
        res.send(formattedResponse);
    }
    waitForResponse();
});


const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post('/webMsg', (req, res) => { // Handle the POST request
    console.log(req.body.message);
    console.log(req.body.contourIds);
    switch (req.body.message) {
        case 'begin cutting':
            if (req.body.contourIds.length <= 0) {
                return io.emit('event', {1: {'message': `ERROR | 1 or more contours/image outlines must be selected`, 'colour': '235, 0, 0'}});
            }
            
            const contourIds = req.body.contourIds.split(',');
            let contourPoints = [];
            let imagePoints = [];
            
            for (i in contourIds) {
                contourPoints.push(contourIdsPoints[parseInt(contourIds[i]) - 1]);
            }

            for (i in contourPoints) {
                for (v in contourPoints[i]) {
                    imagePoints.push(contourPoints[i][v]);
                }
            }

            res.send("success - webMsg");
            const currentDate = new Date().getTime() / 1000;
            io.emit('completion time', (currentDate + shadedPixelCount));

            addToDatabase(imagePoints, storedFile);
            updateMCActions('cutting');
            break;
    }
});


// Generate a randomised string of 15 characters for the uploaded image filename
function generateFileName() {
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for ( let i = 0; i < 15; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

let storage = multer.diskStorage({
    destination: 'ProcessingImages/',
    filename: function(req, file, cb) {
        cb(null, file.originalname);
    }
});

let upload = multer({ dest: 'ProcessingImages/', storage: storage});


app.post('/upload', upload.single('file'), (req, res) => { // Handle the POST request
    console.log(req.file);
    res.send("success");
    storedFile = req.file;
    processImage(req.file); // Call the processImage function to process the image into data suitable for the microcontroller
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////


// Image processing //
const path = require('path');

const getMostRecentFile = (dir) => {
  const files = orderRecentFiles(dir);
  return files.length ? files[0] : undefined;
};

const orderRecentFiles = (dir) => {
  return fs.readdirSync(dir)
    .filter((file) => fs.lstatSync(path.join(dir, file)).isFile())
    .map((file) => ({ file, mtime: fs.lstatSync(path.join(dir, file)).mtime }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
};


// https://www.npmjs.com/package/image-outline

const cv = require('opencv4nodejs'); // Require the 'opencv4nodejs' npm computer vision library for use in this script

function getImageContours(image) {
    const grayImage = image.bgrToGray();
    const threshold = grayImage.threshold(230, 255, cv.THRESH_BINARY);

    cv.imshowWait('MLP', threshold);
    //const threshold2 = threshold;

    let contours = threshold.findContours(cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE); // cv.CHAIN_APPROX_NONE for every single point, cv.CHAIN_APPROX_SIMPLE for end points
    let sortedContours = contours.sort((c0, c1) => c1.area - c0.area);
    let individualContour;
    let individualContours = [];

    for (let v = 1; v < contours.length; v++) {
        individualContour = sortedContours[v];
        individualContour = individualContour.getPoints();
        //console.log(individualContour);
        individualContours.push(individualContour);
        contourIdsPoints.push({id: v, contourPnts: individualContour});
    }
    //console.log(contourIdsPoints);

    for (i in contourIdsPoints) {
        let newArray = [];
        for (v in contourIdsPoints[i].contourPnts) {
            const fixedXY = [contourIdsPoints[i].contourPnts[v].x, contourIdsPoints[i].contourPnts[v].y];
            newArray.push(fixedXY);
        }
        //console.log("newArray: ");
        //console.log(newArray);
        contourIdsPoints[i] = newArray;
    }


    let fullContours = threshold.findContours(cv.RETR_LIST, cv.CHAIN_APPROX_NONE);
    let sortedFullContours = fullContours.sort((c0, c1) => c1.area - c0.area);
    let individualFullContour;

    for (let v = 1; v < fullContours.length; v++) {
        individualFullContour = sortedFullContours[v];
        individualFullContour = individualFullContour.getPoints();
        //console.log(individualFullContour);
        io.emit('processing', {'contourId': v,'points': individualFullContour});
    }
    
    /*let newContours = threshold2.findContours(cv.RETR_LIST, cv.CHAIN_APPROX_NONE);
    let newSortedContours = newContours.sort((c0, c1) => c1.area - c0.area)[1];
    console.log(newContours);
    let contourPoints = newSortedContours.getPoints();
    threshold2.drawContours([contourPoints], -1, new cv.Vec3(41, 176, 218), { thickness: 1});
    cv.imshowWait("Image", threshold2);*/

    //console.log(individualContours);
    return individualContours;
}

function processImage(imageFileDetails) {
    if (!imageFileDetails) {
        io.emit('event', {1: {'message': "ERROR | No file selected for upload", 'colour': '235, 0, 0'}});
        return;
    }

    let imagePoints = []; // Declare the imagePoints array only within this scope with the ability to be changed

    let totalPixelCount = 0; // Declare the totalPixelCount integer only within this scope with the ability to be changed
    shadedPixelCount = 0; // Reset shadedPixelCount back to 0 to prevent miscalculations/errors

    const image = cv.imread("./ProcessingImages/" + getMostRecentFile("./ProcessingImages/").file); // Use the Computer Vision library to read the data of the image
    console.log(image);

    // Ensure the image is the valid size (100 by 100 pixels)
    if (image.rows != 100 || image.cols != 100) {
        io.emit('failed submission');
        io.emit('event', {1: {'message': `ERROR | <i>${imageFileDetails.filename}</i> is an invalid size (${image.rows}x${image.cols}). *Should be (100x100).`, 'colour': '235, 0, 0'}});
        console.log("PROCESSING CANCELLED, IMPROPER FORMAT, IMAGE IS NOT 100x100 PIXELS");
        return;
    }

    updateMCActions('processing');

    for (let x = 0; x < image.rows; x++) { // Loop through each row of pixels in the image
        for (let y = 0; y < image.cols; y++) { // Loop through every column of pixels in the image
            // The above iterations result in the looping through of every pixel present in the image
            io.emit('processing image progress', {x: x, y: y});

            totalPixelCount++ // Increment totalPixelCount
            
            
            const [b, g, r] = image.atRaw(x, y) // Get the Red/Green/Blue values on the image at pixel (x, y)
            //console.log(`RGB: ${r}, ${g}, ${b}`)

            if (r <= 50 && g <= 50 && b <= 50) { // Check if the pixel is shaded, where the microcontrollers will direct the stepper motors to move the nichrome wire to
                imagePoints.push([x, y]); // Add the shaded pixel to the array of imagePoints
                shadedPixelCount++ // Increment shadedPixelCount
            }
            
        }
    }

    // Debugging code to print the totalPixelCount, shadedPixelCount and imagePoints to the console
    console.log(`Pixels: ${totalPixelCount}`);
    //console.log(`Shaded pixels: ${shadedPixelCount}`);
    //console.log(imagePoints);

    let imageContours = getImageContours(image);
    let contoursAmount = 0;
    for (i in imageContours) {
        for (v in imageContours[i]) {
            //console.log(imageContours[i][v]);
            const fixedXY = [imageContours[i][v].x, imageContours[i][v].y];
            imagePoints.push(fixedXY);
        }
        contoursAmount++;
    }

    setTimeout(function(){
        io.emit('event', {1: {'message': "Image successfully processed", 'colour': "0, 235, 0"}});
        io.emit('processed', {'objectNumber': contoursAmount});
        updateMCActions('processed', "begin taking data");
    }, 3000);


    return addToDatabase(imagePoints, imageFileDetails);
}

function arrayToChunks(array, chunkSize) {
    let index = 0;
    let chunkedArray = [];

    for (index = 0; index < array.length; index += chunkSize) {
        let chunk = array.slice(index, index + chunkSize);
        chunkedArray.push(chunk);
    }

    return chunkedArray;
}


// Add imageFile details and microcontroller instructions to the database to be served on '/MCInstructions' for the ESP32 to read
function addToDatabase(imagePoints, imageFileDetails) {
    if (!imagePoints) return console.log("INSTRUCTING MICROCONTROLLERS CANCELLED, NO 'imagePoints' RECEIVED");
    if (!imageFileDetails) return console.log("INSTRUCTING MICROCONTROLLERS CANCELLED, NO 'imageFileDetails' RECEIVED ")
    
    console.log("imgPnts: ")
    console.log(imagePoints);
    console.log("imgDet: ")
    console.log(imageFileDetails)

    formattedPoints = imagePoints;
    formattedPoints = arrayToChunks(formattedPoints, 10);

    imagePoints = JSON.stringify(imagePoints);
    formattedPoints = JSON.stringify(formattedPoints);

    db.serialize(() => {
        db.each(`SELECT * FROM StyrocutData WHERE cutting='1'`, (error, row) => {
            db.run(`UPDATE StyrocutData SET cutting=0 WHERE id='${row.id}'`)
        });
        db.run(`INSERT INTO StyrocutData (id, cutting, fileName, fileSize, progress, points, formattedPoints) VALUES (NULL, true, '${imageFileDetails.filename}', '${imageFileDetails.size}', '0', '${imagePoints}', '${formattedPoints}')`)
    });
    
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
