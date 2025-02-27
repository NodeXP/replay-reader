const fs = require('fs');
const parse = require('.');

(async () => {
  const replayBuffer = fs.readFileSync('replays/mothership.replay');

  console.time();
  const parsedReplay = await parse(replayBuffer, {
    parseLevel: 10,
    // customNetFieldExports: [
    //   require('./NetFieldExports/SafeZoneIndicator.json'),
    // ],
    // onlyUseCustomNetFieldExports: true,
    // debug: true,
  });
  console.timeEnd();

  fs.writeFileSync('replay.json', JSON.stringify(parsedReplay, null, 2));
})().catch((err) => {
  console.error(err.stack);
});
