const cleanPathSuffix = require('../utils/cleanPathSuffix');
const removePathPrefix = require('../utils/removePathPrefix');
const Actor = require('./Actor');
const NetFieldExportGroup = require('./NetFieldExports/NetFieldExportGroup');

class NetGuidCache {
  NetFieldExportGroupMap = {};
  NetFieldExportGroupIndexToGroup = {};
  NetGuidToPathName = {};
  NetFieldExportGroupMapPathFixed = {};
  ArchTypeToExportGroup = {};
  FailedPaths = [];
  CleanedPaths = {};
  CleanedClassNetCache = {};
  _networkGameplayTagNodeIndex = null;
  actorIdToActorMap = [];
  netguidToNetFieldExportgroup = [];
  mapObjectNameMap = {};

  get NetworkGameplayTagNodeIndex() {
    if (!this._networkGameplayTagNodeIndex) {
      const nodeIndex = this.NetFieldExportGroupMap["NetworkGameplayTagNodeIndex"];

      if (nodeIndex !== undefined) {
        this._networkGameplayTagNodeIndex = nodeIndex;
      }
    }

    return this._networkGameplayTagNodeIndex;
  };

  /**
   *
   * @param {string} group
   * @param {NetFieldExportGroup} exportGroup
   */
  addToExportGroupMap(group, exportGroup, netFieldParser, globalData) {
    if (group.endsWith('ClassNetCache')) {
      exportGroup.pathName = removePathPrefix(exportGroup.pathName);
    }

    if (!globalData.debug && !globalData.rebuildMode && group !== 'NetworkGameplayTagNodeIndex' && !netFieldParser.willReadType(exportGroup.pathName)) {
      return;
    }

    this.NetFieldExportGroupMap[group] = exportGroup;
    this.NetFieldExportGroupIndexToGroup[exportGroup.pathNameIndex] = group;
  }

  tryGetPathName(netGuid) {
    return this.NetGuidToPathName[netGuid];
  }

  GetNetFieldExportGroupString(path) {
    return this.NetFieldExportGroupMap[path];
  }

  GetNetFieldExportGroup(netguid, globalData) {
    let mapObjectName = null;

    if (typeof netguid === 'string') {
      return {
        group: this.GetNetFieldExportGroupString(netguid),
        mapObjectName: null,
      };
    }

    if (this.netguidToNetFieldExportgroup[netguid] !== undefined) {
      return this.netguidToNetFieldExportgroup[netguid];
    }

    let group = this.ArchTypeToExportGroup[netguid];

    if (!group) {
      let path = this.NetGuidToPathName[netguid];

      if (!path) {
        this.netguidToNetFieldExportgroup[netguid] = null;
        return null;
      }

      group = this.NetFieldExportGroupMapPathFixed[netguid];

      path = globalData.netFieldParser.getRedirect(path);

      if (group) {
        this.ArchTypeToExportGroup[netguid] = this.NetFieldExportGroupMapPathFixed[netguid];
        this.netguidToNetFieldExportgroup[netguid] = {
          mapObjectName,
          group,
        };

        return this.netguidToNetFieldExportgroup[netguid];
      }

      let returnValue;
      const NetFieldExportGroupMapEntries = Object.entries(this.NetFieldExportGroupMap);

      for (let i = 0; i < NetFieldExportGroupMapEntries.length; i++) {
        const [groupPath, value] = NetFieldExportGroupMapEntries[i];

        let groupPathFixed = this.CleanedPaths[value.pathNameIndex];

        if (!groupPathFixed) {
          groupPathFixed = removePathPrefix(groupPath);
          this.CleanedPaths[value.pathNameIndex] = groupPathFixed;
        }

        if (path.includes(groupPathFixed)) {
          this.NetFieldExportGroupMapPathFixed[netguid] = this.NetFieldExportGroupMap[groupPath];
          this.ArchTypeToExportGroup[netguid] = this.NetFieldExportGroupMap[groupPath];

          returnValue = this.NetFieldExportGroupMap[groupPath];

          break;
        }
      }

      if (returnValue) {
        this.netguidToNetFieldExportgroup[netguid] = {
          group: returnValue,
          mapObjectName,
        };

        return this.netguidToNetFieldExportgroup[netguid];
      }

      const cleanedPath = cleanPathSuffix(path);

      for (let i = 0; i < NetFieldExportGroupMapEntries.length; i++) {
        const [groupPath, value] = NetFieldExportGroupMapEntries[i];

        const groupPathFixed = this.CleanedPaths[value.PathNameIndex];

        if (groupPathFixed) {
          if (this.groupPathFixed.includes(cleanedPath)) {
            this.NetFieldExportGroupMapPathFixed[netguid] = this.NetFieldExportGroupMap[groupPath];
            this.ArchTypeToExportGroup[netguid] = this.NetFieldExportGroupMap[groupPath];

            returnValue = this.NetFieldExportGroupMap[groupPath];

            break;
          }
        }
      }

      if (returnValue) {
        this.netguidToNetFieldExportgroup[netguid] = {
          mapObjectName,
          group: this.netguidToNetFieldExportgroup[netguid],
        };

        return returnValue;
      }

      const mapName = this.getFromMapObjectName(path);

      if (mapName) {
        return {
          ...this.GetNetFieldExportGroup(mapName, globalData),
          mapObjectName: path,
        };
      }

      this.FailedPaths.push(path);
      this.netguidToNetFieldExportgroup[netguid] = null;
      return null;
    }

    this.netguidToNetFieldExportgroup[netguid] = group;

    return {
      group,
      mapObjectName,
    };
  }

  GetNetFieldExportGroupFromIndex(index) {
    const group = this.NetFieldExportGroupIndexToGroup[index];

    if (!group) {
      return null;
    }

    return this.NetFieldExportGroupMap[group];
  }

  tryGetTagName(tagIndex) {
    if (tagIndex < this.NetworkGameplayTagNodeIndex.netFieldExportsLength) {
      if (this.NetworkGameplayTagNodeIndex.netFieldExports[tagIndex]) {
        return this.NetworkGameplayTagNodeIndex.netFieldExports[tagIndex].name;
      }
    }

    return '';
  }

  tryGetClassNetCache(group, useFullName) {
    if (!group) {
      return false;
    }

    let classNetCachePath = this.CleanedClassNetCache[group];

    if (!classNetCachePath) {
      classNetCachePath = useFullName ? `${group}_ClassNetCache` : `${removePathPrefix(group)}_ClassNetCache`;
      this.CleanedClassNetCache[group] = classNetCachePath;
    }

    return this.NetFieldExportGroupMap[classNetCachePath];
  }

  /**
   *
   * @param {Actor} inActor
   */
  addActor(inActor) {
    this.actorIdToActorMap[inActor.actorNetGUID.value] = inActor;
  }

  tryGetActorById(netGuid) {
    return this.actorIdToActorMap[netGuid];
  }

  getFromMapObjectName(path) {
    const cleanedPath = path.replace(/(?<=[a-z])\d*_?\d*$/i, '');
    const fullPath = `${cleanedPath}.${cleanedPath}_C`;

    if (this.mapObjectNameMap[cleanedPath]) {
      return this.mapObjectNameMap[cleanedPath];
    }

    const thePath = Object.keys(this.NetFieldExportGroupMap).find((exportPath) => exportPath.includes(fullPath));

    this.mapObjectNameMap[cleanedPath] = thePath || null;

    return thePath || null;
  }
}

module.exports = NetGuidCache;
