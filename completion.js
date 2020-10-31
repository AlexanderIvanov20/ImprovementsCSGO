const axios = require('axios').default;
const {
    steamKey,
    filterDayCount,
    minItemsCount,
    DividerAverageForPrice3,
    steamMultiplierMax,
    steamMultiplierMin,
    dividerSteamForPrice3,
    dividerForNotAtFilter,
    dividerSteamForPrice4,
    restartAfter
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
    if (recievedData.length !== 0) {
        var fields = Object.keys(recievedData[0]);
        const csv = jsonToCsv(recievedData, {
            fields: fields,
            delimiter: ',',
            quote: ''
        });
        fs.writeFileSync(fileTitle, csv);
    }
}


/* Получение курса доллара. */
const getCursOfDollar = async () => {
    const m = new Date();
    var dateString = `${m.getUTCDate()}/${(m.getUTCMonth() + 1)}/${m.getUTCFullYear()}`

    var url = `http://www.cbr.ru/scripts/XML_dynamic.asp?date_req1=${dateString}&date_req2=${dateString}&VAL_NM_RQ=R01235`;
    var response = await axios.get(url);
    var data = response.data;

    /* Синтексический анализ полученного XML. */
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


let i = 1;
/* Ocновной поток выпонения программы. */
async function mainFunction() {
    /* Очистка логов */
    var finalDate;
    fs.writeFileSync('logsPrice3.log', '');

    console.log('Старт');
    loggingActions('Старт');

    finalDate = formatedDate();
    console.log(chalk.green(`${finalDate} Парсинг данных с ${urlItems}`));
    loggingActions(`Парсинг данных с ${urlItems}`);

    /* Сбор имен всех предметов. */
    var responseSteam;
    try {
        responseSteam = await axios.get(urlItems);
        var keysItems = Object.keys(responseSteam.data);
    } catch (e) {
        console.error(`An error occurred ${e}`);
    }

    finalDate = formatedDate();
    console.log(chalk.gray(`${finalDate} Запись данных в файл Steam.`));
    loggingActions(`Запись данных в файл Steam.`);

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
    finalDate = formatedDate();
    console.log(chalk.yellow(`${finalDate} Парсинг курса рубля с https://www.cbr.ru`));
    loggingActions(`Парсинг курса рубля с https://www.cbr.ru`);
    var curs = await getCursOfDollar();

    for (var item = 0; item < keysItems.length; item += 50) {
        // for (var item = 0; item < 50; item += 50) {
        /* Формирование ссылки для 50-ти предметов. */
        var temporaryArray = keysItems.slice(item, item + 50);
        temporaryArray.forEach((value) => {
            var encodedTitle = encodeURI(value);
            prefinalUrl += `&list_hash_name[]=${encodedTitle}`;
        });

        finalDate = formatedDate();
        console.log(chalk.green(`${finalDate} ${i} Отправка запроса.`));
        loggingActions(`${i} Отправка запроса: ${JSON.stringify(temporaryArray)}`);

        /* Сбор истории цены предметов. Если ошибка - цикл и тайаут 10 секунд. */
        var responseOrError = await makeRequest(prefinalUrl);
        if (!responseOrError.success) {
            var point = true;
            /* Безконечный цикл, пока не прийдет ответ */
            while (point) {
                finalDate = formatedDate();
                console.log(chalk.yellow(`${finalDate} ${i} Ошибка... Таймаут 10 секунд.`));
                loggingActions(`${i} Ошибка... Таймаут 10 секунд.`);

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
                    console.log(chalk.red(`${finalDate} ${i} Ошибка: `) + responseOrError.e.message);
                    loggingActions(`${i} Ошибка: ` + responseOrError.e.message);
                } catch (e) {
                    console.log(chalk.red(`${finalDate} ${i} Ошибка: `) + responseOrError.e);
                    loggingActions(`${i} Ошибка: ` + responseOrError.e);
                }
            }
            responseOrError = responseOrError.data;
        } else {
            responseOrError = responseOrError.data;
        }
        finalDate = formatedDate();
        console.log(chalk.cyan(`${finalDate} ${i} Получение данных.`));
        loggingActions(`${i} Получение данных: ` + JSON.stringify(Object.keys(responseOrError).map((value) => {
            var his = Array.from(responseOrError[value].history);
            his = his.map((element) => {
                var date = new Date(element[0] * 1000);
                d = `${date.getUTCDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
                return [Number((element[1]).toFixed(2)), 'rub', d];
            });
            return his;
        })));

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
            var steamMultiplierPrice = Number((responseSteam.data[value] * curs * steamMultiplierMax).toFixed(2));
            var steamMultiplierPriceMin = Number((responseSteam.data[value] * curs * steamMultiplierMin).toFixed(2));
            var filteredHistory = [];
            var nofilteredHistory = [];
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
                if (diffDays <= filterDayCount && element[1] <= steamMultiplierPrice && element[1] >= steamMultiplierPriceMin) {
                    filteredHistory.push(element);
                } else {
                    nofilteredHistory.push(element);
                }
            });

            var finalFilteredHistory = [];
            if (filteredHistory.length >= minItemsCount) {
                filteredHistory.forEach((element) => {
                    /* Пересчёт среднего арифметического. */
                    var date = new Date(element[0] * 1000);
                    d = `${date.getUTCDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`

                    some = [Number((element[1]).toFixed(2)), 'rub', d];
                    finalFilteredHistory.push(some);
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
                var newMinSome = 1000000000;
                var newMaxSome = 0;
                var newAverageSome = 0;
                var finalnoFilteredHistory = [];

                nofilteredHistory.forEach((element) => {
                    /* Пересчёт среднего арифметического. */
                    var date = new Date(element[0] * 1000);
                    d = `${date.getUTCDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`

                    some = [Number((element[1]).toFixed(2)), 'rub', d];
                    finalnoFilteredHistory.push(some);

                    newAverageSome += element[1];
                    /* Пересчет макс. и мин. цены. */
                    if (newMaxSome < element[1]) {
                        newMaxSome = element[1];
                    }
                    if (newMinSome > element[1]) {
                        newMinSome = element[1];
                    }
                });

                if (nofilteredHistory.length !== 0) {

                    /* Новое среднее арифметическое. */
                    newAverageSome = newAverageSome / nofilteredHistory.length;

                    /* Деление на различные делители в зависимости от промежутка. */
                    Array.from(DividerAverageForPrice3).forEach((value) => {
                        if (newAverageSome >= value.from && newAverageSome <= value.to) {
                            newAverageSome /= value.divider;
                        }
                    });

                    /* Запись предмета, который не прошел фильтрацию */
                    var priceAveragedel1 = item.average / curs;
                    var priceSteamDel1 = responseSteam.data[value];

                    /* Деление на делители */
                    Array.from(dividerForNotAtFilter).forEach((value1) => {
                        if (priceAveragedel1 >= value1.from && priceAveragedel1 <= value1.to) {
                            priceAveragedel1 = priceAveragedel1 / value1.divider;
                        }
                    });
                    Array.from(dividerSteamForPrice4).forEach((value2) => {
                        if (priceSteamDel1 >= value2.from && priceSteamDel1 <= value2.to) {
                            priceSteamDel1 = priceSteamDel1 / value2.divider;
                        }
                    });

                    var minPriceWord1 = (priceSteamDel1 <= priceAveragedel1) ? 'steam' : 'average';
                    var minPriceDel1 = (priceSteamDel1 <= priceAveragedel1) ? priceSteamDel1 : priceAveragedel1;
                    /* Запись в массив */
                    finalObjectThirdStep.push({
                        name: value,
                        SteamMultiplierMax: steamMultiplierPrice,
                        SteamMultiplierMin: steamMultiplierPriceMin,
                        max: newMaxSome,
                        min: newMinSome,
                        NewAverage: Number(newAverageSome.toFixed(2)),
                        "Курс рубля": curs,
                        Steam: responseSteam.data[value],
                        // steamMultiplier: Number((responseSteam.data[value] * steamMultiplierMax).toFixed(2)),
                        price4: [Number(minPriceDel1.toFixed(2)), Number((minPriceDel1 * curs).toFixed(2))],
                        leastPrice: minPriceWord1,
                        priceAveragedel: Number((priceAveragedel1 * 60).toFixed(2)),
                        priceSteamDel: Number((priceSteamDel1 * 60).toFixed(2)),
                        history: finalnoFilteredHistory
                    });
                    /* Для price4 */
                    finalObjectThirdStepPrice4.push({
                        name: value,
                        price: Number(minPriceDel1.toFixed(2)),
                        russian: value
                    });
                }
            }
            /* Новое среднее арифметическое. */
            newAverage = newAverage / filteredHistory.length;

            /* Деление на различные делители в зависимости от промежутка. */
            Array.from(DividerAverageForPrice3).forEach((value) => {
                if (newAverage >= value.from && newAverage <= value.to) {
                    newAverage /= value.divider;
                }
            });

            /* Добавление обработанных предметов. */
            if (finalFilteredHistory.length !== 0) {
                finalObject.push({
                    name: value,
                    SteamMultiplierMax: steamMultiplierPrice,
                    SteamMultiplierMin: steamMultiplierPriceMin,
                    max: newMax,
                    min: newMin,
                    NewAverage: Number(newAverage.toFixed(2)),
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
                    SteamMultiplierMax: steamMultiplierPrice,
                    SteamMultiplierMin: steamMultiplierPriceMin,
                    max: newMax,
                    min: newMin,
                    NewAverage: Number(newAverage.toFixed(2)),
                    "Курс рубля": curs,
                    Steam: responseSteam.data[value],
                    // steamMultiplier: Number((responseSteam.data[value] * steamMultiplierMax).toFixed(2)),
                    price3: [minPriceDel, Number((minPriceDel * curs).toFixed(2))],
                    leastPrice: minPriceWord,
                    priceAveragedel: Number((priceAveragedel * curs).toFixed(2)),
                    priceStemDel: Number((priceSteamDel * curs).toFixed(2)),
                    history: finalFilteredHistory
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
        console.log(chalk.gray(`${finalDate} ${i} Запись данных в CSV файл. Курс: ${curs}`));
        loggingActions(`${i} Запись данных в CSV файл. Курс: ${curs}`);

        /* Запись всех данных */
        writeOrAppendCSVFile(objectForCSV, './filterPrice3.csv');
        writeOrAppendCSVFile(objectForCSV1, './price3.csv');
        writeOrAppendCSVFile(objectForCSV2, './filterSteamAndAverage.csv');
        writeOrAppendCSVFile(objectForCSV3, './filterSteamAverageForNotAtFilter.csv');
        writeOrAppendCSVFile(objectForCSV4, './price4.csv');

        prefinalUrl = `https://market.csgo.com/api/v2/get-list-items-info?key=${steamKey}`;
        i += 1;
    }
    /* Загрузка файла в Google диск. */
    console.log(chalk.red('Запись данных на Google Диск.'));
    uploadFileCompletion.startUploading();
}


mainFunction();
