
/* Global Variables */
// Constants
const HostIP = '192.168.137.1';
const fileConstraints = {
    // Dimension restrictions //
    minHeight: 50,
    minWidth: 50,
    maxHeight: 310,
    maxWidth: 310,

    // File type restrictions //
    acceptedFileTypes: ['image/png']
}

// Variables
var contourIds = [];

var submittedFile = null;
var fileDimensions = {
    original: {
        height: 0,
        width: 0
    },
    submitted: {
        height: 0,
        width: 0
    }
}
/* End Global Variables */


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
/* End Event logs */


// Start a socket.io connection with the server
const socket = io(`http://${HostIP}:8080`, {
    withCredentials: true,
    extraHeaders: {
        'header-auth': "abcd"
    }
});


/* Fit previewImg to container and maintain aspect ratio */
function constrainImg(reqH, reqW) {
    if (!fileDimensions.original.height || !fileDimensions.original.width) return false;
    
    console.log(reqH, reqW);
    
    if (reqH) {
        reqH = parseFloat(reqH);
    }
    if (reqW) {
        reqW = parseFloat(reqW);
    }

    const aspectRatio = fileDimensions.original.height / fileDimensions.original.width;
    console.log('aspectRatio: ', aspectRatio);

    if (aspectRatio == 1) {
        let req = reqH || reqW;
        document.getElementById('previewImg').style.height = `${req * 2}px`;
        document.getElementById('previewImg').style.width = `${document.getElementById('previewImg').style.width}`;
        document.getElementById('changeSizeHeight').value = `${req.toFixed(2)}`;
        document.getElementById('changeSizeWidth').value = `${document.getElementById('changeSizeHeight').value}`;
    } else if (aspectRatio < 1) { // Width is greater than height
        if (reqH) {
            const newWidth = (reqH / aspectRatio);
            console.log('newWidth: ', newWidth)

            if (newWidth >= fileConstraints.minWidth && newWidth <= fileConstraints.maxWidth) {
                document.getElementById('previewImg').style.height = `${reqH * 2}px`;
                document.getElementById('previewImg').style.width = `${newWidth * 2}px`;
                document.getElementById('changeSizeHeight').value = `${reqH.toFixed(2)}`;
                document.getElementById('changeSizeWidth').value = `${newWidth.toFixed(2)}`;
            } else if (newWidth < fileConstraints.minWidth) {
                document.getElementById('previewImg').style.height = `${fileConstraints.minHeight * 2 * aspectRatio}px`;
                document.getElementById('previewImg').style.width = `${fileConstraints.minWidth * 2}px`;
                document.getElementById('changeSizeHeight').value = `${fileConstraints.minHeight}`;
                document.getElementById('changeSizeWidth').value = `${(fileConstraints.minWidth / aspectRatio).toFixed(2)}`;
            } else if (newWidth > fileConstraints.maxWidth) {
                document.getElementById('previewImg').style.height = `${fileConstraints.maxHeight * 2 * aspectRatio}px`;
                document.getElementById('previewImg').style.width = `${fileConstraints.maxWidth * 2}px`;
                document.getElementById('changeSizeHeight').value = `${(fileConstraints.maxHeight * aspectRatio).toFixed(2)}`;
                document.getElementById('changeSizeWidth').value = `${fileConstraints.maxWidth}`;
            }
        } else if (reqW) {
            const newHeight = (reqW * aspectRatio);
            console.log('newHeight: ', newHeight)

            if (newHeight >= fileConstraints.minHeight && newHeight <= fileConstraints.maxHeight) {
                document.getElementById('previewImg').style.width = `${reqW * 2}px`;
                document.getElementById('previewImg').style.height = `${newHeight * 2}px`;
                document.getElementById('changeSizeWidth').value = `${reqW.toFixed(2)}`;
                document.getElementById('changeSizeHeight').value = `${newHeight.toFixed(2)}`;
            } else if (newHeight < fileConstraints.minHeight) {
                document.getElementById('previewImg').style.height = `${fileConstraints.minHeight * 2 * aspectRatio}px`;
                document.getElementById('previewImg').style.width = `${fileConstraints.minWidth * 2 / aspectRatio}px`;
                document.getElementById('changeSizeHeight').value = `${fileConstraints.minHeight}`;
                document.getElementById('changeSizeWidth').value = `${(fileConstraints.minWidth / aspectRatio).toFixed(2)}`;
            } else if (newHeight > fileConstraints.maxHeight) {
                document.getElementById('previewImg').style.width = `${fileConstraints.maxWidth * 2 * aspectRatio}px`;
                document.getElementById('previewImg').style.height = `${fileConstraints.maxHeight * 2 / aspectRatio}px`;
                document.getElementById('changeSizeHeight').value = `${(fileConstraints.maxHeight * aspectRatio).toFixed(2)}`;
                document.getElementById('changeSizeWidth').value = `${fileConstraints.maxWidth}`;
            }
        }
    } else if (aspectRatio > 1) { // Height is greater than width
        if (reqH) {
            const newWidth = (reqH / aspectRatio);
            console.log('newWidth: ', newWidth)

            if (newWidth >= fileConstraints.minWidth && newWidth <= fileConstraints.maxWidth) {
                document.getElementById('previewImg').style.height = `${reqH * 2}px`;
                document.getElementById('previewImg').style.width = `${newWidth * 2}px`;
                document.getElementById('changeSizeHeight').value = `${reqH.toFixed(2)}`;
                document.getElementById('changeSizeWidth').value = `${newWidth.toFixed(2)}`;
            } else if (newWidth < fileConstraints.minWidth) {
                document.getElementById('previewImg').style.height = `${fileConstraints.minHeight * 2 * aspectRatio}px`;
                document.getElementById('previewImg').style.width = `${fileConstraints.minWidth * 2}px`;
                document.getElementById('changeSizeHeight').value = `${(fileConstraints.minHeight * aspectRatio).toFixed(2)}`;
                document.getElementById('changeSizeWidth').value = `${fileConstraints.minWidth}`;
            } else if (newWidth > fileConstraints.maxWidth) {
                document.getElementById('previewImg').style.height = `${fileConstraints.maxHeight * 2 * aspectRatio}px`;
                document.getElementById('previewImg').style.width = `${fileConstraints.maxWidth * 2}px`;
                document.getElementById('changeSizeHeight').value = `${fileConstraints.maxHeight}`;
                document.getElementById('changeSizeWidth').value = `${(fileConstraints.maxWidth * aspectRatio).toFixed(2)}`;
            }
        } else if (reqW) {
            const newHeight = (reqW * aspectRatio);
            console.log('newHeight: ', newHeight)

            if (newHeight >= fileConstraints.minHeight && newHeight <= fileConstraints.maxHeight) {
                document.getElementById('previewImg').style.width = `${reqW * 2}px`;
                document.getElementById('previewImg').style.height = `${newHeight * 2}px`;
                document.getElementById('changeSizeWidth').value = `${reqW.toFixed(2)}`;
                document.getElementById('changeSizeHeight').value = `${newHeight.toFixed(2)}`;
            } else if (newHeight < fileConstraints.minHeight) {
                document.getElementById('previewImg').style.height = `${fileConstraints.minHeight * 2 * aspectRatio}px`;
                document.getElementById('previewImg').style.width = `${fileConstraints.minWidth * 2 / aspectRatio}px`;
                document.getElementById('changeSizeHeight').value = `${fileConstraints.minHeight}`;
                document.getElementById('changeSizeWidth').value = `${(fileConstraints.minWidth / aspectRatio).toFixed(2)}`;
            } else if (newHeight > fileConstraints.maxHeight) {
                document.getElementById('previewImg').style.width = `${fileConstraints.maxWidth * 2 / aspectRatio}px`;
                document.getElementById('previewImg').style.height = `${fileConstraints.maxHeight * 2 * aspectRatio}px`;
                document.getElementById('changeSizeHeight').value = `${fileConstraints.maxHeight}`;
                document.getElementById('changeSizeWidth').value = `${(fileConstraints.maxWidth / aspectRatio).toFixed(2)}`;
            }
        }
    }
}
/* End Fit previewImg to container and maintain aspect ratio */


