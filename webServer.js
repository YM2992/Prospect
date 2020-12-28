
// Database initialisation //
const fs = require('fs');
const dbFile = './database.db';
const exists = fs.existsSync(dbFile);
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(dbFile);

db.serialize(() => {
    //db.exec("DROP TABLE StyrocutData");
    db.exec("CREATE TABLE IF NOT EXISTS StyrocutData (id INTEGER PRIMARY KEY AUTOINCREMENT, cutting BOOLEAN, fileName TEXT, fileSize FLOAT, progress INTEGER, points LONGTEXT)");

    console.log("Database initialised.");
});


// Web Server //
var express = require('express'); // Require the 'express' npm library for use in this script
const ejs = require('ejs'); // Require the 'ejs' npm library to allow for dynamic rendering of pages
var app = express(); // Start an express server

app.use(express.static('public')); // Run a static express server on the 'public' folder directory
app.set('view engine', 'ejs'); // Set the view engine to use ejs

const server = require('http').createServer(app);

const io = require('socket.io')(server);
io.on('connect', () => {
    console.log("socket.io connection established");
});
io.on('disconnect', () => {
    console.log("socket.io disconnected");
});
io.on('event', (data) => {
    console.log(data);
});
server.listen(8080, () => {console.log("Server started on localhost:8080")}); // Listen to port 8080


const multer = require('multer'); // Require the 'multer' npm library for use in this script

app.get('/', (req, res) => { // Detect when user attempts to call web page with the directory of '/'
    res.redirect('http://localhost:8080/home') // Redirect to the home page on the user's screen
});

app.get('/home', (req, res) => {
    res.render('pages/home', {
        processing_progress: 0
    });
});

// Get the current instructions from the database -- Microcontroller reads from this
app.get('/MCInstructions', (req, res) => {
    db.serialize(() => {
        db.all("SELECT * FROM StyrocutData ORDER BY id DESC LIMIT 1", (err, rows) => { // Retrieves the records from the StyrocutData table in descending order of value id
            res.send(JSON.stringify(rows[0])); // Gets the latest record from the StyrocutData table
        });
    });
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

function processImage(imageFileDetails) {
    let imagePoints = []; // Declare the imagePoints array only within this scope with the ability to be changed

    let totalPixelCount = 0; // Declare the totalPixelCount integer only within this scope with the ability to be changed
    let shadedPixelCount = 0; // Declare the shadedPixelCount integer only within this scope with the ability to be changed

    const imageData = cv.imread("./ProcessingImages/" + getMostRecentFile("./ProcessingImages/").file); // Use the Computer Vision library to read the data of the image
    console.log(imageData);

    // Ensure the image is the valid size (100 by 100 pixels)
    if (imageData.rows != 100 || imageData.cols != 100) {
        io.emit('failed submission');
        io.emit('event', {1: {'message': `Image is incorrect size (${imageData.rows}x${imageData.cols}). Should be (100x100).`, 'colour': '235, 0, 0'}});
        console.log("PROCESSING CANCELLED, IMPROPER FORMAT, IMAGE IS NOT 100x100 PIXELS");
        return;
    }

    for (let x = 0; x < imageData.rows; x++) { // Loop through each row of pixels in the image
        for (let y = 0; y < imageData.cols; y++) { // Loop through every column of pixels in the image
            // The above iterations result in the looping through of every pixel present in the image
            io.emit('processing image progress', {x: x, y: y});

            totalPixelCount++ // Increment totalPixelCount

            const [b, g, r] = imageData.atRaw(x, y) // Get the Red/Green/Blue values on the image at pixel (x, y)
            //console.log(`RGB: ${r}, ${g}, ${b}`)

            if (r == '0' && g == '0' && b == '0') { // Check if the pixel is shaded, where the microcontrollers will direct the stepper motors to move the nichrome wire to
                imagePoints.push([x, y]); // Add the shaded pixel to the array of imagePoints
                shadedPixelCount++ // Increment shadedPixelCount
            }
        }
    }

    // Debugging code to print the totalPixelCount, shadedPixelCount and imagePoints to the console
    console.log(`Pixels: ${totalPixelCount}`);
    console.log(`Shaded pixels: ${shadedPixelCount}`);
    console.log(imagePoints);

    var currentDate = new Date().getTime() / 1000;
    console.log(currentDate);
    io.emit('completion time', (currentDate + shadedPixelCount));

    return instructMCs(imagePoints, imageFileDetails);
}

// Add imageFile details and microcontroller instructions to the database to be served on '/MCInstructions' for the ESP32 to read
function instructMCs(imagePoints, imageFileDetails) {
    if (!imagePoints) return console.log("INSTRUCTING MICROCONTROLLERS CANCELLED, NO 'imagePoints' RECEIVED");
    if (!imageFileDetails) return console.log("INSTRUCTING MICROCONTROLLERS CANCELLED, NO 'imageFileDetails' RECEIVED ")
    imagePoints = JSON.stringify(imagePoints);
    db.serialize(() => {
        db.each(`SELECT * FROM StyrocutData WHERE cutting='1'`, (error, row) => {
            db.run(`UPDATE StyrocutData SET cutting=0 WHERE id='${row.id}'`)
        });
        db.run(`INSERT INTO StyrocutData (id, cutting, fileName, fileSize, progress, points) VALUES (NULL, true, '${imageFileDetails.filename}', '${imageFileDetails.size}', '0', '${imagePoints}')`)
    });
    
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
