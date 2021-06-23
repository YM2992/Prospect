
/* Global Variables */
// Constants
const HostIP = '192.168.137.1'; // Server IP
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

var submittedFile = null; // Stores uploaded file
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
function newEventLogs(messages) { // Creates event logs for the user to see
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


/* Popup hint function */
function popupFunc() {
    var popup = document.getElementById('redContourHintPopup');
    popup.classList.toggle("show");
}

/* Fit previewImg to container and maintain aspect ratio */
function constrainImg(reqH, reqW) {
    if (!fileDimensions.original.height || !fileDimensions.original.width) return false; // Ensure both height and width of the image are stored in variables
    
    console.log(reqH, reqW);
    
    if (reqH) {
        reqH = parseFloat(reqH);
    }
    if (reqW) {
        reqW = parseFloat(reqW);
    }

    const aspectRatio = fileDimensions.original.height / fileDimensions.original.width; // Calculate the aspect ratio for resizing rates
    //console.log('aspectRatio: ', aspectRatio);

    if (aspectRatio == 1) {
        let req = reqH || reqW;
        document.getElementById('previewImg').style.height = `${req * 2}px`;
        document.getElementById('previewImg').style.width = `${document.getElementById('previewImg').style.width}`;
        document.getElementById('changeSizeHeight').value = `${req.toFixed(2)}`;
        document.getElementById('changeSizeWidth').value = `${document.getElementById('changeSizeHeight').value}`;
    } else if (aspectRatio < 1) { // Width is greater than height
        if (reqH) {
            const newWidth = (reqH / aspectRatio);
            //console.log('newWidth: ', newWidth)

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
            //console.log('newHeight: ', newHeight)

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
            //console.log('newWidth: ', newWidth)

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
            //console.log('newHeight: ', newHeight)

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

    $('#resetChangeSize').click(() => {
        document.getElementById('changeSizeHeight').value = fileDimensions.original.height;
        document.getElementById('changeSizeWidth').value = fileDimensions.original.width;
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


    function translateSpindle(direction) { // Translate the spindle up and down
        if (direction > 0) {
            spindleRequests("translateSpindle", 1);
        } else if (direction < 0) {
            spindleRequests("translateSpindle", -1);
        }
    }

    function setSpindlePos(pos) { // Set the upper and lower spindle positions
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
        document.getElementById('submitImage').style.cursor = "auto";

        fileDimensions.submitted.height = parseFloat(document.getElementById('changeSizeHeight').value);
        fileDimensions.submitted.width = parseFloat(document.getElementById('changeSizeWidth').value);

        document.getElementById('changeSizeHeight').disabled = true;
        document.getElementById('changeSizeHeight').style.cursor = "auto";
        document.getElementById('changeSizeWidth').disabled = true;
        document.getElementById('changeSizeWidth').style.cursor = "auto";
        document.getElementById('resetChangeSize').disabled = true;
        document.getElementById('resetChangeSize').style.cursor = "auto";

        let selectedTraceMethod;
        document.getElementsByName('traceMethod').forEach((radBtn) => {
            if (radBtn.checked) {
                selectedTraceMethod = radBtn.value;
            }
            radBtn.disabled = true;
        });

        let spindleRotation = document.getElementById('spindleRotation').checked;

        let formData = new FormData();
        formData.append('file', submittedFile);
        formData.append('submittedFileDimensions', JSON.stringify(fileDimensions.submitted));
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
                if (data == "success") {}
            }
        });
    });

    // Begin tracing process
    $('#beginTracing').click(function() {
        document.getElementById('beginTracing').style.visibility = "hidden";
        
        document.getElementById('spindleRotation').disabled = true;
        Array.prototype.forEach.call(document.getElementsByClassName('translateSpindle'), function(element) {
            element.disabled = true;
        });
        Array.prototype.forEach.call(document.getElementsByClassName('setSpindle'), function(element) {
            element.disabled = true;
        });

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

    let contourPxlSize = {
        height: (fileDimensions.submitted.height / fileDimensions.original.height),
        width: (fileDimensions.submitted.width / fileDimensions.original.width)
    }
    newContourPixel.style.height = `${contourPxlSize.height}px`;
    newContourPixel.style.width = `${contourPxlSize.width}px`;

    contoursElement.appendChild(newContourPixel);

    //console.log(fileDimensions)

    let xPos, yPos;
    if (fileDimensions.submitted.width > fileDimensions.original.width || fileDimensions.submitted.width < fileDimensions.original.width) {
        xPos = x * (fileDimensions.submitted.width / fileDimensions.original.width);
    } else if (fileDimensions.submitted.width == fileDimensions.original.width) {
        xPos = x;
    }
    if (fileDimensions.submitted.height > fileDimensions.original.height || fileDimensions.submitted.height < fileDimensions.original.height) {
        yPos = y * (fileDimensions.submitted.height / fileDimensions.original.height);
    } else if (fileDimensions.submitted.height == fileDimensions.original.height) {
        yPos = y;
    }

    //console.log(x, fileDimensions.submitted.width, xPos)


    newContourPixel.style.left = `${xPos}px`;
    newContourPixel.style.top = `${yPos}px`;

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
socket.on('disconnect', (reason) => {
    window.alert("Warning! The client-server connection has been interrupted. This may be a result of an overly complex image being processed.\nIf your image has not yet completed processing, please refresh and try again.");
    console.log("socket.io disconnected:", reason);
});



socket.on('failed submission', () => {
    document.getElementById('previewImg').src = "";
    document.getElementById('submitImage').style.visibility = "hidden";
    document.getElementById('fileInput').disabled = false;
    document.getElementById('submitImage').disabled = false;
    document.getElementById('fileInput').value = null;
});

socket.on('event', (data) => {
    newEventLogs(data);
});

socket.on('processing', (data) => {
    //console.log(data)
    for (i in data.points) {
        addContourOnImage(data.contourId, data.points[i].x || data.points[i][1], data.points[i].y || data.points[i][0]);
    }
})
socket.on('processed', (data) => {
    popupFunc();
    document.getElementById('beginTracing').style.visibility = "visible";
    /*setTimeout(() => {
        window.alert("Click on the red pixels to select/deselect parts of the image to trace.");
    }, 5000);*/
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
});

socket.on('tracing progress', (data) => {
    alterProcessProgress(data.y);
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
});
/* End socket.io handling */
