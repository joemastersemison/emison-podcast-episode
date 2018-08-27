# emison-podcast-episode

Alexa Skill to Play Specific Podcast Episodes

# buildIndex.js

running `node --max-old-space-size=4096 buildIndex.js` will use `podcasts/rss.list` to
retrieve podcast episode titles, descriptions, and urls, build a `podcasts/cache/episodes.json`
cache file to store them, and then index them to `podcasts/cache/index.json` elasticlunr index file that can be searched by the lambda.
