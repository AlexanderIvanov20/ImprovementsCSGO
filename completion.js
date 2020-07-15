const axios = require('axios').default;
const {
  steamKey,
  filterDayCount,
  minItemsCount,
  dividerPrice3,
  SteamMultiplier,
  dividerSteamForPrice3,
  dividerForNotAtFilter
} = require('./config');
const fs = require('fs');
const chalk = require('chalk');
const jsonToCsv = require('json2csv').parse;
const parseXML = require('xml2js');
const uploadFileCompletion = require('./uploadFileCompletion');


var urlItems = 'https://api.steamapis.com/market/items/730?api_key=bmyRVmF1HOQ9IH5LmSInrD8FgV4&format=comact';


/* Логгирование действий. */
const loggingActions = async (message) => {
  /* Выборка текущего времени. */
  const date = new Date();
  var finalMessage = `[${date.getUTCDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}] -- ${message}\n`;

  /* Проверка файла на существование. */
  if (fs.existsSync('logsPrice3.log')) {
    var data = fs.readFileSync('logsPrice3.log', 'utf8');

    /* Корректная запись. */
    var trimmedData = data.trim().replace('\r', '');
    if ((!trimmedData.endsWith('\n')) && trimmedData != '') {
      trimmedData += '\n';
    }
    trimmedData += finalMessage;

    /* Запись сформированной строки. */
    fs.writeFileSync('logsPrice3.log', trimmedData, 'utf8');
  } else {
    fs.writeFileSync('logsPrice3.log', finalMessage, 'utf8');
  }
}


/* Функция сна для таймаута. */
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}


/* История цен предметов. */
const makeRequest = async (prefinalUrl) => {
  try {
    var responseMarket = await axios.get(prefinalUrl);
    return responseMarket.data;
  } catch (e) {
    return {
      success: false,
      e: e
    };
  }
}


/* Запись данных в файл. */
const writeOrAppendCSVFile = async (recievedData, fileTitle) => {
  var fields = Object.keys(recievedData[0]);
  const csv = jsonToCsv(recievedData, {
    fields: fields,
    delimiter: ';',
    quote: ''
  });
  fs.writeFileSync(fileTitle, csv);
}


/* Получение курса доллара. */
const getCursOfDollar = async () => {
  var url = 'http://www.cbr.ru/scripts/XML_dynamic.asp?date_req1=11/06/2020&date_req2=12/06/2020&VAL_NM_RQ=R01235';
  var response = await axios.get(url);
  var data = response.data;

  /* Синтексический анализ полченного XML. */
  var cursNum = 0;
  var extractedData = "";
  var parser = new parseXML.Parser();
  parser.parseString(data, function (err, result) {
    extractedData = result.ValCurs.Record[Array.from(result.ValCurs.Record).length - 1].Value[0].replace(',', '.');
    cursNum = parseFloat(extractedData);
  });
  return cursNum;
}

/* Форматирование даты для консольного вывода */
const formatedDate = () => {
  var date = new Date();
  var finalDate1 = `[${date.getUTCDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}.${date.getMilliseconds()}]`;
  return finalDate1;
}


