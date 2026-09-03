import fs from 'fs';
import path from 'path';
import AudioRecorder from 'node-audiorecorder'; // Import module
import OpenAI from 'openai';
import "dotenv/config"
import { exec } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
// import { createRequire } from 'module'
// const require = createRequire(import.meta.url);

// 1. Manually resolve and load the binary directly
// Bun natively supports loading .node binaries via require
// const binding = require('./node_modules/speaker/build/Release/binding.node');

ffmpeg.setFfmpegPath(ffmpegPath.path);


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 1. Configure the recording settings
const options = {
  program: 'sox',
  device: null,
  bits: 16,
  channels: 1,
  rate: 16000,
  type: 'wav',
};

// 2. Initialize the recorder instance
const audioRecorder = new AudioRecorder(options, console);

// 3. Create a write stream for the output file
const directory = path.join(import.meta.dirname, 'recordings');
if (!fs.existsSync(directory)) {
  fs.mkdirSync(directory);
}
const fileName = path.join(directory, `${Date.now()}.wav`);
const fileStream = fs.createWriteStream(fileName);

// 4. Start recording and pipe the audio stream into the file
const recordingStream = audioRecorder.start().stream();

recordingStream.on('data', (chunk: any) => {
  console.log('Received audio:', chunk.length);
});

recordingStream.on('error', (err: any) => {
  console.error('Stream error:', err);
});

fileStream.on('error', (err) => {
  console.error('File error:', err);
});

fileStream.on('finish', () => {
  console.log('File writing finished');
});

recordingStream.pipe(fileStream);

// 5. Setup an automatic stop mechanism after 10 seconds
setTimeout(async () => {
  console.log('Recording stopped.');
  audioRecorder.stop();
  await transcribe(fileName);
  listen(fileName);
}, 10 * 1000);


async function transcribe(fileName: string) {
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(fileName),
    model: 'whisper-1',
  });

  console.log(transcription.text);

  return transcription.text;
}

function listen(filePath: string) {
  // Plays only the audio track from the MP4 file
  exec(`ffplay -nodisp -autoexit ${filePath}`, (err) => {
    if (err) {
      console.error('Error playing audio:', err);
    }
  });
}