/* Handle events after the document is ready and all DOM elements are loaded */
$(document).ready(function() {
    $('#changeSizeHeight').change(function(e) {
        if (!this.value) return
        if (this.value < fileConstraints.minHeight) {
            this.value = fileConstraints.minHeight;
        } else if (this.value > fileConstraints.maxHeight) {
            this.value = fileConstraints.maxHeight;
        }

        constrainImg(this.value, null);
    });

    $('#changeSizeWidth').change(function(e) {
        if (!this.value) return
        if (this.value < fileConstraints.minWidth) {
            this.value = fileConstraints.minWidth;
        } else if (this.value > fileConstraints.maxWidth) {
            this.value = fileConstraints.maxWidth;
        }

        constrainImg(null, this.value);
    });

    function spindleRequests(command, dir) {
        if (command == "translateSpindle" || command == "setSpindle") {
            if (dir == -1 || dir == 1) {
                $.ajax({
                    url: '../../webMsg',
                    type: 'POST',
                    data: {'message': `${command}`, 'dir': dir},
                    success: function(data) {
                        console.log(data);
                    }
                });
            }
        }
    }

    // Set spindle positions
    function translateSpindle(direction) {
        if (direction > 0) {
            spindleRequests("translateSpindle", 1);
        } else if (direction < 0) {
            spindleRequests("translateSpindle", -1);
        }
    }

    function setSpindlePos(pos) {
        if (pos > 0) {
            spindleRequests("setSpindle", 1);
        } else if (pos < 0) {
            spindleRequests("setSpindle", -1);
        }
    }

    $('#translateSpindleUp').click(function(){translateSpindle(1)});
    $('#translateSpindleDown').click(function(){translateSpindle(-1)});
    $('#setUpPosition').click(function(){setSpindlePos(1)});
    $('#setDownPosition').click(function(){setSpindlePos(-1)});
    

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

        fileDimensions.submitted.height = parseFloat(document.getElementById('changeSizeHeight').value);
        fileDimensions.submitted.width = parseFloat(document.getElementById('changeSizeWidth').value);

        document.getElementById('changeSizeHeight').disabled = true;
        document.getElementById('changeSizeWidth').disabled = true;

        let selectedTraceMethod;
        document.getElementsByName('traceMethod').forEach((radBtn) => {
            if (radBtn.checked) {
                selectedTraceMethod = radBtn.value;
            }
        });

        let spindleRotation = document.getElementById('spindleRotation').checked;

        let formData = new FormData();
        formData.append('file', submittedFile);
        formData.append('traceMethod', selectedTraceMethod);
        formData.append('spindleRotation', spindleRotation);

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

    // Keep the 'eventLogsDiv' scrolled to the bottom
    $('#eventLogsDiv').bind('DOMSubtreeModified', function() {
        var eventLogsDiv = document.getElementById('eventLogsDiv');
        eventLogsDiv.scrollTop = eventLogsDiv.scrollHeight;
    });
});
/* End Handle events after the document is ready and all DOM elements are loaded */