/* Ocновной поток выпонения программы. */
(async () => {
  /* Очистка логов */
  var finalDate;
  fs.writeFileSync('logsPrice3.log', '');

  /* Сбор имен всех предметов. */
  var responseSteam;
  try {
    responseSteam = await axios.get(urlItems);
    var keysItems = Object.keys(responseSteam.data);
  } catch (e) {
    console.error(`An error occurred ${e}`);
  }

  /* Запись предметов в файл */
  var itemsSteam = Object.keys(responseSteam.data).map((value) => {
    return {
      name: value,
      price: responseSteam.data[value]
    }
  });
  writeOrAppendCSVFile(itemsSteam, './steam.csv');

  var prefinalUrl = `https://market.csgo.com/api/v2/get-list-items-info?key=${steamKey}`;
  /* Инициализация массивов для хранения данных */
  var objectForCSV = [];
  var objectForCSV1 = [];
  var objectForCSV2 = [];
  var objectForCSV3 = [];
  var objectForCSV4 = [];
  /* Курс */
  var curs = await getCursOfDollar();

  for (var item = 0; item < keysItems.length; item += 50) {
    /* Формирование ссылки для 50-ти предметов. */
    var temporaryArray = keysItems.slice(item, item + 50);
    temporaryArray.forEach((value) => {
      var encodedTitle = encodeURI(value);
      prefinalUrl += `&list_hash_name[]=${encodedTitle}`;
    });

    finalDate = formatedDate();
    console.log(chalk.green(`${finalDate} Отправка запроса...`));
    loggingActions('Отправка запроса: ' + temporaryArray);

    /* Сбор истории цены предметов. Если ошибка - цикл и тайаут 10 секунд. */
    var responseOrError = await makeRequest(prefinalUrl);
    if (!responseOrError.success) {
      var point = true;
      /* Безконечный цикл, пока не прийдет ответ */
      while (point) {
        finalDate = formatedDate();
        console.log(chalk.yellow(`${finalDate} Повторный запрос.`));
        loggingActions('Повторный запрос.');

        /* Таймаут 10 секунд. */
        await sleep(10000);

        /* Повторная попытка отправить запрос. */
        responseOrError = await makeRequest(prefinalUrl);
        if (responseOrError.success) {
          point = false;
        }

        /* Логгирование ошибки */
        finalDate = formatedDate();
        try {
          console.log(chalk.red(`${finalDate} Ошибка: `) + responseOrError.e.message);
          loggingActions('Ошибка: ' + responseOrError.e.message);
        } catch (e) {
          console.log(chalk.red(`${finalDate} Ошибка: `) + responseOrError.e);
          loggingActions('Ошибка: ' + responseOrError.e);
        }
      }
      responseOrError = responseOrError.data;
    } else {
      responseOrError = responseOrError.data;
    }
    finalDate = formatedDate();
    console.log(chalk.cyan(`${finalDate} Полчение данных.`));
    loggingActions('Полчение данных: ' + Object.values(responseOrError).map((value) => {
      return value.average;
    }));

    /* Cинтаксический анализ (фильтрация) полученных данных (истории цен). */
    var finalObject = [];
    var finalObjectForGoogleDisk = [];
    var finalObjectSecondStep = [];
    var finalObjectThirdStep = [];
    var finalObjectThirdStepPrice4 = [];

    /* Перебор историй полученных историй */
    Object.keys(responseOrError).forEach((value) => {
      var item = responseOrError[value];
      var history = item.history;
      var steamMultiplierPrice = Number((responseSteam.data[value] * curs * SteamMultiplier).toFixed(2));
      var filteredHistory = [];
      var nowDate = new Date();
      var newAverage = 0;
      var newMin = 1000000000;
      var newMax = 0;

      history.forEach((element) => {
        /* Сравнение дат. */
        const date = new Date(element[0] * 1000);
        const diffTime = Math.abs(nowDate - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        /* Сортировка. */
        if (diffDays <= filterDayCount && element[1] <= steamMultiplierPrice) {
          filteredHistory.push(element);
        }
      });

      var finalFilteredHistory = [];
      if (filteredHistory.length >= minItemsCount) {
        filteredHistory.forEach((element) => {
          /* Пересчёт среднего арифметического. */
          var date = new Date(element[0] * 1000);
          element.push(
            `${date.getUTCDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
          );
          finalFilteredHistory.push(element);
          newAverage += element[1];
          /* Пересчет макс. и мин. цены. */
          if (newMax < element[1]) {
            newMax = element[1];
          }
          if (newMin > element[1]) {
            newMin = element[1];
          }
        });
      } else {
        /* Запись предмета, который не прошел фильтрацию */
        var priceAveragedel1 = item.average / curs;
        var priceSteamDel1 = responseSteam.data[value];
        /* Деление на делители */
        Array.from(dividerForNotAtFilter).forEach((value1) => {
          if (priceAveragedel1 >= value.from && priceAveragedel1 <= value.to) {
            priceAveragedel1 /= value1.divider;
          }
        });
        Array.from(dividerSteamForPrice3).forEach((value) => {
          if (priceSteamDel1 >= value.from && priceSteamDel1 <= value.to) {
            priceSteamDel1 /= value.divider;
          }
        });
        var minPriceWord1 = (priceSteamDel1 <= priceAveragedel1) ? 'steam' : 'average';
        var minPriceDel1 = (priceSteamDel1 <= priceAveragedel1) ? priceSteamDel1 : priceAveragedel1;
        /* Запись в массив */
        finalObjectThirdStep.push({
          name: value,
          leastPrice: minPriceWord1,
          steamMultiplier: Number((responseSteam.data[value] * SteamMultiplier).toFixed(2)),
          price: Number(minPriceDel1.toFixed(2)),
          priceAveragedel: Number(priceAveragedel1.toFixed(2)),
          priceSteamDel: Number(priceSteamDel1.toFixed(2))
        });
        /* Для price4 */
        finalObjectThirdStepPrice4.push({
          name: value,
          price: Number(minPriceDel1.toFixed(2)),
          russian: value
        });
      }
      /* Новое среднее арифметическое. */
      newAverage = newAverage / filteredHistory.length;

      /* Деление на различные делители в зависимости от промежутка. */
      Array.from(dividerPrice3).forEach((value) => {
        if (newAverage >= value.from && newAverage <= value.to) {
          newAverage /= value.divider;
        }
      });

      /* Добавление обработанных предметов. */
      if (finalFilteredHistory.length !== 0) {
        finalObject.push({
          name: value,
          SteamMultiplier: steamMultiplierPrice,
          average: Number(newAverage.toFixed(2)),
          min: newMin,
          max: newMax,
          history: finalFilteredHistory
        });
        /* Инициализация нужных полей */
        var priceAveragedel = Number((newAverage / curs).toFixed(2));
        var priceSteamDel = responseSteam.data[value];
        var minPriceWord = (responseSteam.data[value] <= (newAverage / curs)) ? 'steam' : 'average';
        var minPriceDel = (priceSteamDel <= priceAveragedel) ? priceSteamDel : priceAveragedel;
        Array.from(dividerSteamForPrice3).forEach((value) => {
          if (priceSteamDel >= value.from && priceSteamDel <= value.to) {
            priceSteamDel /= value.divider;
          }
        });
        /* Перевод рублей в доллары. */
        finalObjectForGoogleDisk.push({
          name: value,
          price: Number(minPriceDel.toFixed(2)),
          russian: value
        });
        finalObjectSecondStep.push({
          name: value,
          leastPrice: minPriceWord,
          steamMultiplier: Number((responseSteam.data[value] * SteamMultiplier).toFixed(2)),
          price: minPriceDel,
          priceAveragedel: priceAveragedel,
          priceStemDel: Number((priceSteamDel).toFixed(2))
        });
      }
    });

    /* Дополнение основного массива. */
    objectForCSV.push(...finalObject);
    objectForCSV1.push(...finalObjectForGoogleDisk);
    objectForCSV2.push(...finalObjectSecondStep);
    objectForCSV3.push(...finalObjectThirdStep);
    objectForCSV4.push(...finalObjectThirdStepPrice4);

    /* Запись в файлы. */
    finalDate = formatedDate();
    console.log(chalk.gray(`${finalDate} Запись данных в CSV файл. Курс: ` + curs));
    loggingActions('Запись данных в CSV файл. Курс: ' + curs);

    /* Запись всех данных */
    writeOrAppendCSVFile(objectForCSV, './filterPrice3.csv');
    writeOrAppendCSVFile(objectForCSV1, './price3.csv');
    writeOrAppendCSVFile(objectForCSV2, './filterSteamAverage.csv');
    writeOrAppendCSVFile(objectForCSV3, './filterSteamAverageForNotAtFilter.csv');
    writeOrAppendCSVFile(objectForCSV4, './price4.csv');

    prefinalUrl = `https://market.csgo.com/api/v2/get-list-items-info?key=${steamKey}`;
  }
  /* Загрузка файла в Google диск. */
  uploadFileCompletion.startUploading();
})();