const receiveCustomProperty = (reader, fieldCache, bunch, pathName, globalData) => {
  const theClass = require(`../../Classes/${fieldCache.type}.js`);
  const instance = new theClass();
  instance.serialize(reader);

  if (instance.resolve) {
    instance.resolve(globalData.netGuidCache);
  }

  instance.type = fieldCache.customExportName || pathName.split('/').pop();

  globalData.exportEmitter.emit(
    instance.type,
    {
      chIndex: bunch.chIndex,
      data: instance,
      timeSeconds: bunch.timeSeconds,
      staticActorId: null,
      globalData,
      result: globalData.result,
      states: globalData.states,
    },
  );
}

module.exports = receiveCustomProperty;
