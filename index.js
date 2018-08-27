console.log('start');
const fs = require('fs');
const elasticlunr = require('elasticlunr');

const cacheDir = './podcasts/cache';
const indexFile = cacheDir + '/index.json';

const indexDump = require(indexFile);
console.log('loaded require');
const index = elasticlunr.Index.load(indexDump);

console.log('ready to search');
let resultCount = 0;
index.search('jeff bezos').map((result) => {
  resultCount++;
  if (resultCount <= 5) {
    console.log(result);
  }
});
console.log('done');