/* Image obtaining and relaying */
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
    if (fileConstraints.acceptedFileTypes.includes(imageFile.type)) {
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
            /*if (this.height > 620 || this.width > 620) {
                newEventLogs({1: {'message': "ERROR | File too large (must be 620x620 pixels).", 'colour': '235, 0, 0'}});
                return;
            }*/

            fileDimensions.original.height = this.height / 2;
            fileDimensions.original.width = this.width / 2;
        }
    }
    reader.readAsDataURL(imageFile);
    
    setTimeout(() => {
        constrainImg(fileDimensions.original.height, null);
    }, 100);
    
    document.getElementById('previewImg').src = URL.createObjectURL(imageFile);

    document.getElementById('submitImage').style.visibility = "visible";
}
/* End Image obtaining and relaying */

/* Handle contours and processing progress */
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

    console.log('addContourOnImage - x: ', x);
    console.log('addContourOnImage - y: ', y);

    //console.log(fileDimensions)

    const xPos = x * (fileDimensions.submitted.height / Math.abs(fileDimensions.submitted.height - fileDimensions.original.height));
    const yPos = y * (fileDimensions.submitted.width / Math.abs(fileDimensions.submitted.width - fileDimensions.original.width));

    console.log('addContourOnImage height', xPos)
    console.log('addContourOnImage width', yPos)


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
/* End Handle contours and processing progress */


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
            if (data.y >= fileDimensions.original.width) {
                clearInterval(processProgressRepetition);
            }
            alterProcessProgress(data.y - 1);
            alterProcessProgress(data.y);
        }, 40);
    }
    
    if (data.x) {
        setTimeout(function() {
            const xAsPercentage = parseInt(data.x/fileDimensions.original.height * 100) + 1;
            document.getElementById('progressBar').style.width = `${xAsPercentage}%`;
            document.getElementById('progressBarSpan').innerHTML = `Processing image`;
            if (!progressAlreadyGiven.includes(xAsPercentage)) {
                progressAlreadyGiven.push(xAsPercentage);
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
/* End socket.io handling */
