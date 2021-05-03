
// Global variables //
var storedFile = null;
var shadedPixelCount = 0; // Declare the shadedPixelCount integer globally with the ability to be changed
var contourIdsPoints = [];

var wireHeat = false; // true: Wire is receiving current and hot, false: Wire is not receiving current but may be hot


// Global functions //
function debugLog(message) {
    //if (!typeof message == 'string') return console.warn('function debugLog: Enter a valid string');
    message = message.toString();
    console.log('\x1b[34m', message, '\x1b[0m');
};


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
    //db.exec("DROP TABLE ProspectData");
    //db.exec("DROP TABLE Instructions");

    db.exec("CREATE TABLE IF NOT EXISTS ProspectData (id INTEGER PRIMARY KEY AUTOINCREMENT, tracing BOOLEAN, fileName TEXT, fileSize FLOAT, progress INTEGER, points LONGTEXT, formattedPoints LONGTEXT)");
    db.exec("CREATE TABLE IF NOT EXISTS Instructions (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT, message LONGTEXT, wireHeat BOOLEAN)")
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

server.listen(8080, () => {
    console.log(`Server started on ${HostIP}:8080`);
}); // Listen to port 8080


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

function updateMCActions(action, message, wireHeat) {
    let actionVar = action || ""; // | 'idle' | 'processing' | 'processed' | 'tracing' | 'warning' | 'error' |
    let messageVar = message || "";
    let wireHeatVar = false;
    if (typeof wireHeat == "boolean") {
        wireHeatVar = wireHeat || fals
    } else if (typeof wireHeat == "string") {
        if (wireHeat == "toggle") {wireHeatVar = !wireHeatVar};
    }

    db.serialize(() => {
        db.run(`UPDATE Instructions SET action='${actionVar}', message='${messageVar}', wireHeat='${wireHeatVar}' WHERE id='1'`)
    });
}
//db.run(`INSERT INTO Instructions (id, action, message, wireHeat) VALUES (NULL, 'idle', '', false)`)
//updateMCActions("idle", "Test", false);

