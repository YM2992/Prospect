
$(document).ready(function() {
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
});

// Image obtaining and relaying //
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

    document.getElementById('previewImg').src = URL.createObjectURL(imageFile)

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


// socket.io live updates server-client
// Start a socket.io connection with the server
const socket = io('http://localhost:8080');
socket.on('connect', () => {
    console.log("socket.io connection established");
});
socket.on('disconnect', () => {
    console.log("socket.io disconnected");
});

// When the socket connection receives an event, handle the data given (progress of the image processing and cutting)
socket.on('processing image progress', (data) => {
    setTimeout(function() {
        alterProcessProgress(data.y);
        document.getElementById('progressBar').style.width = `${data.x + 1}%`;
        document.getElementById('progressBarSpan').innerHTML = `Processing image: ${data.x + 1}%`;
    }, 100)
});

socket.on('cutting progress', (data) => {
    alterProcessProgress(data.y);
    document.getElementById('progressBar').style.width = `${data.x + 1}%`;
    document.getElementById('progressBarSpan').innerHTML = `Cutting image: ${data.x + 1}%`;
});


function timeRemainingChange(completionDate) {
    var currentDate = new Date().getTime() / 1000;

    let totalSeconds = completionDate - currentDate;
    let hours = Math.floor(totalSeconds / 3600);
    totalSeconds = totalSeconds - hours * 3600;
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = Math.floor(totalSeconds - minutes * 60);

    let formattedHours = ("0" + hours).slice(-2);
    let formattedMins = ("0" + minutes).slice(-2);
    let formattedSecs = ("0" + seconds).slice(-2);

    document.getElementById('timeLeftSpan').innerHTML = `Time left until completion (hh:mm:ss): ${formattedHours}:${formattedMins}:${formattedSecs}`;
}
socket.on('completion time', (completionDate) => {
    setTimeout(function() {
        document.getElementById('progressBar').style.width = `0%`;
        document.getElementById('progressBarSpan').innerHTML = `Cutting image: 0%`;
        document.getElementById('timeLeftSpan').style.visibility = "visible";

        let processDivs = document.getElementsByClassName('processDiv');
        for (var row = 0; row < processDivs.length; row++) {
            processDivs[row].style.width = "0%";
        }
    }, 1000);

    timeRemainingChange(completionDate);
    const timeRemaining = setInterval(function() {
        currentDate = new Date().getTime() / 1000;
        if (currentDate >= completionDate) return clearInterval(timeRemaining);

        timeRemainingChange(completionDate);
    }, 1000);
});
