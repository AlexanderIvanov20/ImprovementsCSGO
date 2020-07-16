const readline = require('readline');
const { google } = require('googleapis');
const fs = require('fs');

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
async function storeFiles(auth) {
  const drive = google.drive({
    version: 'v3', auth
  });

  var fileMetadata3 = {
    'name': 'price3.csv'
  };
  var media3 = {
    mimeType: 'text/plain',
    body: fs.createReadStream(__dirname + '\\price3.csv')
  };

  var fileMetadata4 = {
    'name': 'price4.csv'
  };
  var media4 = {
    mimeType: 'text/plain',
    body: fs.createReadStream(__dirname + '\\price4.csv')
  };

  drive.files.create({
    resource: fileMetadata3,
    media: media3,
    fields: 'id'
  });
  drive.files.create({
    resource: fileMetadata4,
    media: media4,
    fields: 'id'
  });
}


// Обновление файла 
async function updateFile(auth, fileId, fileName) {
  const drive = google.drive({
    version: 'v3', auth
  });
  var fileMetadata = {
    name: `\\${fileName}`
  };
  var media = {
    mimeType: 'text/plain',
    body: fs.createReadStream(__dirname + `\\${fileName}`)
  };

  // Обновление файла
  drive.files.update({
    fileId: fileId,
    resource: fileMetadata,
    media: media
  });
}


// Получение списка файлов
function listFiles(auth) {
  const drive = google.drive({
    version: 'v3', auth
  });
  drive.files.list({
    fields: 'files(id, name)',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const files = res.data.files;

    if (files.length) {
      var point = false;
      // Проверка, если имя файла price.csv
      for (var item of files) {
        if (item.name === 'price3.csv') point = true;
      }
      if (point) {
        files.map((file) => {
          // Обновление файла
          if (file.name === 'price3.csv') updateFile(auth, file.id, 'price3.csv');
          if (file.name === 'price4.csv') updateFile(auth, file.id, 'price4.csv');
        });
      }
      else {
        storeFiles(auth,);
      }
    }
    else {
      storeFiles(auth);
    }
  });
}


// Экспорт функции
module.exports = { startUploading };