
/* Global Variables */
const HostIP = '192.168.1.107';

/* Event logs */
function newEventLogs(messages) {
    for (let i in messages) {
        let newEventMessageBG = document.createElement('p');
        newEventMessageBG.classList.add('eventLogMessageBG');
        let newEventMessage = document.createElement('p');
        newEventMessage.innerHTML = messages[i].message;
        newEventMessage.classList.add('eventLogMesssage');
        newEventMessage.title = new Date().toUTCString();

        if (messages[i].colour) {
            newEventMessage.style.color = `RGB(${messages[i].colour})`
        }

        newEventMessageBG.appendChild(newEventMessage);
        document.getElementById('eventLogsDiv').appendChild(newEventMessageBG);
    }
}


/* Prevent page reload */
window.onbeforeunload = function() {
    return console.log("reloaded page");
}

// Start a socket.io connection with the server
const socket = io(`http://${HostIP}:8080`, {
    withCredentials: true,
    extraHeaders: {
        'header-auth': "abcd"
    }
});

/* Handle events after the document is ready and all DOM elements are loaded */
$(document).ready(function() {
    // When the document is ready, remove the default redirection of the form submit
    $('#submitImage').click(function(e) {
        e.preventDefault();

        let file = document.getElementById('fileInput').files[0];
        if (!file) {
            newEventLogs({1: {'message': "ERROR | No file selected for upload", 'colour': '235, 0, 0'}});
            document.getElementById('submitImage').style.visibility = "hidden";
            return;
        }

        document.getElementById('fileInput').disabled = true;
        document.getElementById('submitImage').disabled = true;
        
        let formData = new FormData();
        formData.append('file', file);

        $.ajax({
            url: '../../upload',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(data) {
                console.log(data);
                if (data == "success") {
                    document.getElementById('imgProcessingProgress').style.visibility = "visible";
                }
            }
        });
    });

    // Begin cutting process
    $('#beginCutting').click(function() {
        $.ajax({
            url: '../../webMsg',
            type: 'POST',
            data: {'message': 'begin cutting'},
            success: function(data) {
                console.log(data);
            }
        });

        let processDivs = document.getElementsByClassName('processDiv');
        for (var row = 0; row < 100; row++) {
            processDivs[row].style.width = "0%";
        }
        document.getElementById('progressBar').style.width = "0%";
        document.getElementById('progressBarSpan').innerHTML = "Cutting image: 0%";
        document.getElementById('imgProcessingProgress').style.visibility = "hidden";
    });

    // Keep the 'eventLogsDiv' scrolled to the bottom
    $('#eventLogsDiv').bind('DOMSubtreeModified', function() {
        var eventLogsDiv = document.getElementById('eventLogsDiv');
        eventLogsDiv.scrollTop = eventLogsDiv.scrollHeight;
    });

    const objectNumberSldr = document.getElementById('objectNumber');
    const objectNumberTxt = document.getElementById('objectNumberTxt');
    objectNumberSldr.oninput = function() {
        objectNumberTxt.value = this.value;
    }
});


/* Image obtaining and relaying */
let acceptedFileTypes = ['image/png']


function getFile(filePath) {
    return filePath.substr(filePath.lastIndexOf('\\') + 1).split('.')[0];
}

function getOutput() {
    let imageFile = document.getElementById('fileInput').files[0]

    if (!imageFile) {
        console.warn("No image received.");
        document.getElementById('submitImage').style.visibility = "hidden";
        return;
    }
    if (acceptedFileTypes.includes(imageFile.type)) {
        console.log("Accepted file type")
    } else {
        console.log("Declined file type")
    };

    document.getElementById('previewImg').src = URL.createObjectURL(imageFile);

    document.getElementById('submitImage').style.visibility = "visible";
}


function progressDivsLoaded() {
    const progressDivs = document.getElementById('progressDivs')
    for (let i = 0; i < 100; i++) {
        let processDiv = document.createElement('div');
        processDiv.className = 'processDiv'
        processDiv.style.top = `${i}%`
        progressDivs.appendChild(processDiv);
    }
}

function addContourOnImage(x, y) {
    const contoursElement = document.getElementById('contoursDiv');
    let newContourPixel = document.createElement('div');
    newContourPixel.classList.add('contourPxl');
    contoursElement.appendChild(newContourPixel);
    newContourPixel.style.left = `${x * 5}px`;
    newContourPixel.style.top = `${y * 5}px`;
}

var processingProgress = 0;

