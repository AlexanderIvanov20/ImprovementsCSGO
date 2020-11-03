const readline = require('readline');
const { google } = require('googleapis');
const fs = require('fs');
// const path = require('path');

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const TOKEN_PATH = 'token.json';


// Выборка creadentials для получения доступа для к API
function startUploading() {
  fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);

    authorize(JSON.parse(content), listFiles);
  });
}


// Авторизация по credentials
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  // Чтение token.json, если он есть
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}


// Запись token'a для "автовхода"
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  // Ввод отокена пользователем и запись в token.json
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);

      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}


// Выгрузка файлов в Google Drive
async function storeFile(auth, title) {
  const drive = google.drive({
    version: 'v3', auth,
  });

  const fileMetadata3 = {
    name: title,
  };
  const media3 = {
    mimeType: 'text/csv',
    body: fs.createReadStream(title),
  };

  drive.files.create({
    resource: fileMetadata3,
    media: media3,
    fields: 'id',
  });
}


// Обновление файла
async function updateFile(auth, fileId, fileName) {
  const drive = google.drive({
    version: 'v3', auth,
  });
  const fileMetadata = {
    name: `${fileName}`,
  };
  const media = {
    mimeType: 'text/csv',
    body: fs.createReadStream(`${fileName}`),
  };

  // Обновление файла
  drive.files.update({
    fileId: fileId,
    resource: fileMetadata,
    media: media,
  });
}


// Получение списка файлов
function listFiles(auth) {
  const drive = google.drive({
    version: 'v3', auth,
  });
  drive.files.list({
    fields: 'files(id, name)',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const files = res.data.files;

    if (files.length) {
      let p1 = false;
      let p2 = false;
      let p3 = false;
      let p4 = false;
      let p5 = false;
      files.map((file) => {
        // Обновление файла
        if (file.name === 'price3.csv') {
          updateFile(auth, file.id, 'price3.csv');
          p1 = true;
        }
        if (file.name === 'price4.csv') {
          updateFile(auth, file.id, 'price4.csv');
          p2 = true;
        }
        if (file.name === 'filterPrice3.csv') {
          updateFile(auth, file.id, 'filterPrice3.csv');
          p3 = true;
        }
        if (file.name === 'filterSteamAndAverage.csv') {
          updateFile(auth, file.id, 'filterSteamAndAverage.csv');
          p4 = true;
        }
        if (file.name === 'filterSteamAverageForNotAtFilter.csv') {
          updateFile(auth, file.id, 'filterSteamAverageForNotAtFilter.csv');
          p5 = true;
        }
      });

      if (!p1) {
        storeFile(auth, 'price3.csv');
      }
      if (!p2) {
        storeFile(auth, 'price4.csv');
      }
      if (!p3) {
        storeFile(auth, 'filterPrice3.csv');
      }
      if (!p4) {
        storeFile(auth, 'filterSteamAndAverage.csv');
      }
      if (!p5) {
        storeFile(auth, 'filterSteamAverageForNotAtFilter.csv');
      }
    } else {
      storeFile(auth, 'price3.csv');
      storeFile(auth, 'price4.csv');
      storeFile(auth, 'filterPrice3.csv');
      storeFile(auth, 'filterSteamAndAverage.csv');
      storeFile(auth, 'filterSteamAverageForNotAtFilter.csv');
    }
  });
}


// Экспорт функции
module.exports = { startUploading };
