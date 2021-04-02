
/* Global Variables */
const HostIP = '192.168.137.1';
var contourIds = [];

var submittedFile = null;
var submittedFileDetails = {
    height: 0,
    width: 0
};


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


// Start a socket.io connection with the server
const socket = io(`http://${HostIP}:8080`, {
    withCredentials: true,
    extraHeaders: {
        'header-auth': "abcd"
    }
});


function fileDropDivDragEnter(ev) {
    ev.preventDefault();
        console.log("dragenter");
}
function fileDropDivDragOver(ev) {
    ev.preventDefault();
    console.log("dragover");
    ev.dataTransfer.dropEffect = 'move';
}
function fileDropDivDragDrop(ev) {
    ev.preventDefault();
    console.log("dropped");
    document.getElementById('fileInput').files[0] = ev.dataTransfer.getData('files')[0];
    console.log(ev.dataTransfer)
}

/* Handle events after the document is ready and all DOM elements are loaded */
$(document).ready(function() {
    // Drag and drop file input
    /*const fileDropDiv = document.getElementById('fileDropPoint');

    fileDropDiv.addEventListener('dragenter', function(event) {
        event.preventDefault();
    });
    fileDropDiv.addEventListener('dragover', function(event) {
        event.preventDefault();
    });
    fileDropDiv.addEventListener('drop dragdrop', function(event) {
        event.preventDefault();
    });*/

    $('#changeSizeHeight').change(function(e) {
        if (!this.value) return

        if (this.value < 0) {
            this.value = '0';
        } else if (this.value > 310) {
            this.value = '310';
        }

        
    });

    // When the document is ready, remove the default redirection of the form submit
    $('#submitImage').click(function(e) {
        e.preventDefault();

        submittedFile = document.getElementById('fileInput').files[0];
        if (!submittedFile) {
            newEventLogs({1: {'message': "ERROR | No file selected for upload", 'colour': '235, 0, 0'}});
            document.getElementById('submitImage').style.visibility = "hidden";
            return;
        }

        document.getElementById('fileInput').disabled = true;
        document.getElementById('submitImage').disabled = true;

        let selectedTraceMethod;
        document.getElementsByName('traceMethod').forEach((radBtn) => {
            if (radBtn.checked) {
                selectedTraceMethod = radBtn.value;
            }
        });
        
        let formData = new FormData();
        formData.append('file', submittedFile);
        formData.append('traceMethod', selectedTraceMethod);

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

    // Begin tracing process
    $('#beginTracing').click(function() {
        document.getElementById('beginTracing').style.visibility = "hidden";
        $('#beginTracing').attr('disabled', true);

        if (contourIds.length > 0) {
            contourIds = `${contourIds}`
        } else {
            contourIds = null;
        }

        $.ajax({
            url: '../../webMsg',
            type: 'POST',
            data: {'message': 'begin tracing', 'contourIds': contourIds},
            success: function(data) {
                console.log(data);
            }
        });

        let processDivs = document.getElementsByClassName('processDiv');
        for (var row = 0; row < 100; row++) {
            processDivs[row].style.width = "0%";
        }
        document.getElementById('progressBar').style.width = "0%";
        document.getElementById('progressBarSpan').innerHTML = "tracing image: 0%";
        document.getElementById('imgProcessingProgress').style.visibility = "hidden";
    });

    // Toggle nichrome wire heat
    /*$('#toggleWireHeat').click(function() {
        $.ajax({
            url: '../../webMsg',
            type: 'POST',
            data: {'message': 'toggle wire heat'},
            success: function(data) {
                console.log(data);
            }
        });
    });*/

    // Keep the 'eventLogsDiv' scrolled to the bottom
    $('#eventLogsDiv').bind('DOMSubtreeModified', function() {
        var eventLogsDiv = document.getElementById('eventLogsDiv');
        eventLogsDiv.scrollTop = eventLogsDiv.scrollHeight;
    });
});


/* Drag 'n' Drop image feature */



/* Image obtaining and relaying */
let acceptedFileTypes = ['image/png']


function getFile(filePath) {
    return filePath.substr(filePath.lastIndexOf('\\') + 1).split('.')[0];
}

function getOutput() {
    const imageFile = document.getElementById('fileInput').files[0];

    if (!imageFile) {
        console.warn("No image received.");
        document.getElementById('submitImage').style.visibility = "hidden";
        return;
    }
    if (acceptedFileTypes.includes(imageFile.type)) {
        console.log("Accepted file type");
    } else {
        console.log("Declined file type");
        document.getElementById('previewImg').src = "";
        document.getElementById('submitImage').style.visibility = "hidden";
        document.getElementById('fileInput').disabled = false;
        document.getElementById('submitImage').disabled = false;
        document.getElementById('imgProcessingProgress').style.visibility = "hidden";
        document.getElementById('fileInput').value = null;
        newEventLogs({1: {'message': "ERROR | Incorrect file submission type (must be '.png')", 'colour': '235, 0, 0'}});
        return;
    };

    // Get image details: file type, image height, image width
    var reader = new FileReader();
    reader.onload = function(m) {
        var img = new Image();
        img.src = m.target.result;
        img.onload = function() {
            submittedFileDetails.height = this.height;
            submittedFileDetails.width = this.width;
        }
    }
    reader.readAsDataURL(imageFile);
    
    setTimeout(() => {
        document.getElementById('changeSizeHeight').value = submittedFileDetails.height / 2;
        document.getElementById('changeSizeWidth').value = submittedFileDetails.width / 2;
    }, 10);
    
    document.getElementById('previewImg').src = URL.createObjectURL(imageFile);

    document.getElementById('submitImage').style.visibility = "visible";
    //document.getElementById('fileDropPointImg').style.visibility = "hidden";
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

function toggleContour(newContourPixel) {
    if (newContourPixel.classList.value.includes('contourId')) {
        // improve efficiency by using newContourPixel.classList.contains()
        const classValues = newContourPixel.classList.value;
        //const contourId = classValues.charAt(classValues.indexOf('contourId') + 9);
        const contourId = (classValues.match(/\d/g)).join("");
        const contourClassName = `contourId${contourId}`;
        const contourGroupElements = document.getElementsByClassName(contourClassName);

        let oldTogVal = '';
        let newTogVal = '';
        if (contourGroupElements.item(0).classList.contains('contourEnabled')) {
            oldTogVal = 'contourEnabled';
            newTogVal = 'contourDisabled';

            const idInArray = contourIds.indexOf(`${contourId}`);
            if (idInArray > -1) {
                contourIds.splice(idInArray, 1);
            }
        } else if (contourGroupElements.item(0).classList.contains('contourDisabled')) {
            oldTogVal = 'contourDisabled';
            newTogVal = 'contourEnabled';

            const idInArray = contourIds.indexOf(`${contourId}`);
            if (idInArray <= -1) {
                contourIds.push(`${contourId}`);
            }
        }

        for (i in contourGroupElements) {
            contourGroupElements.item(i).classList.replace(oldTogVal, newTogVal);
        }
    }
}
function addContourOnImage(contourId, x, y) {
    const contoursElement = document.getElementById('contoursDiv');
    let newContourPixel = document.createElement('input');
    newContourPixel.type = 'button';
    newContourPixel.classList.add('contourPxl');
    newContourPixel.classList.add(`contourId${contourId}`);
    newContourPixel.classList.add('contourEnabled');
    contoursElement.appendChild(newContourPixel);
    newContourPixel.style.left = `${x}px`;
    newContourPixel.style.top = `${y}px`;

    const idInArray = contourIds.indexOf(`${contourId}`);
    if (idInArray <= -1) {
        contourIds.push(`${contourId}`);
    }

    newContourPixel.onclick = function() {
        toggleContour(newContourPixel);
    }
}

var processingProgress = 0;

function alterProcessProgress(row) {
    if (row >= 100) return true;
    let processDivs = document.getElementsByClassName('processDiv');
    let processDiv = processDivs[row];

    if (!processDiv) return false;

    if ((parseFloat(processDiv.style.width) || 0) < 100) {
        processDiv.style.height = '1%';
        processDiv.style.width = `${(parseFloat(processDiv.style.width) || 0) + 1}%`;
        processingProgress++
    }
}

function incrementProcessProgress() {
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
        addContourOnImage(data.contourId, data.points[i].x, data.points[i].y);
    }
})
socket.on('processed', (data) => {
    document.getElementById('beginTracing').style.visibility = "visible";
});

// When the socket connection receives an event, handle the data given (progress of the image processing and tracing)
var progressAlreadyGiven = [];
socket.on('processing image progress', (data) => {
    if (data.y) {
        let processProgressRepetition = setInterval(() => {
            if (data.y >= submittedFileDetails.width) {
                clearInterval(processProgressRepetition);
            }
            alterProcessProgress(data.y - 1);
            alterProcessProgress(data.y);
        }, 40);
    }
    
    if (data.x) {
        setTimeout(function() {
            const xAsPercentage = parseInt(data.x/submittedFileDetails.height * 100) + 1;
            document.getElementById('progressBar').style.width = `${xAsPercentage}%`;
            document.getElementById('progressBarSpan').innerHTML = `Processing image: ${xAsPercentage}%`;
            if (!progressAlreadyGiven.includes(xAsPercentage)) {
                progressAlreadyGiven.push(xAsPercentage);
                newEventLogs({
                    1: {'message': `Processing image .. ${xAsPercentage}% complete`}
                });
            }
        }, 100);
    }
});

socket.on('tracing progress', (data) => {
    alterProcessProgress(data.y);
    document.getElementById('progressBar').style.width = `${data.y + 1}%`;
    document.getElementById('progressBarSpan').innerHTML = `tracing image: ${data.y + 1}%`;
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
        1: {'message': `Beginning tracing .. approximately ${formattedHours}:${formattedMins}:${formattedSecs} remaining`}
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
