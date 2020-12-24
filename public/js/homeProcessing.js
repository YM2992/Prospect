
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

    setInterval(function() {
        const complete = incremenetProcessProgress();
        if (complete) console.log("PROCESSING COMPLETE");
    }, 0.1);
}

function submit(event) {
    const imageFile = this.refs.fileInput.getValue();

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