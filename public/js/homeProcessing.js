
function dataURItoBlob(dataURI) {
    // convert base64/URLEncoded data component to raw binary data held in a string
    var byteString;
    if (dataURI.split(',')[0].indexOf('base64') >= 0)
        byteString = atob(dataURI.split(',')[1]);
    else
        byteString = unescape(dataURI.split(',')[1]);

    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    // write the bytes of the string to a typed array
    var ia = new Uint8Array(byteString.length);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ia], {type:mimeString});
}

$(document).ready(function() {
    $('#submitImage').click(function(e){
        e.preventDefault();
        let file = document.getElementById('fileInput').files[0];
        
        /*let canvas = document.getElementById('canvas');
        let dataURL = canvas.toDataURL('image/png', 1.0);
        let blob = dataURItoBlob(dataURL);*/
        var formData = new FormData();
        formData.append('file', file);


        $.ajax({
            url: '../../upload',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(data) {
                console.log(data);
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
    document.getElementById('imgProcessingProgress').style.visibility = "visible";
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
socket.on('event', (data) => {
    alterProcessProgress(data.y);
    document.getElementById('progressBar').style.width = `${data.x + 1}%`
    document.getElementById('progressBarSpan').innerHTML = `Processing image: ${data.x + 1}%`
});
