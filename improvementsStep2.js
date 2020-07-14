const axios = require('axios').default;
const chalk = require('chalk');
const fileSystem = require('fs');


var url = 'https://api.steamapis.com/market/items/730?api_key=bmyRVmF1HOQ9IH5LmSInrD8FgV4&format=comact';

(async () => {
  try {
    var response = await axios.get(url);
    var data = response.data;
    console.log(data);
  } catch (e) {
    console.error(chalk.red(e));
  }

  
})();