// Get the current instructions from the database -- Microcontroller reads from this
app.get('/MCInstructions', (req, res) => {
    const dataPacketId = req.query.id;
    if (!dataPacketId) {
        db.serialize(() => {
            db.all("SELECT * FROM ProspectData ORDER BY id DESC LIMIT 1", (err, rows) => { // Retrieves the records from the ProspectData table in descending order of value id
                if (!rows[0]) {return res.send("{}")};

                res.send(JSON.stringify(rows[0])); // Gets the latest record from the ProspectData table
            });
        });
    } else {
        db.serialize(() => {
            db.all("SELECT * FROM ProspectData ORDER BY id DESC LIMIT 1", (err, rows) => {
                let response = "";

                if (!rows[0]) {return res.send("{}")};

                const formattedPoints = JSON.parse(rows[0].formattedPoints);
                const fPointsLength = formattedPoints.length;

                if (dataPacketId >= fPointsLength) {
                    return res.send(`final dataPacketId was ${fPointsLength - 1}`);
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
        db.all("SELECT * FROM ProspectData", (err, rows) => { // Retrieves all records from the ProspectTable data
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
    console.log(`req.body.message: ${req.body.message}`);
    console.log(`req.body.contourIds: ${req.body.contourIds}`);
    switch (req.body.message) {
        case 'begin tracing':
            if (req.body.contourIds.length <= 0) {
                return io.emit('event', {1: {'message': `ERROR | 1 or more contours/image outlines must be selected`, 'colour': '235, 0, 0'}});
            }

            const contourIds = req.body.contourIds.split(',');
            let contourPoints = [];
            let imagePoints = [];

            // console.log("contourIdsPoints:");
            // console.log(contourIdsPoints);

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
            updateMCActions('tracing', null, true);
            break;

        case 'toggle wire heat':
            wireHeat = !wireHeat;
            io.emit('nichrome heat', wireHeat.toString());
            db.serialize(() => {

            });
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
    //console.log(req.file);
    //console.log(req.body.traceMethod);
    
    res.send("success");
    processImage(req.file, req.body.traceMethod, req.body.spindleRotation); // Call the processImage function to process the image into data suitable for the microcontroller
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
const { debug } = require('console');
const { traceDeprecation } = require('process');
const { THRESH_MASK } = require('opencv4nodejs');



/////////////////////

// let debugArray = [
//     [[0, 0], [3, 5], [6, 7]],
//     [[ 27, 31 ], [ 28, 30 ], [ 31, 30 ], [ 32, 31 ], [ 31, 32 ], [ 28, 32 ]],
//     [[ 58, 30 ], [ 59, 29 ], [ 61, 29 ], [ 62, 30 ], [ 61, 31 ], [ 59, 31 ]],
//     [[ 49, 33 ], [ 50, 32 ], [ 52, 34 ], [ 51, 35 ], [ 50, 35 ], [ 49, 34 ]],
//     [ [ 60, 32 ], [ 61, 31 ], [ 62, 32 ], [ 61, 33 ] ],
//     {
//         id: 1,
//         contourPnts: [[0, 4], [9, 19], [8, 87]]
//     },
//     {
//         id: 2,
//         contourPnts: [[0, 4], [9, 19], [8, 87]]
//     },
//     {
//         id: 3,
//         contourPnts: [[0, 4], [9, 19], [8, 87]]
//     },
//     {
//         id: 4,
//         contourPnts: [[0, 4], [9, 19], [8, 87]]
//     },
// ]

// var debugArrayFiltered = debugArray.filter(function(element) {
//     return !Array.isArray(element);
// });

// console.log(debugArrayFiltered)

/////////////////////

function getAllImagePoints(image) {
    const grayImage = image.bgrToGray();
    let threshold = grayImage.threshold(230, 255, cv.THRESH_BINARY);
    //theshold = cv.imwrite('./ProcessingImages/thresoldSaveTest.png', threshold);
    console.log(threshold);

    let imagePoints = [];
    

    for (let y = 0; y < threshold.cols; y++) {
        io.emit('processing image progress', {y: y});
        for (let x = 0; x < threshold.rows; x++) {
            const [b, g, r] = threshold.atRaw(x, y);
            if (r <= 50 && g <= 50 && b <= 50) {
                imagePoints.push([x, y]);
            }

        }
    }

    io.emit('processing', {'contourId': 0, 'points': imagePoints});
    return imagePoints;
}

function getImageContours(image) {
    const grayImage = image.bgrToGray();
    const threshold = grayImage.threshold(230, 255, cv.THRESH_BINARY);

    //cv.imshowWait('MLP', threshold);
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

    // console.log("======== contourIdsPoints pre ==========");
    // console.log(contourIdsPoints);

    let contourIdsPointsFiltered = contourIdsPoints.filter(function(element) {
        return !Array.isArray(element);
    });
    contourIdsPoints = contourIdsPointsFiltered;

    for (i in contourIdsPoints) {
        let newArray = [];
        for (v in contourIdsPoints[i].contourPnts) {
            const fixedXY = [contourIdsPoints[i].contourPnts[v].x, contourIdsPoints[i].contourPnts[v].y];
            newArray.push(fixedXY);
        }
        // console.log("newArray: ");
        // console.log(newArray);
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

    // console.log("======== contourIdsPoints post ==========");
    // console.log(contourIdsPoints);
    // console.log("\n");

    return individualContours;
}

function processImage(imageFileDetails, tracingMethod, spindleRotation) {
    // console.log("\n====== function 'processImage' OUTPUT START ======");
    if (!imageFileDetails) {
        io.emit('event', {1: {'message': "ERROR | No file selected for upload. Please refresh the page and try again.", 'colour': '235, 0, 0'}});
        return;
    }

    if (tracingMethod != "traceAll" && tracingMethod != "traceOutlines") {
        io.emit('event', {1: {'message': `ERROR | Invalid tracing method detected. *${tracingMethod}* does not exist. Please refresh the page and try again.`, 'colour': '235, 0, 0'}});
        return;
    }

    let imagePoints = []; // Declare the imagePoints array only within this scope with the ability to be changed

    let totalPixelCount = 0; // Declare the totalPixelCount integer only within this scope with the ability to be changed
    shadedPixelCount = 0; // Reset shadedPixelCount back to 0 to prevent miscalculations/errors

    const image = cv.imread("./ProcessingImages/" + getMostRecentFile("./ProcessingImages/").file); // Use the Computer Vision library to read the data of the image
    // console.log('image', image);

    // Ensure the image is the valid size (100 by 100 pixels)
    /*if (image.rows > 620 || image.cols > 620) {
        io.emit('failed submission');
        io.emit('event', {1: {'message': `ERROR | <i>${imageFileDetails.filename}</i> is an invalid size (${image.rows}x${image.cols}). *Should be (100x100).`, 'colour': '235, 0, 0'}});
        console.warn("PROCESSING CANCELLED, IMPROPER FORMAT, IMAGE IS NOT 100x100 PIXELS");
        return;
    }*/

    updateMCActions('processing');

    for (let y = 0; y < image.cols; y++) { // Loop through every column of pixels in the image
        io.emit('processing image progress', {y: y});
        for (let x = 0; x < image.rows; x++) { // Loop through each row of pixels in the image
            // The above iterations result in the looping through of every pixel present in the image
            io.emit('processing image progress', {x: x});
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
    console.log(`Shaded pixels: ${shadedPixelCount}`);
    //console.log(imagePoints);

    if (tracingMethod == "traceAll") {
        imagePoints = getAllImagePoints(image);
        console.log('traceAll imagePoints')
    } else if (tracingMethod == "traceOutlines") {
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

        setTimeout(function() {
            io.emit('event', {1: {'message': "Image successfully processed", 'colour': "0, 235, 0"}});
            io.emit('processed', {'objectNumber': contoursAmount});
            updateMCActions('processed', "begin taking data");
        }, 3000);
    }

    // console.log("====== function 'processImage' OUTPUT END ======\n");
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
    //console.log("\n====== function 'addToDatabase' OUTPUT START ======");
    if (!imagePoints) return console.log("INSTRUCTING MICROCONTROLLERS CANCELLED, NO 'imagePoints' RECEIVED");
    if (!imageFileDetails) return console.log("INSTRUCTING MICROCONTROLLERS CANCELLED, NO 'imageFileDetails' RECEIVED ")

    // console.log("imgPnts: ");
    // console.log(imagePoints);
    // console.log("imgDet: ");
    // console.log(imageFileDetails);


    formattedPoints = imagePoints;
    formattedPoints = arrayToChunks(formattedPoints, 10);

    imagePoints = JSON.stringify(imagePoints);
    formattedPoints = JSON.stringify(formattedPoints);

    db.serialize(() => {
        db.each(`SELECT * FROM ProspectData WHERE tracing='1'`, (error, row) => {
            db.run(`UPDATE ProspectData SET tracing=0 WHERE id='${row.id}'`)
        });
        db.run(`INSERT INTO ProspectData (id, tracing, fileName, fileSize, progress, points, formattedPoints) VALUES (NULL, true, '${imageFileDetails.filename}', '${imageFileDetails.size}', '0', '${imagePoints}', '${formattedPoints}')`)
    });
    // console.log("====== function 'addToDatabase' OUTPUT END ======\n");
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
