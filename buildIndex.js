const fs = require('fs');
const shajs = require('sha.js');
const striptags = require('striptags');
const elasticlunr = require('elasticlunr');
const jsonc = require('jsoncomp');
const Parser = require('rss-parser');
const parser = new Parser();

const cacheDir = './podcasts/cache';
const cacheFile = cacheDir + '/episodes.json';
const indexFile = cacheDir + '/index.json';

const rssFile = './podcasts/rss.list';

let cache = {};

function getRandomSubarray(arr, size) {
  var shuffled = arr.slice(0),
    i = arr.length,
    temp,
    index;
  while (i--) {
    index = Math.floor((i + 1) * Math.random());
    temp = shuffled[index];
    shuffled[index] = shuffled[i];
    shuffled[i] = temp;
  }
  return shuffled.slice(0, size);
}

(async () => {
  // set up cache
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir);
  }

  if (fs.existsSync(cacheFile)) {
    cache = require(cacheFile);
  }

  // read RSS list:
  var rssFeeds = fs
    .readFileSync(rssFile)
    .toString()
    .split('\n');
  let processedCount = 0;

  await Promise.all(
    getRandomSubarray(rssFeeds, 1400).map(async (url) => {
      try {
        if (
          url &&
          (!cache.feed || !cache.feed[url] || Date.now() > cache.feed[url] + 60 * 60 * 24 * 1000)
        ) {
          const feed = await parser.parseURL(url);
          const podcastTitle = feed.title;

          console.log(`Fetching ${podcastTitle}`);
          // description is either item.description, item.content, item.itunes.summary, or item.contentSnippet
          await Promise.all(
            feed.items.map((item) => {
              console.log(JSON.stringify(item, null, 4));
              if (!item.link && item.enclosure && item.enclosure.url) {
                item.link = item.enclosure.url;
              }
              if (item.link) {
                const episodeHash = shajs('sha256')
                  .update(item.link)
                  .digest('hex');
                const episodeDescription = item.description
                  ? item.description
                  : item.content
                    ? item.content
                    : item.itunes && item.itunes.summary
                      ? item.itunes.summary
                      : item.contentSnippet;
                if (episodeDescription) {
                  const episodeObj = {
                    podcastTitle,
                    title: item.title,
                    link: item.link,
                    description: striptags(episodeDescription)
                  };
                  console.log(episodeObj);
                  cache[episodeHash] = episodeObj;
                }
              }
            })
          );
          if (!cache.feed) {
            cache.feed = {};
          }
          cache.feed[url] = Date.now();

          // flush to disk every 10
          if (processedCount++ % 10 === 0) {
            console.log('saving partway through... ');
            let data = JSON.stringify(cache);
            fs.writeFileSync(cacheFile, data);
          }
        }
      } catch (err) {
        console.log('Handle failed reason:', err, ' for ', url);
      }
    })
  );

  // write cache to disk
  console.log('Saving cache');
  let data = JSON.stringify(cache, null, 2);
  fs.writeFileSync(cacheFile, data);

  // index to elasticlunr
  var index = elasticlunr(function() {
    this.addField('podcastTitle');
    this.addField('title');
    this.addField('link');
    this.addField('description');
    this.setRef('link');
  });

  console.log('starting index');
  await Promise.all(
    Object.keys(cache).map((id) => {
      if (id !== 'feed') {
        index.addDoc(cache[id]);
      }
    })
  );
  console.log('completing index');

  // write index to disk
  console.log('Saving index');
  let indexData = JSON.stringify(index);
  fs.writeFileSync(indexFile, indexData);
})();
