/* Prevent page reload */
window.onbeforeunload = function() {
    return console.log("reloaded page");
}

/* Handle events after the document is ready and all DOM elements are loaded */
$(document).ready(function() {
    // When the document is ready, remove the default redirection of the form submit
    $('#submitImage').click(function(e){
        e.preventDefault();
        
        document.getElementById('fileInput').disabled = true;
        document.getElementById('submitImage').disabled = true;

        let file = document.getElementById('fileInput').files[0];
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

    // Keep the 'eventLogsDiv' scrolled to the bottom
    $("#eventLogsDiv").bind('DOMSubtreeModified', function() {
        var eventLogsDiv = document.getElementById('eventLogsDiv');
        eventLogsDiv.scrollTop = eventLogsDiv.scrollHeight;
    });
});


/* Event logs */
function newEventLogs(messages) {
    for (let i in messages) {
        let newEventMessageBG = document.createElement('p');
        newEventMessageBG.classList.add('eventLogMessageBG');
        let newEventMessage = document.createElement('p');
        newEventMessage.innerHTML = messages[i].message;
        newEventMessage.classList.add('eventLogMesssage');

        if (messages[i].colour) {
            newEventMessage.style.color = `RGB(${messages[i].colour})`
        }

        newEventMessageBG.appendChild(newEventMessage);
        document.getElementById('eventLogsDiv').appendChild(newEventMessageBG);
    }
}

/* Image obtaining and relaying */
let acceptedFileTypes = ['image/png']


function getFile(filePath) {
    return filePath.substr(filePath.lastIndexOf('\\') + 1).split('.')[0];
}

function getOutput() {
    let imageFile = document.getElementById('fileInput').files[0]

    if (!imageFile) return console.warn("No image received.");
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
// Start a socket.io connection with the server
const socket = io('http://localhost:8080');
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
});

socket.on('event', (data) => {
    newEventLogs(data);
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
                1: {
                'message': `Processing image .. ${data.x + 1}% complete`
            }});
        }
    }, 100)
});

socket.on('cutting progress', (data) => {
    alterProcessProgress(data.y);
    document.getElementById('progressBar').style.width = `${data.x + 1}%`;
    document.getElementById('progressBarSpan').innerHTML = `Cutting image: ${data.x + 1}%`;
});


function formattedTimeRemaining(completionDate) {
    var currentDate = new Date().getTime() / 1000;

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
    setTimeout(function() {
        newEventLogs({
            1: {'message': "Image successfully processed"}, 
            2: {'message': `Beginning cutting .. approximately ${formattedHours}:${formattedMins}:${formattedSecs} remaining`
        }});

        document.getElementById('progressBar').style.width = `0%`;
        document.getElementById('progressBarSpan').innerHTML = `Cutting image: 0%`;
        document.getElementById('timeLeftSpan').style.visibility = "visible";

        let processDivs = document.getElementsByClassName('processDiv');
        for (var row = 0; row < 100; row++) {
            processDivs[row].style.width = "0%";
        }
    }, 5000);

    document.getElementById('timeLeftSpan').innerHTML = `Time left until completion (hh:mm:ss): ${formattedHours}:${formattedMins}:${formattedSecs}`;
    const timeRemaining = setInterval(function() {
        currentDate = new Date().getTime() / 1000;
        if (currentDate >= completionDate) return clearInterval(timeRemaining);

        let returnedFormattedTime = formattedTimeRemaining(completionDate);
        let formattedHours = returnedFormattedTime.formattedHours;
        let formattedMins = returnedFormattedTime.formattedMins;
        let formattedSecs = returnedFormattedTime.formattedSecs;
        document.getElementById('timeLeftSpan').innerHTML = `Time left until completion (hh:mm:ss): ${formattedHours}:${formattedMins}:${formattedSecs}`;
    }, 1000);
});
