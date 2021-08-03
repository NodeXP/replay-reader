const DataBunch = require('../Classes/DataBunch');
const Replay = require('../Classes/Replay');
const GlobalData = require('../utils/globalData');
const readFieldHeaderAndPayload = require('./ReadFieldHeaderAndPayload');
const receiveCustomDeltaProperty = require('./receiveCustomDeltaProperty');
const receiveCustomProperty = require('./receiveCustomProperty');
const receivedRPC = require('./receivedRPC');
const receiveProperties = require('./receiveProperties');

/**
 * @param {DataBunch} bunch
 * @param {Replay} archive
 * @param {number} repObject
 * @param {boolean} bHasRepLayout
 * @param {GlobalData} globalData
 */
const receivedReplicatorBunch = (bunch, archive, repObject, bHasRepLayout, globalData) => {
  const exportGroup = globalData.netGuidCache.GetNetFieldExportGroup(repObject, globalData);
  const { netFieldParser } = globalData;

  if (exportGroup == null) {
    return true;
  }

  const { group: netFielExportGroup, mapObjectName } = exportGroup;

  if (bHasRepLayout) {
    if (!receiveProperties(archive, netFielExportGroup, bunch, true, false, globalData, mapObjectName)) {
      return false;
    }
  }

  if (archive.atEnd()) {
    return true;
  }

  const classNetCache = globalData.netGuidCache.tryGetClassNetCache(netFielExportGroup.pathName, bunch.archive.header.EngineNetworkVersion >= 15)

  if (!classNetCache) {
    return false;
  }

  let finished = false;

  while (!finished) {
    const result = readFieldHeaderAndPayload(archive, classNetCache);

    if (!result) {
      finished = true;

      break;
    }

    const { outField: fieldCache, numPayloadBits } = result;

    if (!fieldCache || fieldCache.incompatible || !numPayloadBits) {
      continue;
    }

    archive.addOffset(numPayloadBits);

    if (!netFieldParser.willReadType(classNetCache.pathName)) {
      archive.popOffset();

      continue;
    }

    const classNetProperty = netFieldParser.tryGetClassNetCacheProperty(fieldCache.name, classNetCache.pathName);

    if (classNetProperty) {
      if (classNetProperty.isFunction) {
        const exportGroup = globalData.netGuidCache.GetNetFieldExportGroup(classNetProperty.type);

        if (!exportGroup) {
          return false;
        }

        const { group: functionGroup, mapObjectName } = exportGroup;

        if (!receivedRPC(archive, functionGroup, bunch, globalData, mapObjectName)) {
          return false;
        }
      } else if (classNetProperty.isCustomStruct) {
        if (!receiveCustomProperty(archive, classNetProperty, bunch, classNetCache.pathName, globalData, mapObjectName)) {
          archive.popOffset();

          continue;
        }
      } else {
        const exportGroup = globalData.netGuidCache.GetNetFieldExportGroup(classNetProperty.type);

        if (!exportGroup) {
          return false;
        }

        const { group, mapObjectName } = exportGroup;

        if (!group || !netFieldParser.willReadType(group.pathName)) {
          archive.popOffset();

          continue;
        }

        if (receiveCustomDeltaProperty(archive, group, bunch, classNetProperty.EnablePropertyChecksum || false, globalData, mapObjectName)) {
          archive.popOffset();

          continue;
        }
      }
    }

    archive.popOffset();
  }
};

module.exports = receivedReplicatorBunch;
