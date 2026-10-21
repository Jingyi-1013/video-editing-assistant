let currentFile = null;
let transcriber = null;
let words = [];
let textwords = [];


// Get chatbot elements
const chatInput = document.getElementById("chatInput");
const sendButton = document.getElementById("sendButton");
const messages = document.getElementById("messages");
const uploadButton = document.getElementById("uploadButton");
const exportButton = document.getElementById("exportButton");

uploadButton.addEventListener("click", function () {
    fileInput.click();
});
//show a messgae
function addMessage(text, sender) {
    const message = document.createElement("div");
    message.textContent = text;
    message.className = sender;
    messages.appendChild(message);
}
addMessage(
    "Hello, I am your video editing assistant. You can upload your video here.",
    "bot"
);
//add click button
// sendButton.addEventListener("click", function () {
//     let userText = chatInput.value
//     addMessage(userText, "user");
//     addMessage("Got you", "bot");
//     chatInput.value = "";
// })
sendButton.addEventListener("click", function () {
    let userText = chatInput.value.trim();

    if (userText === "") {
        return;
    }

    addMessage(userText, "user");
    chatInput.value = "";

    if (words.length === 0) {
        addMessage("Please upload a video and wait for transcription first.", "bot");
        return;
    }

    addMessage(
        "I can help you with transcripts and remove filler words. What would you like to do?",
        "bot"
    );

    document.getElementById("options").hidden = false;
});
//load the modole of automatic-speech-recognition
async function setup() {
    let { pipeline } = await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0");
    transcriber = await pipeline("automatic-speech-recognition", "onnx-community/whisper-base_timestamped");
    console.log("Great");
}

setup();

async function loadtextwords() {
    const response = await fetch('text-words.json');
    textwords = await response.json();
    console.log("Success");
}
loadtextwords();

//upload the video file 
const fileInput = document.getElementById('fileInput');

//play the video
const player = document.getElementById('player');
//get the audio
async function decodeAudio(file) {
    //whisper requires audio to have a 16000 sample rate
    const ctx = new AudioContext({ sampleRate: 16000 });
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    //get the audio volum data of the left channel
    return audioBuffer.getChannelData(0);
}
function showwords() {
    const container = document.getElementById('transcript');
    container.innerHTML = '';
    words.forEach(function (w) {
        if (w.deleted === true) {
            return;
        }
        const span = document.createElement('span');
        span.textContent = w.text;
        container.appendChild(span);
    });
}
function clean(text) {
    let words = text.split(/\W+/);
    let result = words.join("");
    let lowerResult = result.toLowerCase();

    return lowerResult;
}
function removeFillers() {
    let count = 0;

    words.forEach(function (w) {

        if (w.deleted === true) {
            return;
        }

        let text = w.text;
        let cleanedText = clean(text);
        let isFiller = textwords.includes(cleanedText);

        if (isFiller) {
            w.deleted = true;
            count = count + 1;
        }

    });

    return count;
}
function getDeletedSegments() {
    let segments = [];
    for (let i = 0; i < words.length; i++) {
        let w = words[i];
        console.log(w.text);
        if (w.deleted === true) {
            segments.push({
                start: w.start,
                end: w.end
            });
        }
    }

    return segments;
}

player.addEventListener("timeupdate", function () {
    for (let i = 0; i < words.length; i++) {
        let w = words[i];
        if (w.deleted === true &&
            player.currentTime >= w.start &&
            player.currentTime < w.end) {
            console.log("Skipping:", w.text);
            player.currentTime = w.end;
            break;
        }
    }
})

//Event listener
fileInput.addEventListener('change', async function () {
    //Get the file and play it
    const file = fileInput.files[0];
    console.log(file);
    player.src = URL.createObjectURL(file);
    //Extract the audio
    const audio = await decodeAudio(file);
    console.log(audio.length, audio);
    //check if the model is ready
    if (!transcriber) {
        console.log("It's still loading");
        //Exit 
        return;
    }
    //transcribe the audio and give the word start and end time
    const result = await transcriber(audio, {
        return_timestamps: "word", chunk_length_s: 30,
        stride_length_s: 5
    });
    console.log(result);

    //convert it into the data structure
    words = result.chunks.map(function (chunk) {
        return {
            text: chunk.text,
            start: chunk.timestamp[0],
            end: chunk.timestamp[1],
            deleted: false,
        };
    });
    console.log(words);

    // addMessage(
    //     "I can help you with transcripts and remove filler words. What would you like to do?",
    //     "bot"
    // ); 
    // document.getElementById("options").hidden = false;
});
const transcriptButton = document.getElementById("transcriptButton");
const cleanTranscriptButton = document.getElementById("cleanTranscriptButton");
const transcript = document.getElementById("transcript");

transcriptButton.addEventListener("click", function () {
    words.forEach(function (w) {
        w.deleted = false;
    });

    showwords();
    transcript.hidden = false;

    addMessage("Here is your full transcript.", "bot");
});

cleanTranscriptButton.addEventListener("click", function () {
    words.forEach(function (w) {
        w.deleted = false;
    });

    let count = removeFillers();
    showwords();
    transcript.hidden = false;

    addMessage(
        "Here is your cleaned transcript.",
        "bot"
    );
});


