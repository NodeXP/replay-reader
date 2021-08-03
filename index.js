const Replay = require('./src/Classes/Replay');
const { replayInfo, replayChunks } = require('./src/parse');
const GlobalData = require('./src/utils/globalData');
const fs = require('fs');
let isParsing = false;

const parse = async (buffer, options) => {
  if (isParsing) {
    throw Error('Cannot parse multiple replays at once');
  }

  isParsing = true;

  const replay = new Replay(buffer);

  const globalData = new GlobalData(options || {});
  let info
  let chunks

  if (globalData.debug) {
    if (fs.existsSync('notReadingGroups.txt')) {
      fs.unlinkSync('notReadingGroups.txt');
    }

    if (fs.existsSync('netfieldexports.txt')) {
      fs.unlinkSync('netfieldexports.txt');
    }

    if (fs.existsSync('netGuidToPathName.txt')) {
      fs.unlinkSync('netGuidToPathName.txt');
    }
  }

  try {
    info = replayInfo(replay);
    chunks = await replayChunks(replay, globalData);
  } catch (err) {
    isParsing = false;

    throw err;
  }

  globalData.result.players = Object.values(globalData.players);
  globalData.result.mapData.pickups = Object.values(globalData.pickups);
  globalData.result.mapData.llamas = Object.values(globalData.llamas);
  globalData.result.mapData.labradorLlamas = Object.values(globalData.labradorLlamas);

  if (globalData.debug) {
    Object.values(globalData.netGuidCache.NetFieldExportGroupMap).forEach((value) => {
      const filteredNetFieldExports = Object.values(value.netFieldExports).filter((a) => a && a.name !== 'RemoteRole' && a.name !== 'Role');

      if (!filteredNetFieldExports.length) {
        return;
      }

      fs.appendFileSync('netfieldexports.txt', value.pathName + ' - ' + value.netFieldExportsLength+ ' - ' + value.pathNameIndex + '\n');

      filteredNetFieldExports.forEach((exportt) => {
        fs.appendFileSync('netfieldexports.txt', '  ' + exportt.handle + ': ' + exportt.name + '\n');
      });
    });

    fs.writeFileSync('netGuidToPathName.txt', globalData.debugNetGuidToPathName.map(({ key, val }) => `${key}: ${val}`).join('\n'));
  }

  if (globalData.rebuildMode) {
    globalData.result.netFieldExports = globalData.netGuidCache.NetFieldExportGroupMap;
  }

  isParsing = false;

  return {
    header: globalData.header,
    info: {
      ...info,
      EncryptionKey: Array.from(info.EncryptionKey),
    },
    events: chunks,
    ...globalData.result,
  };
}

module.exports = parse;