function alterProcessProgress(row) {
    if (row >= 100) return true;
    let processDivs = document.getElementsByClassName('processDiv');
    let processDiv = processDivs[row];
    if ((parseFloat(processDiv.style.width) || 0) < 100) {
        processDiv.style.height = '1%';
        processDiv.style.width = `${(parseFloat(processDiv.style.width) || 0) + 1}%`;
        processingProgress++
    }
}

function incremenetProcessProgress() {
    const complete = alterProcessProgress(parseInt(`${processingProgress / 100}`));
    if (complete) return true;
}


/* socket.io live updates server-client */
socket.on('connect', () => {
    console.log("socket.io connection established");
});
socket.on('disconnect', () => {
    console.log("socket.io disconnected");
});


socket.on('failed submission', () => {
    document.getElementById('previewImg').src = "";
    document.getElementById('submitImage').style.visibility = "hidden";
    document.getElementById('fileInput').disabled = false;
    document.getElementById('submitImage').disabled = false;
    document.getElementById('imgProcessingProgress').style.visibility = "hidden";
    document.getElementById('fileInput').value = null;
});

socket.on('event', (data) => {
    newEventLogs(data);
});

socket.on('processing', (data) => {
    for (i in data.points) {
        addContourOnImage(data.points[i].x, data.points[i].y);
    }
})
socket.on('processed', (data) => {
    document.getElementById('beginCutting').style.visibility = "visible";
    document.getElementById('objectNumber').style.visibility = "visible";
    document.getElementById('objectNumber').setAttribute('max', data.objectNumber);
    document.getElementById('objectNumber').setAttribute('value', data.objectNumber);
    document.getElementById('objectNumberTxt').style.visibility = "visible";
    document.getElementById('objectNumberTxt').setAttribute('value', data.objectNumber);
});

// When the socket connection receives an event, handle the data given (progress of the image processing and cutting)
var progressAlreadyGiven = [];
socket.on('processing image progress', (data) => {
    setTimeout(function() {
        alterProcessProgress(data.y);
        document.getElementById('progressBar').style.width = `${data.x + 1}%`;
        document.getElementById('progressBarSpan').innerHTML = `Processing image: ${data.x + 1}%`;
        if (!progressAlreadyGiven.includes(data.x + 1)) {
            progressAlreadyGiven.push(data.x + 1);
            newEventLogs({
                1: {'message': `Processing image .. ${data.x + 1}% complete`}
            });
        }
    }, 100);
});

socket.on('cutting progress', (data) => {
    alterProcessProgress(data.y);
    document.getElementById('progressBar').style.width = `${data.x + 1}%`;
    document.getElementById('progressBarSpan').innerHTML = `Cutting image: ${data.x + 1}%`;
});


function formattedTimeRemaining(completionDate) {
    let currentDate = new Date().getTime() / 1000;

    let totalSeconds = completionDate - currentDate;
    let hours = Math.floor(totalSeconds / 3600);
    totalSeconds = totalSeconds - hours * 3600;
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = Math.floor(totalSeconds - minutes * 60);

    let formattedHours = ("0" + hours).slice(-2);
    let formattedMins = ("0" + minutes).slice(-2);
    let formattedSecs = ("0" + seconds).slice(-2);

    return {'formattedHours': formattedHours, 'formattedMins': formattedMins, 'formattedSecs': formattedSecs};
}
socket.on('completion time', (completionDate) => {
    let returnedFormattedTime = formattedTimeRemaining(completionDate);
    let formattedHours = returnedFormattedTime.formattedHours;
    let formattedMins = returnedFormattedTime.formattedMins;
    let formattedSecs = returnedFormattedTime.formattedSecs;
    newEventLogs({
        1: {'message': `Beginning cutting .. approximately ${formattedHours}:${formattedMins}:${formattedSecs} remaining`}
    });

    document.getElementById('imgProcessingProgress').style.visibility = "visible";
    document.getElementById('timeLeftSpan').style.visibility = "visible";

    document.getElementById('timeLeftSpan').innerHTML = `Time left until completion (hh:mm:ss): ${formattedHours}:${formattedMins}:${formattedSecs}`;
    const timeRemaining = setInterval(function() {
        let currentDate = new Date().getTime() / 1000;
        if (currentDate >= completionDate) return clearInterval(timeRemaining);

        let returnedFormattedTime = formattedTimeRemaining(completionDate);
        let formattedHours = returnedFormattedTime.formattedHours;
        let formattedMins = returnedFormattedTime.formattedMins;
        let formattedSecs = returnedFormattedTime.formattedSecs;
        document.getElementById('timeLeftSpan').innerHTML = `Time left until completion (hh:mm:ss): ${formattedHours}:${formattedMins}:${formattedSecs}`;
    }, 1000);
});
